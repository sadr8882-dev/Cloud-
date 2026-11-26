#!/bin/bash
# After refit_voice.py: rebuild captions (keeping the old title cards), the sound mix, and the final videos.
# usage: revoice_finish.sh <project> <part|0 for noon>
set -e
R=/home/user/Cloud-; T=$R/tools; A=$R/pisa-short/app/out
p=$1; n=$2; cd $R/$p
case "$p:$n" in
  wish-short:*) HL="WISH,PIP,DOG,TINY,ICE,CREAM,GIANT,FIRE,BIGGEST,TEN,10,CAKE,MEDAL,FOREVER,HAMSTER,LION,BURPED,CRYING,NOTEBOOK";;
  button-short:1) HL="BUTTON,PIP,PRESS,DOG,COWS,MOUSE,CHICKEN,SPAGHETTI,FIREWORKS,LEMONADE,DANCING,FLASH,AGAIN,NO";;
  button-short:2) HL="PIPS,PIP,UNDO,CAKE,CHICKEN,COWS,BUTTON,CLICK,CONFETTI,MOM,TOGETHER,MOOING";;
  dad-short:1) HL="FATHER,DAD,ME,WANTED,PANCAKES,SNORE,DINOSAURS,COW,FIREFIGHTER,CLOWN,ROBOT,DOG,LETTER,OAK,GLOWING,ONE,TWO,THREE,FOUR";;
  dad-short:2) HL="MAP,CAP,ROD,DUCK,BOOK,PANCAKES,SON,PHOTO,BABY,EARS,LETTER,DAD,LOVE,STAR,MOM,PERFECT";;
  noon-short:0) HL="";;
esac
if [ $n = 0 ]; then V=voice; CAP=captions.ass; AUD=audio; RAW=$A/noon_silent.mp4; OUT=noon_short
else V=voice/p$n; CAP=cap_p$n.ass; AUD=audio/p$n; RAW=$A/${p%-short}_p${n}_raw.mp4; OUT=${p%-short}_part$n; fi
[ -f $CAP.sky ] || cp $CAP $CAP.sky
HL="$HL" python3 $T/captions.py $V/words.json /tmp/new_$$.ass 0.68 > /dev/null
python3 - $CAP.sky /tmp/new_$$.ass $CAP <<'PY'
import sys
def ts(x): h, m, s = x.split(':'); return int(h) * 3600 + int(m) * 60 + float(s)
def fm(t): return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"
old = open(sys.argv[1]).read().splitlines(); new = open(sys.argv[2]).read().splitlines()
titles = [l for l in old if l.startswith("Dialogue: 1,")]
ends = [ts(l.split(",")[1]) for l in titles if "pos(540,300)" not in l]
cut = min(ends) if ends else 1e9
head = [l for l in new if not l.startswith("Dialogue:")]; words = []
for l in new:
    if not l.startswith("Dialogue: 0,"): continue
    f = l.split(",", 3); s, e = ts(f[1]), ts(f[2])
    if s >= cut - 0.05: continue
    f[2] = fm(min(e, cut)); words.append(",".join(f))
open(sys.argv[3], "w").write("\n".join(head + words + titles) + "\n")
print(len(words), "words +", len(titles), "titles")
PY
rm -f /tmp/new_$$.ass
cd $AUD/..; if [ $n = 0 ]; then python3 make_sound.py ../voice . 2>&1 | tail -1; MIX=$R/$p/audio/mix.wav
else python3 make_sound.py $n ../voice/p$n p$n 2>&1 | tail -1; MIX=$R/$p/audio/p$n/mix.wav; fi
cd $R/$p
ffmpeg -v error -y -i $RAW -i $MIX -map 0:v:0 -map 1:a:0 -vf "ass=$R/$p/$CAP:fontsdir=$T/fonts" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 256k -shortest ${OUT}_final.mp4
ffmpeg -v error -y -i ${OUT}_final.mp4 -vf scale=720:1280 -c:v libx264 -profile:v main -level 3.1 -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -ar 44100 -movflags +faststart ${OUT}_720.mp4
echo "DONE $p $n"
