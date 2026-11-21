"""Fit pre-generated narration lines (l00.wav, l01.wav, ...) to the timing of an existing words.json, line by line,
so the rendered picture can be re-voiced without a re-render. Each line is trimmed, time-stretched with rubberband
(at most 0.8x..1.25x), placed at the original line start; if it still runs long it borrows the following pause.
Usage: python fit_lines.py <lines_dir> <old_words.json> <total_seconds> <out_dir>
"""
import json, os, subprocess, sys, tempfile, wave
import numpy as np
SR = 48000
def run(*a): subprocess.run(a, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
def read(p):
    with wave.open(p) as w: return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
def write(p, a):
    with wave.open(p, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())
def main(ld, wj, total, out):
    total = float(total); os.makedirs(out, exist_ok=True)
    words = json.load(open(wj, encoding="utf-8")); n = max(w["i"] for w in words) + 1
    y = np.zeros(int(total * SR) + SR, np.float32); tmp = tempfile.mkdtemp(); new = []
    for i in range(n):
        ws = [w for w in words if w["i"] == i]; s0, s1 = ws[0]["s"], ws[-1]["e"]
        run("ffmpeg", "-y", "-i", f"{ld}/l{i:02d}.wav", "-ar", str(SR), "-ac", "1", f"{tmp}/c.wav")
        a = read(f"{tmp}/c.wav"); env = np.convolve(np.abs(a), np.ones(480) / 480, "same"); on = np.where(env > 0.01)[0]
        a = a[max(0, on[0] - 240): on[-1] + 1200]; write(f"{tmp}/c.wav", a)
        need = (len(a) / SR) / (s1 - s0); r = min(max(need, 0.8), 1.25)
        run("ffmpeg", "-y", "-i", f"{tmp}/c.wav", "-af", f"rubberband=tempo={r:.5f}:pitchq=quality", "-ac", "1", "-ar", str(SR), f"{tmp}/f.wav")
        b = read(f"{tmp}/f.wav"); st = int(s0 * SR); y[st:st + len(b)] += b[: len(y) - st]; e = s0 + len(b) / SR
        new.append({"w": f"line{i}", "s": round(s0, 3), "e": round(e, 3), "i": i})
        nxt = [w for w in words if w["i"] == i + 1]
        print(f"{i:2d} {s0:6.2f}-{s1:6.2f} -> {e:6.2f} need x{need:.2f} used x{r:.2f}{'  OVERLAP' if nxt and e > nxt[0]['s'] - 0.05 else ''}")
    y = y[: int(total * SR)]; y = y / max(1e-6, np.abs(y).max()) * 0.89; write(f"{tmp}/all.wav", y)
    run("ffmpeg", "-y", "-i", f"{tmp}/all.wav", "-af", "highpass=f=70,equalizer=f=170:t=q:w=1:g=1.5,equalizer=f=3200:t=q:w=1.4:g=2,acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=1", "-ac", "1", "-c:a", "pcm_s16le", f"{out}/voice.wav")
    json.dump(new, open(f"{out}/words.json", "w"), indent=0)
if __name__ == "__main__":
    main(*sys.argv[1:5])
