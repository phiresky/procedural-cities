_=$(shell echo hi)

all: bin/index.html bin/mapgen.browser.js

bin/index.html: index.html bin
	cat $< > $@

bin/mapgen.babel.js: bin/mapgen.js
	babel --plugins transform-es2015-parameters,transform-es2015-destructuring $< > $@

bin/mapgen.browser.js: bin/mapgen.babel.js
	browserify $< > $@

bin/mapgen.js: mapgen.ts
	tsc

bin:
	mkdir -p bin

gh-pages: bin/.git
	cd bin; git add -A; git commit -m'update binaries'; git push

.PHONY: gh-pages
