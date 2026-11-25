"""Narration for "The Minute Without Gravity" (our own story): Kokoro voice pitched up for a squeaky kid narrator,
then word timings from Whisper (faster-whisper word timestamps) for the word-by-word captions.
Usage: python make_voice.py <kokoro.onnx> <voices.bin> <voice> <semitones>"""
import json, os, subprocess, sys, tempfile, wave
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
SR = 48000
LINES = [
    ("In this town, gravity switches off for one minute every day at noon.", 0.6),
    ("When the bell rings twelve, anything that isn't tied down floats away.", 0.3),
    ("So everything here is tied down.", 0.45),
    ("Dogs wear leashes to the ground. Grandpas wear iron boots. Even the soup has a lid.", 0.45),
    ("Kids love it. At noon, they unclip and float like balloons.", 0.35),
    ("But not me. I'm scared of heights.", 0.3),
    ("Every noon, I hug a lamppost and squeeze my eyes shut until it's over.", 0.5),
    ("Then one day, my little brother Pip forgot his rope.", 0.35),
    ("The bell rang, and he started rising. Over the roofs. Past the clock tower.", 0.3),
    ("Everyone was tied down. Nobody could reach him.", 0.3),
    ("Forty seconds left. When gravity comes back, he'll fall.", 0.45),
    ("So I did the scariest thing I've ever done.", 0.3),
    ("I let go of the lamppost.", 0.4),
    ("I kicked off a chimney and swam through the air like a fish.", 0.3),
    ("Ten seconds. I grabbed his sneaker.", 0.25),
    ("Five. I threw my rope around the weather vane.", 0.25),
    ("Three. Two. One.", 0.3),
    ("Gravity came back, and we swung onto the roof like two socks on a clothesline.", 0.35),
    ("Pip laughed the whole way down.", 0.5),
    ("Now noon is a holiday. The whole town lets go.", 0.4),
    ("And me? I still don't like heights. I just like my brother more.", 0.9),
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
