"""Soundtrack for "One Wish" parts 1 and 2: an original bouncy pizzicato/glockenspiel score with tense and tender
sections, synthesized SFX on the picture's events (bell, snoring dog, bonk, whoosh, sizzle, crowd, thud, chain snap,
roars, pop, burps, applause) and the mix with the voice.
Usage: python make_sound.py <part 1|2> <voice_dir> <out_dir>  ->  mix.wav, music.wav, sfx.wav
Mix rule: music +3 dB, SFX -6 dB relative to their reference level, voice unchanged; music ducked under speech.
"""
import json, sys
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, place, st, pan, make_ir, convolve_st, integrated, read_wav, write_wav, dbg, fades
from instruments import m2f, pluck, glock, brass, pad, triangle, timpani, cymbal, snare, snare_roll
from sfx_gen import hammer_hit, whoosh, wood_crack, bird_chirps, breeze, hurrah, applause, babble, whoa, oof, bolt_snap, chain_whip, rattle

FPS = 30
PART = int(sys.argv[1]) if len(sys.argv) > 1 else 1
TOTAL = 2250 if PART == 1 else 1935
DUR = TOTAL / FPS
N = ns(DUR)
P1CUTS = [4.4, 6.25, 8.5, 13.43, 15.15, 17.72, 22.45, 26.82, 29.41, 30.21, 31.98, 33.75, 36.0, 36.9, 39.31, 40.93, 41.47, 41.93, 43.14, 47.05,
          49.48, 50.45, 51.45, 52.7, 55.09, 56.25, 57.09, 59.16, 60.9, 63.94, 64.92, 66.55, 68.92]
P2CUTS = [2.64, 4.83, 8.03, 9.4, 11.34, 13.45, 16.1, 18.4, 19.65, 20.86, 21.74, 23.17, 26.43, 29.75, 33.52, 38.07, 39.41, 40.66, 43.66,
          45.66, 51.65, 54.9, 57.51, 59.32]
BPM = 112
BEAT = 60 / BPM


def bell(r, f0=220.0, dur=3.0):
    t = tt(dur); y = np.zeros_like(t)
    for m, a, tau in [(0.5, 0.6, 2.5), (1.0, 1.0, 2.0), (1.19, 0.5, 1.5), (1.5, 0.4, 1.2), (2.0, 0.35, 0.9), (2.74, 0.2, 0.5)]:
        y += a * np.exp(-t / tau) * np.sin(2 * np.pi * f0 * m * t + r.uniform(0, 6.28))
    return y * 0.6


def snore(r, dur=2.6):
    t = tt(dur)
    env = np.clip(np.sin(np.pi * t / dur), 0, 1) ** 1.5
    buzz = np.sin(2 * np.pi * 38 * t + 3 * np.sin(2 * np.pi * 4 * t)) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 19 * t)))
    return lp(buzz * env + 0.3 * bp(r.standard_normal(len(t)), 80, 600) * env, 900) * 0.7


def bark(r, f0=180.0, dur=0.32, big=1.0):
    t = tt(dur)
    f = f0 * (1.3 - 0.5 * t / dur)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    y = y * np.exp(-t / (0.12 * big)) * np.clip(t / 0.01, 0, 1)
    y += bp(r.standard_normal(len(t)), 300, 2400) * np.exp(-t / 0.08) * 0.6
    return np.tanh(2 * y) * 0.7


def roar(r, dur=1.4):
    t = tt(dur)
    env = np.clip(t / 0.08, 0, 1) * np.clip((dur - t) / 0.5, 0, 1)
    f = 70 + 25 * np.sin(2 * np.pi * 3 * t)
    y = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + bp(r.standard_normal(len(t)), 120, 1800) * 1.2
    return np.tanh(lp(y, 2200) * 2.5 * env) * 0.8


def sizzle(r, dur=1.6):
    t = tt(dur)
    crack = (r.random(len(t)) < 0.002) * r.standard_normal(len(t)) * 4
    return (hp(r.standard_normal(len(t)), 3000) * 0.25 + hp(crack, 800)) * np.clip(t / 0.1, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)


def pop(r):
    t = tt(0.35)
    return (np.sin(2 * np.pi * (500 - 900 * t) * t) * np.exp(-t / 0.05) + bp(r.standard_normal(len(t)), 600, 5000) * np.exp(-t / 0.03)) * 0.9


