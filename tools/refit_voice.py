"""Re-voice a finished short without re-rendering the picture: every narration line is spoken by a new Kokoro voice
and fitted (time-stretched, at most about 25 %) into the slot the old line had, so cuts and gags stay in sync.
Word timings come from Whisper on the new voice, with the script's own words put back when the counts match.
Usage: python refit_voice.py <kokoro.onnx> <voices.bin> <voice> <make_voice.py with LINES> <old_dir> <new_dir> [speed]"""
import ast, difflib, json, os, re, subprocess, sys, tempfile, wave
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
SR = 48000
def run(*a): subprocess.run(a, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
def read(p):
    with wave.open(p) as w: return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
def write(p, a):
    with wave.open(p, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())
def main(model, voices, voice, script, old, new, speed="1.0"):
    src = open(script).read()
    LINES = ast.literal_eval(re.search(r"^LINES = (\[.*?^\])", src, re.S | re.M).group(1))
    texts = [l[0] if isinstance(l, (list, tuple)) else l for l in LINES]
    olines = json.load(open(f"{old}/lines.json")); assert len(olines) == len(texts), (len(olines), len(texts))
    total = len(read(f"{old}/voice.wav")) / SR
    os.makedirs(new, exist_ok=True); k = Kokoro(model, voices); tmp = tempfile.mkdtemp()
    y = np.zeros(int(total * SR) + 4 * SR, np.float32); lines = []
    for i, (text, ol) in enumerate(zip(texts, olines)):
        a, sr = k.create(text, voice=voice, speed=float(speed), lang="en-gb" if voice[0] == "b" else "en-us")
        sf.write(f"{tmp}/r.wav", a, sr); run("ffmpeg", "-y", "-i", f"{tmp}/r.wav", "-ar", str(SR), "-ac", "1", f"{tmp}/c.wav")
        a = read(f"{tmp}/c.wav"); on = np.where(np.convolve(np.abs(a), np.ones(480) / 480, "same") > 0.01)[0]
        a = a[max(0, on[0] - 240): on[-1] + 1200]; write(f"{tmp}/c.wav", a)
        slot = ol["e"] - ol["s"]; need = (len(a) / SR) / slot; r = min(max(need, 0.82), 1.28)
        run("ffmpeg", "-y", "-i", f"{tmp}/c.wav", "-af", f"rubberband=tempo={r:.5f}:pitchq=quality", "-ar", str(SR), "-ac", "1", f"{tmp}/f.wav")
        b = read(f"{tmp}/f.wav"); st = int(ol["s"] * SR); y[st:st + len(b)] += b
        e = ol["s"] + len(b) / SR; lines.append({"i": i, "text": text, "s": ol["s"], "e": round(e, 3)})
        nx = olines[i + 1]["s"] if i + 1 < len(olines) else total
        print(f"{i:2d} {ol['s']:6.2f}-{ol['e']:6.2f} -> {e:6.2f} need x{need:.2f} used x{r:.2f}{'  OVERLAP' if e > nx - 0.03 else ''}  {text[:40]}")
    y = y[: int(total * SR)]; y = y / np.abs(y).max() * 0.89; write(f"{tmp}/all.wav", y)
    run("ffmpeg", "-y", "-i", f"{tmp}/all.wav", "-af", "highpass=f=80,equalizer=f=3000:t=q:w=1.4:g=2,acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=1", "-ac", "1", "-c:a", "pcm_s16le", f"{new}/voice.wav")
    json.dump(lines, open(f"{new}/lines.json", "w"), indent=0)
    from faster_whisper import WhisperModel
    m = WhisperModel(os.path.join(os.path.dirname(os.path.abspath(__file__)), "models/faster-whisper-small"), device="cpu", compute_type="int8")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f"{new}/voice.wav", "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], check=True, capture_output=True).stdout
    segs, _ = m.transcribe(np.frombuffer(raw, np.int16).astype(np.float32) / 32768, language="en", word_timestamps=True, initial_prompt=" ".join(texts))
    words = []
    for s in segs:
        for w in s.words:
            li = max([l["i"] for l in lines if l["s"] - 0.3 <= w.start] or [0])
            words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "i": li})
    json.dump(words, open(f"{new}/words_raw.json", "w"), indent=0)
    out, bad = [], []
    norm = lambda x: re.sub(r"[^a-z0-9']", "", x.lower())
    for l in lines:  # the script's own words, timed by Whisper (aligned with difflib; unheard words share a neighbour's time)
        ws = [w for w in words if w["i"] == l["i"]]; tok = l["text"].split()
        if not ws: bad.append(l["i"]); continue
        sm = difflib.SequenceMatcher(None, [norm(t) for t in tok], [norm(w["w"]) for w in ws], autojunk=False)
        tim = [None] * len(tok)
        for op, a0, a1, b0, b1 in sm.get_opcodes():
            if op == "equal" or (op == "replace" and a1 - a0 == b1 - b0):
                for j in range(a1 - a0): tim[a0 + j] = (ws[b0 + j]["s"], ws[b0 + j]["e"])
            elif op in ("replace", "delete"):
                if op == "replace": s0, e0 = ws[b0]["s"], ws[b1 - 1]["e"]
                else:
                    s0 = ws[b0 - 1]["e"] if b0 > 0 else l["s"]; e0 = ws[b0]["s"] if b0 < len(ws) else l["e"]
                    if e0 - s0 < 0.1: s0 = e0 - 0.1 * (a1 - a0)
                for j in range(a1 - a0): tim[a0 + j] = (s0 + (e0 - s0) * j / (a1 - a0), s0 + (e0 - s0) * (j + 1) / (a1 - a0))
                bad.append(l["i"])
        out += [{"w": t, "s": round(x[0], 3), "e": round(x[1], 3), "i": l["i"]} for t, x in zip(tok, tim)]
    json.dump(out, open(f"{new}/words.json", "w"), indent=0)
    print(f"{len(out)} words; lines with unheard words: {sorted(set(bad))}")
if __name__ == "__main__":
    main(*sys.argv[1:])
