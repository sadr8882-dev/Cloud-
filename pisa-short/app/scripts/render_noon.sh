#!/bin/bash
# Renders the Pisa short in 300-frame chunks (resumable), then joins them and muxes the mix.
cd "$(dirname "$0")/.."
export TMPDIR=$PWD/.remotion-tmp; mkdir -p $TMPDIR out/nchunks
B="--gl=swangle --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell --log=error --timeout=300000"
P='{"post":{"msaa":4,"shadow":2048,"dpr":0.6667}}'
TOTAL=1980; STEP=300
for ((a=0; a<TOTAL; a+=STEP)); do
  b=$((a+STEP-1)); ((b>=TOTAL)) && b=$((TOTAL-1))
  f=out/nchunks/c_$(printf %04d $a).mp4
  [ -s "$f" ] && continue
  echo "chunk $a-$b start $(date +%T)"
  npx remotion render src/index.ts NoonShort "$f.tmp.mp4" --frames=$a-$b --scale=1 --concurrency=1 --codec=h264 --crf=16 --props="$P" $B > out/nchunks/log_$a.txt 2>&1 && mv "$f.tmp.mp4" "$f" || { echo "chunk $a failed"; exit 1; }
  echo "chunk $a-$b done $(date +%T)"
done
ls out/nchunks/c_*.mp4 | sed "s/^/file '..\//; s/$/'/" | sed "s|file '../out/nchunks/|file '|" > out/nchunks/list.txt
ffmpeg -v error -y -f concat -safe 0 -i out/nchunks/list.txt -c copy out/noon_silent.mp4
ffmpeg -v error -y -i out/noon_silent.mp4 -i ../../noon-short/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest out/noon_short.mp4
echo "ALL DONE $(date +%T)"
