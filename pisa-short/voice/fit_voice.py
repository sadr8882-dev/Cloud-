"""Re-voice the narration with another TTS voice while keeping the picture's timing.
Each line (make_voice.LINES) is synthesized with RHVoice, cleaned up, time-stretched with rubberband to the span the
line had in the original words.json, and placed at the same start. words.json stays valid for the picture.
Usage: python fit_voice.py <rhvoice_voice> <outdir>
"""
import json, os, re, subprocess, sys, tempfile, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, "make_voice.py"), encoding="utf-8").read()
LINES = [t for t, _ in re.findall(r'\("([^"]+)", ([\d.]+)\)', src)]
SR = 48000

def run(*a): subprocess.run(a, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def read(p):
    with wave.open(p) as w: return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768

def main(voice, out):
    os.makedirs(out, exist_ok=True)
    words = json.load(open(os.path.join(HERE, "words.json"), encoding="utf-8"))
    total = 77.22
    y = np.zeros(int(total * SR) + SR, np.float32)
    tmp = tempfile.mkdtemp()
    for i, text in enumerate(LINES):
        ws = [w for w in words if w["i"] == i]
        s0, s1 = ws[0]["s"], ws[-1]["e"]
        raw, clean = f"{tmp}/r{i}.wav", f"{tmp}/c{i}.wav"
        subprocess.run(["RHVoice-test", "-p", voice, "-o", raw], input=text.encode(), check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        run("ffmpeg", "-y", "-i", raw, "-af", "aresample=48000", "-ac", "1", clean)
        a = read(clean)
        env = np.convolve(np.abs(a), np.ones(480) / 480, "same")
        on = np.where(env > 0.01)[0]
        a = a[max(0, on[0] - 240): on[-1] + 1200]
        with wave.open(clean, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((a * 32767).astype(np.int16).tobytes())
        ratio = (len(a) / SR) / (s1 - s0)  # >1 = speed up
        fit = f"{tmp}/f{i}.wav"
        run("ffmpeg", "-y", "-i", clean, "-af", f"rubberband=tempo={ratio:.5f}:pitchq=quality", "-ac", "1", "-ar", str(SR), fit)
        b = read(fit)
        k = int(s0 * SR)
        y[k:k + len(b)] += b[: len(y) - k]
        print(f"{i:2d} {s0:6.2f}-{s1:6.2f}  tempo x{ratio:.2f}  {text[:40]}")
    y = y[: int(total * SR)]
    y = y / max(1e-6, np.abs(y).max()) * 0.89
    raw = f"{tmp}/all.wav"
    with wave.open(raw, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype(np.int16).tobytes())
    run("ffmpeg", "-y", "-i", raw, "-af", "highpass=f=70,equalizer=f=150:t=q:w=1:g=2.5,equalizer=f=3000:t=q:w=1.5:g=2,acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=1.5", "-ac", "1", "-c:a", "pcm_s16le", os.path.join(out, "voice.wav"))
    json.dump(words, open(os.path.join(out, "words.json"), "w", encoding="utf-8"), ensure_ascii=False)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
