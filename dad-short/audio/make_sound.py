"""Soundtrack for "Wanted: One Dad" parts 1 and 2: an original bouncy pizzicato/glockenspiel score with tense and tender
sections, synthesized SFX on the picture's events (bell, snoring dog, bonk, whoosh, sizzle, crowd, thud, chain snap,
roars, pop, burps, applause) and the mix with the voice.
Usage: python make_sound.py <part 1|2> <voice_dir> <out_dir>  ->  mix.wav, music.wav, sfx.wav
Mix rule: music +3 dB, SFX -6 dB relative to their reference level, voice unchanged; music ducked under speech.
"""
import json, sys
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, place, st, pan, make_ir, convolve_st, integrated, read_wav, write_wav, dbg, fades
from instruments import m2f, pluck, glock, musicbox, brass, pad, triangle, timpani, cymbal, snare, snare_roll
from sfx_gen import stroll_step, flag_flutter, creak, bubbles, hammer_hit, whoosh, wood_crack, bird_chirps, breeze, hurrah, applause, babble, whoa, oof, bolt_snap, chain_whip, rattle

FPS = 30
PART = int(sys.argv[1]) if len(sys.argv) > 1 else 1
TOTAL = 2205 if PART == 1 else 2295
DUR = TOTAL / FPS
N = ns(DUR)
P1CUTS = [2.4, 3.85, 7.3, 11.1, 13.15, 14.85, 16.4, 17.4, 18.6, 20.8, 24.25, 26.85, 27.55, 29.4, 31.85, 33.55, 34.85, 36.7, 38.85, 41.6, 43.1, 45.4,
          47.55, 49.3, 50.15, 52.6, 55.05, 57.0, 59.55, 62.65, 66.3, 68.0]
P2CUTS = [2.3, 4.05, 7.0, 8.6, 10.5, 12.9, 15.15, 17.7, 20.45, 23.3, 25.4, 27.65, 32.4, 36.85, 40.35, 42.3, 44.1, 45.9, 49.6, 53.2, 56.85,
          59.9, 62.9, 64.7, 66.8, 68.75, 70.4]
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
        secs = [(0, 2.4, 62, "play"), (2.4, 3.85, 57, "sad"), (3.85, 14.85, 62, "play"), (14.85, 18.6, 62, "warm"), (18.6, 29.4, 62, "chase"),
                (29.4, 55.05, 62, "play"), (55.05, 59.55, 57, "sad"), (59.55, 66.3, 60, "mystery"), (66.3, 69.0, 57, "rise"), (69.0, DUR, 57, "hold")]
    else:
        secs = [(0, 7.0, 60, "mystery"), (7.0, 27.65, 62, "chase"), (27.65, 36.85, 60, "warm"), (36.85, 59.9, 57, "sad"),
                (59.9, 68.75, 60, "sad"), (68.75, DUR, 60, "sadend")]
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
            if mood in ("sad", "sadend"):
                prog_sad = [[0, 3, 7], [8, 12, 15], [3, 7, 10], [7, 10, 14]]
                ch = prog_sad[b % 4]
                place(out, pad([m2f(root - 12 + i) for i in ch], span, 0.22, r, att=0.9, rel=1.4), tb)
                melo = [7, 5, 3, -99, 3, 2, 0, -99] if mood == "sad" else [12, 10, 7, -99, 5, 3, 0, -99]
                for k in range(8):
                    tk = tb + k * BEAT; nt = melo[(b * 8 + k) % 8]
                    if tk >= t1 or nt < -50 or k % 2: continue
                    place(out, pan(musicbox(m2f(root + 12 + nt), 0.35, r, dur=2.0), -0.15), tk)
                continue
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


def boop(r, f0=620.0):
    t = tt(0.32)
    y = np.sin(2 * np.pi * np.cumsum(f0 * (1.0 + 0.6 * np.exp(-t / 0.03))) / SR) * np.exp(-t / 0.09)
    return (y + 0.5 * np.sin(2 * np.pi * np.cumsum(f0 * 0.5 * np.ones_like(t)) / SR) * np.exp(-t / 0.05) + hp(r.standard_normal(len(t)), 2000) * np.exp(-t / 0.01) * 0.3) * 0.8


