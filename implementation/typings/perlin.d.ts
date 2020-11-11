declare namespace Perlin {
  interface Noise {
    simplex2(x: number, y: number): number;
    /** NB: this perlin noise library only supports 65536 different seeds */
    seed(s: number): void;
  }
  const noise: Noise;
}
declare module "perlin" {
  export = Perlin;
}
