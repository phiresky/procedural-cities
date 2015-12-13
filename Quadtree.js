/*
 * Javascript Quadtree
 * @version 1.1.1
 * @licence MIT
 * @author Timo Hausmann
 * https://github.com/timohausmann/quadtree-js/
 */
"use strict";
class Quadtree {
    /*
     * Quadtree Constructor
     * @param Object bounds		bounds of the node, object with x, y, width, height
     * @param Integer max_objects		(optional) max objects a node can hold before splitting into 4 subnodes (default: 10)
     * @param Integer max_levels		(optional) total max levels inside root Quadtree (default: 4)
     * @param Integer level		(optional) deepth level, required for subnodes
     */
    constructor(bounds, max_objects, max_levels, level) {
        this.bounds = bounds;
        this.max_objects = max_objects;
        this.max_levels = max_levels;
        this.level = level;
        this.objects = [];
        this.objectsO = [];
        this.isLeaf = true;
        if (this.level === undefined)
            this.level = 0;
    }
    ;
    /**
     * Split the node into 4 subnodes
     */
    split() {
        this.isLeaf = false;
        const level = this.level + 1, width = this.bounds.width / 2, height = this.bounds.height / 2, x = this.bounds.x, y = this.bounds.y;
        //top right node
        this.topRight = new Quadtree({
            x: x + width, y: y, width: width, height: height
        }, this.max_objects, this.max_levels, level);
        //top left node
        this.topLeft = new Quadtree({
            x: x, y: y, width: width, height: height
        }, this.max_objects, this.max_levels, level);
        //bottom left node
        this.bottomLeft = new Quadtree({
            x: x, y: y + height, width: width, height: height
        }, this.max_objects, this.max_levels, level);
        //bottom right node
        this.bottomRight = new Quadtree({
            x: x + width, y: y + height, width: width, height: height
        }, this.max_objects, this.max_levels, level);
        //add all objects to there corresponding subnodes
        for (let i = 0; i < this.objects.length; i++) {
            const rect = this.objects[i];
            const obj = this.objectsO[i];
            for (const node of this.getRelevantNodes(rect))
                node.insert(rect, obj);
        }
        this.objects = [];
        this.objectsO = [];
    }
    ;
    /**
     * Determine which nodes the object belongs to
     * @param r the AABB to check
     */
    getRelevantNodes(r) {
        const midX = this.bounds.x + (this.bounds.width / 2);
        const midY = this.bounds.y + (this.bounds.height / 2);
        const qs = [];
        const isTop = r.y <= midY;
        const isBottom = r.y + r.height > midY;
        if (r.x <= midX) {
            if (isTop)
                qs.push(this.topLeft);
            if (isBottom)
                qs.push(this.bottomLeft);
        }
        if (r.x + r.width > midX) {
            if (isTop)
                qs.push(this.topRight);
            if (isBottom)
                qs.push(this.bottomRight);
        }
        return qs;
    }
    ;
    /**
     * Insert the object into the node. If the node
     * exceeds the capacity, it will split and add all
     * objects to their corresponding subnodes.
     * @param Object pRect		bounds of the object to be added, with x, y, width, height
     */
    insert(pRect, obj) {
        if (!this.isLeaf) {
            for (const node of this.getRelevantNodes(pRect))
                node.insert(pRect, obj);
            return;
        }
        this.objects.push(pRect);
        this.objectsO.push(obj);
        if (this.objects.length > this.max_objects && this.level < this.max_levels)
            this.split();
    }
    ;
    /**
     * Return all objects that could collide with the given object
     * @param Object pRect		bounds of the object to be checked, with x, y, width, height
     * @Return Array		array with all detected objects
     */
    retrieve(pRect) {
        if (this.isLeaf)
            return this.objectsO;
        let relevant = [];
        for (const node of this.getRelevantNodes(pRect))
            relevant = relevant.concat(node.retrieve(pRect));
        return relevant;
    }
    ;
}
exports.Quadtree = Quadtree;
