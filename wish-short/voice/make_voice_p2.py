"""Narration for "One Wish" (our own story): Kokoro voice pitched up for a squeaky kid narrator,
then word timings from Whisper (faster-whisper word timestamps) for the word-by-word captions.
Usage: python make_voice.py <kokoro.onnx> <voices.bin> <voice> <semitones>"""
import json, os, subprocess, sys, tempfile, wave
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
SR = 48000
LINES = [
    ("In this town, everyone gets one wish. Mine got stolen by my little brother.", 0.4),
    ("And now the biggest dog in the world was running straight at him.", 0.35),
    ("The clock was still ringing, so I yelled the first thing in my head.", 0.3),
    ("I wish that dog was tiny!", 0.5),
    ("There was a flash. A pop. And then, silence.", 0.5),
    ("The dog was the size of a hamster.", 0.4),
    ("Everybody cheered. For about one second.", 0.35),
    ("Because it still barked like a lion.", 0.5),
    ("Grandpa tried to catch it. He missed by three meters.", 0.4),
    ("The mailman chased it so fast, he caught fire again.", 0.4),
    ("Mom yelled at it, but nobody heard. Peace and quiet, remember?", 0.45),
    ("Then the tiny dog ate the entire giant ice cream. In four seconds.", 0.45),
    ("It looked at Pip.", 0.3),
    ("Pip looked at it.", 0.3),
    ("And they both burped at exactly the same time.", 0.5),
    ("That's when the mayor started crying.", 0.35),
    ("Not because his dog was tiny. Because it finally fit on his lap. He'd waited eight years for a cuddle.", 0.45),
    ("He gave me a medal for the best wish in town history.", 0.45),
    ("Mom says I wasted my wish on a dog. I think it was a pretty good trade.", 0.4),
    ("Besides, Pip owes me a birthday now. Forever.", 0.9),
]
def main(model, voices, voice, semi):
    k = Kokoro(model, voices); tmp = tempfile.mkdtemp()
    pieces, t, lines = [np.zeros(int(0.25 * SR), np.float32)], 0.25, []
    for i, (text, pause) in enumerate(LINES):
        a, sr = k.create(text, voice=voice, speed=1.08, lang="en-us"); sf.write(f"{tmp}/r.wav", a, sr)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{tmp}/r.wav", "-af", f"aresample={SR},rubberband=pitch={2 ** (float(semi) / 12):.4f}:formant=shifted:pitchq=quality", "-ac", "1", f"{tmp}/c.wav"], check=True)
        with wave.open(f"{tmp}/c.wav") as w: a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        on = np.where(np.convolve(np.abs(a), np.ones(480) / 480, "same") > 0.01)[0]; a = a[max(0, on[0] - 240): on[-1] + 1200]
        lines.append({"i": i, "text": text, "s": round(t, 3), "e": round(t + len(a) / SR, 3)})
        pieces += [a, np.zeros(int(pause * SR), np.float32)]; t += len(a) / SR + int(pause * SR) / SR
    y = np.concatenate(pieces); y = y / np.abs(y).max() * 0.89
    with wave.open(f"{tmp}/all.wav", "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{tmp}/all.wav", "-af", "highpass=f=90,equalizer=f=3000:t=q:w=1.4:g=2,acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=1", "-ac", "1", "-c:a", "pcm_s16le", "voice.wav"], check=True)
    json.dump(lines, open("lines.json", "w"), indent=0)
    # word timings from Whisper, matched back to each line
    from faster_whisper import WhisperModel
    m = WhisperModel(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../tools/models/faster-whisper-small"), device="cpu", compute_type="int8")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", "voice.wav", "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], check=True, capture_output=True).stdout
    segs, _ = m.transcribe(np.frombuffer(raw, np.int16).astype(np.float32) / 32768, language="en", word_timestamps=True, initial_prompt=" ".join(l["text"] for l in lines))
    words = []
    for s in segs:
        for w in s.words:
            li = next((l["i"] for l in lines if l["s"] - 0.15 <= w.start <= l["e"] + 0.15), -1)
            words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "i": li})
    json.dump(words, open("words.json", "w"), indent=0)
    print(f"{t:.2f} s, {len(words)} words")
    for l in lines: print(l["i"], l["s"], l["e"], l["text"][:50])
if __name__ == "__main__":
    main(*sys.argv[1:5])
