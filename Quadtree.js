"use strict";

class Quadtree {
    /**
     * @param max_objects max objects a node can hold before splitting into 4 subnodes (default: 10)
     * @param max_levels total max levels inside root Quadtree (default: 4)
     * @param level	depth level (0 for root node)
     */
    constructor(bounds) {
        let max_objects = arguments.length <= 1 || arguments[1] === undefined ? 10 : arguments[1];
        let max_levels = arguments.length <= 2 || arguments[2] === undefined ? 4 : arguments[2];
        let level = arguments.length <= 3 || arguments[3] === undefined ? 0 : arguments[3];

        this.bounds = bounds;
        this.max_objects = max_objects;
        this.max_levels = max_levels;
        this.level = level;
        this.objects = [];
        this.objectsO = [];
        this.isLeaf = true;
    }
    /** split this node, moving all objects to their corresponding subnode */
    split() {
        this.isLeaf = false;
        const level = this.level + 1,
              width = this.bounds.width / 2,
              height = this.bounds.height / 2,
              x = this.bounds.x,
              y = this.bounds.y;
        this.topRight = new Quadtree({
            x: x + width, y: y, width: width, height: height
        }, this.max_objects, this.max_levels, level);
        this.topLeft = new Quadtree({
            x: x, y: y, width: width, height: height
        }, this.max_objects, this.max_levels, level);
        this.bottomLeft = new Quadtree({
            x: x, y: y + height, width: width, height: height
        }, this.max_objects, this.max_levels, level);
        this.bottomRight = new Quadtree({
            x: x + width, y: y + height, width: width, height: height
        }, this.max_objects, this.max_levels, level);
        //add all objects to there corresponding subnodes
        for (let i = 0; i < this.objects.length; i++) {
            const rect = this.objects[i];
            const obj = this.objectsO[i];
            for (const node of this.getRelevantNodes(rect)) node.insert(rect, obj);
        }
        this.objects = [];
        this.objectsO = [];
    }

    getRelevantNodes(r) {
        const midX = this.bounds.x + this.bounds.width / 2;
        const midY = this.bounds.y + this.bounds.height / 2;
        const qs = [];
        const isTop = r.y <= midY;
        const isBottom = r.y + r.height > midY;
        if (r.x <= midX) {
            if (isTop) qs.push(this.topLeft);
            if (isBottom) qs.push(this.bottomLeft);
        }
        if (r.x + r.width > midX) {
            if (isTop) qs.push(this.topRight);
            if (isBottom) qs.push(this.bottomRight);
        }
        return qs;
    }

    /**
     * Insert object into the tree.
     * If the tree exceeds the capacity, it will be split.
     */
    insert(pRect, obj) {
        if (!this.isLeaf) {
            for (const node of this.getRelevantNodes(pRect)) node.insert(pRect, obj);
            return;
        }
        this.objects.push(pRect);
        this.objectsO.push(obj);
        if (this.objects.length > this.max_objects && this.level < this.max_levels) this.split();
    }

    /**
     * Return all objects that could collide with the given bounds
     */
    retrieve(pRect) {
        if (this.isLeaf) return this.objectsO;
        let relevant = [];
        for (const node of this.getRelevantNodes(pRect)) relevant = relevant.concat(node.retrieve(pRect));
        return relevant;
    }
}
exports.Quadtree = Quadtree;

