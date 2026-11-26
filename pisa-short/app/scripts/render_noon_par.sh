#!/bin/bash
# Noon short: 300-frame chunks rendered 4 at a time (resumable), then joined to out/noon_silent.mp4.
cd "$(dirname "$0")/.."
export TMPDIR=$PWD/.remotion-tmp; mkdir -p $TMPDIR out/nchunks
TOTAL=1980; STEP=300
one() {
  a=$1; b=$((a+299)); ((b>=1980)) && b=1979
  f=out/nchunks/c_$(printf %04d $a).mp4; [ -s "$f" ] && return
  echo "chunk $a start $(date +%T)"
  npx remotion render src/index.ts NoonShort "$f.tmp.mp4" --frames=$a-$b --scale=1 --concurrency=1 --codec=h264 --crf=16 \
    --props='{"post":{"msaa":4,"shadow":2048,"dpr":0.6667}}' --gl=swangle \
    --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell \
    --log=error --timeout=300000 > out/nchunks/log_$a.txt 2>&1 && mv "$f.tmp.mp4" "$f" && echo "chunk $a done $(date +%T)" || echo "chunk $a FAILED"
}
export -f one
seq 0 $STEP $((TOTAL-1)) | xargs -P4 -I{} bash -c 'one {}'
n=$(ls out/nchunks/c_*.mp4 | wc -l); [ $n -eq 7 ] || { echo "EXIT 1 ($n chunks)"; exit 1; }
(cd out/nchunks && ls c_*.mp4 | sed "s/.*/file '&'/" > list.txt)
ffmpeg -v error -y -f concat -safe 0 -i out/nchunks/list.txt -vf fps=30 -c:v libx264 -crf 16 -pix_fmt yuv420p out/noon_silent.mp4
echo "EXIT 0 $(date +%T)"
