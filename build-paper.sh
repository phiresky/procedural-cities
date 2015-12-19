#!/bin/bash

# use `FMT=tex ./build-paper.sh` to get the .tex file

pandoc \
	paper.md \
	--filter pandoc-crossref \
	--filter pandoc-citeproc \
	--standalone \
	--template paper-template.tex \
	--chapters \
	-o ausarbeitung.${FMT:-pdf}