def zap(r, up=True, dur=0.9):
    t = tt(dur)
    f = (300 + 2400 * (t / dur) ** 1.5) if up else (2600 - 2300 * (t / dur) ** 0.7)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 0.7 * 0.35
    for k in range(6):
        g = glock(m2f(84 + 3 * k), 0.25, r, dur=0.6); o = int(k * 0.08 * SR); m = min(len(g), len(y) - o)
        if m > 0: y[o:o + m] += g[:m] * 0.5
    return y


def moo(r, f0=120.0, dur=1.1):
    t = tt(dur)
    f = f0 * (1 + 0.25 * np.sin(np.pi * t / dur)) * (1 - 0.1 * t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) + 0.6 * np.sin(2 * ph) + 0.4 * np.sin(3 * ph) + 0.25 * np.sin(4 * ph)
    env = np.clip(t / 0.12, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)
    return bp(np.tanh(y * 1.4), 150, 1600) * env * 0.7


def cluck(r, n=3):
    out = np.zeros(ns(0.25 * n + 0.2))
    for i in range(n):
        t = tt(0.13); f = r.uniform(700, 950) * (1.2 - 0.5 * t / 0.13)
        y = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t / 0.04)
        place_at = int(i * r.uniform(0.18, 0.26) * SR); out[place_at:place_at + len(y)] += bp(y, 500, 3000)[: len(out) - place_at] * 0.5
    return out


def slide(r, up=False, dur=0.8):
    t = tt(dur)
    f = (1800 - 1500 * (t / dur)) if not up else (300 + 1500 * (t / dur))
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 0.02 * np.sin(2 * np.pi * 6 * t))) / SR) * np.clip(t / 0.03, 0, 1) * np.clip((dur - t) / 0.1, 0, 1) * 0.4


def splat(r):
    t = tt(0.25)
    return (lp(r.standard_normal(len(t)), 900) * np.exp(-t / 0.05) * 1.4 + np.sin(2 * np.pi * (180 - 300 * t) * t) * np.exp(-t / 0.06)) * 0.6


def crackle(r, dur=0.8):
    t = tt(dur)
    c = (r.random(len(t)) < 0.004) * r.standard_normal(len(t)) * 3
    return hp(c, 1500) * np.exp(-t / (dur * 0.5)) + pop(r)[: len(t)].copy().resize(len(t)) if False else hp(c, 1500) * np.exp(-t / (dur * 0.5))


def fizz(r, dur=1.4):
    return bubbles(dur, r, 60, f_lo=900, f_hi=4000) * 0.5 + hp(r.standard_normal(ns(dur)), 4000) * 0.05


def voice(r, dur, base, scale, rate=4.6):
    return babble(dur, r, base, scale, rate=rate, active=0.95, fmax=5000) * 1.6


def steps(r, t0, t1, rate=6.0):
    return [(t0 + k / rate, stroll_step(r, 0.3)) for k in range(int((t1 - t0) * rate))]


def ding(r):
    return glock(m2f(91), 0.6, r, dur=1.4) + 0.6 * glock(m2f(98), 0.4, r, dur=1.4)


def quack(r):
    t = tt(0.22); f = 520 * (1.2 - 0.4 * t / 0.22)
    y = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t / 0.08)
    return bp(y, 500, 2500) * 0.5