def burp(r, base=90.0, dur=0.7):
    t = tt(dur)
    f = base * (1 + 0.25 * np.sin(2 * np.pi * 7 * t)) * (1 - 0.2 * t / dur)
    pulse = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (r.random(len(t)) * 0.5 + 0.5)
    return np.tanh(bp(pulse, 120, 900) * 3) * np.clip(t / 0.03, 0, 1) * np.clip((dur - t) / 0.2, 0, 1) * 0.6


def thud(r, big=1.0):
    return timpani(m2f(31), 1.0, r) * big + hammer_hit(r, 0.8 * big)[: ns(2.2)].copy().resize(ns(2.2)) if False else timpani(m2f(31), 1.0, r) * big


def gasp(r, n=10):
    out = np.zeros(ns(1.2))
    for i in range(n):
        y = whoa(r, base=r.uniform(110, 260), dur=r.uniform(0.35, 0.5))
        k = int(r.uniform(0, 0.12) * SR); out[k:k + len(y)] += y[: len(out) - k] * r.uniform(0.4, 0.8)
    return out * 0.5


def cheer(r, n=12):
    out = np.zeros(ns(1.6))
    for i in range(n):
        y = hurrah(r, base=r.uniform(110, 280), scale=r.uniform(0.95, 1.15), kid=i % 3 == 0)
        k = int(r.uniform(0, 0.3) * SR); out[k:k + len(y)] += y[: len(out) - k] * r.uniform(0.4, 0.8)
    return out * 0.5


def music():
    r = rng(31 + PART)
    out = np.zeros((2, N))
    prog_play = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]]
    prog_tense = [[0, 3, 7], [8, 12, 15], [5, 8, 12], [7, 11, 14]]
    prog_warm = [[0, 4, 7, 11], [9, 12, 16], [5, 9, 12, 16], [7, 11, 14]]
    mel = [12, 14, 16, 19, 16, 14, 12, -99, 9, 12, 14, 12, 7, 9, 12, -99]
    if PART == 1:
        secs = [(0, 13.4, 62, "play"), (13.4, 26.8, 62, "play"), (26.8, 33.7, 60, "mystery"), (33.7, 43.1, 62, "warm"), (43.1, 49.5, 62, "play"),
                (49.5, 52.6, 60, "stop"), (52.7, 57.0, 62, "play"), (57.0, 61.0, 57, "mystery"), (61.0, 68.9, 57, "tense"), (68.9, 71.2, 57, "rise"), (71.2, DUR, 57, "hold")]
    else:
        secs = [(0, 11.3, 57, "tense"), (11.3, 13.85, 57, "rise"), (13.85, 16.2, 0, "stop"), (16.2, 20.9, 62, "play"), (20.9, 23.1, 0, "stop"),
                (23.1, 33.6, 62, "chase"), (33.6, 43.6, 62, "play"), (43.6, 51.6, 60, "warm"), (51.6, 59.0, 62, "triumph"), (59.0, DUR, 62, "warm")]
    for (t0, t1, root, mood) in secs:
        bar = 4 * BEAT
        if mood == "stop":
            continue
        if mood == "rise":
            for (tk, vk) in snare_roll(t0, t1, 0.15, 0.9, r): place(out, st(snare(vk * 0.5, r, dur=0.12, buzz=True)), tk)
            place(out, pad([m2f(root + i) for i in [0, 3, 7, 12]], t1 - t0, 0.35, r, att=t1 - t0 - 0.1, rel=0.2), t0)
            continue
        if mood == "hold":
            place(out, st(cymbal(0.7, r)), t0); place(out, st(timpani(m2f(root - 24), 1.0, r)), t0)
            place(out, pad([m2f(root + i) for i in [0, 3, 6, 10]], t1 - t0, 0.35, r, att=0.05, rel=1.2), t0)
            continue
        for b in range(int(np.ceil((t1 - t0) / bar))):
            tb = t0 + b * bar
            if tb >= t1: break
            span = min(bar, t1 - tb)
            if mood in ("tense", "mystery"):
                ch = prog_tense[b % 4]
                step = BEAT / 2 if mood == "tense" else BEAT
                for k in range(int(bar / step)):
                    tk = tb + k * step
                    if tk >= t1: break
                    place(out, st(pluck(m2f(root - 12 + (0 if k % 2 == 0 else 7)), 0.55, r, dur=0.3)) * 0.5, tk)
                    if mood == "mystery" and k % 2 == 0: place(out, pan(glock(m2f(root + 24 + ch[k % 3]), 0.15, r, dur=0.8), 0.3), tk)
                if mood == "tense": place(out, st(snare(0.25, r)), tb + 2 * BEAT)
                place(out, pad([m2f(root + i) for i in ch], span, 0.2, r, att=0.3, rel=0.4), tb)
                continue
            if mood == "warm":
                ch = prog_warm[b % 4]
                place(out, pad([m2f(root + i) for i in ch], span, 0.28, r, att=0.5, rel=0.8), tb)
                for k in range(4):
                    tk = tb + k * BEAT
                    if tk < t1: place(out, pan(glock(m2f(root + 12 + ch[k % len(ch)]), 0.2, r, dur=1.4), -0.2 + 0.15 * k), tk)
                continue
            ch = prog_play[b % 4]
            vel = 0.75 if mood in ("chase", "triumph") else 0.6
            sub = 2 if mood == "chase" else 1
            for k in range(4 * sub):
                tk = tb + k * BEAT / sub
                if tk >= t1: break
                if k % 2 == 0: place(out, st(brass(m2f(root - 12 + ch[0] + (7 if k % 4 == 2 else 0)), BEAT * 0.4, vel * 0.5, r, kind="soft")), tk)
                else:
                    for i, iv in enumerate(ch): place(out, pan(pluck(m2f(root + iv), vel * 0.42, r, dur=0.4, bright=0.75), -0.3 + 0.3 * i), tk + i * 0.01)
            for k in range(8):
                tk = tb + k * BEAT / 2; note = mel[(b * 8 + k) % 16]
                if tk >= t1 or note < -50: continue
                place(out, pan(glock(m2f(root + 12 + note), vel * 0.33, r), 0.2), tk)
            if mood == "triumph" and b % 2 == 0: place(out, st(cymbal(0.3, r)), tb)
    ir = make_ir(1.2, 3)
    return 0.8 * out + 0.25 * convolve_st(out, ir)[:, :N]


