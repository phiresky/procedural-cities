/*
 * Javascript Quadtree
 * @version 1.1.1
 * @licence MIT
 * @author Timo Hausmann
 * https://github.com/timohausmann/quadtree-js/
 */

/*
 Copyright © 2012 Timo Hausmann
Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:
The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENthis. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
export interface Bounds {
    x: number, y: number, width: number, height: number
}
export class Quadtree<T> {
    objects = [] as Bounds[];
    objectsO = [] as T[];
    isLeaf = true;
    topLeft: Quadtree<T>;
    topRight: Quadtree<T>;
    bottomLeft: Quadtree<T>;
    bottomRight: Quadtree<T>;
    /*
     * Quadtree Constructor
     * @param Object bounds		bounds of the node, object with x, y, width, height
     * @param Integer max_objects		(optional) max objects a node can hold before splitting into 4 subnodes (default: 10)
     * @param Integer max_levels		(optional) total max levels inside root Quadtree (default: 4)
     * @param Integer level		(optional) deepth level, required for subnodes
     */
    constructor(public bounds: Bounds, public max_objects: number, public max_levels: number, public level?: number) {
        if (this.level === undefined) this.level = 0;
    };


	/**
	 * Split the node into 4 subnodes
	 */
    split() {
        this.isLeaf = false;
        const level = this.level + 1,
            width = this.bounds.width / 2,
            height = this.bounds.height / 2,
            x = this.bounds.x,
            y = this.bounds.y;
        //top right node
        this.topRight = new Quadtree<T>({
            x: x + width, y, width, height
        }, this.max_objects, this.max_levels, level);

        //top left node
        this.topLeft = new Quadtree<T>({
            x, y, width, height
        }, this.max_objects, this.max_levels, level);

        //bottom left node
        this.bottomLeft = new Quadtree<T>({
            x, y: y + height, width, height
        }, this.max_objects, this.max_levels, level);

        //bottom right node
        this.bottomRight = new Quadtree<T>({
            x: x + width, y: y + height, width, height
        }, this.max_objects, this.max_levels, level);
    };


	/**
	 * Determine which nodes the object belongs to
	 * @param r the AABB to check
	 */
    getRelevantNodes(r: Bounds) {
        const midX = this.bounds.x + (this.bounds.width / 2);
        const midY = this.bounds.y + (this.bounds.height / 2);

        //pRect can completely fit within the top quadrants
        const topQuadrant = (r.y < midY && r.y + r.height < midY);
        //pRect can completely fit within the bottom quadrants
        const bottomQuadrant = (r.y > midY);
        //pRect can completely fit within the left quadrants
        if (r.x < midX && r.x + r.width < midX) {
            if (topQuadrant) {
                return this.topLeft;
            } else if (bottomQuadrant) {
                return this.bottomLeft;
            }
            //pRect can completely fit within the right quadrants
        } else if (r.x > midX) {
            if (topQuadrant) {
                return this.topRight;
            } else if (bottomQuadrant) {
                return this.bottomRight;
            }
        }
        return undefined;
    };


	/**
	 * Insert the object into the node. If the node
	 * exceeds the capacity, it will split and add all
	 * objects to their corresponding subnodes.
	 * @param Object pRect		bounds of the object to be added, with x, y, width, height
	 */
    insert(pRect: Bounds, obj: T) {
        if (!this.isLeaf) {
            const node = this.getRelevantNodes(pRect);

            if (node) {
                node.insert(pRect, obj);
                return;
            }
        }

        this.objects.push(pRect);
        this.objectsO.push(obj);

        if (this.objects.length > this.max_objects && this.level < this.max_levels) {

            //split if we don't already have subnodes
            if (this.isLeaf) {
                this.split();
            }

            var i = 0;
            //add all objects to there corresponding subnodes
            while (i < this.objects.length) {

                const node = this.getRelevantNodes(this.objects[i]);

                if (node) {
                    node.insert(this.objects.splice(i, 1)[0], this.objectsO.splice(i, 1)[0]);
                } else {
                    i = i + 1;
                }
            }
        }
    };


	/**
	 * Return all objects that could collide with the given object
	 * @param Object pRect		bounds of the object to be checked, with x, y, width, height
	 * @Return Array		array with all detected objects
	 */
    retrieve(pRect: Bounds) {
        var node = this.getRelevantNodes(pRect),
            returnObjects = this.objectsO;

        //if we have subnodes ...
        if (!this.isLeaf) {
            //if pRect fits into a subnode ..
            if (node) {
                returnObjects = returnObjects.concat(node.retrieve(pRect));

                //if pRect does not fit into a subnode, check it against all subnodes
            } else {
                for (const node of [this.topLeft, this.topRight, this.bottomLeft, this.bottomRight]) {
                    returnObjects = returnObjects.concat(node.retrieve(pRect));
                }
            }
        }

        return returnObjects;
    };
}
