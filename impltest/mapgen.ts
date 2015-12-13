
// code adapted from http://www.tmwhere.com/city_generation.html
import {noise} from 'perlin';
import seedrandom from 'seedrandom'; seedrandom;
import {Bounds, Quadtree} from "./Quadtree";
import {Point, math} from './math';

export const config = {
    DEFAULT_SEGMENT_LENGTH: 300, HIGHWAY_SEGMENT_LENGTH: 400,
    DEFAULT_SEGMENT_WIDTH: 6, HIGHWAY_SEGMENT_WIDTH: 16,
    RANDOM_BRANCH_ANGLE: function() { return math.randomNearCubic(3) },
    RANDOM_STRAIGHT_ANGLE: function() { return math.randomNearCubic(15) },
    DEFAULT_BRANCH_PROBABILITY: .4, HIGHWAY_BRANCH_PROBABILITY: .02,
    HIGHWAY_BRANCH_POPULATION_THRESHOLD: .1, NORMAL_BRANCH_POPULATION_THRESHOLD: .1,
    NORMAL_BRANCH_TIME_DELAY_FROM_HIGHWAY: 10, MINIMUM_INTERSECTION_DEVIATION: 30,
    SEGMENT_COUNT_LIMIT: 10000, ROAD_SNAP_DISTANCE: 50,
    HEAT_MAP_PIXEL_DIM: 25, DRAW_HEATMAP: true,
    QUADTREE_PARAMS: { x: -2E4, y: -2E4, width: 4E4, height: 4E4 },
    QUADTREE_MAX_OBJECTS: 10, QUADTREE_MAX_LEVELS: 10, DEBUG: !1
};
interface MetaInfo {
    highway?: boolean, color?: number, severed?: boolean
}
export class Segment {
    /** time-step delay before this road is evaluated */
    t: number;
    /** meta-information relevant to global goals */
    q: MetaInfo = {};
    /** links backwards and forwards */
    links = { b: [] as Segment[], f: [] as Segment[] };
    width: number;
    setupBranchLinks: () => void = undefined;
    constructor(public start: Point, public end: Point, t = 0, q?: MetaInfo) {
        const obj = this;
        for (const t in q) this.q[t] = q[t];
        this.width = this.q.highway ? config.HIGHWAY_SEGMENT_WIDTH : config.DEFAULT_SEGMENT_WIDTH;
        // representation of road
        this.t = t;
    }

    // clockwise direction
    dir() {
        const vector = math.subtractPoints(this.end, this.start);
        return -1 * math.sign(math.crossProduct({ x: 0, y: 1 }, vector)) * math.angleBetween({ x: 0, y: 1 }, vector);
    };
    length() {
        return math.length(this.start, this.end)
    };
    limits(): Bounds {
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
    };

