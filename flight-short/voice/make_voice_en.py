"""Narration for "The Brother Who Crashed First" (Wright brothers, edu mode) with Kokoro, voice bm_george.
Usage: python make_voice_en.py <kokoro.onnx> <voices.bin> <outdir>  -> voice.wav (48 kHz mono) + words.json
Word times are character-weighted inside each line's trimmed speech span (Kokoro gives no alignments).
"""
import json, os, re, subprocess, sys, tempfile, wave
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

SR = 48000
LINES = [  # (text, pause after)
    ("The first airplane flight was shorter than the wings of a jumbo jet.", 0.7),
    ("It's nineteen oh three. Two brothers from Ohio fix bicycles.", 0.3),
    ("They dream of building a flying machine.", 0.4),
    ("Everyone says it's impossible.", 0.25),
    ("One famous inventor's plane falls into a river.", 0.45),
    ("So the brothers build a wind tunnel, a box with a fan,", 0.15),
    ("and test over two hundred tiny wings.", 0.4),
    ("Here's the secret. Stick your hand out of a car window and tilt it up.", 0.2),
    ("The air pushes it up. That push is called lift.", 0.3),
    ("A wing works the same way, just much bigger.", 0.5),
    ("In December, they take their plane to a windy beach.", 0.3),
    ("They flip a coin to see who flies first.", 0.3),
    ("Wilbur wins, and three seconds later, crashes into the sand.", 0.45),
    ("Three days later, it's Orville's turn.", 0.3),
    ("He lies on the wing, the engine roars, and the plane lifts off.", 0.35),
    ("Twelve seconds. Thirty-seven metres.", 0.45),
    ("Luckily, that was enough to change the world.", 0.3),
    ("Unluckily, a gust of wind flipped the plane that same day.", 0.25),
    ("It never flew again.", 0.5),
    ("Today, a jumbo jet's wings are longer than that whole flight.", 0.35),
    ("And Wilbur? He made the longest flight that day.", 0.3),
    ("Fifty-nine seconds. Not bad for the brother who crashed first.", 0.9),
]
LEAD = 0.25

def main(model, voices, out):
    os.makedirs(out, exist_ok=True)
    k = Kokoro(model, voices)
    tmp = tempfile.mkdtemp()
    pieces, words, t = [np.zeros(int(LEAD * SR), np.float32)], [], LEAD
    for i, (text, pause) in enumerate(LINES):
        a, sr = k.create(text, voice="bm_george", speed=1.06, lang="en-gb")
        sf.write(f"{tmp}/r.wav", a, sr)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{tmp}/r.wav", "-ar", str(SR), "-ac", "1", f"{tmp}/c.wav"], check=True)
        with wave.open(f"{tmp}/c.wav") as w:
            a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        env = np.convolve(np.abs(a), np.ones(480) / 480, "same")
        on = np.where(env > 0.01)[0]
        a = a[max(0, on[0] - 240): on[-1] + 1200]
        dur = len(a) / SR
        toks = text.split()
        wts = [max(2, len(re.sub(r"[^\w]", "", w))) + (3 if re.search(r"[,.?]$", w) else 0) for w in toks]
        kk, x = dur / sum(wts), t
        for w, wt in zip(toks, wts):
            words.append({"w": re.sub(r"[^\w'-]", "", w), "s": round(x, 3), "e": round(x + wt * kk * 0.85, 3), "i": i})
            x += wt * kk
        pieces += [a, np.zeros(int(pause * SR), np.float32)]
        t += dur + int(pause * SR) / SR
    y = np.concatenate(pieces)
    y = y / np.abs(y).max() * 0.89
    with wave.open(f"{tmp}/all.wav", "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{tmp}/all.wav", "-af", "highpass=f=60,equalizer=f=140:t=q:w=1:g=1.5,acompressor=threshold=-20dB:ratio=2.5:attack=5:release=80:makeup=1", "-ac", "1", "-c:a", "pcm_s16le", f"{out}/voice.wav"], check=True)
    json.dump(words, open(f"{out}/words.json", "w"), indent=0)
    print(f"{len(words)} words, {t:.2f} s")
    for i in range(len(LINES)):
        ws = [w for w in words if w["i"] == i]
        print(i, ws[0]["s"], ws[-1]["e"], " | ".join(f"{w['w']}@{w['s']}" for w in ws))

if __name__ == "__main__":
    main(*sys.argv[1:4])
