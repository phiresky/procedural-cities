// code adapted from http://www.tmwhere.com/city_generation.html
import { noise } from "perlin";
import seedrandom from "seedrandom";
seedrandom;
import { Bounds, Quadtree } from "./Quadtree";
import { Point, math } from "./math";
import { config } from "./config";

interface MetaInfo {
  highway?: boolean;
  color?: number;
  severed?: boolean;
}
export class Segment {
  /** time-step delay before this road is evaluated */
  t: number;
  /** meta-information relevant to global goals */
  q: MetaInfo = {};
  /**
   * links backwards and forwards:
   * each segment has a direction given by how the road network grows
   *
   * the backwards links are which segments merge with this road segment at it's this.start point,
   * the forwards links are which segments split off at the end point
   */
  links = { b: [] as Segment[], f: [] as Segment[] };
  width: number;
  setupBranchLinks: undefined | (() => void) = undefined;
  constructor(public start: Point, public end: Point, t = 0, q?: MetaInfo) {
    if (q) Object.assign(this.q, q);
    this.width = this.q.highway
      ? config.HIGHWAY_SEGMENT_WIDTH
      : config.DEFAULT_SEGMENT_WIDTH;
    // representation of road
    this.t = t;
  }

  // clockwise direction
  dir(): number {
    const vector = math.subtractPoints(this.end, this.start);
    return (
      -1 *
      math.sign(math.crossProduct({ x: 0, y: 1 }, vector)) *
      math.angleBetween({ x: 0, y: 1 }, vector)
    );
  }
  length(): number {
    return math.length(this.start, this.end);
  }
  limits(): Bounds {
    return {
      x: Math.min(this.start.x, this.end.x),
      y: Math.min(this.start.y, this.end.y),
      width: Math.abs(this.start.x - this.end.x),
      height: Math.abs(this.start.y - this.end.y),
    };
  }

  debugLinks(): void {
    this.q.color = 0x00ff00;
    this.links.b.forEach((backwards) => (backwards.q.color = 0xff0000));
    this.links.f.forEach((forwards) => (forwards.q.color = 0x0000ff));
  }

  // check if the start of this segment is in the backwards links or forward links
  // should pretty much always be true (todo: is it ever not?)
  startIsBackwards(): boolean {
    if (this.links.b.length > 0) {
      if (!this.links.b[0]) throw Error("impossib");
      const ba =
        math.equalV(this.links.b[0].start, this.start) ||
        math.equalV(this.links.b[0].end, this.start);
      if (!ba) console.log("warning: backward", ba);
      return ba;
    } else {
      // just in case we have no backwards links (we are start segment)
      if (!this.links.f[0]) throw Error("impossib");
      console.log("startSegment.startIsBackwards()");
      return (
        math.equalV(this.links.f[0].start, this.end) ||
        math.equalV(this.links.f[0].end, this.end)
      );
    }
  }

  linksForEndContaining(segment: Segment): Segment[] | undefined {
    if (this.links.b.indexOf(segment) !== -1) {
      return this.links.b;
    } else if (this.links.f.indexOf(segment) !== -1) {
      return this.links.f;
    } else {
      return undefined;
    }
  }

  /**
   * split this segment into two segments, connecting the given segment to the newly created crossing
   *
   * left example in https://phiresky.github.io/procedural-cities/img/20151213214559.png
   *
   * @param point the coordinates the split will be at
   * @param thirdSegment the third segment that will be joined to the newly created crossing
   * @param segmentList the full list of all segments (new segment will be added here)
   * @param qTree quadtree for faster finding of segments (new segment will be added here)
   */
  split(
    point: Point,
    thirdSegment: Segment,
    segmentList: Segment[],
    qTree: Quadtree<Segment>,
  ): void {
    const splitPart = this.clone();
    const startIsBackwards = this.startIsBackwards();
    segmentList.push(splitPart);
    qTree.insert(splitPart.limits(), splitPart); // todo: shouldn't this be done after the start and end points are fixed?
    splitPart.end = point;
    this.start = point;
    // links are not copied in the constructor, so
    // copy link array for the split part, keeping references the same
    splitPart.links.b = this.links.b.slice();
    splitPart.links.f = this.links.f.slice();
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
    // one of the ends of our segment is now instead part of the newly created segment
    // go through all linked roads at that end, and replace their inverse references from referring to this to referring to the newly created segment
    fixLinks.forEach((link) => {
      let index = link.links.b.indexOf(this);
      if (index !== -1) {
        link.links.b[index] = splitPart;
      } else {
        index = link.links.f.indexOf(this);
        if (index === -1)
          throw Error("impossible, link is either backwards or forwards");
        link.links.f[index] = splitPart;
      }
    });
    // new crossing is between firstSplit, secondSplit, and thirdSegment
    firstSplit.links.f = [thirdSegment, secondSplit];
    secondSplit.links.b = [thirdSegment, firstSplit];
    thirdSegment.links.f.push(firstSplit);
    thirdSegment.links.f.push(secondSplit);
  }
  clone(t = this.t, q = this.q): Segment {
    return new Segment(this.start, this.end, t, q);
  }
  static usingDirection(
    start: Point,
    dir = 90,
    length = config.DEFAULT_SEGMENT_LENGTH,
    t: number,
    q?: MetaInfo,
  ): Segment {
    const end = {
      x: start.x + length * Math.sin((dir * Math.PI) / 180),
      y: start.y + length * Math.cos((dir * Math.PI) / 180),
    };
    return new Segment(start, end, t, q);
  }
  intersectWith(s: Segment): { x: number; y: number; t: number } | null {
    return math.doLineSegmentsIntersect(
      this.start,
      this.end,
      s.start,
      s.end,
      true,
    );
  }
}
export const heatmap = {
  popOnRoad: function (r: Segment): number {
    return (
      (this.populationAt(r.start.x, r.start.y) +
        this.populationAt(r.end.x, r.end.y)) /
      2
    );
  },
  populationAt: function (x: number, y: number): number {
    // to generate title page of the presentation: if(x < 7000 && y < 3500 && x > -7000 && y > 2000) return 0; else if(1) return Math.random()/4+config.NORMAL_BRANCH_POPULATION_THRESHOLD;
    const value1 = (noise.simplex2(x / 10000, y / 10000) + 1) / 2;
    const value2 = (noise.simplex2(x / 20000 + 500, y / 20000 + 500) + 1) / 2;
    const value3 = (noise.simplex2(x / 20000 + 1000, y / 20000 + 1000) + 1) / 2;
    return Math.pow((value1 * value2 + value3) / 2, 2);
  },
};
class DebugData {
  snaps: Point[] = [];
  intersectionsRadius: Point[] = [];
  intersections: { x: number; t: number; y: number }[] = [];
}
const debugData = new DebugData();

