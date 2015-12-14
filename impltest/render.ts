import {math} from "./math";
import {config, Segment, generate, GeneratorResult, heatmap} from "./mapgen";
import * as PIXI from 'pixi.js';

var qd: { [key: string]: string } = {};
location.search.substr(1).split("&").forEach(item => {
    let [k, v] = item.split("=");
    qd[k] = v && decodeURIComponent(v);
});
for (let c of Object.keys(qd)) {
    const list = c.toUpperCase().split(".");
    const attr = list.pop();
    const targ = list.reduce((a, b, i, arr) => a[b], config as any);
    const origValue = targ[attr];
    console.log(targ, attr);
    targ[attr] = typeof origValue === "number" ? +qd[c] :
        typeof origValue === "boolean" ? +qd[c] :
            qd[c];
}

const seed = config.SEED || Math.random() + "";
console.log("generating with seed " + seed);
export const generator = generate(seed);
let W = window.innerWidth, H = window.innerHeight;

export const dobounds = function(segs: Segment[], interpolate = 1) {
    const lim = segs.map(s => s.limits());
    const bounds = {
        minx: Math.min(...lim.map(s => s.x)),
        miny: Math.min(...lim.map(s => s.y)),
        maxx: Math.max(...lim.map(s => s.x + s.width)),
        maxy: Math.max(...lim.map(s => s.y + s.height)),
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
stage.addChild(graphics);
stage.interactive = true;
stage.hitArea = new PIXI.Rectangle(-1e5, -1e5, 2e5, 2e5);
let has_interacted = false;
function renderSegment(seg: Segment, color = 0x000000) {
    if (!color) color = seg.q.color;
    const x1 = seg.start.x;
    const x2 = seg.end.x;
    const y1 = seg.start.y;
    const y2 = seg.end.y;
    const len = seg.length();
    const arrowLength = Math.min(len, config.ARROWHEAD_SIZE);
    if (config.DRAW_CIRCLE_ON_SEGMENT_BASE) {
        graphics.beginFill(0x000000);
        graphics.drawCircle(x1, y1, config.DRAW_CIRCLE_ON_SEGMENT_BASE);
        graphics.endFill();
    }
    if (config.ARROWHEAD_SIZE) {
        graphics.lineStyle(seg.width * 2, color, 1);
        graphics.moveTo(x1, y1);
        graphics.lineTo(math.lerp(x1, x2, 1 - arrowLength / len), math.lerp(y1, y2, 1 - arrowLength / len));
    } else {
        graphics.lineStyle(seg.width * 10, color, 1);
        graphics.moveTo(x1, y1);
        graphics.lineTo(x2, y2);
    }

    if (config.ARROWHEAD_SIZE) {
        const angle = Math.PI / 8;
        const h = Math.abs(arrowLength / Math.cos(angle));
        const lineangle = Math.atan2(y2 - y1, x2 - x1);
        const angle1 = lineangle + Math.PI + angle;
        const topx = x2 + Math.cos(angle1) * h;
        const topy = y2 + Math.sin(angle1) * h;
        const angle2 = lineangle + Math.PI - angle;
        const botx = x2 + Math.cos(angle2) * h;
        const boty = y2 + Math.sin(angle2) * h;
        graphics.beginFill(color, 1);
        graphics.lineStyle(0, 0, 1);
        graphics.moveTo(x2, y2);
        graphics.lineTo(topx, topy);
        graphics.lineTo(botx, boty);
        graphics.lineTo(x2, y2);
        graphics.endFill();
    }
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
    if (this.wasdragged || !config.DEBUG) return;
    const p = event.data.getLocalPosition(graphics);
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
    this.wasdragged = false;
    has_interacted = true;
}
function onDragEnd() { this.dragstart = null; }
function onDragMove(event: PIXI.interaction.InteractionEvent) {
    this.wasdragged = true;
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
window.addEventListener('wheel', e => {
    has_interacted = true;
    zoom(e.clientX, e.clientY, -math.sign(e.deltaY))
});
export let stuff: GeneratorResult;

let done = false;
requestAnimationFrame(animate);
let iteration = 0;
let iteration_wanted = 0;
function animate() {
    if (!done) {
        iteration_wanted += iteration * config.ITERATION_SPEEDUP + config.ITERATIONS_PER_FRAME;
        while (iteration < iteration_wanted) {
            const iter = generator.next();
            if (iter.done) {
                done = true;
                break;
            } else {
                stuff = iter.value;
                stuff = stuff;
                iteration++;
            }
        }
        if(!has_interacted)
            dobounds(stuff.segments, iteration < 20 || (done && !has_interacted) ? 1 : 0.05);
    }
    graphics.clear();
    if (config.DRAW_HEATMAP) {
        const dim = config.HEAT_MAP_PIXEL_DIM;
        for (let x = 0; x < W; x += dim) for (let y = 0; y < H; y += dim) {
            const p = stage.toLocal(new PIXI.Point(x, y));
            const pop = heatmap.populationAt(p.x + dim / 2, p.y + dim / 2);
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