def sfx():
    r = rng(40 + PART)
    out = np.zeros((2, N))
    P = lambda x, t, g=1.0, p=0.0: place(out, pan(x, p) if x.ndim == 1 else x, t, g) if t < DUR else None
    for c in (P1CUTS if PART == 1 else P2CUTS): P(whoosh(0.45, r, peak=0.22, tail=0.15), c - 0.2, 0.16)
    P(breeze(DUR, r, 0.6, gust=0.2, bright=900), 0.0, 0.2)
    P(bird_chirps(DUR, r, 0.3), 0.0, 0.15)
    if PART == 1:
        for t0 in (5.5, 6.4): P(bell(r), t0, 0.6)
        P(triangle(0.6, r), 2.4, 0.4); P(glock(m2f(96), 0.5, r), 6.35, 0.4)
        P(hammer_hit(r, 0.6), 7.3, 0.6)                                            # stamp
        P(hammer_hit(r, 1.0), 11.86, 0.8); P(timpani(m2f(40), 0.7, r), 11.86, 0.5)  # bonk
        P(whoosh(1.0, r, peak=0.5, f_lo=500, f_hi=4000, tail=0.2), 13.6, 0.8)       # mailman
        P(sizzle(r, 1.6), 15.45, 0.5)
        P(snore(r), 26.9, 0.45); P(snore(r), 29.6, 0.6); P(snore(r), 32.0, 0.8)
        P(cheer(r), 37.2, 0.5); P(applause(2.5, r, 20), 37.4, 0.35)
        P(babble(3.5, r, 160, 1.0), 39.4, 0.25)
        P(whoosh(0.8, r, peak=0.4, f_lo=900, f_hi=3000, tail=0.2), 45.7, 0.5)       # blow
        for k in range(8): P(bell(r), 49.92 + 1.6 * k, 0.6 * 0.9 ** k)
        P(gasp(r), 50.5, 0.7)
        P(whoosh(1.6, r, peak=1.2, f_lo=200, f_hi=1500, tail=0.1), 52.9, 0.8)        # fall
        P(timpani(m2f(28), 1.0, r), 54.2, 1.2); P(wood_crack(r) * 0.3, 54.2, 0.5)
        P(snore(r), 57.6, 0.7)
        for k in range(5): P(bark(r, 220, 0.12) * 0.3, 58.0 + k * 0.32, 0.3)      # sniffs
        P(roar(r, 0.9), 60.4, 0.8)
        P(bolt_snap(r), 61.68, 0.9); P(chain_whip(r), 61.75, 0.6)
        for k in range(6): P(timpani(m2f(26), 0.6, r) * 0.7, 62.1 + k * 0.5, 0.6)  # pounding steps
        for k in range(4): P(bell(r), 65.0 + 1.6 * k, 0.5)
        P(whoosh(1.4, r, peak=1.2, f_lo=200, f_hi=900, tail=0.1), 69.6, 0.4)        # breath
    else:
        for k in range(8): P(bell(r), 0.2 + 1.6 * k, 0.45)
        for k in range(10): P(timpani(m2f(26), 0.5, r) * 0.6, 0.5 + k * 1.2, 0.5)
        P(roar(r, 1.0), 5.2, 0.6)
        P(cymbal(1.0, r) if False else st(cymbal(0.9, r, bright=1.5)), 13.88, 0.6)
        P(pop(r), 14.42, 1.0)
        P(bark(r, 1100, 0.15) * 0.6, 17.6, 0.25)                                    # tiny yip
        P(cheer(r), 18.55, 0.6)
        P(roar(r, 1.5), 21.64, 1.3); P(st(timpani(m2f(26), 1.0, r)), 21.64, 0.7)
        P(gasp(r), 21.75, 0.5)
        P(whoosh(0.6, r, peak=0.4, f_lo=300, f_hi=1500, tail=0.2), 24.1, 0.6); P(timpani(m2f(30), 1.0, r), 24.62, 1.0); P(oof(r, "oof", base=90), 24.65, 0.8)
        for k in range(6): P(bark(r, 1100, 0.12) * 0.4, 26.6 + k * 0.45, 0.2)
        P(whoosh(1.2, r, peak=0.5, f_lo=500, f_hi=3500, tail=0.3), 26.7, 0.5); P(sizzle(r, 1.4), 28.54, 0.6)
        for k in range(14): P(bark(r, 900, 0.1) * 0.25, 34.5 + k * 0.21, 0.25)      # chomps
        P(burp(r, 85, 0.8), 41.28, 0.9); P(burp(r, 240, 0.5) * 0.6, 41.3, 0.6)
        P(cheer(r), 52.4, 0.5); P(applause(3.5, r, 24), 52.3, 0.4)
        P(triangle(0.6, r), 61.3, 0.4)
    return out


