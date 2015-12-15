"use strict"
// code adapted from http://www.tmwhere.com/city_generation.html
;
var perlin_1 = require('perlin');
var seedrandom_1 = require('seedrandom');
seedrandom_1.default;
var Quadtree_1 = require("./Quadtree");
var math_1 = require('./math');
var config_1 = require("./config");
class Segment {
    constructor(start, end) {
        let t = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];
        let q = arguments[3];

        this.start = start;
        this.end = end;
        /** meta-information relevant to global goals */
        this.q = {};
        /** links backwards and forwards */
        this.links = { b: [], f: [] };
        this.setupBranchLinks = undefined;
        const obj = this;
        for (const t in q) this.q[t] = q[t];
        this.width = this.q.highway ? config_1.config.HIGHWAY_SEGMENT_WIDTH : config_1.config.DEFAULT_SEGMENT_WIDTH;
        // representation of road
        this.t = t;
    }
    // clockwise direction
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
        // links are not copied using the preceding factory method.
        // copy link array for the split part, keeping references the same
        splitPart.links.b = this.links.b.slice(0);
        splitPart.links.f = this.links.f.slice(0);
        let firstSplit, fixLinks, secondSplit;
        // determine which links correspond to which end of the split segment
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
        let length = arguments.length <= 2 || arguments[2] === undefined ? config_1.config.DEFAULT_SEGMENT_LENGTH : arguments[2];
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
    if (config_1.config.IGNORE_CONFLICTS) return true;
    const action = {
        priority: 0, func: undefined, t: undefined
    };
    for (const other of qTree.retrieve(segment.limits())) {
        // intersection check
        if (action.priority <= 4) {
            const intersection = segment.intersectWith(other);
            if (intersection) {
                if (action.t == null || intersection.t < action.t) {
                    action.t = intersection.t;
                    action.priority = 4;
                    action.func = function () {
                        // if intersecting lines are too similar don't continue
                        if (math_1.math.minDegreeDifference(other.dir(), segment.dir()) < config_1.config.MINIMUM_INTERSECTION_DEVIATION) {
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
        // snap to crossing within radius check
        if (action.priority <= 3) {
            // current segment's start must have been checked to have been created.
            // other segment's start must have a corresponding end.
            if (math_1.math.length(segment.end, other.end) <= config_1.config.ROAD_SNAP_DISTANCE) {
                const point = other.end;
                action.priority = 3;
                action.func = function () {
                    segment.end = point;
                    segment.q.severed = true;
                    // update links of otherSegment corresponding to other.r.end
                    const links = other.startIsBackwards() ? other.links.f : other.links.b;
                    // check for duplicate lines, don't add if it exists
                    // this should be done before links are setup, to avoid having to undo that step
                    if (links.some(link => math_1.math.equalV(link.start, segment.end) && math_1.math.equalV(link.end, segment.start) || math_1.math.equalV(link.start, segment.start) && math_1.math.equalV(link.end, segment.end))) {
                        return false;
                    }
                    links.forEach(link => {
                        // pick links of remaining segments at junction corresponding to other.r.end
                        link.linksForEndContaining(other).push(segment);
                        // add junction segments to snapped segment
                        segment.links.f.push(link);
                    });
                    links.push(segment);
                    segment.links.f.push(other);
                    debugData.snaps.push({ x: point.x, y: point.y });
                    return true;
                };
            }
        }
        //  intersection within radius check
        if (action.priority <= 2) {
            var _math_1$math$distance = math_1.math.distanceToLine(segment.end, other.start, other.end);

            const distance2 = _math_1$math$distance.distance2;
            const pointOnLine = _math_1$math$distance.pointOnLine;
            const lineProj2 = _math_1$math$distance.lineProj2;
            const length2 = _math_1$math$distance.length2;

            if (distance2 < config_1.config.ROAD_SNAP_DISTANCE * config_1.config.ROAD_SNAP_DISTANCE && lineProj2 >= 0 && lineProj2 <= length2) {
                const point = pointOnLine;
                action.priority = 2;
                action.func = function () {
                    segment.end = point;
                    segment.q.severed = true;
                    // if intersecting lines are too closely aligned don't continue
                    if (math_1.math.minDegreeDifference(other.dir(), segment.dir()) < config_1.config.MINIMUM_INTERSECTION_DEVIATION) {
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
        // used for highways or going straight on a normal branch
        const templateContinue = direction => template(direction, previousSegment.length(), 0, previousSegment.q);
        // not using q, i.e. not highways
        const templateBranch = direction => template(direction, config_1.config.DEFAULT_SEGMENT_LENGTH, previousSegment.q.highway ? config_1.config.NORMAL_BRANCH_TIME_DELAY_FROM_HIGHWAY : 0, null);
        const continueStraight = templateContinue(0);
        const straightPop = exports.heatmap.popOnRoad(continueStraight);
        if (previousSegment.q.highway) {
            let maxPop = straightPop;
            let bestSegment = continueStraight;
            for (let i = 0; i < config_1.config.HIGHWAY_POPULATION_SAMPLE_SIZE; i++) {
                // TODO: https://github.com/phiresky/prosem-proto/blob/gh-pages/src/main.tsx#L524
                const curSegment = templateContinue(config_1.config.RANDOM_STRAIGHT_ANGLE());
                const curPop = exports.heatmap.popOnRoad(curSegment);
                if (curPop > maxPop) {
                    maxPop = curPop;
                    bestSegment = curSegment;
                }
            }
            newBranches.push(bestSegment);
            if (maxPop > config_1.config.HIGHWAY_BRANCH_POPULATION_THRESHOLD) {
                if (Math.random() < config_1.config.HIGHWAY_BRANCH_PROBABILITY) {
                    newBranches.push(templateContinue(-90 + config_1.config.RANDOM_BRANCH_ANGLE()));
                } else if (Math.random() < config_1.config.HIGHWAY_BRANCH_PROBABILITY) {
                    newBranches.push(templateContinue(+90 + config_1.config.RANDOM_BRANCH_ANGLE()));
                }
            }
        } else if (straightPop > config_1.config.NORMAL_BRANCH_POPULATION_THRESHOLD) {
            newBranches.push(continueStraight);
        }
        if (!config_1.config.ONLY_HIGHWAYS) if (straightPop > config_1.config.NORMAL_BRANCH_POPULATION_THRESHOLD) {
            if (Math.random() < config_1.config.DEFAULT_BRANCH_PROBABILITY) {
                newBranches.push(templateBranch(-90 + config_1.config.RANDOM_BRANCH_ANGLE()));
            } else if (Math.random() < config_1.config.DEFAULT_BRANCH_PROBABILITY) {
                newBranches.push(templateBranch(+90 + config_1.config.RANDOM_BRANCH_ANGLE()));
            }
        }
    }
    for (const branch of newBranches) {
        // setup links between each current branch and each existing branch stemming from the previous segment
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
        // benchmarked - linear array as fast or faster than actual min-heap
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
    // setup first segments in queue
    const rootSegment = new Segment({ x: 0, y: 0 }, { x: config_1.config.HIGHWAY_SEGMENT_LENGTH, y: 0 }, 0, { highway: !config_1.config.START_WITH_NORMAL_STREETS });
    if (!config_1.config.TWO_SEGMENTS_INITIALLY) return [rootSegment];
    const oppositeDirection = rootSegment.clone();
    const newEnd = {
        x: rootSegment.start.x - config_1.config.HIGHWAY_SEGMENT_LENGTH,
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
    const qTree = new Quadtree_1.Quadtree(config_1.config.QUADTREE_PARAMS, config_1.config.QUADTREE_MAX_OBJECTS, config_1.config.QUADTREE_MAX_LEVELS);
    while (!priorityQ.empty() && segments.length < config_1.config.SEGMENT_COUNT_LIMIT) {
        generationStep(priorityQ, segments, qTree);
        yield { segments: segments, priorityQ: priorityQ.elements, qTree: qTree };
    }
    console.log(segments.length + " segments generated.");
    yield { segments: segments, qTree: qTree, priorityQ: priorityQ.elements };
}
exports.generate = generate;
;
window._mapgen = this;

