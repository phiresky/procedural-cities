"use strict";
var PIXI = require('pixi.js');
var perlin = require('perlin');
var noise = perlin.noise;
var Quadtree_1 = require("./Quadtree");
var seedrandom = require('seedrandom');
seedrandom;
var math = {
    subtractPoints: function (p1, p2) { return ({ x: p1.x - p2.x, y: p1.y - p2.y }); },
    crossProduct: function (a, b) { return a.x * b.y - a.y * b.x; },
    doLineSegmentsIntersect: function (a, b, p, d, c) {
        b = math.subtractPoints(b, a);
        d = math.subtractPoints(d, p);
        var f = math.crossProduct(math.subtractPoints(p, a), b);
        var k = math.crossProduct(b, d);
        if (0 == f && 0 == k || 0 == k)
            return null;
        f /= k;
        var e = math.crossProduct(math.subtractPoints(p, a), d) / k;
        var intersect = c ? 0.001 < e && (0.999 > e && (0.001 < f && 0.999 > f)) : 0 <= e && (1 >= e && (0 <= f && 1 >= f));
        return intersect ? { x: a.x + e * b.x, y: a.y + e * b.y, t: e } : null;
    },
    minDegreeDifference: function (val1, val2) {
        var bottom = Math.abs(val1 - val2) % 180;
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
        var angleRad = Math.acos((a.x * b.x + a.y * b.y) / (math.lengthV(a) * math.lengthV(b)));
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
        var proj = math.project(d, e);
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
var randomWat = function (b) {
    var d = Math.pow(Math.abs(b), 3);
    var c = 0;
    while (0 === c || Math.random() < Math.pow(Math.abs(c), 3) / d) {
        c = math.randomRange(-b, b);
    }
    return c;
};
var config = {
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
var Segment = (function () {
    function Segment(start, end, t, q) {
        if (t === void 0) { t = 0; }
        if (q === void 0) { q = { highway: false }; }
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
        var obj = this;
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
        _a = q.highway ? [1200, 12] : [800, 6], this.maxSpeed = _a[0], this.capacity = _a[1];
        var _a;
    }
    Segment.prototype.limits = function () {
        return {
            x: Math.min(this.start.x, this.end.x),
            y: Math.min(this.start.y, this.end.y),
            width: Math.abs(this.start.x - this.end.x),
            height: Math.abs(this.start.y - this.end.y),
            o: this
        };
    };
    Segment.prototype.currentSpeed = function () {
        return Math.min(config.gameLogic.MIN_SPEED_PROPORTION, 1 - Math.max(0, this.users.length - 1) / this.capacity) * this.maxSpeed;
    };
    ;
    Segment.prototype.dir = function () {
        if (this.dirRevision !== this.roadRevision) {
            this.dirRevision = this.roadRevision;
            var vector = math.subtractPoints(this.r.end, this.r.start);
            this.cachedDir = -1 * math.sign(math.crossProduct({ x: 0, y: 1 }, vector)) * math.angleBetween({ x: 0, y: 1 }, vector);
        }
        return this.cachedDir;
    };
    ;
    Segment.prototype.length = function () {
        if (this.lengthRevision !== this.roadRevision) {
            this.lengthRevision = this.roadRevision;
            this.cachedLength = math.length(this.r.start, this.r.end);
        }
        return this.cachedLength;
    };
    ;
    Segment.prototype.debugLinks = function () {
        this.q.color = 0x00FF00;
        this.links.b.forEach(function (backwards) { return backwards.q.color = 0xFF0000; });
        this.links.f.forEach(function (forwards) { return forwards.q.color = 0x0000FF; });
    };
    ;
    Segment.prototype.startIsBackwards = function () {
        if (this.links.b.length > 0) {
            return math.equalV(this.links.b[0].r.start, this.r.start) || math.equalV(this.links.b[0].r.end, this.r.start);
        }
        else {
            return math.equalV(this.links.f[0].r.start, this.r.end) || math.equalV(this.links.f[0].r.end, this.r.end);
        }
    };
    ;
    Segment.prototype.cost = function () {
        return this.length() / this.currentSpeed();
    };
    ;
    Segment.prototype.costTo = function (other, fromFraction) {
        var segmentEnd = this.endContaining(other);
        var res = 0.5;
        if (fromFraction != null) {
            if (segmentEnd === Segment.End.START)
                res = fromFraction;
            else
                res = 1 - fromFraction;
        }
        return this.cost() * res;
    };
    ;
    Segment.prototype.neighbours = function () {
        return this.links.f.concat(this.links.b);
    };
    ;
    Segment.prototype.endContaining = function (segment) {
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
    };
    ;
    Segment.prototype.linksForEndContaining = function (segment) {
        if (this.links.b.indexOf(segment) !== -1) {
            return this.links.b;
        }
        else if (this.links.f.indexOf(segment) !== -1) {
            return this.links.f;
        }
        else {
            return void 0;
        }
    };
    ;
    Segment.prototype.split = function (point, segment, segmentList, qTree) {
        var _this = this;
        var splitPart = segmentFactory.fromExisting(this);
        var startIsBackwards = this.startIsBackwards();
        segmentList.push(splitPart);
        qTree.insert(splitPart.limits());
        splitPart.r.setEnd(point);
        this.r.setStart(point);
        splitPart.links.b = this.links.b.slice(0);
        splitPart.links.f = this.links.f.slice(0);
        var firstSplit, fixLinks, secondSplit;
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
        fixLinks.forEach(function (link) {
            var index = link.links.b.indexOf(_this);
            if (index !== -1) {
                link.links.b[index] = splitPart;
            }
            else {
                index = link.links.f.indexOf(_this);
                link.links.f[index] = splitPart;
            }
        });
        firstSplit.links.f = [segment, secondSplit];
        secondSplit.links.b = [segment, firstSplit];
        segment.links.f.push(firstSplit);
        segment.links.f.push(secondSplit);
    };
    ;
    Segment.End = { START: "start", END: "end" };
    return Segment;
}());
exports.Segment = Segment;
var segmentFactory = {
    fromExisting: function (segment, t, r, q) {
        if (t === void 0) { t = segment.t; }
        if (r === void 0) { r = segment.r; }
        if (q === void 0) { q = segment.q; }
        return new Segment(r.start, r.end, t, q);
    },
    usingDirection: function (start, dir, length, t, q) {
        if (dir === void 0) { dir = 90; }
        if (length === void 0) { length = config.mapGeneration.DEFAULT_SEGMENT_LENGTH; }
        var end = {
            x: start.x + length * Math.sin(dir * Math.PI / 180),
            y: start.y + length * Math.cos(dir * Math.PI / 180)
        };
        return new Segment(start, end, t, q);
    }
};
var heatmap = {
    popOnRoad: function (r) {
        return (this.populationAt(r.start.x, r.start.y) + this.populationAt(r.end.x, r.end.y)) / 2;
    },
    populationAt: function (x, y) {
        var value1 = (noise.simplex2(x / 10000, y / 10000) + 1) / 2;
        var value2 = (noise.simplex2(x / 20000 + 500, y / 20000 + 500) + 1) / 2;
        var value3 = (noise.simplex2(x / 20000 + 1000, y / 20000 + 1000) + 1) / 2;
        return Math.pow((value1 * value2 + value3) / 2, 2);
    }
};
function doRoadSegmentsIntersect(r1, r2) {
    return math.doLineSegmentsIntersect(r1.start, r1.end, r2.start, r2.end, true);
}
;
var localConstraints = function (segment, segments, qTree, debugData) {
    var action = {
        priority: 0,
        func: undefined,
        t: undefined
    };
    var _loop_1 = function(match) {
        var other = match.o;
        if (action.priority <= 4) {
            var intersection = doRoadSegmentsIntersect(segment.r, other.r);
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
                var point = other.r.end;
                action.priority = 3;
                action.func = function () {
                    segment.r.end = point;
                    segment.q.severed = true;
                    var links = other.startIsBackwards() ? other.links.f : other.links.b;
                    if (links.some(function (link) { return (math.equalV(link.r.start, segment.r.end) && math.equalV(link.r.end, segment.r.start)) || (math.equalV(link.r.start, segment.r.start) && math.equalV(link.r.end, segment.r.end)); })) {
                        return false;
                    }
                    links.forEach(function (link) {
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
            var _a = math.distanceToLine(segment.r.end, other.r.start, other.r.end), distance2 = _a.distance2, pointOnLine = _a.pointOnLine, lineProj2 = _a.lineProj2, length2 = _a.length2;
            if (distance2 < config.mapGeneration.ROAD_SNAP_DISTANCE * config.mapGeneration.ROAD_SNAP_DISTANCE && lineProj2 >= 0 && lineProj2 <= length2) {
                var point = pointOnLine;
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
    };
    for (var _i = 0, _b = qTree.retrieve(segment.limits()); _i < _b.length; _i++) {
        var match = _b[_i];
        _loop_1(match);
    }
    if (action.func)
        return action.func();
    return true;
};
var globalGoals = {
    generate: function (previousSegment) {
        var newBranches = [];
        if (!previousSegment.q.severed) {
            var template = function (direction, length, t, q) {
                return segmentFactory.usingDirection(previousSegment.r.end, direction, length, t, q);
            };
            var templateContinue = function (direction) { return template(direction, previousSegment.length(), 0, previousSegment.q); };
            var templateBranch = function (direction) { return template(direction, config.mapGeneration.DEFAULT_SEGMENT_LENGTH, previousSegment.q.highway ? config.mapGeneration.NORMAL_BRANCH_TIME_DELAY_FROM_HIGHWAY : 0, null); };
            var continueStraight = templateContinue(previousSegment.dir());
            var straightPop = heatmap.popOnRoad(continueStraight.r);
            if (previousSegment.q.highway) {
                var randomStraight = templateContinue(previousSegment.dir() + config.mapGeneration.RANDOM_STRAIGHT_ANGLE());
                var randomPop = heatmap.popOnRoad(randomStraight.r);
                var roadPop;
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
                        var leftHighwayBranch = templateContinue(previousSegment.dir() - 90 + config.mapGeneration.RANDOM_BRANCH_ANGLE());
                        newBranches.push(leftHighwayBranch);
                    }
                    else if (Math.random() < config.mapGeneration.HIGHWAY_BRANCH_PROBABILITY) {
                        var rightHighwayBranch = templateContinue(previousSegment.dir() + 90 + config.mapGeneration.RANDOM_BRANCH_ANGLE());
                        newBranches.push(rightHighwayBranch);
                    }
                }
            }
            else if (straightPop > config.mapGeneration.NORMAL_BRANCH_POPULATION_THRESHOLD) {
                newBranches.push(continueStraight);
            }
            if (straightPop > config.mapGeneration.NORMAL_BRANCH_POPULATION_THRESHOLD) {
                if (Math.random() < config.mapGeneration.DEFAULT_BRANCH_PROBABILITY) {
                    var leftBranch = templateBranch(previousSegment.dir() - 90 + config.mapGeneration.RANDOM_BRANCH_ANGLE());
                    newBranches.push(leftBranch);
                }
                else if (Math.random() < config.mapGeneration.DEFAULT_BRANCH_PROBABILITY) {
                    var rightBranch = templateBranch(previousSegment.dir() + 90 + config.mapGeneration.RANDOM_BRANCH_ANGLE());
                    newBranches.push(rightBranch);
                }
            }
        }
        var _loop_2 = function(branch) {
            branch.setupBranchLinks = function () {
                previousSegment.links.f.forEach(function (link) {
                    branch.links.b.push(link);
                    link.linksForEndContaining(previousSegment).push(branch);
                });
                previousSegment.links.f.push(branch);
                return branch.links.b.push(previousSegment);
            };
        };
        for (var _i = 0, newBranches_1 = newBranches; _i < newBranches_1.length; _i++) {
            var branch = newBranches_1[_i];
            _loop_2(branch);
        }
        return newBranches;
    }
};
exports.generate = function (seed) {
    var debugData = {};
    Math.seedrandom(seed);
    noise.seed(Math.random());
    var priorityQ = [];
    var rootSegment = new Segment({ x: 0, y: 0 }, { x: config.mapGeneration.HIGHWAY_SEGMENT_LENGTH, y: 0 }, 0, { highway: true });
    var oppositeDirection = segmentFactory.fromExisting(rootSegment);
    var newEnd = {
        x: rootSegment.r.start.x - config.mapGeneration.HIGHWAY_SEGMENT_LENGTH,
        y: oppositeDirection.r.end.y
    };
    oppositeDirection.r.setEnd(newEnd);
    oppositeDirection.links.b.push(rootSegment);
    rootSegment.links.b.push(oppositeDirection);
    priorityQ.push(rootSegment);
    priorityQ.push(oppositeDirection);
    var segments = [];
    var qTree = new Quadtree_1.default(config.mapGeneration.QUADTREE_PARAMS, config.mapGeneration.QUADTREE_MAX_OBJECTS, config.mapGeneration.QUADTREE_MAX_LEVELS);
    var _loop_3 = function() {
        var minT = Infinity;
        var minT_i = 0;
        priorityQ.forEach(function (segment, i) {
            if (segment.t < minT) {
                minT = segment.t;
                minT_i = i;
            }
        });
        var minSegment = priorityQ.splice(minT_i, 1)[0];
        var accepted = localConstraints(minSegment, segments, qTree, debugData);
        if (accepted) {
            if (minSegment.setupBranchLinks != null)
                minSegment.setupBranchLinks();
            segments.push(minSegment);
            qTree.insert(minSegment.limits());
            globalGoals.generate(minSegment).forEach(function (newSegment) {
                newSegment.t = minSegment.t + 1 + newSegment.t;
                priorityQ.push(newSegment);
            });
        }
    };
    while (priorityQ.length > 0 && segments.length < config.mapGeneration.SEGMENT_COUNT_LIMIT) {
        _loop_3();
    }
    var id = 0;
    for (var _i = 0, segments_1 = segments; _i < segments_1.length; _i++) {
        var segment = segments_1[_i];
        segment.id = id++;
    }
    console.log(segments.length + " segments generated.");
    return { segments: segments, qTree: qTree, heatmap: heatmap, debugData: debugData };
};
console.time("generating");
var stuff = exports.generate(Math.random() + "bla");
console.timeEnd("generating");
var W = 1500, H = 900;
var bounds = function () {
    var lim = stuff.segments.map(function (s) { return s.limits(); });
    return {
        minx: Math.min.apply(Math, lim.map(function (s) { return s.x; })),
        miny: Math.min.apply(Math, lim.map(function (s) { return s.y; })),
        maxx: Math.max.apply(Math, lim.map(function (s) { return s.x; })),
        maxy: Math.max.apply(Math, lim.map(function (s) { return s.y; })),
    };
}();
var renderer = PIXI.autoDetectRenderer(W, H, { backgroundColor: 0xaaaaaa, antialias: true });
document.body.appendChild(renderer.view);
var graphics = new PIXI.Graphics();
var stage = new PIXI.Container();
stage.addChild(graphics);
stage.interactive = true;
var scale = Math.min(W / (bounds.maxx - bounds.minx), H / (bounds.maxy - bounds.miny));
stage.position.x = -bounds.minx * scale;
stage.position.y = -bounds.miny * scale;
stage.scale.x = scale;
stage.scale.y = scale;
stage.hitArea = new PIXI.Rectangle(0, 0, 10000, 10000);
function renderSegment(seg) {
    graphics.lineStyle(seg.width * 10, 0x000000, 1);
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
    for (var _i = 0, _a = stuff.segments.splice(0, 10); _i < _a.length; _i++) {
        var seg = _a[_i];
        renderSegment(seg);
    }
    requestAnimationFrame(animate);
    renderer.render(stage);
}
var glbl = window;
glbl.renderer = renderer;
glbl.graphics = graphics;
glbl.stage = stage;
glbl.bounds = bounds;
