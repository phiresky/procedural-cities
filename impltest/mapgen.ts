
// code adapted from http://www.tmwhere.com/city_generation.html
import perlin = require('perlin');
const noise = perlin.noise;
import seedrandom from 'seedrandom';
import {Bounds, Quadtree} from "./Quadtree";
import {Point, math} from './math';

seedrandom;

interface DistanceInfo {
    distance2: number;
    pointOnLine: Point;
    lineProj2: number;
    length2: number;
}

const randomNearCubic = function(b: number) {
    var d = Math.pow(Math.abs(b), 3);
    var c = 0;
    while (c === 0 || Math.random() < Math.pow(Math.abs(c), 3) / d) {
        c = math.randomRange(-b, b);
    }
    return c;
};
const config = {
    mapGeneration: {
        DEFAULT_SEGMENT_LENGTH: 300, HIGHWAY_SEGMENT_LENGTH: 400,
        DEFAULT_SEGMENT_WIDTH: 6, HIGHWAY_SEGMENT_WIDTH: 16,
        RANDOM_BRANCH_ANGLE: function() { return randomNearCubic(3) },
        RANDOM_STRAIGHT_ANGLE: function() { return randomNearCubic(15) },
        DEFAULT_BRANCH_PROBABILITY: .4, HIGHWAY_BRANCH_PROBABILITY: .02,
        HIGHWAY_BRANCH_POPULATION_THRESHOLD: .1, NORMAL_BRANCH_POPULATION_THRESHOLD: .1,
        NORMAL_BRANCH_TIME_DELAY_FROM_HIGHWAY: 5, MINIMUM_INTERSECTION_DEVIATION: 30,
        SEGMENT_COUNT_LIMIT: 10000, DEBUG_DELAY: 0, ROAD_SNAP_DISTANCE: 50,
        HEAT_MAP_PIXEL_DIM: 50, DRAW_HEATMAP: !1,
        QUADTREE_PARAMS: { x: -2E4, y: -2E4, width: 4E4, height: 4E4 },
        QUADTREE_MAX_OBJECTS: 10, QUADTREE_MAX_LEVELS: 10, DEBUG: !1
    },
    gameLogic: {
        SELECT_PAN_THRESHOLD: 50, SELECTION_RANGE: 50, DEFAULT_PICKUP_RANGE: 150,
        DEFAULT_BOOST_FACTOR: 2, DEFAULT_BOOST_DURATION: 2,
        MIN_LENGTH_FOR_VEHICLE_ARRIVAL: .1, DEFAULT_CARGO_CAPACITY: 1, MIN_SPEED_PROPORTION: .1
    }
};
interface Road {
    start: Point;
    end: Point;
    setStart: (p: Point) => void;
    setEnd: (p: Point) => void;
}
interface MetaInfo {
    highway?: boolean, color?: number, severed?: boolean
}
interface Intersection {
    x: number, t: number, y: number
}
export class Segment {
    limitsRevision: number = undefined;
    cachedDir: number = void 0;
    cachedLength: number = void 0;
    limits(): Bounds {
        return {
            x: Math.min(this.start.x, this.end.x),
            y: Math.min(this.start.y, this.end.y),
            width: Math.abs(this.start.x - this.end.x),
            height: Math.abs(this.start.y - this.end.y)
        };
    }
    roadRevision = 0;
    dirRevision: number = undefined;
    lengthRevision: number = void 0;
    r: Road;
    /** time-step delay before this road is evaluated */
    t: number;
    /** meta-information relevant to global goals */
    q: MetaInfo = {};
    /** links backwards and forwards */
    links = { b: [] as Segment[], f: [] as Segment[] };
    users: number[] = [];
    id: number = undefined;
    width: number;
    maxSpeed: number;
    capacity: number;
    setupBranchLinks: () => void = undefined;
    start: Point;
    end: Point;
    static End = { START: "start", END: "end" };
    constructor(start: Point, end: Point, t = 0, q: MetaInfo) {
        const obj = this;
        this.start = { x: start.x, y: start.y };
        this.end = { x: end.x, y: end.y };
        for (const t in q) this.q[t] = q[t];
        this.width = this.q.highway ? config.mapGeneration.HIGHWAY_SEGMENT_WIDTH : config.mapGeneration.DEFAULT_SEGMENT_WIDTH;
        // representation of road
        this.r = {
            start: start,
            end: end,
            setStart: function(val) {
                this.start = val;
                obj.start = this.start;
                return obj.roadRevision++;
            },
            setEnd: function(val) {
                this.end = val;
                obj.end = this.end;
                return obj.roadRevision++;
            }
        };
        this.t = t;
        [this.maxSpeed, this.capacity] = this.q.highway ? [1200, 12] : [800, 6];
    }

