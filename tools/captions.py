"""Word-by-word captions (the reel style): one big word at a time, white with a thick dark outline, a quick pop-in.
Writes an ASS file from words.json [{"w","s","e"}] that ffmpeg burns in:
  python captions.py <words.json> <out.ass> [y_fraction=0.68] [font=Lilita One]
  ffmpeg -i in.mp4 -vf "ass=out.ass:fontsdir=tools/fonts" -c:a copy out.mp4
Capital words stay; everything is upper-cased for punch; punctuation dropped."""
import json, os, re, sys
words = json.load(open(sys.argv[1], encoding="utf-8"))
out = sys.argv[2]; yf = float(sys.argv[3]) if len(sys.argv) > 3 else 0.68; font = sys.argv[4] if len(sys.argv) > 4 else "Lilita One"
W, H = 1080, 1920
ts = lambda x: f"{int(x // 3600)}:{int(x % 3600 // 60):02d}:{x % 60:05.2f}"
head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Word,{font},118,&H00FFFFFF,&H00FFFFFF,&H00261724,&H80000000,0,0,0,0,100,100,2,0,1,9,4,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
HL = set(os.environ["HL"].split(",")) if os.environ.get("HL") else {"NOON", "GRAVITY", "PIP", "TWELVE", "ONE", "TWO", "THREE", "FIVE", "TEN", "FORTY", "HEIGHTS", "ROPE"}
lines = []
for i, w in enumerate(words):
    txt = re.sub(r"[^\w'’-]", "", w["w"]).upper()
    if not txt: continue
    s = w["s"]; e = words[i + 1]["s"] if i + 1 < len(words) and words[i + 1]["s"] - w["e"] < 0.35 else w["e"] + 0.12
    e = max(e, s + 0.12)
    pop = r"{\an5\pos(%d,%d)\fscx72\fscy72\t(0,70,\fscx108\fscy108)\t(70,130,\fscx100\fscy100)}" % (W // 2, int(H * yf))
    colour = r"{\c&H3AD4F5&}" if txt in HL else ""
    lines.append(f"Dialogue: 0,{ts(s)},{ts(e)},Word,,0,0,0,,{pop}{colour}{txt}")
open(out, "w", encoding="utf-8").write(head + "\n".join(lines) + "\n")
print(len(lines), "captions")
