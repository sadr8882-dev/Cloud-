"""Narration for "One Wish" (our own story): Kokoro voice pitched up for a squeaky kid narrator,
then word timings from Whisper (faster-whisper word timestamps) for the word-by-word captions.
Usage: python make_voice.py <kokoro.onnx> <voices.bin> <voice> <semitones>"""
import json, os, subprocess, sys, tempfile, wave
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
SR = 48000
LINES = [
    ("In this town, everyone gets exactly one wish, on their tenth birthday.", 0.5),
    ("You make it when the clock tower rings, and it comes true. No take-backs.", 0.45),
    ("Grandpa wished to be taller. Now he's three meters tall and bonks his head on everything.", 0.4),
    ("The mailman wished to be fast. Now your letters arrive slightly on fire.", 0.4),
    ("Mom wished for peace and quiet. Nobody has heard her drop a pan in twelve years.", 0.4),
    ("Our neighbor wished for summer forever. He hasn't stopped sweating since I was born.", 0.45),
    ("And the mayor wished for the biggest dog in the world. He got it.", 0.35),
    ("It sleeps next to town hall. Nobody wakes it up. Ever.", 0.5),
    ("I've been planning my wish for years. I have a whole notebook.", 0.35),
    ("And today, finally, I turned ten.", 0.45),
    ("The whole town came to watch. Cake. Candles. Clock tower ready.", 0.4),
    ("Then my little brother Pip leaned over my cake and blew out my candles.", 0.3),
    ("And he said, I wish I had an ice cream.", 0.35),
    ("The clock rang. Everyone gasped. My wish was gone.", 0.45),
    ("A giant ice cream fell out of the sky. Pip was very happy. I was not.", 0.45),
    ("But somebody else smelled it too.", 0.4),
    ("The mayor's dog woke up.", 0.45),
    ("It snapped its chain and ran straight for the ice cream. And straight for Pip.", 0.35),
    ("The clock was still ringing. If I made a wish now, maybe it would still count.", 0.35),
    ("So I took a deep breath, closed my eyes, and yelled...", 1.4),
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