    currentSpeed() {
        // subtract 1 from user's length so that a single user can go full speed
        return Math.min(config.gameLogic.MIN_SPEED_PROPORTION, 1 - Math.max(0, this.users.length - 1) / this.capacity) * this.maxSpeed;
    };

    // clockwise direction
    dir() {
        if (this.dirRevision !== this.roadRevision) {
            this.dirRevision = this.roadRevision;
            const vector = math.subtractPoints(this.r.end, this.r.start);
            this.cachedDir = -1 * math.sign(math.crossProduct({ x: 0, y: 1 }, vector)) * math.angleBetween({ x: 0, y: 1 }, vector);
        }
        return this.cachedDir;
    };

    length() {
        if (this.lengthRevision !== this.roadRevision) {
            this.lengthRevision = this.roadRevision;
            this.cachedLength = math.length(this.r.start, this.r.end);
        }
        return this.cachedLength;
    };

    debugLinks() {
        this.q.color = 0x00FF00;
        this.links.b.forEach(backwards => backwards.q.color = 0xFF0000);
        this.links.f.forEach(forwards => forwards.q.color = 0x0000FF);
    };

    startIsBackwards() {
        if (this.links.b.length > 0) {
            return math.equalV(this.links.b[0].r.start, this.r.start) || math.equalV(this.links.b[0].r.end, this.r.start);
        } else {
            return math.equalV(this.links.f[0].r.start, this.r.end) || math.equalV(this.links.f[0].r.end, this.r.end);
        }
    };

    cost() {
        return this.length() / this.currentSpeed();
    };

    costTo(other: Segment, fromFraction?: number) {
        const segmentEnd = this.endContaining(other);
        let res: number = 0.5;
        if (fromFraction != null) {
            if (segmentEnd === Segment.End.START) res = fromFraction;
            else res = 1 - fromFraction;
        }
        return this.cost() * res;
    };

    neighbours() {
        return this.links.f.concat(this.links.b);
    };

    endContaining(segment: Segment) {
        var startBackwards = this.startIsBackwards();
        if (this.links.b.indexOf(segment) !== -1) {
            return startBackwards ? Segment.End.START : Segment.End.END;
        } else if (this.links.f.indexOf(segment) !== -1) {
            return startBackwards ? Segment.End.END : Segment.End.START;
        } else {
            return undefined;
        }
    };

    linksForEndContaining(segment: Segment) {
        if (this.links.b.indexOf(segment) !== -1) {
            return this.links.b;
        } else if (this.links.f.indexOf(segment) !== -1) {
            return this.links.f;
        } else {
            return void 0;
        }
    };

