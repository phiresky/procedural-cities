"use strict";
exports.math = {
    subtractPoints: (p1, p2) => ({ x: p1.x - p2.x, y: p1.y - p2.y }),
    crossProduct: (a, b) => a.x * b.y - a.y * b.x,
    /** c = approximate match */
    doLineSegmentsIntersect: (a, b, p, d, c) => {
        b = exports.math.subtractPoints(b, a);
        d = exports.math.subtractPoints(d, p);
        var f = exports.math.crossProduct(exports.math.subtractPoints(p, a), b);
        var k = exports.math.crossProduct(b, d);
        if (0 == f && 0 == k || 0 == k)
            return null;
        f /= k;
        let e = exports.math.crossProduct(exports.math.subtractPoints(p, a), d) / k;
        const intersect = c ? 0.001 < e && (0.999 > e && (0.001 < f && 0.999 > f)) : 0 <= e && (1 >= e && (0 <= f && 1 >= f));
        return intersect ? { x: a.x + e * b.x, y: a.y + e * b.y, t: e } : null;
    },
    minDegreeDifference: (val1, val2) => {
        const bottom = Math.abs(val1 - val2) % 180;
        return Math.min(bottom, Math.abs(bottom - 180));
    },
    equalV: function (a, b) {
        var e = exports.math.subtractPoints(a, b);
        return 1E-8 > exports.math.lengthV2(e);
    },
    dotProduct: function (a, b) {
        return a.x * b.x + a.y * b.y;
    },
    length: function (a, b) {
        return exports.math.lengthV(exports.math.subtractPoints(b, a));
    },
    length2: function (a, b) {
        return exports.math.lengthV2(exports.math.subtractPoints(b, a));
    },
    lengthV: function (a) {
        return Math.sqrt(exports.math.lengthV2(a));
    },
    lengthV2: function (a) {
        return a.x * a.x + a.y * a.y;
    },
    angleBetween: function (a, b) {
        const angleRad = Math.acos((a.x * b.x + a.y * b.y) / (exports.math.lengthV(a) * exports.math.lengthV(b)));
        return 180 * angleRad / Math.PI;
    },
    sign: function (a) {
        return 0 < a ? 1 : 0 > a ? -1 : 0;
    },
    fractionBetween: function (a, b, e) {
        b = exports.math.subtractPoints(b, a);
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
        var d = exports.math.subtractPoints(a, b);
        e = exports.math.subtractPoints(e, b);
        const proj = exports.math.project(d, e);
        var c = proj.projected;
        b = exports.math.addPoints(b, c);
        return {
            distance2: exports.math.length2(b, a),
            pointOnLine: b,
            lineProj2: exports.math.sign(proj.dotProduct) * exports.math.lengthV2(c),
            length2: exports.math.lengthV2(e)
        };
    },
    project: function (a, b) {
        var e = exports.math.dotProduct(a, b);
        return {
            dotProduct: e,
            projected: exports.math.multVScalar(b, e / exports.math.lengthV2(b))
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
    lerp: function (a, b, x) {
        return a * (1 - x) + b * x;
    }
};
