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

with $R \geq 0$ and $\theta \in [0,2\pi)$. There are various basis fields, such as the radial pattern (seen below the river) and the constant directional pattern (above the river). These are combined into a single pattern by adding them together while scaling them using exponential fall-off from a given center point [@chen_interactive_2008, ch. 5.2].

![Semi-automatically generated tensor field visualized using hyperstreamlines, used for creating
 a street network [@chen_interactive_2008]](img/tensor.png)

Tensor fields can be used to create a street network, allowing easy visualization of the flow direction beforehand. In [@chen_interactive_2008] they are used in a graphical user interface, to allow interactive modification of the input parameters.


## Noise (Perlin noise, Fractal noise) [@_terragen;@kelly_survey]

    - here: mostly for input parameters like height maps

# Literaturverzeichnis
