
export interface Point {
    x: number; y: number;
}
export const math = {
    subtractPoints: (p1: Point, p2: Point) => ({ x: p1.x - p2.x, y: p1.y - p2.y }),
    crossProduct: (a: Point, b: Point) => a.x * b.y - a.y * b.x,
    /** c = approximate match */
    doLineSegmentsIntersect: (a: Point, b: Point, p: Point, d: Point, c: boolean) => {
        b = math.subtractPoints(b, a);
        d = math.subtractPoints(d, p);
        var f = math.crossProduct(math.subtractPoints(p, a), b);
        var k = math.crossProduct(b, d);
        if (0 == f && 0 == k || 0 == k) return null;
        f /= k;
        let e = math.crossProduct(math.subtractPoints(p, a), d) / k;
        const intersect = c ? 0.001 < e && (0.999 > e && (0.001 < f && 0.999 > f)) : 0 <= e && (1 >= e && (0 <= f && 1 >= f));
        return intersect ? { x: a.x + e * b.x, y: a.y + e * b.y, t: e } : null;
    },
    minDegreeDifference: (val1: number, val2: number) => {
        const bottom = Math.abs(val1 - val2) % 180;
        return Math.min(bottom, Math.abs(bottom - 180));
    },
    equalV: function(a: Point, b: Point) {
        var e = math.subtractPoints(a, b);
        return 1E-8 > math.lengthV2(e);
    },
    dotProduct: function(a: Point, b: Point) {
        return a.x * b.x + a.y * b.y;
    },
    length: function(a: Point, b: Point) {
        return math.lengthV(math.subtractPoints(b, a));
    },
    length2: function(a: Point, b: Point) {
        return math.lengthV2(math.subtractPoints(b, a));
    },
    lengthV: function(a: Point) {
        return Math.sqrt(math.lengthV2(a));
    },
    lengthV2: function(a: Point) {
        return a.x * a.x + a.y * a.y;
    },
    angleBetween: function(a: Point, b: Point) {
        const angleRad = Math.acos((a.x * b.x + a.y * b.y) / (math.lengthV(a) * math.lengthV(b)));
        return 180 * angleRad / Math.PI;
    },
    sign: function(a: number) {
        return 0 < a ? 1 : 0 > a ? -1 : 0;
    },
    fractionBetween: function(a: Point, b: Point, e: number) {
        b = math.subtractPoints(b, a);
        return {
            x: a.x + b.x * e,
            y: a.y + b.y * e
        };
    },
    randomRange: function(a: number, b: number) {
        return Math.random() * (b - a) + a;
    },
    addPoints: function(a: Point, b: Point) {
        return { x: a.x + b.x, y: a.y + b.y }
    },
    distanceToLine: function(a: Point, b: Point, e: Point) {
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
    project: function(a: Point, b: Point) {
        var e = math.dotProduct(a, b);
        return {
            dotProduct: e,
            projected: math.multVScalar(b, e / math.lengthV2(b))
        };
    },
    multVScalar: function(a: Point, b: number) {
        return {
            x: a.x * b,
            y: a.y * b
        };
    },
    divVScalar: function(a: Point, b: number) {
        return {
            x: a.x / b,
            y: a.y / b
        };
    },
    lerp: function(a: number, b: number, x: number) {
        return a * (1 - x) + b * x;
    },
    lerpV: function(a: Point, b: Point, x: number) {
        return {x: math.lerp(a.x, b.x, x), y: math.lerp(a.y, b.y, x)};
    },
    randomNearCubic: function(b: number) {
        var d = Math.pow(Math.abs(b), 3);
        var c = 0;
        while (c === 0 || Math.random() < Math.pow(Math.abs(c), 3) / d) {
            c = math.randomRange(-b, b);
        }
        return c;
    }
};