    split(point: Point, segment: Segment, segmentList: Segment[], qTree: Quadtree<Segment>) {
        const splitPart = this.clone();
        const startIsBackwards = this.startIsBackwards();
        segmentList.push(splitPart);
        qTree.insert(splitPart.limits(), splitPart);
        splitPart.r.setEnd(point);
        this.r.setStart(point);
        // links are not copied using the preceding factory method.
        // copy link array for the split part, keeping references the same
        splitPart.links.b = this.links.b.slice(0);
        splitPart.links.f = this.links.f.slice(0);
        let firstSplit: Segment, fixLinks: Segment[], secondSplit: Segment;
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
    };
    clone(t = this.t, r = this.r, q = this.q) {
        return new Segment(r.start, r.end, t, q);
    }
    static usingDirection(start: Point, dir = 90, length = config.mapGeneration.DEFAULT_SEGMENT_LENGTH,
        t: number, q: MetaInfo) {

        var end = {
            x: start.x + length * Math.sin(dir * Math.PI / 180),
            y: start.y + length * Math.cos(dir * Math.PI / 180)
        };
        return new Segment(start, end, t, q);
    }
};
export const heatmap = {
    popOnRoad: function(r: Road) {
        return (this.populationAt(r.start.x, r.start.y) + this.populationAt(r.end.x, r.end.y)) / 2;
    },
    populationAt: function(x: number, y: number) {
        const value1 = (noise.simplex2(x / 10000, y / 10000) + 1) / 2;
        const value2 = (noise.simplex2(x / 20000 + 500, y / 20000 + 500) + 1) / 2;
        const value3 = (noise.simplex2(x / 20000 + 1000, y / 20000 + 1000) + 1) / 2;
        return Math.pow((value1 * value2 + value3) / 2, 2);
    }
};
function doRoadSegmentsIntersect(r1: Road, r2: Road) {
    return math.doLineSegmentsIntersect(r1.start, r1.end, r2.start, r2.end, true);
};
interface DebugData {
    snaps?: Point[];
    intersectionsRadius: Point[];
    intersections: Intersection[];
}
const localConstraints = function(segment: Segment, segments: Segment[], qTree: Quadtree<Segment>, debugData: DebugData) {
    const action = {
        priority: 0,
        func: undefined as () => boolean,
        t: undefined as number
    };
    for (const other of qTree.retrieve(segment.limits())) {
        // intersection check
        if (action.priority <= 4) {
            const intersection = doRoadSegmentsIntersect(segment.r, other.r);
            if (intersection) {
                if (action.t == null || intersection.t < action.t) {
                    action.t = intersection.t;
                    action.priority = 4;
                    action.func = function() {
                        // if intersecting lines are too similar don't continue
                        if (math.minDegreeDifference(other.dir(), segment.dir()) < config.mapGeneration.MINIMUM_INTERSECTION_DEVIATION) {
                            return false;
                        }
                        other.split(intersection, segment, segments, qTree);
                        segment.r.end = intersection;
                        segment.q.severed = true;
                        if (debugData.intersections == null) debugData.intersections = [];
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
            if (math.length(segment.r.end, other.r.end) <= config.mapGeneration.ROAD_SNAP_DISTANCE) {
                const point = other.r.end;
                action.priority = 3;
                action.func = function() {
                    segment.r.end = point;
                    segment.q.severed = true;
                    // update links of otherSegment corresponding to other.r.end
                    const links = other.startIsBackwards() ? other.links.f : other.links.b;
                    // check for duplicate lines, don't add if it exists
                    // this should be done before links are setup, to avoid having to undo that step
                    if (links.some(link => (math.equalV(link.r.start, segment.r.end) && math.equalV(link.r.end, segment.r.start)) || (math.equalV(link.r.start, segment.r.start) && math.equalV(link.r.end, segment.r.end)))) {
                        return false;
                    }
                    links.forEach(link => {
                        // pick links of remaining segments at junction corresponding to other.r.end
                        link.linksForEndContaining(other).push(segment)
                        // add junction segments to snapped segment
                        segment.links.f.push(link)
                    });
                    links.push(segment);
                    segment.links.f.push(other);
                    if (debugData.snaps == null) debugData.snaps = [];
                    debugData.snaps.push({ x: point.x, y: point.y });
                    return true;
                };
            }
        }
        //  intersection within radius check
        if (action.priority <= 2) {
            const {distance2, pointOnLine, lineProj2, length2} = math.distanceToLine(segment.r.end, other.r.start, other.r.end);
            if (distance2 < config.mapGeneration.ROAD_SNAP_DISTANCE * config.mapGeneration.ROAD_SNAP_DISTANCE && lineProj2 >= 0 && lineProj2 <= length2) {
                const point = pointOnLine;
                action.priority = 2;
                action.func = function() {
                    segment.r.end = point;
                    segment.q.severed = true;
                    // if intersecting lines are too closely aligned don't continue
                    if (math.minDegreeDifference(other.dir(), segment.dir()) < config.mapGeneration.MINIMUM_INTERSECTION_DEVIATION) {
                        return false;
                    }
                    other.split(point, segment, segments, qTree);
                    if (debugData.intersectionsRadius == null) debugData.intersectionsRadius = [];
                    debugData.intersectionsRadius.push({ x: point.x, y: point.y });
                    return true;
                };
            }
        }
    }
    if (action.func) return action.func();
    return true;
};

const globalGoals = {
    generate: function(previousSegment: Segment) {
        const newBranches = [] as Segment[];
        if (!previousSegment.q.severed) {
            const template = function(direction: number, length: number, t: number, q: MetaInfo) {
                return Segment.usingDirection(previousSegment.r.end, direction, length, t, q);
            };
            // used for highways or going straight on a normal branch
            const templateContinue = (direction: number) => template(direction, previousSegment.length(), 0, previousSegment.q);
            // not using q, i.e. not highways
            const templateBranch = (direction: number) => template(direction, config.mapGeneration.DEFAULT_SEGMENT_LENGTH, previousSegment.q.highway ? config.mapGeneration.NORMAL_BRANCH_TIME_DELAY_FROM_HIGHWAY : 0, null);
            const continueStraight = templateContinue(previousSegment.dir());
            const straightPop = heatmap.popOnRoad(continueStraight.r);
            if (previousSegment.q.highway) {
                const randomStraight = templateContinue(previousSegment.dir() + config.mapGeneration.RANDOM_STRAIGHT_ANGLE());
                const randomPop = heatmap.popOnRoad(randomStraight.r);
                let roadPop: number;
                if (randomPop > straightPop) {
                    newBranches.push(randomStraight);
                    roadPop = randomPop;
                } else {
                    newBranches.push(continueStraight);
                    roadPop = straightPop;
                }
                if (roadPop > config.mapGeneration.HIGHWAY_BRANCH_POPULATION_THRESHOLD) {
                    if (Math.random() < config.mapGeneration.HIGHWAY_BRANCH_PROBABILITY) {
                        const leftHighwayBranch = templateContinue(previousSegment.dir() - 90 + config.mapGeneration.RANDOM_BRANCH_ANGLE());
                        newBranches.push(leftHighwayBranch);
                    } else if (Math.random() < config.mapGeneration.HIGHWAY_BRANCH_PROBABILITY) {
                        const rightHighwayBranch = templateContinue(previousSegment.dir() + 90 + config.mapGeneration.RANDOM_BRANCH_ANGLE());
                        newBranches.push(rightHighwayBranch);
                    }
                }
            } else if (straightPop > config.mapGeneration.NORMAL_BRANCH_POPULATION_THRESHOLD) {
                newBranches.push(continueStraight);
            }
            if (straightPop > config.mapGeneration.NORMAL_BRANCH_POPULATION_THRESHOLD) {
                if (Math.random() < config.mapGeneration.DEFAULT_BRANCH_PROBABILITY) {
                    const leftBranch = templateBranch(previousSegment.dir() - 90 + config.mapGeneration.RANDOM_BRANCH_ANGLE());
                    newBranches.push(leftBranch);
                } else if (Math.random() < config.mapGeneration.DEFAULT_BRANCH_PROBABILITY) {
                    const rightBranch = templateBranch(previousSegment.dir() + 90 + config.mapGeneration.RANDOM_BRANCH_ANGLE());
                    newBranches.push(rightBranch);
                }
            }
        }
        for (const branch of newBranches) {
            // setup links between each current branch and each existing branch stemming from the previous segment
            branch.setupBranchLinks = function() {
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
class PriorityQueue<T> {
    public elements: T[] = [];
    constructor(private getPriority: (ele: T) => number) { }
    enqueue(...ele: T[]) { this.elements.push(...ele); }
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
    empty() { return this.elements.length === 0; }
}
export interface GeneratorResult {
    segments: Segment[]; priorityQ: Segment[]; qTree: Quadtree<Segment>;
}
function makeInitialSegments() {
    // setup first segments in queue
    const rootSegment = new Segment({ x: 0, y: 0 }, { x: config.mapGeneration.HIGHWAY_SEGMENT_LENGTH, y: 0 }, 0, { highway: true });
    const oppositeDirection = rootSegment.clone();
    const newEnd = {
        x: rootSegment.r.start.x - config.mapGeneration.HIGHWAY_SEGMENT_LENGTH,
        y: oppositeDirection.r.end.y
    };
    oppositeDirection.r.setEnd(newEnd);
    oppositeDirection.links.b.push(rootSegment);
    rootSegment.links.b.push(oppositeDirection);
    return [rootSegment, oppositeDirection];
}
export const generate = function* (seed: string): Iterator<GeneratorResult> {
    const debugData = {};
    Math.seedrandom(seed);
    // NB: this perlin noise library only supports 65536 different seeds
    noise.seed(Math.random());
    const priorityQ = new PriorityQueue<Segment>(s => s.t);

    priorityQ.enqueue(...makeInitialSegments());
    const segments = [] as Segment[];
    const qTree = new Quadtree<Segment>(config.mapGeneration.QUADTREE_PARAMS, config.mapGeneration.QUADTREE_MAX_OBJECTS, config.mapGeneration.QUADTREE_MAX_LEVELS);
    while (!priorityQ.empty() && segments.length < config.mapGeneration.SEGMENT_COUNT_LIMIT) {
        const minSegment = priorityQ.dequeue();
        const accepted = localConstraints(minSegment, segments, qTree, debugData as any);
        if (accepted) {
            if (minSegment.setupBranchLinks != null) minSegment.setupBranchLinks();
            segments.push(minSegment);
            qTree.insert(minSegment.limits(), minSegment);
            globalGoals.generate(minSegment).forEach(newSegment => {
                newSegment.t = minSegment.t + 1 + newSegment.t;
                priorityQ.enqueue(newSegment);
            });
            yield { segments, priorityQ: priorityQ.elements, qTree };
        }
    }
    let id = 0;
    for (const segment of segments) segment.id = id++;
    console.log(segments.length + " segments generated.");
    yield { segments, qTree, priorityQ: priorityQ.elements };
};
