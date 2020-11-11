MAKEFLAGS += --no-builtin-rules
.SUFFIXES:

all: bin/.git bin/demo.html bin/main.js bin/index.html

bin/index.html: index.md
	pandoc -i $< --citeproc -s -t html5 --email-obfuscation=javascript -o $@

bin/%.html: %.html
	cat $< > $@

gh-pages: bin/.git
	cd bin; git add -A; git commit -m'update binaries'; git push

bin/.git:
	git worktree add bin gh-pages

.PHONY: gh-pages