    startIsBackwards() {
        if (this.links.b.length > 0) {
            return math.equalV(this.links.b[0].start, this.start) || math.equalV(this.links.b[0].end, this.start);
        } else {
            return math.equalV(this.links.f[0].start, this.end) || math.equalV(this.links.f[0].end, this.end);
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
        splitPart.end = point;
        this.start = point;
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
    clone(t = this.t, q = this.q) {
        return new Segment(this.start, this.end, t, q);
    }
    static usingDirection(start: Point, dir = 90, length = config.DEFAULT_SEGMENT_LENGTH,
        t: number, q: MetaInfo) {

        var end = {
            x: start.x + length * Math.sin(dir * Math.PI / 180),
            y: start.y + length * Math.cos(dir * Math.PI / 180)
        };
        return new Segment(start, end, t, q);
    }
    intersectWith(s: Segment) {
        return math.doLineSegmentsIntersect(this.start, this.end, s.start, s.end, true);
    }
};
export const heatmap = {
    popOnRoad: function(r: Segment) {
        return (this.populationAt(r.start.x, r.start.y) + this.populationAt(r.end.x, r.end.y)) / 2;
    },
    populationAt: function(x: number, y: number) {
        const value1 = (noise.simplex2(x / 10000, y / 10000) + 1) / 2;
        const value2 = (noise.simplex2(x / 20000 + 500, y / 20000 + 500) + 1) / 2;
        const value3 = (noise.simplex2(x / 20000 + 1000, y / 20000 + 1000) + 1) / 2;
        return Math.pow((value1 * value2 + value3) / 2, 2);
    }
};
class DebugData {
    snaps: Point[] = [];
    intersectionsRadius: Point[] = [];
    intersections: { x: number, t: number, y: number }[] = [];
}
let debugData = new DebugData();

const localConstraints = function(segment: Segment, segments: Segment[], qTree: Quadtree<Segment>) {
    const action = {
        priority: 0, func: undefined as () => boolean, t: undefined as number
    };
    for (const other of qTree.retrieve(segment.limits())) {
        // intersection check
        if (action.priority <= 4) {
            const intersection = segment.intersectWith(other);
            if (intersection) {
                if (action.t == null || intersection.t < action.t) {
                    action.t = intersection.t;
                    action.priority = 4;
                    action.func = function() {
                        // if intersecting lines are too similar don't continue
                        if (math.minDegreeDifference(other.dir(), segment.dir()) < config.MINIMUM_INTERSECTION_DEVIATION) {
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
            if (math.length(segment.end, other.end) <= config.ROAD_SNAP_DISTANCE) {
                const point = other.end;
                action.priority = 3;
                action.func = function() {
                    segment.end = point;
                    segment.q.severed = true;
                    // update links of otherSegment corresponding to other.r.end
                    const links = other.startIsBackwards() ? other.links.f : other.links.b;
                    // check for duplicate lines, don't add if it exists
                    // this should be done before links are setup, to avoid having to undo that step
                    if (links.some(link => (
                        math.equalV(link.start, segment.end) && math.equalV(link.end, segment.start))
                        || (math.equalV(link.start, segment.start) && math.equalV(link.end, segment.end))
                    )) {
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
            const {distance2, pointOnLine, lineProj2, length2} = math.distanceToLine(segment.end, other.start, other.end);
            if (distance2 < config.ROAD_SNAP_DISTANCE * config.ROAD_SNAP_DISTANCE && lineProj2 >= 0 && lineProj2 <= length2) {
                const point = pointOnLine;
                action.priority = 2;
                action.func = function() {
                    segment.end = point;
                    segment.q.severed = true;
                    // if intersecting lines are too closely aligned don't continue
                    if (math.minDegreeDifference(other.dir(), segment.dir()) < config.MINIMUM_INTERSECTION_DEVIATION) {
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

function globalGoalsGenerate(previousSegment: Segment) {
    const newBranches = [] as Segment[];
    if (!previousSegment.q.severed) {
        const template = (direction: number, length: number, t: number, q: MetaInfo) =>
            Segment.usingDirection(previousSegment.end, previousSegment.dir() + direction, length, t, q);
        // used for highways or going straight on a normal branch
        const templateContinue = (direction: number) => template(direction, previousSegment.length(), 0, previousSegment.q);
        // not using q, i.e. not highways
        const templateBranch = (direction: number) => template(direction, config.DEFAULT_SEGMENT_LENGTH, previousSegment.q.highway ? config.NORMAL_BRANCH_TIME_DELAY_FROM_HIGHWAY : 0, null);
        const continueStraight = templateContinue(0);
        const straightPop = heatmap.popOnRoad(continueStraight);
        if (previousSegment.q.highway) {
            const randomStraight = templateContinue(config.RANDOM_STRAIGHT_ANGLE());
            const randomPop = heatmap.popOnRoad(randomStraight);
            let roadPop: number;
            if (randomPop > straightPop) {
                newBranches.push(randomStraight);
                roadPop = randomPop;
            } else {
                newBranches.push(continueStraight);
                roadPop = straightPop;
            }
            if (roadPop > config.HIGHWAY_BRANCH_POPULATION_THRESHOLD) {
                if (Math.random() < config.HIGHWAY_BRANCH_PROBABILITY) {
                    newBranches.push(templateContinue(- 90 + config.RANDOM_BRANCH_ANGLE()));
                } else if (Math.random() < config.HIGHWAY_BRANCH_PROBABILITY) {
                    newBranches.push(templateContinue(+ 90 + config.RANDOM_BRANCH_ANGLE()));
                }
            }
        } else if (straightPop > config.NORMAL_BRANCH_POPULATION_THRESHOLD) {
            newBranches.push(continueStraight);
        }
        if (straightPop > config.NORMAL_BRANCH_POPULATION_THRESHOLD) {
            if (Math.random() < config.DEFAULT_BRANCH_PROBABILITY) {
                newBranches.push(templateBranch(- 90 + config.RANDOM_BRANCH_ANGLE()));
            } else if (Math.random() < config.DEFAULT_BRANCH_PROBABILITY) {
                newBranches.push(templateBranch(+ 90 + config.RANDOM_BRANCH_ANGLE()));
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
    const rootSegment = new Segment({ x: 0, y: 0 }, { x: config.HIGHWAY_SEGMENT_LENGTH, y: 0 }, 0, { highway: true });
    const oppositeDirection = rootSegment.clone();
    const newEnd = {
        x: rootSegment.start.x - config.HIGHWAY_SEGMENT_LENGTH,
        y: oppositeDirection.end.y
    };
    oppositeDirection.end = newEnd;
    oppositeDirection.links.b.push(rootSegment);
    rootSegment.links.b.push(oppositeDirection);
    return [rootSegment, oppositeDirection];
}
function generationStep(priorityQ: PriorityQueue<Segment>, segments: Segment[], qTree: Quadtree<Segment>) {
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
export function* generate(seed: string): Iterator<GeneratorResult> {
    Math.seedrandom(seed);
    noise.seed(Math.random());
    const priorityQ = new PriorityQueue<Segment>(s => s.t);

    priorityQ.enqueue(...makeInitialSegments());
    const segments = [] as Segment[];
    const qTree = new Quadtree<Segment>(config.QUADTREE_PARAMS, config.QUADTREE_MAX_OBJECTS, config.QUADTREE_MAX_LEVELS);
    while (!priorityQ.empty() && segments.length < config.SEGMENT_COUNT_LIMIT) {
        generationStep(priorityQ, segments, qTree);
        yield { segments, priorityQ: priorityQ.elements, qTree };
    }
    console.log(segments.length + " segments generated.");
    yield { segments, qTree, priorityQ: priorityQ.elements };
};
(window as any)._mapgen = this;
