---
history: true
width: 1280
height: 960
margin: 0.05
theme: white
slideNumber: true
bibliography: prosem.bib
header-includes: |
    <style>
    img {max-height:400px ! important;}
    .reveal h1 { font-size: 1.5em; }
    iframe {
        width: 1024px;
        height: 768px;
    }
    /*p { text-align: left; }*/
    </style>
---


# Procedural Modeling of Cities ![](img/20151124201337.png)

# Goal and Motivation

---

**Goal**: *Automatic generation of a realistic-looking city including road structure and buildings*

. . .

### Applications

* Entertainment (Movies, Games)
* Military training
* Land use planning

# Einführung und Grundlagen

## Approach

1. Festlegen/Verarbeiten der Eingabeparameter
2. Generate street network
3. generate building structure

dazwischen optional Interaktion

# Modeling of the street network

## Input parameters

Need some type of contextual information

- map boundaries and obstacles
- street layouting information

. . .

**Examples**

- Elevation and water map
- Population density map
- Vegetation map
- City type and road patterns
- City zones (residential, industrial, etc.)

## Initialization

Begin with two opposite street segments:

<iframe data-src="demo.html?
    segment_count_limit = 2;
    arrowhead_size = 80;
    draw_circle_on_segment_base = 30;
    iterations_per_frame = Infinity;
"></iframe>

## Street growth

- create new street segments greedily
- continue straight from existing end segments
- branch with some probability at ≈ 90 degrees
- label fully connected street segments as done

<iframe style="height:600px" data-src="demo.html?
    segment_count_limit = 20;
    arrowhead_size = 80;
    draw_circle_on_segment_base = 30;
    iterations_per_second = 1;
    target_zoom = 0.8;
    two_segments_initially = 0;
    only_highways = 1;
    seed = 0.03153736749663949;
    restart_after_seconds = 3;
    highway_branch_probability = 0.08;
"></iframe>

## Street hierarchy

Primary, secondary, tertiary streets are used in urban planning

→ Simplified distinction between "highways" and normal streets

. . .

- highway segments are longer and branch less
- normal streets can only branch into normal streets

<iframe style="height:400px;width:500px;" data-src="demo.html?
    segment_count_limit = 20;
    arrowhead_size = 100;
    iterations_per_second = 1;
    target_zoom = 0.8;
    highway_segment_width = 24;
    two_segments_initially = 0;
    only_highways = 1;
    seed = 0.1;
    restart_after_seconds = 3;
"></iframe>
<iframe style="height:400px;width:500px;" data-src="demo.html?
    segment_count_limit = 40;
    arrowhead_size = 80;
    iterations_per_second = 2;
    target_zoom = 0.8;
    two_segments_initially = 0;
    only_highways = 0;
    seed = 0.1;
    restart_after_seconds = 3;
    start_with_normal_streets = 1;
"></iframe>


## Conflict resolution (intersections, obstacles)

> - If the new segment ends in an obstacle (e.g. water, park):  
Shorten or rotate segment to fit
> - If new segment intersects with existing street:  Shorten and create intersection
> - If existing street / intersection is near: Join road to intersection

. . .

![<small>@cities2001</small>](img/20151213214559.png)

## Implementation as parametric L-System

Original implementation by @cities2001
```
w: R(0, initialRuleAttr) ?I(initRoadAttr, UNASSIGNED)
p1: R(del, ruleAttr) : del<0 -> e
p2: R(del, ruleAttr) > ?I(roadAttr,state) : state==SUCCEED
    { globalGoals(ruleAttr,roadAttr) creates the parameters for:
          pDel[0-2], pRuleAttr[0-2], pRoadAttr[0-2] }
    -> +(roadAttr.angle)F(roadAttr.length)
      B(pDel[1],pRuleAttr[1],pRoadAttr[1]),
      B(pDel[2],pRuleAttr[2],pRoadAttr[2]),
      R(pDel[0],pRuleAttr[0]) ?I(pRoadAttr[0],UNASSIGNED)[i]
p3: R(del, ruleAttr) > ?I(roadAttr, state) : state==FAILED -> e
p4: B(del, ruleAttr, roadAttr) : del>0 -> B(del-1, ruleAttr, roadAttr)
p5: B(del, ruleAttr, roadAttr) : del==0 -> [R(del, ruleAttr)?I(roadAttr, UNASSIGNED)]
p6: B(del, ruleAttr, roadAttr) : del<0 -> e
p7: R(del, ruleAttr) < ?I(roadAttr,state) : del<0 -> e
p8: ?I(roadAttr,state) : state==UNASSIGNED
    { localConstraints(roadAttr) adjusts the parameters for:
        state, roadAttr}
    -> ?I(roadAttr, state)
p9: ?I(roadAttr,state) : state!=UNASSIGNED -> e
```
→ unnecessarily complicated

## Implementation with priority queue

Implementation by @harmful

```javascript
function generate() {
    let Q = new PriorityQueue<Segment>();
    Q.enqueueAll(makeInitialSegments());
    let segments = [];
    while (!Q.empty() && segments.length < SEG_LIMIT) {
        let minSegment = Q.dequeue();
        let accepted = localConstraints(minSegment, segments);
        if (accepted) {
            segments.push(minSegment);
            Q.enqueueAll(globalGoalsGenerate(minSegment));
        }
    }
}
```
(*globalGoalsGenerate* increases delay)

## Complete demo

<iframe data-src="demo.html?"></iframe>

## Street patterns

Different patterns found in cities:

- Rectangular raster (≈ 90° angles)
- Radial
- Branching / random

![](img/20151213214501.png)

---

demo walkthrough...

---

Acceleration: Quadtrees

# Modeling of buildings

## Input parameters

- Street network
- Building information (e.g. height / type / age)

## Lot subdivision

## Architektur: L-systems, split grammars, etc.


---

demo walkthrough...

---

# Alternative Methoden: Tensorfelder / Zeitsimulation

# Beispielprojekte

- CityEngine

#

## Quellen

Quellen inkl. Links sind auf der Ankündigungsseite
