all: bin bin/index.html bin/render.browser.js
bin/index.html: index.html
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
