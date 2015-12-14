declare module Perlin {
    interface Noise {
        simplex2(x: number, y: number): number;
        /** NB: this perlin noise library only supports 65536 different seeds */
        seed(s: number): void;
    }
    var noise : Noise;
}
declare module 'perlin' {
    export = Perlin;
}
