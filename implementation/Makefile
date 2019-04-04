MAKEFLAGS += --no-builtin-rules
.SUFFIXES:

all: bin/.git bin/demo.html bin/render.browser.js bin/index.html

bin/index.html: index.md
	pandoc -i $< --filter pandoc-citeproc -s -t html5 --email-obfuscation=javascript -o $@

bin/%.html: %.html
	cat $< > $@

bin/%.browser.js: $(patsubst %.ts, bin/%.js, $(wildcard *.ts))
	browserify bin/$*.js >$@

bin/%.js: tsc/%.js
	babel --plugins transform-es2015-parameters,transform-es2015-destructuring $< > $@

tsc/%.js: %.ts
	tsc

gh-pages: bin/.git
	cd bin; git add -A; git commit -m'update binaries'; git push

bin/.git:
	git worktree add bin gh-pages

clean:
	rm -r bin/* tsc/*

.PHONY: gh-pages
.PRECIOUS: bin/%.js tsc/%.js