def sfx():
    r = rng(40 + PART)
    out = np.zeros((2, N))
    P = lambda x, t, g=1.0, p=0.0: place(out, pan(x, p) if x.ndim == 1 else x, t, g) if t < DUR else None
    for c in (P1CUTS if PART == 1 else P2CUTS): P(whoosh(0.45, r, peak=0.22, tail=0.15), c - 0.2, 0.14)
    P(breeze(DUR, r, 0.6, gust=0.2, bright=900), 0.0, 0.2)
    P(bird_chirps(DUR, r, 0.3), 0.0, 0.12)
    if PART == 1:
        P(babble(15.0, r, 150, 1.0), 0.0, 0.14); P(babble(14.0, r, 220, 1.2), 0.5, 0.1)
        for k in range(10): P(stroll_step(r, 0.4), 4.0 + k * 0.5, 0.3)
        P(voice(r, 1.2, 140, 1.0, 4.0), 9.8, 0.45)                                 # neigh-ish dad noise
        for k in range(12): P(stroll_step(r, 0.2) * 0.7, 7.4 + k * 0.33, 0.25)
        P(flag_flutter(3.0, r) * 0.6, 11.3, 0.35)
        P(ding(r), 17.75, 0.6)
        for k in range(6): P(whoosh(0.25, r, peak=0.1, f_lo=2000, f_hi=6000), 19.0 + k * 0.25, 0.25)   # marker squeaks
        for tm in (21.36, 22.52, 23.46): P(triangle(0.3, r), tm, 0.25)
        for tm in (26.4, 27.1, 28.0): P(hammer_hit(r, 0.25), tm, 0.35)            # tape slaps
        P(moo(r, 120), 28.55, 0.7)
        for tm in (29.6, 36.86, 43.28, 50.32): P(st(cymbal(0.3, r)), tm, 0.15); P(boop(r, 520), tm + 0.1, 0.4)
        P(crackle(r, 1.6), 32.2, 0.5); P(whoosh(1.4, r, peak=0.5, f_lo=1500, f_hi=6000, tail=0.6), 33.7, 0.6); P(fizz(r, 2.0), 34.9, 0.6)
        P(splat(r), 34.95, 0.7); P(gasp(r), 35.0, 0.35)
        P(slide(r, True, 0.3) * 0.6, 38.15, 0.5)                                    # honk
        P(snore(r, 2.2), 39.4, 0.7); P(snore(r, 2.4), 40.4, 1.0)
        P(flag_flutter(1.6, r), 41.7, 0.6); P(bird_chirps(1.6, r, 3.0), 41.7, 0.4)
        for k in range(4): P(boop(r, 900 + 120 * k) * 0.6, 44.7 + k * 0.18, 0.35)
        for k in range(8): P(boop(r, 1200 + (k % 2) * 300), 47.0 + k * 0.14, 0.5)
        for k in range(10): P(stroll_step(r, 0.1), 47.6 + k * 0.18, 0.4)
        P(hammer_hit(r, 1.0), 49.48, 0.9); P(bell(r, 900, 1.2) * 0.4, 49.5, 0.5)
        P(st(timpani(m2f(26), 0.7, r)), 50.4, 0.6)
        for tm in (52.9, 54.2): P(bark(r, 260, 0.14) * 0.7, tm, 0.7); P(splat(r), tm + 0.08, 0.4)
        P(burp(r, 80, 0.7), 54.9, 0.7)
        for k in range(4): P(stroll_step(r, 0.4), 59.6 + k * 0.28, 0.35)
        P(triangle(0.4, r), 60.9, 0.35)
        for k in range(8): P(stroll_step(r, 0.2), 66.4 + k * 0.2, 0.4)
        P(zap(r, True, 1.2), 67.9, 0.5)
    else:
        P(zap(r, True, 1.0), 0.6, 0.35); P(flag_flutter(0.8, r) * 0.4, 3.0, 0.4)
        P(ding(r), 8.6, 0.4)
        for k in range(10): P(stroll_step(r, 0.2), 10.5 + k * 0.22, 0.45)
        P(breeze(1.8, r, 2.0, gust=0.8, bright=1800), 12.7, 0.8)
        P(whoosh(0.6, r, peak=0.3), 13.9, 0.4)
        P(water_like(r, 4.0) if False else fizz(r, 3.0) * 0.3, 15.2, 0.4)
        for k in range(5): P(quack(r), 18.0 + k * 0.4, 0.6)
        for k in range(16): P(stroll_step(r, 0.2), 20.5 + k * 0.17, 0.35)
        for k in range(6): P(quack(r), 20.8 + k * 0.45, 0.35)
        P(st(cymbal(0.3, r)), 22.76, 0.25); P(quack(r), 24.05, 0.5); P(triangle(0.4, r), 24.3, 0.3)
        P(ding(r), 27.5, 0.35)
        P(triangle(0.3, r), 31.6, 0.3)
        P(creak(0.9, r) * 0.5, 37.6, 0.4)
        P(triangle(0.25, r, f=990), 39.5, 0.25)
        P(whoosh(0.5, r, peak=0.15, f_lo=2500, f_hi=7000), 44.9, 0.2)
        for k in range(5): P(stroll_step(r, 0.4) * 0.6, 57.2 + k * 0.5, 0.25)
        P(fizz(r, 2.5) * 0.4, 60.2, 0.3)
        P(triangle(0.5, r, f=1760), 71.1, 0.45); P(triangle(0.35, r, f=2640), 71.25, 0.3)
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
