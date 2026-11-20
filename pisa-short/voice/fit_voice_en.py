"""English narration (Kokoro, voice bm_george) fitted line by line to the Russian narration's timing, so the picture
does not need a re-render. Line i here says what Russian line i says.
Usage: python fit_voice_en.py <kokoro.onnx> <voices.bin> <voice> <outdir>
"""
import json, os, subprocess, sys, tempfile, wave
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
LINES = [
    "This tower started falling over before anyone finished building it.",
    "It's eleven seventy-three. Pisa, Italy.",
    "They build a white marble bell tower.",
    "Floor after floor.",
    "But after only a few floors, the tower starts to lean.",
    "Underneath is soft clay. Sticky, wet mud.",
    "One side sinks faster.",
    "Luckily, the builders had to take a break.",
    "Unluckily, it lasted almost a hundred years.",
    "Luckily, that long break is what saved the tower.",
    "Squeeze a wet sponge, and the water drips out. The sponge gets firmer.",
    "The tower squeezed the water out of the clay, and the ground got stronger.",
    "Later, the new floors were built taller on the low side.",
    "So the tower doesn't just lean. It bends, like a banana.",
    "In nineteen thirty-four, workers poured cement under it to straighten it.",
    "It leaned even more.",
    "By nineteen ninety, the top hung four and a half metres to the side.",
    "Engineers dug soil from under the high side, bit by bit,",
    "and the tower leaned back about forty centimetres.",
    "Now it's safe for hundreds of years.",
    "And here's the funny part. Since then, it's been straightening itself.",
    "Four more centimetres.",
    "Very, very slowly.",
]

def run(*a): subprocess.run(a, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
def read(p):
    with wave.open(p) as w: return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
def write(p, a):
    with wave.open(p, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())

def main(model, voices, voice, out):
    os.makedirs(out, exist_ok=True)
    k = Kokoro(model, voices)
    lang = "en-gb" if voice.startswith("b") else "en-us"
    words = json.load(open(os.path.join(HERE, "words.json"), encoding="utf-8"))
    total = 77.22
    y = np.zeros(int(total * SR) + SR, np.float32)
    tmp = tempfile.mkdtemp()
    newwords = []
    for i, text in enumerate(LINES):
        ws = [w for w in words if w["i"] == i]
        s0, s1 = ws[0]["s"], ws[-1]["e"]
        a, sr = k.create(text, voice=voice, speed=1.0, lang=lang)
        sf.write(f"{tmp}/r{i}.wav", a, sr)
        run("ffmpeg", "-y", "-i", f"{tmp}/r{i}.wav", "-ar", str(SR), "-ac", "1", f"{tmp}/c{i}.wav")
        a = read(f"{tmp}/c{i}.wav")
        env = np.convolve(np.abs(a), np.ones(480) / 480, "same")
        on = np.where(env > 0.01)[0]
        a = a[max(0, on[0] - 240): on[-1] + 1200]
        write(f"{tmp}/c{i}.wav", a)
        ratio = (len(a) / SR) / (s1 - s0)
        # keep the voice natural: stretch at most 15 %; if it still runs long it may borrow the pause after the line
        r = min(max(ratio, 0.85), 1.15)
        run("ffmpeg", "-y", "-i", f"{tmp}/c{i}.wav", "-af", f"rubberband=tempo={r:.5f}:pitchq=quality", "-ac", "1", "-ar", str(SR), f"{tmp}/f{i}.wav")
        b = read(f"{tmp}/f{i}.wav")
        st = int(s0 * SR)
        y[st:st + len(b)] += b[: len(y) - st]
        e = s0 + len(b) / SR
        tw = text.split()
        for j, w in enumerate(tw):
            newwords.append({"w": w, "s": round(s0 + (e - s0) * j / len(tw), 3), "e": round(s0 + (e - s0) * (j + 1) / len(tw), 3), "i": i})
        nxt = [w for w in words if w["i"] == i + 1]
        warn = "  OVERLAP" if nxt and e > nxt[0]["s"] - 0.05 else ""
        print(f"{i:2d} {s0:6.2f}-{s1:6.2f} -> {e:6.2f}  need x{ratio:.2f} used x{r:.2f}{warn}  {text[:44]}")
    y = y[: int(total * SR)]
    y = y / max(1e-6, np.abs(y).max()) * 0.89
    write(f"{tmp}/all.wav", y)
    run("ffmpeg", "-y", "-i", f"{tmp}/all.wav", "-af", "highpass=f=60,equalizer=f=140:t=q:w=1:g=1.5,acompressor=threshold=-20dB:ratio=2.5:attack=5:release=80:makeup=1", "-ac", "1", "-c:a", "pcm_s16le", os.path.join(out, "voice.wav"))
    json.dump(newwords, open(os.path.join(out, "words.json"), "w"), indent=0)

if __name__ == "__main__":
    main(*sys.argv[1:5])
