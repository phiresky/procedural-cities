import {math} from "./math";
import {config, Segment, generate, GeneratorResult, heatmap} from "./mapgen";
import * as PIXI from 'pixi.js';

const seed = "blablabla" + Math.random();
const worldScale = 1 / 10;
console.log("generating with seed " + seed);
const generator = generate(seed);
let W = window.innerWidth, H = window.innerHeight;
const dobounds = function(segs: Segment[], interpolate = 1) {
    const lim = segs.map(s => s.limits());
    const bounds = {
        minx: Math.min(...lim.map(s => s.x * worldScale)),
        miny: Math.min(...lim.map(s => s.y * worldScale)),
        maxx: Math.max(...lim.map(s => s.x * worldScale)),
        maxy: Math.max(...lim.map(s => s.y * worldScale)),
    }
    const scale = Math.min(W / (bounds.maxx - bounds.minx), H / (bounds.maxy - bounds.miny)) * 0.9;
    const npx = - (bounds.maxx + bounds.minx) / 2 * scale + W / 2;
    const npy = - (bounds.maxy + bounds.miny) / 2 * scale + H / 2;
    stage.position.x = math.lerp(stage.position.x, npx, interpolate);
    stage.position.y = math.lerp(stage.position.y, npy, interpolate);
    stage.scale.x = math.lerp(stage.scale.x, scale, interpolate);
    stage.scale.y = math.lerp(stage.scale.y, scale, interpolate);
};
export const renderer = PIXI.autoDetectRenderer(W, H, { backgroundColor: 0xeeeeee, antialias: true });
document.body.appendChild(renderer.view);
export const graphics = new PIXI.Graphics();
export const stage = new PIXI.Container();
const makeSpeed = 1;
stage.addChild(graphics);
stage.interactive = true;
stage.hitArea = new PIXI.Rectangle(-1e5, -1e5, 2e5, 2e5);
function renderSegment(seg: Segment, color = 0x000000) {
    if (!color) color = seg.q.color;
    graphics.lineStyle(seg.width * 10 * worldScale, color, 1);
    graphics.moveTo(seg.start.x * worldScale, seg.start.y * worldScale);
    graphics.lineTo(seg.end.x * worldScale, seg.end.y * worldScale);
}
stage.on('mousedown', onDragStart)
    .on('touchstart', onDragStart)
    // events for drag end
    .on('mouseup', onDragEnd)
    .on('mouseupoutside', onDragEnd)
    .on('touchend', onDragEnd)
    .on('touchendoutside', onDragEnd)
    // events for drag move
    .on('mousemove', onDragMove)
    .on('touchmove', onDragMove)
    .on('click', onClick);
function onClick(event: PIXI.interaction.InteractionEvent) {
    const p = event.data.getLocalPosition(graphics);
    p.x /= worldScale;
    p.y /= worldScale;
    const poss = stuff.qTree.retrieve({
        x: p.x - 10, y: p.y - 10,
        width: 20, height: 20
    });
    const dist = (a: Segment) => {
        const x = math.distanceToLine(p, a.start, a.end);
        if (x.lineProj2 >= 0 && x.lineProj2 <= x.length2)
            return x.distance2;
        else return Infinity;
    };
    poss.sort((a, b) => dist(a) - dist(b));
    //for(poss[0].linksaa)
    poss[0].debugLinks();
    //poss[0].q.color = 0xff0000;
}

function onDragStart(event: PIXI.interaction.InteractionEvent) {
    this.dragstart = { x: event.data.global.x, y: event.data.global.y };
}
function onDragEnd() { this.dragstart = null; }
function onDragMove(event: PIXI.interaction.InteractionEvent) {
    if (this.dragstart) {
        this.position.x += event.data.global.x - this.dragstart.x;
        this.position.y += event.data.global.y - this.dragstart.y;
        this.dragstart = { x: event.data.global.x, y: event.data.global.y };
    }
}
function zoom(x: number, y: number, direction: number) {
    const beforeTransform = stage.toLocal(new PIXI.Point(x, y));
    var factor = (1 + direction * 0.1);
    stage.scale.x *= factor;
    stage.scale.y *= factor;
    const afterTransform = stage.toLocal(new PIXI.Point(x, y));
    stage.position.x += (afterTransform.x - beforeTransform.x) * stage.scale.x;
    stage.position.y += (afterTransform.y - beforeTransform.y) * stage.scale.y;
}
window.addEventListener('wheel', e => zoom(e.clientX, e.clientY, -math.sign(e.deltaY)));
export let stuff: GeneratorResult;

let done = false;
requestAnimationFrame(animate);
let iteration = 0;
function animate() {
    for (let i = 0; i < (iteration / 100 * makeSpeed) + 1; i++) {
        const iter = generator.next();
        if (!iter.done) {
            stuff = iter.value;
            stuff = stuff;
            iteration++;
        } else done = true;
    }
    if (!done) dobounds(stuff.segments, iteration < 20 ? 1 : 0.02);
    graphics.clear();
    if (config.DRAW_HEATMAP) {
        const dim = config.HEAT_MAP_PIXEL_DIM;
        for (let x = 0; x < W; x += dim) for (let y = 0; y < H; y += dim) {
            const p = stage.toLocal(new PIXI.Point(x, y));
            const pop = heatmap.populationAt((p.x+dim/2) / worldScale, (p.y+dim/2) / worldScale);
            //const v = 255 - (pop * 127) | 0;
            const v = pop > config.NORMAL_BRANCH_POPULATION_THRESHOLD ? 255 :
                pop > config.HIGHWAY_BRANCH_POPULATION_THRESHOLD ? 200 : 150;
            graphics.beginFill(v << 16 | v << 8 | v);
            graphics.drawRect(p.x, p.y,
                dim / stage.scale.x,
                dim / stage.scale.y);
            graphics.endFill();
        }
    }
    for (const seg of stuff.segments) renderSegment(seg);
    if (!done) for (const seg of stuff.priorityQ) renderSegment(seg, 0xFF0000);

    requestAnimationFrame(animate);
    renderer.render(stage);
    iteration++;
}
function onResize() {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.resize(W, H);
}
window.addEventListener("resize", onResize);
(window as any)._render = this;
