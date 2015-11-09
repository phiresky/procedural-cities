---
title: Procedural Modeling of Cities
author: Robin
bibliography: prosem.bib
institute: |
	Institut für Visualisierung und Datenanalyse,\
	Lehrstuhl für Computergrafik
link-citations: true
header-includes: |
	\setkeys{Gin}{width=0.8\linewidth,height=5cm,keepaspectratio}
csl: ieee.csl
---
<style>img {width:400px}</style>


# Overview

The first popular paper about procedural city modeling is [@cities2001] (2001), which contains a general approach to modeling of the street network and building architecture and is citied in nearly every subsequent document. It is also the basis for CityEngine [@cityengine] which is a professional software application for semi-automated city modeling. [@wonka_instant_2003] (2003) contains more specific and complex algorithms for modeling architecture.

[@lechner_procedural_2003] ...

[@weber_interactive_2009] uses a time based approach.

[@vanegas_modelling_2010] and [@vanegas_procedural_2012] give an extensive overview over a lot of other papers.

!!todo others

## Approaches to city / street network generation

### L-system based approach by Parish and Mueller [-@cities2001]

##### Input

* Elevation map and Land/water map -- used as obstacles
* Population density map -- used for highways and street density
* Street patterns map -- specifies local type of street patterns
* Zone map (residential, commercial or mixed) -- used for architecture choices
* maximum house height map -- used for architecture

##### Algorithm

Uses an extended parametric L-system with constraint functions.

![Left: Input maps (water, elevation, population density). Right: Sample output from [@cities2001, fig. 2]](img/20151109203325.png)


### Approach using agents by Lechner et al. [-@lechner_procedural_2003]

##### Input

* Elevation map
* Initial seed position
* Optionally local modifications to the rules

##### Algorithm

Begins from a single seed.
Uses multiple simultaneous agents interacting with their local environment according to a set of rules. The environment consists of rectangular patches. Only generates tertiary roads, no highways.

There are two types of agents. Extender agents search the land for areas that are not reachable from existing streets and create streets according to the elevation maps. Connector agents walk along the road network, choose random near destinations and comparing the current path finding distance to the optimal distance. If there is significant improvement, a new road segment is added.

![Sample output from [@lechner_procedural_2003, fig. 4]](img/20151109201926.png)

### Approach from Citygen by Kelly and McCabe [-@kelly_citygen_2007]

##### Input

* Corner points of the primary road network

##### Algorithm

First the primary road network is created according to the general layouts described in [@sec:road-patterns]. For every resulting enclosed region the secondary road network is created independently and in parallel.

Primary Roads are created with a set start and target point. The road is built using an algorithm that walks in the direction of the destination, with a maximum angle of deviation, sampling the possible next points (see [@fig:roadSampling]). The next point is chosen so the elevation difference along the completed road is as evenly distributed as possible.

