#!/bin/bash

# use `FMT=tex ./build.sh` to get the .tex file

pandoc \
	ausarbeitung.md \
	--filter pandoc-citeproc \
	--standalone \
	--template ausarbeitung-template.tex \
	--chapters \
	-o ausarbeitung.${FMT:-pdf}
