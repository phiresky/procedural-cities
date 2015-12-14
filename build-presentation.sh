while true; do
	pandoc presentation.md -s -S -t revealjs \
		-o implementation/bin/presentation.html --slide-level 2 \
		--filter pandoc-citeproc
	rsync img implementation/bin -a
	echo built $(date)
	inotifywait -e modify presentation.md
done
