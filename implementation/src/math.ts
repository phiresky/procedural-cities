export interface Point {
  x: number;
  y: number;
}
export const math = {
  subtractPoints: (p1: Point, p2: Point): Point => ({
    x: p1.x - p2.x,
    y: p1.y - p2.y,
  }),
  crossProduct: (a: Point, b: Point): number => a.x * b.y - a.y * b.x,
  /** c = approximate match */
  doLineSegmentsIntersect: (
    a: Point,
    b: Point,
    p: Point,
    d: Point,
    c: boolean,
  ): { x: number; y: number; t: number } | null => {
    b = math.subtractPoints(b, a);
    d = math.subtractPoints(d, p);
    let f = math.crossProduct(math.subtractPoints(p, a), b);
    const k = math.crossProduct(b, d);
    if ((0 == f && 0 == k) || 0 == k) return null;
    f /= k;
    const e = math.crossProduct(math.subtractPoints(p, a), d) / k;
    const intersect = c
      ? 0.001 < e && 0.999 > e && 0.001 < f && 0.999 > f
      : 0 <= e && 1 >= e && 0 <= f && 1 >= f;
    return intersect ? { x: a.x + e * b.x, y: a.y + e * b.y, t: e } : null;
  },
  minDegreeDifference: (val1: number, val2: number): number => {
    const bottom = Math.abs(val1 - val2) % 180;
    return Math.min(bottom, Math.abs(bottom - 180));
  },
  equalV: function (a: Point, b: Point): boolean {
    const e = math.subtractPoints(a, b);
    return 1e-8 > math.lengthV2(e);
  },
  dotProduct: function (a: Point, b: Point): number {
    return a.x * b.x + a.y * b.y;
  },
  length: function (a: Point, b: Point): number {
    return math.lengthV(math.subtractPoints(b, a));
  },
  length2: function (a: Point, b: Point): number {
    return math.lengthV2(math.subtractPoints(b, a));
  },
  lengthV: function (a: Point): number {
    return Math.sqrt(math.lengthV2(a));
  },
  lengthV2: function (a: Point): number {
    return a.x * a.x + a.y * a.y;
  },
  angleBetween: function (a: Point, b: Point): number {
    const angleRad = Math.acos(
      (a.x * b.x + a.y * b.y) / (math.lengthV(a) * math.lengthV(b)),
    );
    return (180 * angleRad) / Math.PI;
  },
  sign: function (a: number): 0 | 1 | -1 {
    return 0 < a ? 1 : 0 > a ? -1 : 0;
  },
  fractionBetween: function (a: Point, b: Point, e: number): Point {
    b = math.subtractPoints(b, a);
    return {
      x: a.x + b.x * e,
      y: a.y + b.y * e,
    };
  },
  randomRange: function (a: number, b: number): number {
    return Math.random() * (b - a) + a;
  },
  addPoints: function (a: Point, b: Point): Point {
    return { x: a.x + b.x, y: a.y + b.y };
  },
  distanceToLine: function (
    a: Point,
    b: Point,
    e: Point,
  ): {
    distance2: number;
    pointOnLine: Point;
    lineProj2: number;
    length2: number;
  } {
    const d = math.subtractPoints(a, b);
    e = math.subtractPoints(e, b);
    const proj = math.project(d, e);
    const c = proj.projected;
    b = math.addPoints(b, c);
    return {
      distance2: math.length2(b, a),
      pointOnLine: b,
      lineProj2: math.sign(proj.dotProduct) * math.lengthV2(c),
      length2: math.lengthV2(e),
    };
  },
  project: function (
    a: Point,
    b: Point,
  ): { dotProduct: number; projected: Point } {
    const e = math.dotProduct(a, b);
    return {
      dotProduct: e,
      projected: math.multVScalar(b, e / math.lengthV2(b)),
    };
  },
  multVScalar: function (a: Point, b: number): Point {
    return {
      x: a.x * b,
      y: a.y * b,
    };
  },
  divVScalar: function (a: Point, b: number): Point {
    return {
      x: a.x / b,
      y: a.y / b,
    };
  },
  lerp: function (a: number, b: number, x: number): number {
    return a * (1 - x) + b * x;
  },
  lerpV: function (a: Point, b: Point, x: number): Point {
    return { x: math.lerp(a.x, b.x, x), y: math.lerp(a.y, b.y, x) };
  },
  randomNearCubic: function (b: number): number {
    const d = Math.pow(Math.abs(b), 3);
    let c = 0;
    while (c === 0 || Math.random() < Math.pow(Math.abs(c), 3) / d) {
      c = math.randomRange(-b, b);
    }
    return c;
  },
};
