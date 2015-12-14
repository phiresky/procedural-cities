---
history: true
width: 1280
height: 720
margin: 0.1
theme: white
slideNumber: true
bibliography: prosem.bib
header-includes: |
    <style>
    img {max-height:400px ! important;}
    .reveal h1 { font-size: 1.5em; }
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

---

### Primary and secondary street network

Primary, secondary, tertiary streets are used in urban planning

→ Simplified distinction between "highways" and normal streets

## Street growth

- create new street segments greedily, in parallel.
- mostly straight from existing segment
- branch with some probability at about 90 degrees
- label fully connected street segments as done

---

## Conflict resolution (intersections, obstacles)

> - If the new segment ends in an obstacle (e.g. water, park):<br>
Shorten or rotate segment to fit
> - If new segment intersects with existing street: Shorten and create intersection
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

## Implementation with priority queue

Implementation by @harmful

```javascript
function generate() {
    let Q = new PriorityQueue<Segment>(s => s.t);
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
