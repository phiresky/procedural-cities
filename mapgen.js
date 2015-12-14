"use strict";

var perlin_1 = require('perlin');
var seedrandom_1 = require('seedrandom');
seedrandom_1.default;
var Quadtree_1 = require("./Quadtree");
var math_1 = require('./math');
exports.config = {
    DEFAULT_SEGMENT_LENGTH: 300, HIGHWAY_SEGMENT_LENGTH: 400,
    DEFAULT_SEGMENT_WIDTH: 6, HIGHWAY_SEGMENT_WIDTH: 16,
    RANDOM_BRANCH_ANGLE: function () {
        return math_1.math.randomNearCubic(3);
    },
    RANDOM_STRAIGHT_ANGLE: function () {
        return math_1.math.randomNearCubic(15);
    },
    DEFAULT_BRANCH_PROBABILITY: .4, HIGHWAY_BRANCH_PROBABILITY: .02,
    HIGHWAY_BRANCH_POPULATION_THRESHOLD: .1, NORMAL_BRANCH_POPULATION_THRESHOLD: .1,
    NORMAL_BRANCH_TIME_DELAY_FROM_HIGHWAY: 10, MINIMUM_INTERSECTION_DEVIATION: 30,
    SEGMENT_COUNT_LIMIT: 5000, ROAD_SNAP_DISTANCE: 50,
    HEAT_MAP_PIXEL_DIM: 25, DRAW_HEATMAP: false,
    QUADTREE_PARAMS: { x: -2E4, y: -2E4, width: 4E4, height: 4E4 },
    QUADTREE_MAX_OBJECTS: 10, QUADTREE_MAX_LEVELS: 10, DEBUG: false,
    ONLY_HIGHWAYS: false,
    ARROWHEAD_SIZE: 0,
    DRAW_CIRCLE_ON_SEGMENT_BASE: 0,
    IGNORE_CONFLICTS: false,
    ITERATION_SPEEDUP: 0.01,
    ITERATIONS_PER_SECOND: 100,
    TARGET_ZOOM: 0.9,
    RESTART_AFTER_SECONDS: -1,
    RESEED_AFTER_RESTART: true,
    TWO_SEGMENTS_INITIALLY: true,
    TRANSPARENT: false, BACKGROUND_COLOR: 0xFFFFFF,
    SEED: null
};
class Segment {
    constructor(start, end) {
        let t = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];
        let q = arguments[3];

