---
title: Procedural Modeling of Cities
author: Robin
bibliography: prosem.bib
institute: |
	Institut für Visualisierung und Datenanalyse,\
	Lehrstuhl für Computergrafik
link-citations: true
header-includes: |
	\setkeys{Gin}{width=0.8\linewidth}
csl: ieee.csl
---
<style>img {width:400px}</style>


# General concepts and methods

## Procedural modeling


## Parametric Lindenmayer Systems (L-systems) [@beauty]

### L-Systems

As defined by Lindenmayer in [@beauty, ch. 1], an L-System is a formal grammer defined as $G=(V, \omega, P)$, where

* V is the alphabet
* $\omega \in V^+$ is the initial word called the *axiom*
* $P \subset V \times V^*$ is a set of production rules that map from one letter to a sequence of letters.

Letters that do not have production rules are assigned an implicit identity rule $a\to a$.

In general, an L-system can be deterministic or non-deterministic. It is deterministic when there is exactly one rule for each letter in $V$.

In contrast to normal formal grammars, the rule application in L-systems is simultaneous.

L-systems can be context-sensitive or context-free ^[definition of $(m,n)$L-Systems with context of m letters to the left and n letters to the right in [@hanan_parametric_1992, ch. 2.2]],

### Parametric L-Systems [@hanan_parametric_1992]

Parametric L-Systems are an extensions to L-Systems allowing the incorporation of arbitrary functions into L-Systems. Each letter can have assigned *parameters* which are real numbers, and can be combined with unknowns and regular arithmetic operators like $+, *, \geq, \dots$. Rules can then also be conditional on the parameter. As an example, the rule

$$A(t): t>5 \to B(t+1)CD(t \wedge 0.5)$$

replaces $A(t)$ with $B(t+1)CD(t\wedge 0.5)$ only when $t > 5$.

### Applications in procedural city modeling

Originally used for plant modeling, L-systems can be applied to more complex problems with the above extensions. In [@cities2001], they are used extensively for creation of the road network and modeling of building architecture.

## Tensor fields [@chen_interactive_2008]

As defined in [@chen_interactive_2008], an tensor field is a continuous function from every 2-dimensional point $\mathbf p$ to a tensor $T(\mathbf p)$. A tensor is defined as

$$R\begin{pmatrix}
\cos{2 \theta} & \sin{2 \theta} \\
\sin{2 \theta} & -\cos{2 \theta} \\
\end{pmatrix}$$

with $R \geq 0$ and $\theta \in [0,2\pi)$. There are various basis fields, such as the radial pattern (seen below the river in [@fig:tensor]) and the constant directional pattern (above the river in [@fig:tensor]). These are combined into a single pattern by adding them together while scaling them using exponential fall-off from a given center point [@chen_interactive_2008, ch. 5.2].

