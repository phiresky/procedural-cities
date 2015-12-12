"use strict";
var Quadtree = (function () {
    function Quadtree(bounds, max_objects, max_levels, level) {
        if (max_objects === void 0) { max_objects = 10; }
        if (max_levels === void 0) { max_levels = 4; }
        if (level === void 0) { level = 0; }
        this.bounds = bounds;
        this.max_objects = max_objects;
        this.max_levels = max_levels;
        this.level = level;
        this.objects = [];
        this.nodes = [];
    }
    ;
    Quadtree.prototype.split = function () {
        var nextLevel = this.level + 1, subWidth = Math.round(this.bounds.width / 2), subHeight = Math.round(this.bounds.height / 2), x = Math.round(this.bounds.x), y = Math.round(this.bounds.y);
        this.nodes[0] = new Quadtree({
            x: x + subWidth,
            y: y,
            width: subWidth,
            height: subHeight
        }, this.max_objects, this.max_levels, nextLevel);
        this.nodes[1] = new Quadtree({
            x: x,
            y: y,
            width: subWidth,
            height: subHeight
        }, this.max_objects, this.max_levels, nextLevel);
        this.nodes[2] = new Quadtree({
            x: x,
            y: y + subHeight,
            width: subWidth,
            height: subHeight
        }, this.max_objects, this.max_levels, nextLevel);
        this.nodes[3] = new Quadtree({
            x: x + subWidth,
            y: y + subHeight,
            width: subWidth,
            height: subHeight
        }, this.max_objects, this.max_levels, nextLevel);
    };
    ;
    Quadtree.prototype.getIndex = function (pRect) {
        var index = -1, verticalMidpoint = this.bounds.x + (this.bounds.width / 2), horizontalMidpoint = this.bounds.y + (this.bounds.height / 2), topQuadrant = (pRect.y < horizontalMidpoint && pRect.y + pRect.height < horizontalMidpoint), bottomQuadrant = (pRect.y > horizontalMidpoint);
        if (pRect.x < verticalMidpoint && pRect.x + pRect.width < verticalMidpoint) {
            if (topQuadrant) {
                index = 1;
            }
            else if (bottomQuadrant) {
                index = 2;
            }
        }
        else if (pRect.x > verticalMidpoint) {
            if (topQuadrant) {
                index = 0;
            }
            else if (bottomQuadrant) {
                index = 3;
            }
        }
        return index;
    };
    ;
    Quadtree.prototype.insert = function (pRect) {
        var i = 0, index;
        if (typeof this.nodes[0] !== 'undefined') {
            index = this.getIndex(pRect);
            if (index !== -1) {
                this.nodes[index].insert(pRect);
                return;
            }
        }
        this.objects.push(pRect);
        if (this.objects.length > this.max_objects && this.level < this.max_levels) {
            if (typeof this.nodes[0] === 'undefined') {
                this.split();
            }
            while (i < this.objects.length) {
                index = this.getIndex(this.objects[i]);
                if (index !== -1) {
                    this.nodes[index].insert(this.objects.splice(i, 1)[0]);
                }
                else {
                    i = i + 1;
                }
            }
        }
    };
    ;
    Quadtree.prototype.retrieve = function (pRect) {
        var index = this.getIndex(pRect), returnObjects = this.objects;
        if (typeof this.nodes[0] !== 'undefined') {
            if (index !== -1) {
                returnObjects = returnObjects.concat(this.nodes[index].retrieve(pRect));
            }
            else {
                for (var i = 0; i < this.nodes.length; i = i + 1) {
                    returnObjects = returnObjects.concat(this.nodes[i].retrieve(pRect));
                }
            }
        }
        return returnObjects;
    };
    ;
    Quadtree.prototype.clear = function () {
        this.objects = [];
        for (var i = 0; i < this.nodes.length; i = i + 1) {
            if (typeof this.nodes[i] !== 'undefined') {
                this.nodes[i].clear();
            }
        }
        this.nodes = [];
    };
    ;
    return Quadtree;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Quadtree;
