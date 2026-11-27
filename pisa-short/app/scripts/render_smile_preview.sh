#!/bin/bash
# Animated preview of "Everyone Is Smiling": 4 parallel 120-frame chunks, joined to out/smile_preview.mp4 (silent)
cd "$(dirname "$0")/.."
export TMPDIR=$PWD/.remotion-tmp; mkdir -p $TMPDIR out/spchunks; rm -f out/spchunks/*
one() { a=$1; b=$((a+194));
  npx remotion render src/index.ts SmilePreview out/spchunks/c_$(printf %04d $a).mp4 --frames=$a-$b --scale=1 --concurrency=1 --codec=h264 --crf=18 \
  --props='{"part":1,"post":{"msaa":4,"shadow":2048,"dpr":0.6667}}' --gl=swangle --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell \
  --log=error --timeout=300000 > out/spchunks/log_$a.txt 2>&1 && echo "chunk $a done $(date +%T)" || echo "chunk $a FAILED"; }
export -f one
seq 0 195 779 | xargs -P4 -I{} bash -c 'one {}'
(cd out/spchunks && ls c_*.mp4 | sed "s/.*/file '&'/" > list.txt)
ffmpeg -v error -y -f concat -safe 0 -i out/spchunks/list.txt -vf fps=30,scale=720:1280 -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart out/smile_preview.mp4 && echo "EXIT 0" || echo "EXIT 1"