![Semi-automatically generated tensor field visualized using hyperstreamlines, used for creating
 a street network [@chen_interactive_2008]](img/tensor.png){#fig:tensor}

Tensor fields can be used to create a street network, based on the observation that most street network have two dominant directions [@vanegas_modelling_2010, pp. 30-31]. This also allows easy visualization of the flow direction beforehand. In [@chen_interactive_2008] they are used in a graphical user interface, to allow interactive modification of the input parameters.


## Gradient Noise [@_terragen;@kelly_survey_2006] {#sec:noise}

Gradient noise created from a map of interpolated random gradients, creating a smooth-looking bumpy surface. It is used in many aspects of content generation in computer graphics to create nature-like effects. It can be used to create or enhance textures and generate terrain [@_terragen]. The simple noise is smooth, but can be summed in multiple scales to create fractal noise as seen in [@fig:perlin].

A commonly used type of gradient noise is Perlin noise [@perlin_improving_2002], which is easy to calculate and gives good results.

!["Perlin noise rescaled and added into itself to create fractal noise." [@_fileperlinpng_2012]](img/Perlin.png){#fig:perlin}

In the context of procedural cities, noise is mostly used to automate the input parameters like the terrain height map.


# Generating a city structure


## Input parameters [@cities2001, p. 2]

Most city generation methods have some form of user input. In [@cities2001], the input is a set of image maps containing elevation, water and population density plus some numbers like city block size or maximum bridge length. All further steps are completely automatic. In [@chen_interactive_2008], the input maps are similar, but the initial street flow is created based on the map boundaries. The user can then modify the tensor field to change the resulting street graph [@chen_interactive_2008_youtube].


In [@kelly_citygen_2007], the user draws the primary streets, which is used as the basis for the secondary street network.

Most of the city modeling systems expect multiple input maps. These are either created from user input, based on real data or also procedurally generated. The commonly used ones are described below.

### Geographical maps (Elevation maps, Land/water/vegetation maps)

Water map
~ Water is seen as an obstacle. The modeling system works around this, or in some cases builds bridges.

Elevation map
~ Terrain. Real streets are often aligned to the terrain map to minimize slope. Too high slopes mean no In some cases this is taken from real world data, in some it is procedurally generated using noise [@sec:noise;@_terragen] or other methods

Vegetation map
~ forests and shit

### Sociostatistical maps (Population density, Zones, Street patterns)

[@cities2001] expects a population density input map, which is not found in other programs.

Most programs have the local road pattern (see [@sec:road-pattern]) as inputs, which in real life is determined by the way the city was built.

## Generating a street network

In [@cities2001, p. 3], the street generation is modeled as follows.

[@kelly_citygen_2007]s approach is very similar to Parish and Mueller [@cities2001].

### Separate street types

Most systems employ at least two street types. [@cities2001] introduces highways and streets, where highways connect population centers and streets fill the areas according to given patterns. [@kelly_citygen_2007] follows the exact same method.

[@chen_interactive_2008] first generates a sparse network of "major roads" and fills the spaces with minor roads. Both major and minor roads follow the same alignment rules. Highways are hand-drawn by the user in this system.

### L-system with global goals and local constraints

- global goals for general direction and order like road patterns, population density
- local constraints for obstacles like water / existing elements

### Road patterns, [see @cities2001, sec. 3.2.2] {#sec:road-pattern}

[@cities2001] mentions the following three general street patterns (seee [@fig:roadp])

* Rectangular raster -- aligned to one angle and perpendicular to that. This is common in planned cities that are built in modern times
* Radial / concentric -- streets go around a center point and perpendicular streets go straight to the center
* Branching / random -- smaller streets branch from larger ones. Common in old cities that have naturally grown. In [@cities2001] this is the interpreted as no restrictions / random layout

![An overview of the street pattern used in the
CityEngine system with a short description and an example [@cities2001]](img/road-patterns.pdf){#fig:roadp}

### Constraints and solving conflicts

Streets are grown in parallel and greedily from starting points, branching off randomly.

When a new street collides with an existing street, they are connected, preferably at an already existing intersection if one is near enough. The approach in [@kelly_citygen_2007] instead has a set area ("snap radius") around the growing street that is searched for available connections.

For other obstacles such as water or mountains, [@cities2001] proposes the following solution:

If the obstacle is shorter than a preset length, it is ignored. The resulting street is marked as special according to the obstacle, e.g. as a bridge or as a tunnel.

Otherwise, the near space is searched up to a maximum rotation for alternative positions that are valid. This allows the roads to work around boundaries just like they would in reality.

If the maximum angle is reached, the road segment is truncated and simply stops at the maximum valid distance.

### Approach using tensor fields from [@chen_interactive_2008]

In this approach, the obstacle problem is solved before creating the city structure because the tensor fields are adjusted according to map boundaries.

The tensor field is converted into a road network by tracing hyperstreamlines.

## Splitting areas into building blocks

- recursively divide area until target size is reached
- fill target block with buildings

## Computation time

* @cities2001: few seconds - 10 minutes (!!reread)
* @kelly_citygen_2007: realtime
* [@chen_interactive_2008]: 5 minutes

# Generating architecture [@wonka_instant_2003]

toread: [@muller_procedural_2006]

## Procedural architecture
## "split grammar" for symmetrical modeling

- extension of shape grammars [@stiny_introduction_1980]

## Texturing

a) photographic textures
b) procedural textures


---

Andere Projekte / muss ich mir noch ankucken:

* [@subvimpl] implementiert nach [@subversion]
* [@harmful] (zeigt lsystems ansatz zur straßenmodellierung aus [@cities2001] ist unnötig kompliziert)
* [@pixelcity; @stadtmorph; @chen_interactive_2008; @kelly_citygen_2007; @kelly_survey_2006]
* Summary see [@vanegas_modelling_2010]
---

# References
