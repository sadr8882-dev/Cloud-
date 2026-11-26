"""Narration for "The Wrong Button" (our own story): Kokoro voice pitched up for a squeaky kid narrator,
then word timings from Whisper (faster-whisper word timestamps) for the word-by-word captions.
Usage: python make_voice.py <kokoro.onnx> <voices.bin> <voice> <semitones>"""
import json, os, subprocess, sys, tempfile, wave
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
SR = 48000
LINES = [
    ("In this town, there are now two Pips. And one of them is me.", 0.45),
    ("I said: I'm the real big brother! It came out very squeaky.", 0.35),
    ("The other Pip said the exact same thing. Even squeakier.", 0.45),
    ("We ran home to Mom. She looked at us. Then at the dog. The dog said: don't look at me.", 0.4),
    ("Mom said: there's only one way to know. And she brought out a chocolate cake.", 0.35),
    ("The real Pip would eat it all in one bite. The real me would share.", 0.35),
    ("We both ate it in one bite. Mom fainted.", 0.45),
    ("Meanwhile, the town was a mess. The chicken mailman was laying letters. In eggs.", 0.4),
    ("Floating cows were mooing over the bakery. There was spaghetti everywhere.", 0.4),
    ("And the tiny mayor stood on his dog's nose, shouting orders nobody could hear.", 0.45),
    ("Then Grandpa had an idea. If the button did it, the button can undo it.", 0.4),
    ("So we all climbed the clock tower. The whole town. Even the cows.", 0.4),
    ("At the top, Grandpa turned the button over. On the back, there was a tiny blue button.", 0.35),
    ("It said: undo.", 0.5),
    ("Everyone looked at Pip. Both Pips. The other Pip reached for it...", 0.3),
    ("And I stopped him. This time, I said, we press it together.", 0.45),
    ("Click. The cows landed. The mayor grew back. The spaghetti turned into confetti.", 0.4),
    ("I was me again. Pip was Pip. And Mom woke up.", 0.4),
    ("Almost everything went back to normal.", 0.45),
    ("Except the mailman. He's still a chicken. Honestly, he seems happier.", 1.4),
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