def speech_mask(words, pre=0.08, post=0.15):
    ctl = np.zeros(int(DUR * 100) + 2)
    for w in words:
        ctl[int((w["s"] - pre) * 100):int((w["e"] + post) * 100)] = 1
    ctl = np.convolve(ctl, np.ones(25) / 25, "same")
    return np.interp(np.arange(N) / SR, np.arange(len(ctl)) / 100, ctl)


def main(vdir, out):
    v, _sr = read_wav(f"{vdir}/voice.wav")
    v = v if v.ndim == 1 else v.mean(0)
    v = np.pad(v, (0, max(0, N - len(v))))[:N]
    words = json.load(open(f"{vdir}/words.json"))
    m, s = music(), sfx()
    vL = integrated(np.vstack([v, v]))
    m *= dbg(vL - 18 - integrated(m) + 3)
    s *= dbg(vL - 10 - integrated(s) - 6)
    m *= (1 - (1 - dbg(-6)) * speech_mask(words))[None, :]
    mix = np.vstack([v, v]) * 0.92 + m + s
    for _ in range(3):
        mix *= dbg(-15 - integrated(mix))
        c, k = dbg(-1.2), dbg(-6)
        a = np.abs(mix); over = a > k
        mix[over] = np.sign(mix[over]) * (k + (c - k) * np.tanh((a[over] - k) / (c - k)))
    mix = np.vstack([fades(c, 0.005, 0.8) for c in mix])
    write_wav(f"{out}/mix.wav", mix, 16); write_wav(f"{out}/music.wav", m, 16); write_wav(f"{out}/sfx.wav", s, 16)
    print("mix", round(integrated(mix), 2), "LUFS, len", mix.shape[1] / SR, "s")


if __name__ == "__main__":
    main(sys.argv[2], sys.argv[3])
