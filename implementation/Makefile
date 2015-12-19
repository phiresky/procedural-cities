MAKEFLAGS += --no-builtin-rules
.SUFFIXES:

all: bin bin/demo.html bin/render.browser.js bin/index.html

bin/index.html: index.md
	pandoc -i $< --filter pandoc-citeproc -s -S -t html5 -o $@

bin/%.html: %.html
	cat $< > $@

bin/%.browser.js: $(patsubst %.ts, bin/%.js, $(wildcard *.ts))
	browserify bin/$*.js >$@

bin/%.js: tsc/%.js
	babel --plugins transform-es2015-parameters,transform-es2015-destructuring $< > $@

tsc/%.js: %.ts
	tsc

bin:
	mkdir -p bin

gh-pages: bin/.git
	cd bin; git add -A; git commit -m'update binaries'; git push

clean:
	rm -r bin/* tsc/*

.PHONY: gh-pages
.PRECIOUS: bin/%.js tsc/%.js
