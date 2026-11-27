"""Soundtrack for "Everyone Is Smiling" parts 1 and 2 (horror): a detuned music-box lullaby over a low breathing
drone, a heartbeat under the tense scenes, a pulsing chase, low booms + screeching stingers on the reveals, and SFX:
sea and gulls by day, crickets and surf by night, doors creaking open, the town marching in perfect step, the clock,
three taps on the glass, a whisper, running feet, the lamp-room door bursting open, grinding gears, a ticking key.
Usage: python make_sound.py <part 1|2> <voice_dir> <out_dir>  ->  mix.wav, music.wav, sfx.wav
"""
import json, sys
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, place, st, pan, make_ir, convolve_st, integrated, read_wav, write_wav, dbg, fades
from instruments import m2f, musicbox, pad, timpani
from sfx_gen import stroll_step, creak, whoosh, bird_chirps, crickets, water_bed, boot, hammer_hit, clink

FPS = 30
PART = int(sys.argv[1]) if len(sys.argv) > 1 else 1
TOTAL = 1995 if PART == 1 else 2190
DUR = TOTAL / FPS
N = ns(DUR)


def music():
    r = rng(71 + PART)
    out = np.zeros((2, N))
    # low drone (root + fifth, slow swell), darker at night
    root = 45
    for (t0, t1, notes, v) in ([(0, 32, [root, root + 7], 0.25), (32, DUR, [root - 2, root + 5, root + 13], 0.4)] if PART == 1 else
                               [(0, 13, [root - 2, root + 5], 0.45), (13, 42.2, [root - 2, root + 4, root + 13], 0.4), (42.2, 51.6, [root, root + 7, root + 12], 0.3), (51.6, DUR, [root + 3, root + 10, root + 15], 0.3)]):
        p = pad([m2f(n) for n in notes], t1 - t0, v, r, att=2.0, rel=2.0, warm=500, detune=11, trem=lambda tt_: 0.75 + 0.25 * np.sin(2 * np.pi * 0.25 * tt_))
        place(out, p, t0)
    # the lullaby on a music box, every note a little out of tune
    mel = [76, 79, 81, 79, 76, 74, 72, 74, 76, 72, 69, 71, 72, -1, 69, -1]
    beat = 60 / 66
    spans = [(0, 31.9, 1.0)] if PART == 1 else [(42.2, 51.6, 0.9), (51.6, DUR - 2.5, 1.0)]
    for (t0, t1, vel) in spans:
        t, i = t0, 0
        while t < t1:
            n = mel[i % len(mel)]
            if n > 0:
                f = m2f(n) * 2 ** ((r.uniform(-28, 28) + (i // 16) * -12 * (PART == 2 and t > 51.6)) / 1200)
                place(out, pan(musicbox(f, 0.55 * vel, r, dur=2.2), 0.2 * np.sin(i)), t)
            t += beat; i += 1
    # heartbeat under the tension
    hb = [(36.0, 60.0, 1.0, 1.4)] if PART == 1 else [(0, 13.0, 1.0, 2.0), (19.75, 33.1, 0.8, 1.3)]
    for (t0, t1, amp, rate) in hb:
        t = t0
        while t < t1:
            k = (t - t0) / max(1e-3, t1 - t0)
            for dt, a in ((0, 1.0), (0.22, 0.7)):
                th = lp(np.sin(2 * np.pi * 52 * tt(0.25)) * np.exp(-tt(0.25) / 0.06), 200) * a * amp * (0.6 + 0.4 * k)
                place(out, st(th), t + dt)
            t += 1 / (rate * (1 + 0.5 * k))
    # chase pulse (part 2): low staccato 8ths and timpani
    if PART == 2:
        t = 1.65
        while t < 13.0:
            f = m2f(33 if int((t - 1.65) / (60 / 150) / 4) % 2 else 36)
            place(out, st(lp(np.sign(np.sin(2 * np.pi * f * tt(0.14))) * np.exp(-tt(0.14) / 0.05), 600) * 0.35), t)
            t += 60 / 150 / 2
        for t in (1.65, 4.85, 9.45, 13.0): place(out, st(timpani(m2f(38), 0.8, r, dur=2.0)), t)
    # stingers: boom + rising screech at the reveals
    stings = [44.9, 53.9, 60.3] if PART == 1 else [13.6, 25.55, 27.4, 54.9, 63.6]
    for tsg in stings:
        boom = lp(r.standard_normal(ns(2.5)), 120) * np.exp(-tt(2.5) / 0.7) * 2.0 + np.sin(2 * np.pi * 38 * tt(2.5)) * np.exp(-tt(2.5) / 0.9)
        n = ns(1.6); sc = bp(r.standard_normal(n), 2500, 6500) * np.linspace(0, 1, n) ** 2 * 0.25
        place(out, st(boom * 0.6), tsg); place(out, pan(sc, 0.3), tsg - 1.5)
    rev = make_ir(2.6, 11 + PART, hf=0.6)
    out = 0.65 * out + 0.35 * convolve_st(out, rev)[:, :N]
    out = np.vstack([fades(c, 0.5, 2.5) for c in out])
    return out


def sfx():
    r = rng(9 + PART)
    out = np.zeros((2, N))
    def at(x, t, g=1.0, p=0.0): place(out, pan(x * g, p) if x.ndim == 1 else x * g, t)
    if PART == 1:
        at(water_bed(32.0, r, close=0.6), 0, 0.5); at(bird_chirps(31.0, r, density=0.6), 0.5, 0.35)
        for t in (0.6, 9.0, 18.5, 24.0): at(hp(bp(r.standard_normal(ns(0.5)), 1800, 3800) * np.exp(-tt(0.5) / 0.12), 900) * 0.4, t, 1.0, 0.4)  # gull cries
        at(crickets(34.0, r), 32.0, 0.35); at(water_bed(34.0, r, close=0.3), 32.0, 0.3)
        for t in (33.66, 34.02, 34.2, 34.6, 35.0, 35.4): at(clink(r, f0=3200, dur=0.05), t, 0.9)  # the clock
        for i, t in enumerate((36.2, 36.5, 36.9, 37.3, 37.6)): at(creak(0.9, r, rate0=70, rate1=140), t, 0.6, -0.6 + 0.3 * i)  # every door opens
        t = 39.3
        while t < 48.0:  # the town marching in perfect step (many feet, one beat)
            at(st(boot(r, 0.8)), t, 0.8); t += 0.5
        for t in (51.48, 51.74, 52.08): at(hp(r.standard_normal(ns(0.06)) * np.exp(-tt(0.06) / 0.01), 1500) * 1.2 + np.sin(2 * np.pi * 900 * tt(0.06)) * np.exp(-tt(0.06) / 0.008) * 0.5, t, 1.0)  # tap tap tap
        wh = bp(r.standard_normal(ns(2.4)), 1200, 5200) * np.sin(np.linspace(0, np.pi, ns(2.4))) ** 2 * 0.22
        at(wh, 60.3, 1.0, 0.25)  # the whisper under "why aren't you smiling"
    else:
        at(crickets(DUR, r), 0, 0.25); at(water_bed(14.0, r, close=0.5), 0, 0.35)
        t = 0.4
        while t < 9.4:  # running feet
            at(stroll_step(r, 0.9) * 1.6, t, 1.0, 0.1); t += 0.19
        t = 1.7
        while t < 9.5:  # the town behind, marching in step
            at(st(boot(r, 0.7)), t, 0.6); t += 0.5
        at(hammer_hit(r, 1.4), 13.25, 1.2); at(creak(0.7, r, rate0=60, rate1=120), 13.15, 0.8)  # the door bursts open
        g = np.zeros(ns(15.0)); k = 0
        while k < len(g) - 2000: g[k:k + 1500] += np.exp(-np.arange(1500) / 200) * r.uniform(0.5, 1.0); k += int(SR * 0.25)
        gears = lp(np.convolve(g, r.standard_normal(400) * 0.3, "same"), 3000) + lp(r.standard_normal(len(g)), 90) * 0.4
        at(gears, 15.6, 0.55)
        t = 54.2
        while t < 58.0:  # the key, ticking
            at(clink(r, f0=4200, dur=0.04), t, 1.0); t += 0.5
        at(water_bed(DUR - 63.6, r, close=0.2), 63.6, 0.3)
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
    m *= dbg(vL - 16 - integrated(m) + 3)
    s *= dbg(vL - 10 - integrated(s) - 5)
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
