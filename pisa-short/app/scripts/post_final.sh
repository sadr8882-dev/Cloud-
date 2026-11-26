#!/bin/bash
# usage: post_final.sh <name> <assetdir>   e.g. button button-short
N=$1; D=/home/user/Cloud-/$2; cd /home/user/Cloud-/pisa-short/app
until grep -q EXIT out/${N}_render1.log && grep -q EXIT out/${N}_render2.log; do sleep 60; done
for P in 1 2; do
  ffmpeg -y -loglevel error -i out/${N}_p${P}_raw.mp4 -vf "ass=$D/cap_p$P.ass:fontsdir=/home/user/Cloud-/tools/fonts" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a copy $D/${N}_part${P}_final.mp4
  ffmpeg -y -loglevel error -i $D/${N}_part${P}_final.mp4 -vf scale=720:1280 -c:v libx264 -profile:v main -level 3.1 -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -ar 44100 -movflags +faststart $D/${N}_part${P}_720.mp4
done
echo POSTDONE >> out/${N}_post.log