![Road interval sampling [@kelly_citygen_2007, fig. 3]](img/20151109203028.png){#fig:roadSampling}

Secondary roads are generated starting from the middle of the longest sides of the primary road network. The roads grow in parallel, splitting off randomly with some specified angle plus deviation. When encountering existing roads with some maximum distance, the roads are connected, whereas existing intersections are preferred.

### Approach using tensor fields by Chen et al. [-@chen_interactive_2008]

##### Input

* Binary Water map -- interpreted as obstacles
* Binary Park and forest map -- interpreted as obstacles
* Elevation map
* Population density map

##### Algorithm

From the set of input maps, the initial tensor field (see [@sec:tensor-fields]) is generated. The obstacle maps are converted to boundaries, the tensors are aligned so the major eigenvectors are in parallel to the boundaries. The elevation map is used to set the major direction to minimize the height difference of the roads. Then the user interactively adds preset tensor fields that correspond to the road patterns from [@sec:road-patterns]. All of the overlayed basis tensor fields are then blended together.

The tensor field is then converted to a road map by tracing hyperstreamlines (see [@fig:radial-tensor]).

![Left: radial input tensor field (Green: major, magenta: minor hyperstreamlines), Right: resulting road map [@chen_interactive_2008, fig. 5]](img/20151109205310.png){#fig:radial-tensor}



![Left: Semi-automatically generated tensor field visualized using hyperstreamlines. Right: tensor field used for creating
 a street network [@chen_interactive_2008, fig. 1]](img/tensor.png){#fig:tensor}

### Time-based approach by Weber et al. [-@weber_interactive_2009]

##### Input

* Elevation map
* list of city centers and growth centers
* percentage of street growth per year
* average land price per year
* list of street patterns
* land use type definitions and corresponding use percentages, construction setback values and building generation rules

##### Algorithm

Streets are build on demand according to a traffic simulation. The traffic simulation is created by simulating residents that make trips to random targets in the city.

todo?: read http://www.train-fever.com/data/xian_slides_train_fever.pdf

![Sample output (green: residential areas, blue: industrial zones)[@weber_interactive_2009, fig. 4]](img/20151109213837.png)

### Approach by Lipp et al. [@lipp_interactive_2011]

...

### Approach by Venegas et al. [@vanegas_procedural_2012]

...

## Approaches to architecture generation

###  Approach by [@cities2001]

...

###  Approach by [@wonka_instant_2003]

...

###  Approach by [@muller_procedural_2006]

...

###  Approach by [@coelho_expeditious_2007]

...

###  Approach by [@kelly_citygen_2007]

...

###  Approach by [@weber_interactive_2009]

...

###  Approach by [@subversion]

...

###  Approach by [@lipp_interactive_2011]

...


# General concepts and methods

## Procedural modeling

Procedural modeling is a general term for creating graphics or models from automatically or semi-automatically from an algorithm or a set of rules and a pseudorandom number generator.

## Lindenmayer Systems (L-systems) [@beauty]

L-systems are a popular tool for all kinds of procedural modeling, because they allow the description of the generation algorithm as a set of rules.

### L-Systems

As defined by Lindenmayer in [@beauty, ch. 1], an L-System is a formal grammer defined as $G=(V, \omega, P)$, where

* $V$ is the alphabet
* $\omega \in V^+$ is the initial word, called the *axiom*
* $P \subset V \times V^*$ is a set of production rules that each map from one letter to a sequence of letters.

Letters that do not have production rules are assigned an implicit identity rule $a\to a$. Those are called terminal symbols, because once they are reached the letter will stop changing.

In general, an L-system can be deterministic or non-deterministic. It is deterministic when there is exactly one rule for each letter in $V$.

In contrast to normal formal grammars, the rule application in L-systems is simultaneous. L-systems can be finite, meaning they that after some number of iterations the only matching rules are $a\to a$. When using non-finite L-systems, rule application is stopped when some condition is reached, for example when a specific number of iterations is reached or when the resulting changes become insignificant.

L-systems can be context-sensitive or context-free. In [@hanan_parametric_1992, ch. 2.2],$(m)L-systems$ are defined as l-systems where each rule can access $m$ symbols to the left. The definition of $(m,n)$L-Systems then has the context of m letters to the left and n letters to the right. The classical Lindenmayer system is thus a 0L-system.

### Parametric L-Systems [@hanan_parametric_1992]

Parametric L-Systems are an extensions to L-Systems allowing the incorporation of arbitrary functions into L-Systems. Each letter can have assigned *parameters* which are real numbers, and can be combined with variables and regular arithmetic operators like $+, *, \geq, \dots$. Rules can then also be conditional on the parameter. As an example, the rule

$$A(t): t>5 \to B(t+1)CD(t \wedge 0.5)$$

replaces $A(t)$ with $B(t+1)CD(t\wedge 0.5)$ if and only if $t > 5$.

Additionally, external functions can be called from these rules.

### Applications in procedural city modeling

Originally used for plant modeling, L-systems can be applied to more complex problems with the above extensions. In [@cities2001], they are used extensively for creation of the road network and modeling of building architecture.

The newer relevant documents avoid L-systems (except [@coelho_expeditious_2007]), replacing them with custom algorithms or regular grammars in both modeling of architecture and of the street network for various reasons:

> With regard to the application of L-
systems to buildings, we have to consider that the structure of a
building is fundamentally different from the structure of plants (or
streets)–most importantly, a building is not designed with a growth-
like process, but a sequence of partitioning steps.
> -- [@wonka_instant_2003]


> An L-system seemed inapt because of
the parameter bloat that would result from all the specific
exceptions and particularities that may come with a given
culture -- [@lechner_procedural_2003]

> Our generation algorithm is
distinct in that it is computationally efficient and contains a
number of optimisation to enable it to run in real-time. -- [@kelly_citygen_2007, sec. 3.2]

> While [the approach by Parish and Mueller] creates a high quality solution, there remains a significant challenge: the method does not allow extensive user-control of
the outcome to be easily integrated into a production environment. [@chen_interactive_2008, sec. 1]

> We chose not to embed the
expansion in an L-system framework to make the implemen-
tation more efficient. -- [@weber_interactive_2009]

> While parallel
grammars like L-systems are suited to capture growth over time,
a sequential application of rules allows for the characterization
of structure i.e. the spatial distribution of features and compo-
nents [Prusinkiewicz et al. 2001]. Therefore, CGA Shape is a se-
quential grammar (similar to Chomsky grammars)
> -- [@muller_procedural_2006, sec. 2]

## Tensor fields [@chen_interactive_2008] {#sec:tensor-fields}

As defined in [@chen_interactive_2008], an tensor field is a continuous function from every 2-dimensional point $\mathbf p$ to a tensor $T(\mathbf p)$. A tensor is defined as

$$R\begin{pmatrix}
\cos{2 \theta} & \sin{2 \theta} \\
\sin{2 \theta} & -\cos{2 \theta} \\
\end{pmatrix}$$

with $R \geq 0$ and $\theta \in [0,2\pi)$. There are various basis fields, such as the radial pattern (seen below the river in [@fig:tensor]) and the constant directional pattern (above the river in [@fig:tensor]). These are combined into a single pattern by adding them together while scaling them using exponential fall-off from a given center point [@chen_interactive_2008, ch. 5.2].

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
~ Water is seen as an obstacle, no buildings are allowed here. Streets are build around water in most cases, sometimes a bridge crossing the water is built.

Elevation map
~ Terrain. Real streets are often aligned to the terrain map to minimize slope. Too high slopes mean no In some cases this is taken from real world data, in some it is procedurally generated using noise [@sec:noise;@_terragen] or other methods

Vegetation map
~ forests and shit

### Sociostatistical maps (Population density, Zones, Street patterns)

[@cities2001] expects a population density input map, which is not found in other programs.

Most programs have the local road pattern (see [@sec:road-patterns]) as inputs, which in real life is determined by the way the city was built.

## Generating a street network

In [@cities2001, p. 3], the street generation is modeled as follows.

[@kelly_citygen_2007]s approach is very similar to Parish and Mueller [@cities2001].

### Separate street types

Most systems employ at least two street types. [@cities2001] introduces highways and streets, where highways connect population centers and streets fill the areas according to given patterns. [@kelly_citygen_2007] follows the exact same method.

[@chen_interactive_2008] first generates a sparse network of "major roads" and fills the spaces with minor roads. Both major and minor roads follow the same alignment rules. Highways are hand-drawn by the user in this system.

### L-system with global goals and local constraints

In [@cities2001] a complex L-system is used to produce the road network. The L-system has two external functions: `localConstraints` and `globalGoals`. GlobalGoals is used for the general structure of the roads. For the highways this is done by searching for the nearest population centers and navigating in that direction. Secondarily, highways and also streets are directed according to road patterns, described in the next section.

LocalConstraints contains more local rules relevant for specific points on the map. In these specific points (described in [@sec:constraints]) the localConstraints function can adjust the parameters of the next iteration, or return FAILED if no there is no solution.

### Road patterns, [see @cities2001, sec. 3.2.2] {#sec:road-patterns}

[@cities2001] mentions the following three general street patterns (see [@fig:roadp])

* Rectangular raster -- aligned to one angle and perpendicular to that. This is common in planned cities that are built in modern times
* Radial / concentric -- streets go around a center point and perpendicular streets go straight to the center
* Branching / random -- smaller streets branch from larger ones. Common in old cities that have naturally grown. In [@cities2001] this is the interpreted as no restrictions / random layout

![An overview of the street pattern used in the
CityEngine system with a short description and an example [@cities2001]](img/road-patterns.pdf){#fig:roadp}

### Constraints and solving conflicts {#sec:constraints}

Streets are grown in parallel and greedily from starting points, branching off randomly.

When a new street collides with an existing street, they are connected, preferably at an already existing intersection if one is near enough. The approach in [@kelly_citygen_2007] instead has a set area ("snap radius") around the growing street that is searched for available connections.

For other obstacles such as water or mountains, [@cities2001] proposes the following solution:

If the obstacle is shorter than a preset length, it is ignored. The resulting street is marked as special according to the obstacle, e.g. as a bridge or as a tunnel.

Otherwise, the near space is searched up to a maximum rotation for alternative positions that are valid. This allows the roads to work around boundaries just like they would in reality.

If the maximum angle is reached, the road segment is truncated and simply stops at the maximum valid distance.

### Approach using tensor fields from [@chen_interactive_2008]

In this approach, the obstacle problem is solved before creating the city structure because the tensor fields are adjusted according to map boundaries.

The tensor field is converted into a road network by tracing hyperstreamlines. These hyperstreamlines are aligned to the eigenvector field of the tensors.

Intersections between real roads tend to have near right angles, because that creates the most efficient street navigation. In tensor fields, the major and minor eigenvectors are perpendicular to each other, so the resulting street layout created from them using the methods described in [@chen_interactive_2008] is similar to that of real road networks.

## Splitting areas into building blocks

When the network graph is complete, thet resulting areas need to be devided into blocks.

First, the streets are expanded to have a width. The resulting blocks are converted into a polygon. For simplification this polygon must be convex in [@cities2001]. Then the block is recursively divided along the longest approximately parallel edges until a specified maximum target size is reached. Every resulting area that is too small, or does not have direct access to a street, is discarded. The remaining blocks are interpreted as the base area for the building generation.

![The lot division process [@cities2001, fig. 10]](img/20151108215824.png)

## Computation time

Here are some data points for execution time of the algorithms presented in some papers.

* [@cities2001]\: 10 seconds for the street graph, 10 minutes for building blocks and architecture
* [@chen_interactive_2008]\: 5 minutes
* [@kelly_citygen_2007]\: realtime
* [@lechner_procedural_2003]\: ?

# Generating architecture [@wonka_instant_2003]

toread: [@muller_procedural_2006]

## Procedural architecture
## "split grammar" for symmetrical modeling

- extension of shape grammars [@stiny_introduction_1980]

## Texturing

a) photographic textures
b) procedural textures


# todo

Andere Projekte / muss ich mir noch ankucken:

* [@subvimpl] implementiert nach [@subversion]
* [@harmful] (zeigt lsystems ansatz zur straßenmodellierung aus [@cities2001] ist unnötig kompliziert)
* [@pixelcity; @stadtmorph; @chen_interactive_2008; @kelly_survey_2006]
* Summary see [@vanegas_modelling_2010]


# References
