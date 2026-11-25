"""Soundtrack for the Pisa short: an original light Italian-flavoured score (mandolin-like plucks with tremolo,
glockenspiel, soft tuba bass, pad), synthesized SFX on the picture's events, and the mix with the Russian voice.
Usage: python make_sound.py <voice_dir> <out_dir>   ->  mix.wav (48 kHz stereo, exact length), music.wav, sfx.wav
Mix rule (skill): music +3 dB, SFX -6 dB relative to their reference level, voice unchanged; music ducked under speech.
"""
import json, sys
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, place, st, pan, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav, dbg, fades
from instruments import m2f, pluck, glock, brass, pad, triangle, timpani, cymbal, snare
from sfx_gen import hammer_hit, whoosh, wood_crack, creak, bubbles, bird_chirps, crickets, breeze, hurrah, applause, stroll_step, rattle, babble

FPS = 30
TOTAL = 1980
DUR = TOTAL / FPS
N = ns(DUR)
# picture time constants (mirrors story.ts W / SHOTS)
W = dict(twelve=4.94, tied=9.04, leashes=10.76, iron=12.92, lid=14.7, kids=15.45, balloons=17.9, heights=20.22, lamppost=22.1,
         pip=26.78, rope=27.6, rang=28.44, rising=29.4, roofs=30.42, tower=31.64, reach=34.48, forty=35.3, fall=37.76, scariest=39.28,
         letgo=41.06, kicked=43.04, chimney=43.6, fish=45.36, ten=45.94, sneaker=47.32, five=48.02, vane=49.9, three=50.66, two=51.02,
         one=51.28, gravity=51.86, swung=53.26, clothesline=55.18, laughed=56.34, holiday=59.04, lets=60.24, me=61.42, brother=63.66)
CUTS = [f / FPS for f in [125, 166, 236, 302, 352, 412, 460, 565, 627, 758, 843, 911, 947, 970, 1057, 1103, 1157, 1229, 1286, 1376, 1440, 1517, 1531, 1538, 1554, 1684, 1745, 1838]]
FLASH = 125 / FPS
BPM = 104
BEAT = 60 / BPM


def music():
    r = rng(21)
    out = np.zeros((2, N))
    secs = [(0, 4.2, 60, "play"), (4.2, 18.9, 60, "play"), (18.9, 25.4, 57, "slow"), (25.4, 38.6, 57, "tense"), (38.6, 51.9, 62, "tense"),
            (51.9, 58.3, 60, "play"), (58.3, DUR, 62, "end")]
    prog = [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]]
    mel = [12, 16, 19, 16, 14, 12, 11, 7, 9, 12, 14, 16, 19, 21, 19, -99]
    for (t0, t1, root, mood) in secs:
        bar = 4 * BEAT
        for b in range(int(np.ceil((t1 - t0) / bar))):
            tb = t0 + b * bar
            if tb >= t1: break
            ch = prog[b % 4]
            if mood == "tense":
                for k in range(8):
                    tk = tb + k * BEAT / 2
                    if tk < t1:
                        place(out, st(pluck(m2f(root - 12 + (0 if k % 2 == 0 else 7)), 0.55, r, dur=0.3)) * 0.55, tk)
                        place(out, pan(glock(m2f(root + 24 + ch[k % 3]), 0.18, r, dur=0.6), 0.3), tk)
                place(out, pad([m2f(root + i) for i in ch], min(bar, t1 - tb), 0.22, r, att=0.3, rel=0.4), tb)
                continue
            vel = 0.45 if mood in ("slow", "end") else 0.6
            for k in range(4):
                tk = tb + k * BEAT * (1.3 if mood == "slow" else 1.0)
                if tk >= t1: break
                if k % 2 == 0: place(out, st(brass(m2f(root - 12 + ch[0]), BEAT * 0.5, vel * 0.5, r, kind="soft")), tk)
                else:
                    for i, iv in enumerate(ch): place(out, pan(pluck(m2f(root + iv), vel * 0.45, r, dur=0.5, bright=0.7), -0.3 + 0.3 * i), tk + i * 0.01)
            if mood != "slow":
                for k in range(8):
                    tk = tb + k * BEAT / 2; note = mel[(b * 8 + k) % 16]
                    if tk >= t1 or note < -50: continue
                    place(out, pan(glock(m2f(root + 12 + note), vel * 0.33, r), 0.2), tk)
            else:
                place(out, pad([m2f(root + i) for i in ch], min(bar * 1.3, t1 - tb), 0.22, r), tb)
    place(out, st(glock(m2f(72), 0.5, r, dur=2.0)) * 0.5, W["twelve"] - 0.5)
    place(out, st(cymbal(0.45, r)) * 0.5, FLASH)
    place(out, st(timpani(m2f(36), 1.0, r)) * 1.0, W["gravity"])
    place(out, st(cymbal(0.6, r)) * 0.6, W["gravity"] + 0.05)
    place(out, st(triangle(0.6, r)) * 0.5, W["laughed"])
    ir = make_ir(1.3, 3)
    return 0.8 * out + 0.25 * convolve_st(out, ir)[:, :N]


