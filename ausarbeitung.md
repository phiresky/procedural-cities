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

Tensor fields can be used to create a street network, allowing easy visualization of the flow direction beforehand. In [@chen_interactive_2008] they are used in a graphical user interface, to allow interactive modification of the input parameters.


## Gradient Noise [@_terragen;@kelly_survey]

Gradient noise created from a map of interpolated random gradients, creating a smooth-looking bumpy surface. It is used in many aspects of content generation in computer graphics to create nature-like effects. It can be used to create or enhance textures and generate terrain [@_terragen]. The simple noise is smooth, but can be summed in multiple scales to create fractal noise as seen in [@fig:perlin].

A commonly used type of gradient noise is Perlin noise [@perlin_improving_2002], which is easy to calculate and gives good results.

!["Perlin noise rescaled and added into itself to create fractal noise." [@_fileperlinpng_2012]](img/Perlin.png){#fig:perlin}

In the context of procedural cities, noise is mostly used to automate the input parameters like the terrain height map.


# Generating a city structure

## Input parameters [@cities2001, p. 2]

Most city generation methods have some form of user input. In [@cities2001], the input is a set of image maps containing elevation, water and population density plus some numbers like city block size or maximum bridge length. All further steps are completely automatic. In [@chen_interactive_2008], the input maps are similar, but the initial street flow is created based on the map boundaries. The user can then modify the tensor field to change the resulting street graph [@peterwonkaresearch_2008].

The commonly used inputs are described below.

### Geographical maps (Elevation maps, Land/water/vegetation maps)
### Sociostatistical maps (Population density, Zones, Street patterns)

- created from user input, based on real data or also procedurally generated [@_terragen]

## Generating a street network according to [@cities2001, p. 3]
### Separate street types
#### Highways (connect population centers)
#### Streets
### L-system with global goals and local constraints

- global goals for general direction and order like road patterns, population density
- local constraints for obstacles like water / existing elements

### Road patterns, [see @cities2001, sec. 3.2.2]

- all streets aligned to one angle (planned city)
- radial structure around center point
- random / population based (naturally grown city)

### Constraints and solving conflicts

- connect colliding streets at existing intersections
- for other obstacles:
    a) ignore up to certains lengths, mark as e.g. bridge
    b) search up to maximum rotation for possible alternatives
    c) truncate road segment

### Approach using tensor fields from [@chen_interactive_2008]

- ...

## Splitting areas into building blocks

- recursively divide area until target size is reached
- fill target block with buildings

# Generating architecture [@instantArch]
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
* [@pixelcity; @stadtmorph; @chen_interactive_2008; @kelly_citygen_2007; @kelly_survey]

---

# References