        this.start = start;
        this.end = end;
        this.q = {};
        this.links = { b: [], f: [] };
        this.setupBranchLinks = undefined;
        const obj = this;
        for (const t in q) this.q[t] = q[t];
        this.width = this.q.highway ? exports.config.HIGHWAY_SEGMENT_WIDTH : exports.config.DEFAULT_SEGMENT_WIDTH;
        this.t = t;
    }
    dir() {
        const vector = math_1.math.subtractPoints(this.end, this.start);
        return -1 * math_1.math.sign(math_1.math.crossProduct({ x: 0, y: 1 }, vector)) * math_1.math.angleBetween({ x: 0, y: 1 }, vector);
    }

    length() {
        return math_1.math.length(this.start, this.end);
    }

    limits() {
        return {
            x: Math.min(this.start.x, this.end.x),
            y: Math.min(this.start.y, this.end.y),
            width: Math.abs(this.start.x - this.end.x),
            height: Math.abs(this.start.y - this.end.y)
        };
    }
    debugLinks() {
        this.q.color = 0x00FF00;
        this.links.b.forEach(backwards => backwards.q.color = 0xFF0000);
        this.links.f.forEach(forwards => forwards.q.color = 0x0000FF);
    }

    startIsBackwards() {
        if (this.links.b.length > 0) {
            return math_1.math.equalV(this.links.b[0].start, this.start) || math_1.math.equalV(this.links.b[0].end, this.start);
        } else {
            return math_1.math.equalV(this.links.f[0].start, this.end) || math_1.math.equalV(this.links.f[0].end, this.end);
        }
    }

    linksForEndContaining(segment) {
        if (this.links.b.indexOf(segment) !== -1) {
            return this.links.b;
        } else if (this.links.f.indexOf(segment) !== -1) {
            return this.links.f;
        } else {
            return void 0;
        }
    }

    split(point, segment, segmentList, qTree) {
        const splitPart = this.clone();
        const startIsBackwards = this.startIsBackwards();
        segmentList.push(splitPart);
        qTree.insert(splitPart.limits(), splitPart);
        splitPart.end = point;
        this.start = point;
        splitPart.links.b = this.links.b.slice(0);
        splitPart.links.f = this.links.f.slice(0);
        let firstSplit, fixLinks, secondSplit;
        if (startIsBackwards) {
            firstSplit = splitPart;
            secondSplit = this;
            fixLinks = splitPart.links.b;
        } else {
            firstSplit = this;
            secondSplit = splitPart;
            fixLinks = splitPart.links.f;
        }
        fixLinks.forEach(link => {
            var index = link.links.b.indexOf(this);
            if (index !== -1) {
                link.links.b[index] = splitPart;
            } else {
                index = link.links.f.indexOf(this);
                link.links.f[index] = splitPart;
            }
        });
        firstSplit.links.f = [segment, secondSplit];
        secondSplit.links.b = [segment, firstSplit];
        segment.links.f.push(firstSplit);
        segment.links.f.push(secondSplit);
    }

    clone() {
        let t = arguments.length <= 0 || arguments[0] === undefined ? this.t : arguments[0];
        let q = arguments.length <= 1 || arguments[1] === undefined ? this.q : arguments[1];

        return new Segment(this.start, this.end, t, q);
    }
    static usingDirection(start) {
        let dir = arguments.length <= 1 || arguments[1] === undefined ? 90 : arguments[1];
        let length = arguments.length <= 2 || arguments[2] === undefined ? exports.config.DEFAULT_SEGMENT_LENGTH : arguments[2];
        let t = arguments[3];
        let q = arguments[4];

        var end = {
            x: start.x + length * Math.sin(dir * Math.PI / 180),
            y: start.y + length * Math.cos(dir * Math.PI / 180)
        };
        return new Segment(start, end, t, q);
    }
    intersectWith(s) {
        return math_1.math.doLineSegmentsIntersect(this.start, this.end, s.start, s.end, true);
    }
}
exports.Segment = Segment;
;
exports.heatmap = {
    popOnRoad: function (r) {
        return (this.populationAt(r.start.x, r.start.y) + this.populationAt(r.end.x, r.end.y)) / 2;
    },
    populationAt: function (x, y) {
        const value1 = (perlin_1.noise.simplex2(x / 10000, y / 10000) + 1) / 2;
        const value2 = (perlin_1.noise.simplex2(x / 20000 + 500, y / 20000 + 500) + 1) / 2;
        const value3 = (perlin_1.noise.simplex2(x / 20000 + 1000, y / 20000 + 1000) + 1) / 2;
        return Math.pow((value1 * value2 + value3) / 2, 2);
    }
};
class DebugData {
    constructor() {
        this.snaps = [];
        this.intersectionsRadius = [];
        this.intersections = [];
    }
}
let debugData = new DebugData();
const localConstraints = function (segment, segments, qTree) {
    if (exports.config.IGNORE_CONFLICTS) return true;
    const action = {
        priority: 0, func: undefined, t: undefined
    };
    for (const other of qTree.retrieve(segment.limits())) {
        if (action.priority <= 4) {
            const intersection = segment.intersectWith(other);
            if (intersection) {
                if (action.t == null || intersection.t < action.t) {
                    action.t = intersection.t;
                    action.priority = 4;
                    action.func = function () {
                        if (math_1.math.minDegreeDifference(other.dir(), segment.dir()) < exports.config.MINIMUM_INTERSECTION_DEVIATION) {
                            return false;
                        }
                        other.split(intersection, segment, segments, qTree);
                        segment.end = intersection;
                        segment.q.severed = true;
                        debugData.intersections.push(intersection);
                        return true;
                    };
                }
            }
        }
        if (action.priority <= 3) {
            if (math_1.math.length(segment.end, other.end) <= exports.config.ROAD_SNAP_DISTANCE) {
                const point = other.end;
                action.priority = 3;
                action.func = function () {
                    segment.end = point;
                    segment.q.severed = true;
                    const links = other.startIsBackwards() ? other.links.f : other.links.b;
                    if (links.some(link => math_1.math.equalV(link.start, segment.end) && math_1.math.equalV(link.end, segment.start) || math_1.math.equalV(link.start, segment.start) && math_1.math.equalV(link.end, segment.end))) {
                        return false;
                    }
                    links.forEach(link => {
                        link.linksForEndContaining(other).push(segment);
                        segment.links.f.push(link);
                    });
                    links.push(segment);
                    segment.links.f.push(other);
                    debugData.snaps.push({ x: point.x, y: point.y });
                    return true;
                };
            }
        }
        if (action.priority <= 2) {
            var _math_1$math$distance = math_1.math.distanceToLine(segment.end, other.start, other.end);

            const distance2 = _math_1$math$distance.distance2;
            const pointOnLine = _math_1$math$distance.pointOnLine;
            const lineProj2 = _math_1$math$distance.lineProj2;
            const length2 = _math_1$math$distance.length2;

            if (distance2 < exports.config.ROAD_SNAP_DISTANCE * exports.config.ROAD_SNAP_DISTANCE && lineProj2 >= 0 && lineProj2 <= length2) {
                const point = pointOnLine;
                action.priority = 2;
                action.func = function () {
                    segment.end = point;
                    segment.q.severed = true;
                    if (math_1.math.minDegreeDifference(other.dir(), segment.dir()) < exports.config.MINIMUM_INTERSECTION_DEVIATION) {
                        return false;
                    }
                    other.split(point, segment, segments, qTree);
                    debugData.intersectionsRadius.push({ x: point.x, y: point.y });
                    return true;
                };
            }
        }
    }
    if (action.func) return action.func();
    return true;
};
function globalGoalsGenerate(previousSegment) {
    const newBranches = [];
    if (!previousSegment.q.severed) {
        const template = (direction, length, t, q) => Segment.usingDirection(previousSegment.end, previousSegment.dir() + direction, length, t, q);
        const templateContinue = direction => template(direction, previousSegment.length(), 0, previousSegment.q);
        const templateBranch = direction => template(direction, exports.config.DEFAULT_SEGMENT_LENGTH, previousSegment.q.highway ? exports.config.NORMAL_BRANCH_TIME_DELAY_FROM_HIGHWAY : 0, null);
        const continueStraight = templateContinue(0);
        const straightPop = exports.heatmap.popOnRoad(continueStraight);
        if (previousSegment.q.highway) {
            const randomStraight = templateContinue(exports.config.RANDOM_STRAIGHT_ANGLE());
            const randomPop = exports.heatmap.popOnRoad(randomStraight);
            let roadPop;
            if (randomPop > straightPop) {
                newBranches.push(randomStraight);
                roadPop = randomPop;
            } else {
                newBranches.push(continueStraight);
                roadPop = straightPop;
            }
            if (roadPop > exports.config.HIGHWAY_BRANCH_POPULATION_THRESHOLD) {
                if (Math.random() < exports.config.HIGHWAY_BRANCH_PROBABILITY) {
                    newBranches.push(templateContinue(-90 + exports.config.RANDOM_BRANCH_ANGLE()));
                } else if (Math.random() < exports.config.HIGHWAY_BRANCH_PROBABILITY) {
                    newBranches.push(templateContinue(+90 + exports.config.RANDOM_BRANCH_ANGLE()));
                }
            }
        } else if (straightPop > exports.config.NORMAL_BRANCH_POPULATION_THRESHOLD) {
            newBranches.push(continueStraight);
        }
        if (!exports.config.ONLY_HIGHWAYS) if (straightPop > exports.config.NORMAL_BRANCH_POPULATION_THRESHOLD) {
            if (Math.random() < exports.config.DEFAULT_BRANCH_PROBABILITY) {
                newBranches.push(templateBranch(-90 + exports.config.RANDOM_BRANCH_ANGLE()));
            } else if (Math.random() < exports.config.DEFAULT_BRANCH_PROBABILITY) {
                newBranches.push(templateBranch(+90 + exports.config.RANDOM_BRANCH_ANGLE()));
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
class PriorityQueue {
    constructor(getPriority) {
        this.getPriority = getPriority;
        this.elements = [];
    }
    enqueue() {
        this.elements.push(...arguments);
    }
    dequeue() {
        let minT = Infinity;
        let minT_i = 0;
        this.elements.forEach((segment, i) => {
            const t = this.getPriority(segment);
            if (t < minT) {
                minT = t;
                minT_i = i;
            }
        });
        return this.elements.splice(minT_i, 1)[0];
    }
    empty() {
        return this.elements.length === 0;
    }
}
function makeInitialSegments() {
    const rootSegment = new Segment({ x: 0, y: 0 }, { x: exports.config.HIGHWAY_SEGMENT_LENGTH, y: 0 }, 0, { highway: true });
    if (!exports.config.TWO_SEGMENTS_INITIALLY) return [rootSegment];
    const oppositeDirection = rootSegment.clone();
    const newEnd = {
        x: rootSegment.start.x - exports.config.HIGHWAY_SEGMENT_LENGTH,
        y: oppositeDirection.end.y
    };
    oppositeDirection.end = newEnd;
    oppositeDirection.links.b.push(rootSegment);
    rootSegment.links.b.push(oppositeDirection);
    return [rootSegment, oppositeDirection];
}
function generationStep(priorityQ, segments, qTree) {
    const minSegment = priorityQ.dequeue();
    const accepted = localConstraints(minSegment, segments, qTree);
    if (accepted) {
        if (minSegment.setupBranchLinks != null) minSegment.setupBranchLinks();
        segments.push(minSegment);
        qTree.insert(minSegment.limits(), minSegment);
        globalGoalsGenerate(minSegment).forEach(newSegment => {
            newSegment.t = minSegment.t + 1 + newSegment.t;
            priorityQ.enqueue(newSegment);
        });
    }
}
function* generate(seed) {
    Math.seedrandom(seed);
    perlin_1.noise.seed(Math.random());
    const priorityQ = new PriorityQueue(s => s.t);
    priorityQ.enqueue(...makeInitialSegments());
    const segments = [];
    const qTree = new Quadtree_1.Quadtree(exports.config.QUADTREE_PARAMS, exports.config.QUADTREE_MAX_OBJECTS, exports.config.QUADTREE_MAX_LEVELS);
    while (!priorityQ.empty() && segments.length < exports.config.SEGMENT_COUNT_LIMIT) {
        generationStep(priorityQ, segments, qTree);
        yield { segments: segments, priorityQ: priorityQ.elements, qTree: qTree };
    }
    console.log(segments.length + " segments generated.");
    yield { segments: segments, qTree: qTree, priorityQ: priorityQ.elements };
}
exports.generate = generate;
;
window._mapgen = this;

