fname=$(date +'img/%Y%m%d%H%M%S'.png)
scrot -s $fname
echo "![]($fname)"|xsel -b

