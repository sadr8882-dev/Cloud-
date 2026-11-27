#!/bin/bash
# Renders "Everyone Is Smiling" part $1 in 300-frame chunks, 2 at a time (resumable), joins and muxes the mix.
cd "$(dirname "$0")/.."
P=$1; DIR=out/schunks$P; TOTAL=$([ "$P" = 1 ] && echo 1995 || echo 2190)
export TMPDIR=$PWD/.remotion-tmp P DIR TOTAL; mkdir -p $TMPDIR $DIR
one() { a=$1; b=$((a+299)); ((b>=TOTAL)) && b=$((TOTAL-1)); f=$DIR/c_$(printf %04d $a).mp4; [ -s "$f" ] && return
  echo "part $P chunk $a start $(date +%T)"
  npx remotion render src/index.ts SmilePart$P "$f.tmp.mp4" --frames=$a-$b --scale=1 --concurrency=1 --codec=h264 --crf=16 \
    --props="{\"part\":$P,\"post\":{\"msaa\":4,\"shadow\":2048,\"dpr\":0.6667}}" --gl=swangle \
    --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell --log=error --timeout=300000 \
    > $DIR/log_$a.txt 2>&1 && mv "$f.tmp.mp4" "$f" && echo "part $P chunk $a done $(date +%T)" || echo "part $P chunk $a FAILED"; }
export -f one
seq 0 300 $((TOTAL-1)) | xargs -P2 -I{} bash -c 'one {}'
n=$(ls $DIR/c_*.mp4 | wc -l); [ $n -eq $(( (TOTAL+299)/300 )) ] || { echo "EXIT 1 ($n chunks)"; exit 1; }
ls $DIR/c_*.mp4 | sed "s|^$DIR/|file '|; s/$/'/" > $DIR/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $DIR/list.txt -i ../../smile-short/audio/p$P/mix.wav -map 0:v:0 -map 1:a:0 -vf fps=30 -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 256k -t $(echo "$TOTAL/30" | bc -l) out/smile_p${P}_raw.mp4
echo "PART $P DONE $(date +%T)"; echo "EXIT 0"
