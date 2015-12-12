"use strict";
var PIXI = require('pixi.js');
var perlin = require('perlin');
const noise = perlin.noise;
var Quadtree_1 = require("./Quadtree");
var seedrandom_1 = require('seedrandom');
seedrandom_1.default;
const math = {
    subtractPoints: (p1, p2) => ({ x: p1.x - p2.x, y: p1.y - p2.y }),
    crossProduct: (a, b) => a.x * b.y - a.y * b.x,
    doLineSegmentsIntersect: (a, b, p, d, c) => {
        b = math.subtractPoints(b, a);
        d = math.subtractPoints(d, p);
        var f = math.crossProduct(math.subtractPoints(p, a), b);
        var k = math.crossProduct(b, d);
        if (0 == f && 0 == k || 0 == k)
            return null;
        f /= k;
        let e = math.crossProduct(math.subtractPoints(p, a), d) / k;
        const intersect = c ? 0.001 < e && (0.999 > e && (0.001 < f && 0.999 > f)) : 0 <= e && (1 >= e && (0 <= f && 1 >= f));
        return intersect ? { x: a.x + e * b.x, y: a.y + e * b.y, t: e } : null;
    },
    minDegreeDifference: (val1, val2) => {
        const bottom = Math.abs(val1 - val2) % 180;
        return Math.min(bottom, Math.abs(bottom - 180));
    },
    equalV: function (a, b) {
        var e = math.subtractPoints(a, b);
        return 1E-8 > math.lengthV2(e);
    },
    dotProduct: function (a, b) {
        return a.x * b.x + a.y * b.y;
    },
    length: function (a, b) {
        return math.lengthV(math.subtractPoints(b, a));
    },
    length2: function (a, b) {
        return math.lengthV2(math.subtractPoints(b, a));
    },
    lengthV: function (a) {
        return Math.sqrt(math.lengthV2(a));
    },
    lengthV2: function (a) {
        return a.x * a.x + a.y * a.y;
    },
    angleBetween: function (a, b) {
        const angleRad = Math.acos((a.x * b.x + a.y * b.y) / (math.lengthV(a) * math.lengthV(b)));
        return 180 * angleRad / Math.PI;
    },
    sign: function (a) {
        return 0 < a ? 1 : 0 > a ? -1 : 0;
    },
    fractionBetween: function (a, b, e) {
        b = math.subtractPoints(b, a);
        return {
            x: a.x + b.x * e,
            y: a.y + b.y * e
        };
    },
    randomRange: function (a, b) {
        return Math.random() * (b - a) + a;
    },
    addPoints: function (a, b) {
        return { x: a.x + b.x, y: a.y + b.y };
    },
    distanceToLine: function (a, b, e) {
        var d = math.subtractPoints(a, b);
        e = math.subtractPoints(e, b);
        const proj = math.project(d, e);
        var c = proj.projected;
        b = math.addPoints(b, c);
        return {
            distance2: math.length2(b, a),
            pointOnLine: b,
            lineProj2: math.sign(proj.dotProduct) * math.lengthV2(c),
            length2: math.lengthV2(e)
        };
    },
    project: function (a, b) {
        var e = math.dotProduct(a, b);
        return {
            dotProduct: e,
            projected: math.multVScalar(b, e / math.lengthV2(b))
        };
    },
    multVScalar: function (a, b) {
        return {
            x: a.x * b,
            y: a.y * b
        };
    },
    divVScalar: function (a, b) {
        return {
            x: a.x / b,
            y: a.y / b
        };
    },
};
const randomWat = function (b) {
    var d = Math.pow(Math.abs(b), 3);
    var c = 0;
    while (0 === c || Math.random() < Math.pow(Math.abs(c), 3) / d) {
        c = math.randomRange(-b, b);
    }
    return c;
};
const config = {
    mapGeneration: {
        DEFAULT_SEGMENT_LENGTH: 300, HIGHWAY_SEGMENT_LENGTH: 400, DEFAULT_SEGMENT_WIDTH: 6, HIGHWAY_SEGMENT_WIDTH: 16,
        RANDOM_BRANCH_ANGLE: function () { return randomWat(3); },
        RANDOM_STRAIGHT_ANGLE: function () { return randomWat(15); },
        DEFAULT_BRANCH_PROBABILITY: .4, HIGHWAY_BRANCH_PROBABILITY: .05,
        HIGHWAY_BRANCH_POPULATION_THRESHOLD: .1, NORMAL_BRANCH_POPULATION_THRESHOLD: .1,
        NORMAL_BRANCH_TIME_DELAY_FROM_HIGHWAY: 5, MINIMUM_INTERSECTION_DEVIATION: 30,
        SEGMENT_COUNT_LIMIT: 3000, DEBUG_DELAY: 0, ROAD_SNAP_DISTANCE: 50, HEAT_MAP_PIXEL_DIM: 50, DRAW_HEATMAP: !1,
        QUADTREE_PARAMS: { x: -2E4, y: -2E4, width: 4E4, height: 4E4 }, QUADTREE_MAX_OBJECTS: 10, QUADTREE_MAX_LEVELS: 10, DEBUG: !1
    },
    gameLogic: {
        SELECT_PAN_THRESHOLD: 50, SELECTION_RANGE: 50, DEFAULT_PICKUP_RANGE: 150,
        DEFAULT_BOOST_FACTOR: 2, DEFAULT_BOOST_DURATION: 2,
        MIN_LENGTH_FOR_VEHICLE_ARRIVAL: .1, DEFAULT_CARGO_CAPACITY: 1, MIN_SPEED_PROPORTION: .1
    }
};
class Segment {
    constructor(start, end, t = 0, q = { highway: false }) {
        this.limitsRevision = undefined;
        this.cachedDir = void 0;
        this.cachedLength = void 0;
        this.roadRevision = 0;
        this.dirRevision = undefined;
        this.lengthRevision = void 0;
        this.links = { b: [], f: [] };
        this.users = [];
        this.id = undefined;
        this.setupBranchLinks = undefined;
        const obj = this;
        this.start = { x: start.x, y: start.y };
        this.end = { x: end.x, y: end.y };
        if (!q)
            q = { highway: false };
        this.width = q.highway ? config.mapGeneration.HIGHWAY_SEGMENT_WIDTH : config.mapGeneration.DEFAULT_SEGMENT_WIDTH;
        this.r = {
            start: start,
            end: end,
            setStart: function (val) {
                this.start = val;
                obj.start = this.start;
                return obj.roadRevision++;
            },
            setEnd: function (val) {
                this.end = val;
                obj.end = this.end;
                return obj.roadRevision++;
            }
        };
        this.t = t;
        this.q = q;
        [this.maxSpeed, this.capacity] = q.highway ? [1200, 12] : [800, 6];
    }
    limits() {
        return {
            x: Math.min(this.start.x, this.end.x),
            y: Math.min(this.start.y, this.end.y),
            width: Math.abs(this.start.x - this.end.x),
            height: Math.abs(this.start.y - this.end.y),
            o: this
        };
    }
    currentSpeed() {
        return Math.min(config.gameLogic.MIN_SPEED_PROPORTION, 1 - Math.max(0, this.users.length - 1) / this.capacity) * this.maxSpeed;
    }
    ;
    dir() {
        if (this.dirRevision !== this.roadRevision) {
            this.dirRevision = this.roadRevision;
            const vector = math.subtractPoints(this.r.end, this.r.start);
            this.cachedDir = -1 * math.sign(math.crossProduct({ x: 0, y: 1 }, vector)) * math.angleBetween({ x: 0, y: 1 }, vector);
        }
        return this.cachedDir;
    }
    ;
    length() {
        if (this.lengthRevision !== this.roadRevision) {
            this.lengthRevision = this.roadRevision;
            this.cachedLength = math.length(this.r.start, this.r.end);
        }
        return this.cachedLength;
    }
    ;
    debugLinks() {
        this.q.color = 0x00FF00;
        this.links.b.forEach(backwards => backwards.q.color = 0xFF0000);
        this.links.f.forEach(forwards => forwards.q.color = 0x0000FF);
    }
    ;
    startIsBackwards() {
        if (this.links.b.length > 0) {
            return math.equalV(this.links.b[0].r.start, this.r.start) || math.equalV(this.links.b[0].r.end, this.r.start);
        }
        else {
            return math.equalV(this.links.f[0].r.start, this.r.end) || math.equalV(this.links.f[0].r.end, this.r.end);
        }
    }
    ;
    cost() {
        return this.length() / this.currentSpeed();
    }
    ;
    costTo(other, fromFraction) {
        const segmentEnd = this.endContaining(other);
        let res = 0.5;
        if (fromFraction != null) {
            if (segmentEnd === Segment.End.START)
                res = fromFraction;
            else
                res = 1 - fromFraction;
        }
        return this.cost() * res;
    }
    ;
    neighbours() {
        return this.links.f.concat(this.links.b);
    }
    ;
    endContaining(segment) {
        var startBackwards = this.startIsBackwards();
        if (this.links.b.indexOf(segment) !== -1) {
            return startBackwards ? Segment.End.START : Segment.End.END;
        }
        else if (this.links.f.indexOf(segment) !== -1) {
            return startBackwards ? Segment.End.END : Segment.End.START;
        }
        else {
            return undefined;
        }
    }
    ;
    linksForEndContaining(segment) {
        if (this.links.b.indexOf(segment) !== -1) {
            return this.links.b;
        }
        else if (this.links.f.indexOf(segment) !== -1) {
            return this.links.f;
        }
        else {
            return void 0;
        }
    }
    ;
    split(point, segment, segmentList, qTree) {
        const splitPart = segmentFactory.fromExisting(this);
        const startIsBackwards = this.startIsBackwards();
        segmentList.push(splitPart);
        qTree.insert(splitPart.limits());
        splitPart.r.setEnd(point);
        this.r.setStart(point);
        splitPart.links.b = this.links.b.slice(0);
        splitPart.links.f = this.links.f.slice(0);
        let firstSplit, fixLinks, secondSplit;
        if (startIsBackwards) {
            firstSplit = splitPart;
            secondSplit = this;
            fixLinks = splitPart.links.b;
        }
        else {
            firstSplit = this;
            secondSplit = splitPart;
            fixLinks = splitPart.links.f;
        }
        fixLinks.forEach(link => {
            var index = link.links.b.indexOf(this);
            if (index !== -1) {
                link.links.b[index] = splitPart;
            }
            else {
                index = link.links.f.indexOf(this);
                link.links.f[index] = splitPart;
            }
        });
        firstSplit.links.f = [segment, secondSplit];
        secondSplit.links.b = [segment, firstSplit];
        segment.links.f.push(firstSplit);
        segment.links.f.push(secondSplit);
    }
    ;
}
Segment.End = { START: "start", END: "end" };
exports.Segment = Segment;
const segmentFactory = {
    fromExisting: function (segment, t = segment.t, r = segment.r, q = segment.q) {
        return new Segment(r.start, r.end, t, q);
    },
    usingDirection: function (start, dir = 90, length = config.mapGeneration.DEFAULT_SEGMENT_LENGTH, t, q) {
        var end = {
            x: start.x + length * Math.sin(dir * Math.PI / 180),
            y: start.y + length * Math.cos(dir * Math.PI / 180)
        };
        return new Segment(start, end, t, q);
    }
};
const heatmap = {
    popOnRoad: function (r) {
        return (this.populationAt(r.start.x, r.start.y) + this.populationAt(r.end.x, r.end.y)) / 2;
    },
    populationAt: function (x, y) {
        const value1 = (noise.simplex2(x / 10000, y / 10000) + 1) / 2;
        const value2 = (noise.simplex2(x / 20000 + 500, y / 20000 + 500) + 1) / 2;
        const value3 = (noise.simplex2(x / 20000 + 1000, y / 20000 + 1000) + 1) / 2;
        return Math.pow((value1 * value2 + value3) / 2, 2);
    }
};
function doRoadSegmentsIntersect(r1, r2) {
    return math.doLineSegmentsIntersect(r1.start, r1.end, r2.start, r2.end, true);
}
;
const localConstraints = function (segment, segments, qTree, debugData) {
    const action = {
        priority: 0,
        func: undefined,
        t: undefined
    };
    for (const match of qTree.retrieve(segment.limits())) {
        let other = match.o;
        if (action.priority <= 4) {
            const intersection = doRoadSegmentsIntersect(segment.r, other.r);
            if (intersection) {
                if (action.t == null || intersection.t < action.t) {
                    action.t = intersection.t;
                    action.priority = 4;
                    action.func = function () {
                        if (math.minDegreeDifference(other.dir(), segment.dir()) < config.mapGeneration.MINIMUM_INTERSECTION_DEVIATION) {
                            return false;
                        }
                        other.split(intersection, segment, segments, qTree);
                        segment.r.end = intersection;
                        segment.q.severed = true;
                        if (debugData.intersections == null)
                            debugData.intersections = [];
                        debugData.intersections.push(intersection);
                        return true;
                    };
                }
            }
        }
        if (action.priority <= 3) {
            if (math.length(segment.r.end, other.r.end) <= config.mapGeneration.ROAD_SNAP_DISTANCE) {
                const point = other.r.end;
                action.priority = 3;
                action.func = function () {
                    segment.r.end = point;
                    segment.q.severed = true;
                    const links = other.startIsBackwards() ? other.links.f : other.links.b;
                    if (links.some(link => (math.equalV(link.r.start, segment.r.end) && math.equalV(link.r.end, segment.r.start)) || (math.equalV(link.r.start, segment.r.start) && math.equalV(link.r.end, segment.r.end)))) {
                        return false;
                    }
                    links.forEach(link => {
                        link.linksForEndContaining(other).push(segment);
                        segment.links.f.push(link);
                    });
                    links.push(segment);
                    segment.links.f.push(other);
                    if (debugData.snaps == null)
                        debugData.snaps = [];
                    debugData.snaps.push({ x: point.x, y: point.y });
                    return true;
                };
            }
        }
        if (action.priority <= 2) {
            const { distance2, pointOnLine, lineProj2, length2 } = math.distanceToLine(segment.r.end, other.r.start, other.r.end);
            if (distance2 < config.mapGeneration.ROAD_SNAP_DISTANCE * config.mapGeneration.ROAD_SNAP_DISTANCE && lineProj2 >= 0 && lineProj2 <= length2) {
                const point = pointOnLine;
                action.priority = 2;
                action.func = function () {
                    segment.r.end = point;
                    segment.q.severed = true;
                    if (math.minDegreeDifference(other.dir(), segment.dir()) < config.mapGeneration.MINIMUM_INTERSECTION_DEVIATION) {
                        return false;
                    }
                    other.split(point, segment, segments, qTree);
                    if (debugData.intersectionsRadius == null)
                        debugData.intersectionsRadius = [];
                    debugData.intersectionsRadius.push({ x: point.x, y: point.y });
                    return true;
                };
            }
        }
    }
    if (action.func)
        return action.func();
    return true;
};
const globalGoals = {
    generate: function (previousSegment) {
        const newBranches = [];
        if (!previousSegment.q.severed) {
            const template = function (direction, length, t, q) {
                return segmentFactory.usingDirection(previousSegment.r.end, direction, length, t, q);
            };
            const templateContinue = (direction) => template(direction, previousSegment.length(), 0, previousSegment.q);
            const templateBranch = (direction) => template(direction, config.mapGeneration.DEFAULT_SEGMENT_LENGTH, previousSegment.q.highway ? config.mapGeneration.NORMAL_BRANCH_TIME_DELAY_FROM_HIGHWAY : 0, null);
            const continueStraight = templateContinue(previousSegment.dir());
            const straightPop = heatmap.popOnRoad(continueStraight.r);
            if (previousSegment.q.highway) {
                const randomStraight = templateContinue(previousSegment.dir() + config.mapGeneration.RANDOM_STRAIGHT_ANGLE());
                const randomPop = heatmap.popOnRoad(randomStraight.r);
                let roadPop;
                if (randomPop > straightPop) {
                    newBranches.push(randomStraight);
                    roadPop = randomPop;
                }
                else {
                    newBranches.push(continueStraight);
                    roadPop = straightPop;
                }
                if (roadPop > config.mapGeneration.HIGHWAY_BRANCH_POPULATION_THRESHOLD) {
                    if (Math.random() < config.mapGeneration.HIGHWAY_BRANCH_PROBABILITY) {
                        const leftHighwayBranch = templateContinue(previousSegment.dir() - 90 + config.mapGeneration.RANDOM_BRANCH_ANGLE());
                        newBranches.push(leftHighwayBranch);
                    }
                    else if (Math.random() < config.mapGeneration.HIGHWAY_BRANCH_PROBABILITY) {
                        const rightHighwayBranch = templateContinue(previousSegment.dir() + 90 + config.mapGeneration.RANDOM_BRANCH_ANGLE());
                        newBranches.push(rightHighwayBranch);
                    }
                }
            }
            else if (straightPop > config.mapGeneration.NORMAL_BRANCH_POPULATION_THRESHOLD) {
                newBranches.push(continueStraight);
            }
            if (straightPop > config.mapGeneration.NORMAL_BRANCH_POPULATION_THRESHOLD) {
                if (Math.random() < config.mapGeneration.DEFAULT_BRANCH_PROBABILITY) {
                    const leftBranch = templateBranch(previousSegment.dir() - 90 + config.mapGeneration.RANDOM_BRANCH_ANGLE());
                    newBranches.push(leftBranch);
                }
                else if (Math.random() < config.mapGeneration.DEFAULT_BRANCH_PROBABILITY) {
                    const rightBranch = templateBranch(previousSegment.dir() + 90 + config.mapGeneration.RANDOM_BRANCH_ANGLE());
                    newBranches.push(rightBranch);
                }
            }
        }
        for (const branch of newBranches) {
            branch.setupBranchLinks = function () {
                previousSegment.links.f.forEach(link => {
                    branch.links.b.push(link);
                    link.linksForEndContaining(previousSegment).push(branch);
                });
                previousSegment.links.f.push(branch);
                return branch.links.b.push(previousSegment);
            };
        }
        return newBranches;
    }
};
exports.generate = function* (seed) {
    const debugData = {};
    Math.seedrandom(seed);
    noise.seed(Math.random());
    const priorityQ = [];
    const rootSegment = new Segment({ x: 0, y: 0 }, { x: config.mapGeneration.HIGHWAY_SEGMENT_LENGTH, y: 0 }, 0, { highway: true });
    const oppositeDirection = segmentFactory.fromExisting(rootSegment);
    const newEnd = {
        x: rootSegment.r.start.x - config.mapGeneration.HIGHWAY_SEGMENT_LENGTH,
        y: oppositeDirection.r.end.y
    };
    oppositeDirection.r.setEnd(newEnd);
    oppositeDirection.links.b.push(rootSegment);
    rootSegment.links.b.push(oppositeDirection);
    priorityQ.push(rootSegment);
    priorityQ.push(oppositeDirection);
    const segments = [];
    const qTree = new Quadtree_1.default(config.mapGeneration.QUADTREE_PARAMS, config.mapGeneration.QUADTREE_MAX_OBJECTS, config.mapGeneration.QUADTREE_MAX_LEVELS);
    while (priorityQ.length > 0 && segments.length < config.mapGeneration.SEGMENT_COUNT_LIMIT) {
        let minT = Infinity;
        let minT_i = 0;
        priorityQ.forEach((segment, i) => {
            if (segment.t < minT) {
                minT = segment.t;
                minT_i = i;
            }
        });
        const minSegment = priorityQ.splice(minT_i, 1)[0];
        const accepted = localConstraints(minSegment, segments, qTree, debugData);
        if (accepted) {
            if (minSegment.setupBranchLinks != null)
                minSegment.setupBranchLinks();
            segments.push(minSegment);
            qTree.insert(minSegment.limits());
            const newsegs = globalGoals.generate(minSegment);
            yield { segments: segments, newsegs: newsegs, priorityQ: priorityQ };
            newsegs.forEach(newSegment => {
                newSegment.t = minSegment.t + 1 + newSegment.t;
                priorityQ.push(newSegment);
            });
        }
    }
    let id = 0;
    for (const segment of segments)
        segment.id = id++;
    console.log(segments.length + " segments generated.");
    return { segments: segments, qTree: qTree, heatmap: heatmap, debugData: debugData };
};
console.time("generating");
const iterations = [...exports.generate(Math.random() + "bla")];
const stuff = iterations.pop();
console.timeEnd("generating");
const W = 1500, H = 900;
const bounds = function () {
    const lim = stuff.segments.map(s => s.limits());
    return {
        minx: Math.min(...lim.map(s => s.x)),
        miny: Math.min(...lim.map(s => s.y)),
        maxx: Math.max(...lim.map(s => s.x)),
        maxy: Math.max(...lim.map(s => s.y)),
    };
}();
const renderer = PIXI.autoDetectRenderer(W, H, { backgroundColor: 0xaaaaaa, antialias: true });
document.body.appendChild(renderer.view);
const graphics = new PIXI.Graphics();
const stage = new PIXI.Container();
stage.addChild(graphics);
stage.interactive = true;
const scale = Math.min(W / (bounds.maxx - bounds.minx), H / (bounds.maxy - bounds.miny));
stage.position.x = -bounds.minx * scale;
stage.position.y = -bounds.miny * scale;
stage.scale.x = scale;
stage.scale.y = scale;
stage.hitArea = new PIXI.Rectangle(-10000, -10000, 20000, 20000);
function renderSegment(seg, color = 0x000000) {
    graphics.lineStyle(seg.width * 10, color, 1);
    graphics.moveTo(seg.r.start.x, seg.r.start.y);
    graphics.lineTo(seg.r.end.x, seg.r.end.y);
}
stage.on('mousedown', onDragStart)
    .on('touchstart', onDragStart)
    .on('mouseup', onDragEnd)
    .on('mouseupoutside', onDragEnd)
    .on('touchend', onDragEnd)
    .on('touchendoutside', onDragEnd)
    .on('mousemove', onDragMove)
    .on('touchmove', onDragMove);
function onDragStart(event) {
    this.start = { x: event.data.global.x, y: event.data.global.y };
    this.dragging = true;
}
function onDragEnd() {
    this.dragging = false;
    this.data = null;
}
function onDragMove(event) {
    if (this.dragging) {
        this.position.x += event.data.global.x - this.start.x;
        this.position.y += event.data.global.y - this.start.y;
        this.start = { x: event.data.global.x, y: event.data.global.y };
    }
}
requestAnimationFrame(animate);
function animate() {
    const iter = iterations.length === 0 ? stuff : iterations.shift();
    graphics.clear();
    for (const seg of iter.segments)
        renderSegment(seg);
    for (const seg of iter.priorityQ)
        renderSegment(seg, 0xFF0000);
    requestAnimationFrame(animate);
    renderer.render(stage);
}
const glbl = window;
glbl.renderer = renderer;
glbl.graphics = graphics;
glbl.stage = stage;
glbl.bounds = bounds;
