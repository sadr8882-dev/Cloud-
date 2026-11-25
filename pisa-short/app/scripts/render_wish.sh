#!/bin/bash
# Renders "One Wish" part $1 in 300-frame chunks (resumable), joins (re-encoded) and muxes the mix.
cd "$(dirname "$0")/.."
P=$1; DIR=out/wchunks$P; TOTAL=$([ "$P" = 1 ] && echo 2250 || echo 1935); STEP=300
export TMPDIR=$PWD/.remotion-tmp; mkdir -p $TMPDIR $DIR
B="--gl=swangle --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell --log=error --timeout=300000"
PROPS="{\"part\":$P,\"post\":{\"msaa\":4,\"shadow\":2048,\"dpr\":0.6667}}"
for ((a=0; a<TOTAL; a+=STEP)); do
  b=$((a+STEP-1)); ((b>=TOTAL)) && b=$((TOTAL-1))
  f=$DIR/c_$(printf %04d $a).mp4
  [ -s "$f" ] && continue
  echo "part $P chunk $a-$b start $(date +%T)"
  npx remotion render src/index.ts WishPart$P "$f.tmp.mp4" --frames=$a-$b --scale=1 --concurrency=1 --codec=h264 --crf=16 --props="$PROPS" $B > $DIR/log_$a.txt 2>&1 && mv "$f.tmp.mp4" "$f" || { echo "part $P chunk $a failed"; exit 1; }
  echo "part $P chunk $a-$b done $(date +%T)"
done
ls $DIR/c_*.mp4 | sed "s|^$DIR/|file '|; s/$/'/" > $DIR/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $DIR/list.txt -i ../../wish-short/audio/p$P/mix.wav -map 0:v:0 -map 1:a:0 -vf fps=30 -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 256k -t $(echo "$TOTAL/30" | bc -l) out/wish_p${P}_raw.mp4
echo "PART $P DONE $(date +%T)"
