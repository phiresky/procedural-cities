while true; do
	pandoc presentation.md -s -S -t revealjs \
		-o presentation.html --slide-level 2 \
		--filter pandoc-citeproc
	echo built $(date)
	inotifywait -e modify presentation.md
done
