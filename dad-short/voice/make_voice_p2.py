"""Narration for "Wanted: One Dad" (our own story): Kokoro voice pitched up for a squeaky kid narrator,
then word timings from Whisper (faster-whisper word timestamps) for the word-by-word captions.
Usage: python make_voice.py <kokoro.onnx> <voices.bin> <voice> <semitones>"""
import json, os, subprocess, sys, tempfile, wave
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
SR = 48000
LINES = [
    ('In this town, there is an old oak tree. And inside it, I found a map.', 0.45),
    ('It said: find three things, and you will know me.', 0.5),
    ('Thing number one: a cap. At the very top of the clock tower.', 0.4),
    ('I climbed all two hundred stairs. The wind tried to take it. I said: no way.', 0.5),
    ('Thing number two: a fishing rod, by the pond.', 0.35),
    ('A duck had it. The duck did not want to give it back.', 0.4),
    ('We ran three laps around the pond. The duck won. But then, he gave it back anyway.', 0.5),
    ('Thing number three: a recipe book, at the bakery.', 0.4),
    ('On the first page, in big letters, it said: pancakes for my son.', 0.6),
    ('The last line of the map pointed to a tree house I had never noticed before.', 0.5),
    ('Inside, there was a box. And in the box, there was a photo.', 0.5),
    ('A man, holding a tiny baby. The baby had my ears.', 0.7),
    ('And there was a letter.', 0.7),
    ("If you are reading this, you are big now. I can't be there with you.", 0.6),
    ('But I left you my cap, my fishing rod, and our pancakes.', 0.5),
    ("Every time you make them, I'm right there with you. Love, Dad.", 0.9),
    ('I read it three times. Then I went home.', 0.6),
    ('That night, I made pancakes for Mom. They were a little burned. She said they were perfect.', 0.6),
    ('I put one more plate on the table. And his cap, right next to it.', 0.7),
    ('Then I looked out the window. And one star winked at me.', 1.6),
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
