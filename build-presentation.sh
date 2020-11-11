while true; do
	pandoc presentation.md -s -t revealjs \
		-o implementation/bin/presentation.html --slide-level 2 \
		--citeproc
	rsync img implementation/bin -a
	echo built $(date)
	inotifywait -e modify presentation.md
done
