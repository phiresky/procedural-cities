export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
export class Quadtree<T> {
  node = { type: "leaf", objects: [], objectsO: [] } as
    | { type: "leaf"; objects: Bounds[]; objectsO: T[] }
    | {
        type: "inner";
        topLeft: Quadtree<T>;
        topRight: Quadtree<T>;
        bottomLeft: Quadtree<T>;
        bottomRight: Quadtree<T>;
      };
  /**
   * @param max_objects max objects a node can hold before splitting into 4 subnodes (default: 10)
   * @param max_levels total max levels inside root Quadtree (default: 4)
   * @param level	depth level (0 for root node)
   */
  constructor(
    public bounds: Bounds,
    public max_objects = 10,
    public max_levels = 4,
    public level = 0,
  ) {}

  /** split this node, moving all objects to their corresponding subnode */
  split(): void {
    const level = this.level + 1,
      width = this.bounds.width / 2,
      height = this.bounds.height / 2,
      x = this.bounds.x,
      y = this.bounds.y;
    const leaf = this.node;
    if (leaf.type !== "leaf") throw Error("can't split non leaf");
    this.node = {
      type: "inner",
      topRight: new Quadtree<T>(
        {
          x: x + width,
          y,
          width,
          height,
        },
        this.max_objects,
        this.max_levels,
        level,
      ),
      topLeft: new Quadtree<T>(
        {
          x,
          y,
          width,
          height,
        },
        this.max_objects,
        this.max_levels,
        level,
      ),
      bottomLeft: new Quadtree<T>(
        {
          x,
          y: y + height,
          width,
          height,
        },
        this.max_objects,
        this.max_levels,
        level,
      ),

      bottomRight: new Quadtree<T>(
        {
          x: x + width,
          y: y + height,
          width,
          height,
        },
        this.max_objects,
        this.max_levels,
        level,
      ),
    };

    // add all objects to their corresponding subnodes
    for (let i = 0; i < leaf.objects.length; i++) {
      const rect = leaf.objects[i];
      const obj = leaf.objectsO[i];
      if (!rect || !obj) throw Error("impossible");
      for (const node of this.getRelevantNodes(rect)) node.insert(rect, obj);
    }
  }

  getRelevantNodes(r: Bounds): Quadtree<T>[] {
    if (this.node.type === "leaf")
      throw Error("cant get relevant nodes in leaf");
    const midX = this.bounds.x + this.bounds.width / 2;
    const midY = this.bounds.y + this.bounds.height / 2;

    const qs: Quadtree<T>[] = [];
    const isTop = r.y <= midY;
    const isBottom = r.y + r.height > midY;
    if (r.x <= midX) {
      // left
      if (isTop) qs.push(this.node.topLeft);
      if (isBottom) qs.push(this.node.bottomLeft);
    }
    if (r.x + r.width > midX) {
      // right
      if (isTop) qs.push(this.node.topRight);
      if (isBottom) qs.push(this.node.bottomRight);
    }
    return qs;
  }

  /**
   * Insert object into the tree.
   * If the tree exceeds the capacity, it will be split.
   */
  insert(pRect: Bounds, obj: T): void {
    if (this.node.type !== "leaf") {
      for (const node of this.getRelevantNodes(pRect)) node.insert(pRect, obj);
      return;
    }

    this.node.objects.push(pRect);
    this.node.objectsO.push(obj);

    if (
      this.node.objects.length > this.max_objects &&
      this.level < this.max_levels
    )
      this.split();
  }

  /**
   * Return all objects that could collide with the given bounds
   */
  retrieve(pRect: Bounds): T[] {
    if (this.node.type === "leaf") return this.node.objectsO;
    let relevant: T[] = [];
    for (const node of this.getRelevantNodes(pRect))
      relevant = relevant.concat(node.retrieve(pRect));
    return relevant;
  }
}
