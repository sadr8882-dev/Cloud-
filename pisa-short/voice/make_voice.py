"""Russian narration for the Pisa short with Piper (voice ru-irinia-medium, GPLv2 data from RHVoice).
Usage: python make_voice.py <model.onnx> <outdir>
Writes voice.wav (48 kHz mono, 16-bit) and words.json [{"w","s","e","i"}] (i = line index).
Piper's old model gives no alignments, so word times are phoneme-weighted inside each line's trimmed speech span.
"""
import json, sys, wave, subprocess, re
import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig

# (text, pause after in seconds). Numbers spelled out for the phonemizer.
LINES = [
    ("Эта башня начала падать ещё до того, как её достроили.", 0.7),
    ("Тысяча сто семьдесят третий год. Пиза, Италия.", 0.3),
    ("Тут строят колокольню из белого мрамора.", 0.25),
    ("Этаж за этажом.", 0.3),
    ("Но уже через несколько этажей башня кренится.", 0.35),
    ("Под ней мягкая глина — липкая мокрая земля.", 0.25),
    ("Одна сторона проседает быстрее.", 0.45),
    ("К счастью, строителям пришлось сделать перерыв.", 0.3),
    ("К несчастью, перерыв длился почти сто лет.", 0.35),
    ("К счастью, именно этот перерыв и спас башню.", 0.5),
    ("Сожми мокрую губку — вода вытекает, и губка твердеет.", 0.3),
    ("Башня так же выжимала воду из глины, и земля стала крепче.", 0.45),
    ("Потом новые этажи строили выше с низкой стороны.", 0.25),
    ("Поэтому башня ещё и изогнута, как банан.", 0.5),
    ("В тысяча девятьсот тридцать четвёртом под неё залили цемент, чтобы выпрямить.", 0.3),
    ("Она наклонилась ещё сильнее.", 0.5),
    ("К тысяча девятьсот девяностому верх отклонился на четыре с половиной метра.", 0.3),
    ("Инженеры понемногу вынули землю из-под высокой стороны,", 0.15),
    ("и башня выпрямилась примерно на сорок сантиметров.", 0.3),
    ("Теперь она простоит ещё сотни лет.", 0.5),
    ("А самое смешное — с тех пор она выпрямляется сама.", 0.3),
    ("Ещё на четыре сантиметра.", 0.3),
    ("Очень-очень медленно.", 0.9),
]
LEAD_IN = 0.25
SR_OUT = 48000

def main(model, out):
    v = PiperVoice.load(model)
    cfg = SynthesisConfig(length_scale=0.94, noise_scale=0.6, noise_w_scale=0.7)
    sr = v.config.sample_rate
    pieces, words, t = [np.zeros(int(LEAD_IN * sr), np.float32)], [], LEAD_IN
    for i, (text, pause) in enumerate(LINES):
        say = text.replace("—", ",")
        a = np.concatenate([np.frombuffer(c.audio_int16_bytes, np.int16) for c in v.synthesize(say, cfg)]).astype(np.float32) / 32768
        env = np.convolve(np.abs(a), np.ones(220) / 220, "same")
        on = np.where(env > 0.012)[0]
        a = a[max(0, on[0] - 200): min(len(a), on[-1] + 600)]
        dur = len(a) / sr
        # phoneme-weighted word spans; punctuation inside the line adds a pause weight
        toks = text.replace("—", " — ").split()
        spoken = [w for w in toks if re.search(r"\w", w)]
        weights, pauses = [], []
        for w in spoken:
            ph = [p for p in sum(v.phonemize(w.strip(",.!?")), []) if p not in "ˈˌ ,.!?"]
            weights.append(max(2, len(ph)))
            pauses.append(4.0 if re.search(r"[,—:]$", w) or (toks.index(w) + 1 < len(toks) and toks[toks.index(w) + 1] == "—") else 0.0)
        total = sum(weights) + sum(pauses[:-1])
        k = dur / total
        x = t
        for w, wt, pz in zip(spoken, weights, pauses):
            words.append({"w": w.strip(",.!?—"), "s": round(x, 3), "e": round(x + wt * k, 3), "i": i})
            x += (wt + pz) * k
        pieces += [a, np.zeros(int(pause * sr), np.float32)]
        t += dur + int(pause * sr) / sr
    y = np.concatenate(pieces)
    y = y / max(1e-6, np.abs(y).max()) * 0.89
    raw = f"{out}/voice_{sr}.wav"
    with wave.open(raw, "wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(sr); wf.writeframes((y * 32767).astype(np.int16).tobytes())
    # 48 kHz, gentle cleanup: high-pass rumble, light de-ess, slight warmth
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af",
                    "highpass=f=80,equalizer=f=6500:t=q:w=2:g=-3,equalizer=f=220:t=q:w=1:g=1.5,aresample=48000:resampler=soxr",
                    "-ac", "1", "-c:a", "pcm_s16le", f"{out}/voice.wav"], check=True)
    json.dump(words, open(f"{out}/words.json", "w"), ensure_ascii=False, indent=0)
    print(f"{len(words)} words, {t:.2f} s")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