function localConstraints(
  segment: Segment,
  segments: Segment[],
  qTree: Quadtree<Segment>,
) {
  if (config.IGNORE_CONFLICTS) return true;
  const action = {
    priority: 0,
    func: undefined as undefined | (() => boolean),
    t: undefined as undefined | number,
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
            if (
              math.minDegreeDifference(other.dir(), segment.dir()) <
              config.MINIMUM_INTERSECTION_DEVIATION
            ) {
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
        action.func = function () {
          segment.end = point;
          segment.q.severed = true;
          // update links of otherSegment corresponding to other.r.end
          const links = other.startIsBackwards()
            ? other.links.f
            : other.links.b;
          // check for duplicate lines, don't add if it exists
          // this should be done before links are setup, to avoid having to undo that step
          if (
            links.some(
              (link) =>
                (math.equalV(link.start, segment.end) &&
                  math.equalV(link.end, segment.start)) ||
                (math.equalV(link.start, segment.start) &&
                  math.equalV(link.end, segment.end)),
            )
          ) {
            return false;
          }
          links.forEach((link) => {
            // pick links of remaining segments at junction corresponding to other.r.end
            const containing = link.linksForEndContaining(other);
            if (!containing) throw Error("isntpossible");
            containing.push(segment);
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
      const {
        distance2,
        pointOnLine,
        lineProj2,
        length2,
      } = math.distanceToLine(segment.end, other.start, other.end);
      if (
        distance2 < config.ROAD_SNAP_DISTANCE * config.ROAD_SNAP_DISTANCE &&
        lineProj2 >= 0 &&
        lineProj2 <= length2
      ) {
        const point = pointOnLine;
        action.priority = 2;
        action.func = function () {
          segment.end = point;
          segment.q.severed = true;
          // if intersecting lines are too closely aligned don't continue
          if (
            math.minDegreeDifference(other.dir(), segment.dir()) <
            config.MINIMUM_INTERSECTION_DEVIATION
          ) {
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
}

function globalGoalsGenerate(previousSegment: Segment) {
  const newBranches = [] as Segment[];
  if (!previousSegment.q.severed) {
    const template = (
      direction: number,
      length: number,
      t: number,
      q?: MetaInfo,
    ) =>
      Segment.usingDirection(
        previousSegment.end,
        previousSegment.dir() + direction,
        length,
        t,
        q,
      );
    // used for highways or going straight on a normal branch
    const templateContinue = (direction: number) =>
      template(direction, previousSegment.length(), 0, previousSegment.q);
    // not using q, i.e. not highways
    const templateBranch = (direction: number) =>
      template(
        direction,
        config.DEFAULT_SEGMENT_LENGTH,
        previousSegment.q.highway
          ? config.NORMAL_BRANCH_TIME_DELAY_FROM_HIGHWAY
          : 0,
      );
    const continueStraight = templateContinue(0);
    const straightPop = heatmap.popOnRoad(continueStraight);
    if (previousSegment.q.highway) {
      let maxPop = straightPop;
      let bestSegment = continueStraight;
      for (let i = 0; i < config.HIGHWAY_POPULATION_SAMPLE_SIZE; i++) {
        // TODO: https://github.com/phiresky/prosem-proto/blob/gh-pages/src/main.tsx#L524
        const curSegment = templateContinue(config.RANDOM_STRAIGHT_ANGLE());
        const curPop = heatmap.popOnRoad(curSegment);
        if (curPop > maxPop) {
          maxPop = curPop;
          bestSegment = curSegment;
        }
      }
      newBranches.push(bestSegment);
      if (maxPop > config.HIGHWAY_BRANCH_POPULATION_THRESHOLD) {
        if (Math.random() < config.HIGHWAY_BRANCH_PROBABILITY) {
          newBranches.push(
            templateContinue(-90 + config.RANDOM_BRANCH_ANGLE()),
          );
        } else {
          if (Math.random() < config.HIGHWAY_BRANCH_PROBABILITY) {
            newBranches.push(
              templateContinue(+90 + config.RANDOM_BRANCH_ANGLE()),
            );
          }
        }
      }
    } else if (straightPop > config.NORMAL_BRANCH_POPULATION_THRESHOLD) {
      newBranches.push(continueStraight);
    }
    if (!config.ONLY_HIGHWAYS)
      if (straightPop > config.NORMAL_BRANCH_POPULATION_THRESHOLD) {
        if (Math.random() < config.DEFAULT_BRANCH_PROBABILITY) {
          newBranches.push(templateBranch(-90 + config.RANDOM_BRANCH_ANGLE()));
        } else {
          if (Math.random() < config.DEFAULT_BRANCH_PROBABILITY) {
            newBranches.push(
              templateBranch(+90 + config.RANDOM_BRANCH_ANGLE()),
            );
          }
        }
      }
  }
  for (const branch of newBranches) {
    // setup links between each current branch and each existing branch stemming from the previous segment
    branch.setupBranchLinks = function () {
      previousSegment.links.f.forEach((link) => {
        branch.links.b.push(link);
        const containing = link.linksForEndContaining(previousSegment);
        if (!containing) throw Error("impossible");
        containing.push(branch);
      });
      previousSegment.links.f.push(branch);
      return branch.links.b.push(previousSegment);
    };
  }
  return newBranches;
}
class PriorityQueue<T> {
  public elements: T[] = [];
  constructor(private getPriority: (ele: T) => number) {}
  enqueue(...ele: T[]) {
    this.elements.push(...ele);
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
export interface GeneratorResult {
  segments: Segment[];
  priorityQ: Segment[];
  qTree: Quadtree<Segment>;
}
function makeInitialSegments() {
  // setup first segments in queue
  const rootSegment = new Segment(
    { x: 0, y: 0 },
    { x: config.HIGHWAY_SEGMENT_LENGTH, y: 0 },
    0,
    { highway: !config.START_WITH_NORMAL_STREETS },
  );
  if (!config.TWO_SEGMENTS_INITIALLY) return [rootSegment];
  const oppositeDirection = rootSegment.clone();
  const newEnd = {
    x: rootSegment.start.x - config.HIGHWAY_SEGMENT_LENGTH,
    y: oppositeDirection.end.y,
  };
  oppositeDirection.end = newEnd;
  oppositeDirection.links.b.push(rootSegment);
  rootSegment.links.b.push(oppositeDirection);
  return [rootSegment, oppositeDirection];
}
function generationStep(
  priorityQ: PriorityQueue<Segment>,
  segments: Segment[],
  qTree: Quadtree<Segment>,
) {
  const minSegment = priorityQ.dequeue();
  if (!minSegment) throw Error("no segment remaining");
  const accepted = localConstraints(minSegment, segments, qTree);
  if (accepted) {
    if (minSegment.setupBranchLinks != null) minSegment.setupBranchLinks();
    segments.push(minSegment);
    qTree.insert(minSegment.limits(), minSegment);
    globalGoalsGenerate(minSegment).forEach((newSegment) => {
      newSegment.t = minSegment.t + 1 + newSegment.t;
      priorityQ.enqueue(newSegment);
    });
  }
}
export function* generate(seed: string): Iterator<GeneratorResult> {
  seedRandom(seed);
  noise.seed(Math.random());
  const priorityQ = new PriorityQueue<Segment>((s) => s.t);

  priorityQ.enqueue(...makeInitialSegments());
  const segments = [] as Segment[];
  const qTree = new Quadtree<Segment>(
    config.QUADTREE_PARAMS,
    config.QUADTREE_MAX_OBJECTS,
    config.QUADTREE_MAX_LEVELS,
  );
  while (!priorityQ.empty() && segments.length < config.SEGMENT_COUNT_LIMIT) {
    generationStep(priorityQ, segments, qTree);
    yield { segments, priorityQ: priorityQ.elements, qTree };
  }
  console.log(`${segments.length} segments generated.`);
  yield { segments, qTree, priorityQ: priorityQ.elements };
}
function seedRandom(seed: string) {
  // hack to be able to use legacy seedrandom function
  ((Math as unknown) as { seedrandom: (seed: string) => void }).seedrandom(
    seed,
  );
}
Object.assign(window, { _mapgen: this });