def bell(r, f0=220.0, dur=3.0):
    t = tt(dur); y = np.zeros_like(t)
    for m, a, tau in [(0.5, 0.6, 2.5), (1.0, 1.0, 2.0), (1.19, 0.5, 1.5), (1.5, 0.4, 1.2), (2.0, 0.35, 0.9), (2.74, 0.2, 0.5)]:
        y += a * np.exp(-t / tau) * np.sin(2 * np.pi * f0 * m * t + r.uniform(0, 6.28))
    return y * 0.6


def sfx():
    r = rng(17)
    out = np.zeros((2, N))
    P = lambda x, t, g=1.0, p=0.0: place(out, pan(x, p) if x.ndim == 1 else x, t, g)
    for c in CUTS: P(whoosh(0.5, r, peak=0.22, tail=0.15), c - 0.22, 0.2)
    for t0 in (0.0, W["twelve"], W["rang"]): P(bell(r), t0, 0.7)
    for k in range(3): P(bell(r, 220.0), W["twelve"] + 0.9 * (k + 1), 0.45)
    P(breeze(DUR, r, 0.6, gust=0.2, bright=900), 0.0, 0.25)
    P(bird_chirps(DUR, r, 0.3), 0.0, 0.2)
    # floating: soft rising whooshes on noon shots
    for t0 in (0.3, 15.6, 28.5, 41.2, 43.0, 58.4):
        P(whoosh(1.4, r, peak=0.9, f_lo=500, f_hi=2600, tail=0.4) , t0, 0.35)
    P(bubbles(0.2, r, 1, f_lo=500, f_hi=900), W["leashes"] + 0.2, 0.3)  # dog boof-ish
    P(hammer_hit(r, 0.35), W["iron"] + 0.1, 0.4)
    P(hammer_hit(r, 0.3), W["iron"] + 0.5, 0.35)
    P(glock(m2f(96), 0.4, r), W["lid"] + 0.1, 0.3)
    P(applause(1.6, r, 8), W["balloons"] - 0.4, 0.25)
    P(whoosh(0.6, r, peak=0.05, f_lo=800, f_hi=3000, tail=0.3), W["letgo"] + 0.25, 0.5)
    P(hammer_hit(r, 0.4), W["chimney"], 0.4)
    P(whoosh(0.8, r, peak=0.1, f_lo=700, f_hi=2500, tail=0.3), W["vane"] - 0.8, 0.5)
    P(wood_crack(r) * 0.5, W["gravity"] + 0.05, 0.6)
    P(creak(2.5, r, rate0=60, rate1=110), W["swung"], 0.5)
    P(applause(3.0, r, 20), W["holiday"] - 0.2, 0.4)
    return out


def speech_mask(words, pre=0.08, post=0.15):
    ctl = np.zeros(int(DUR * 100) + 2)
    for w in words:
        ctl[int((w["s"] - pre) * 100):int((w["e"] + post) * 100)] = 1
    k = np.ones(25) / 25
    ctl = np.convolve(ctl, k, "same")
    return np.interp(np.arange(N) / SR, np.arange(len(ctl)) / 100, ctl)


def main(vdir, out):
    v, _sr = read_wav(f"{vdir}/voice.wav")
    v = v if v.ndim == 1 else v.mean(0)
    v = np.pad(v, (0, max(0, N - len(v))))[:N]
    words = json.load(open(f"{vdir}/words.json"))
    m, s = music(), sfx()
    vL = integrated(np.vstack([v, v]))
    # reference levels: music bed -18 LU under the voice, SFX -10 LU; then the skill's rule: music +3 dB, SFX -6 dB
    m *= dbg(vL - 18 - integrated(m) + 3)
    s *= dbg(vL - 10 - integrated(s) - 6)
    duck = 1 - (1 - dbg(-6)) * speech_mask(words)
    m *= duck[None, :]
    mix = np.vstack([v, v]) * 0.92 + m + s
    for _ in range(3):  # gain to -15 LUFS, soft limiter above -6 dBFS (ceiling -1.2 dBFS), repeat to settle
        mix *= dbg(-15 - integrated(mix))
        c, k = dbg(-1.2), dbg(-6)
        a = np.abs(mix)
        over = a > k
        mix[over] = np.sign(mix[over]) * (k + (c - k) * np.tanh((a[over] - k) / (c - k)))
    mix = fades(mix, 0.005, 0.8) if mix.ndim == 1 else np.vstack([fades(c, 0.005, 0.8) for c in mix])
    write_wav(f"{out}/mix.wav", mix, 16)
    write_wav(f"{out}/music.wav", m, 16)
    write_wav(f"{out}/sfx.wav", s, 16)
    print("mix", round(integrated(mix), 2), "LUFS, len", mix.shape[1] / SR, "s")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
