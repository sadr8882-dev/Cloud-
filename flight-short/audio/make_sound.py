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
TOTAL = 2316
DUR = TOTAL / FPS
N = ns(DUR)
# picture time constants (mirrors story.ts W / SHOTS)
W = dict(jumbo=3.793, nineteen=5.52, brothers=7.026, dream=9.76, machine=11.384, everyone=12.491, impossible=13.61, falls=16.646, river=17.515,
         so=18.597, fan=21.484, test=22.26, secret=25.506, hand=26.682, tilt=28.184, air=29.315, pushes=29.527, lift=31.577, wing9=32.506, bigger=34.519,
         december=35.756, windy=37.943, flip=39.403, first11=41.119, wilbur=42.016, wins=42.41, crashes=44.379, days=46.553, orville=47.593,
         engine=50.358, roars=50.765, lifts=52.055, twelve=53.152, metres=54.982, luckily=56.042, change=57.526, unluckily=58.835, gust=59.8,
         flipped=60.489, never=62.887, again=63.565, today=64.667, jumbo2=65.351, whole=67.471, wilbur2=68.965, fifty=71.823, notbad=73.05, crashed=74.472)
CUTS = [f / FPS for f in [113, 144, 209, 280, 368, 440, 497, 552, 666, 744, 798, 965, 1062, 1168, 1255, 1278, 1329, 1381, 1462, 1509, 1545, 1590, 1675, 1760, 1792, 1876, 1934, 2058, 2148, 2190]]
FLASH = 144 / FPS
BPM = 104
BEAT = 60 / BPM


def music():
    r = rng(9)
    out = np.zeros((2, N))
    secs = [(0, 4.8, 55, "play"), (4.8, 18.4, 53, "play"), (18.4, 24.8, 50, "slow"), (24.8, 35.4, 55, "play"), (35.4, 46.0, 53, "play"),
            (46.0, 48.7, 48, "slow"), (48.7, 56.0, 55, "tense"), (56.0, 59.6, 57, "play"), (59.6, 64.5, 50, "tense"), (64.5, DUR, 55, "end")]
    prog = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]]
    mel = [7, 9, 11, 12, 14, 12, 11, 7, 9, 12, 16, 14, 12, 11, 9, -99]
    for (t0, t1, root, mood) in secs:
        bar = 4 * BEAT
        nb = int(np.ceil((t1 - t0) / bar))
        for b in range(nb):
            tb = t0 + b * bar
            if tb >= t1:
                break
            ch = prog[b % 4]
            if mood == "tense":
                for k in range(8):
                    tk = tb + k * BEAT / 2
                    if tk < t1:
                        place(out, st(pluck(m2f(root - 12 + (0 if k % 2 == 0 else 7)), 0.55, r, dur=0.35)) * 0.6, tk)
                        if k % 2 == 1: place(out, st(snare(0.25, r)) * 0.25, tk)
                place(out, pad([m2f(root + i) for i in (0, 4, 7)], min(bar, t1 - tb), 0.22, r, att=0.3, rel=0.4), tb)
                continue
            vel = 0.45 if mood in ("slow", "end") else 0.6
            for k in range(4):
                tk = tb + k * BEAT * (1.4 if mood == "slow" else 1.0)
                if tk >= t1:
                    break
                if k % 2 == 0:
                    place(out, st(brass(m2f(root - 12 + ch[0] + (7 if k == 2 else 0)), BEAT * 0.6, vel * 0.55, r, kind="soft")), tk)
                else:
                    for i, iv in enumerate(ch):
                        place(out, pan(pluck(m2f(root + iv), vel * 0.5, r, dur=0.5, bright=0.6), -0.3 + 0.3 * i), tk + i * 0.012)
            if mood != "slow":
                for k in range(8):
                    tk = tb + k * BEAT / 2
                    note = mel[(b * 8 + k) % 16]
                    if tk >= t1 or note < -50:
                        continue
                    f = m2f(root + 12 + note)
                    place(out, pan(glock(f, vel * 0.32, r), 0.2), tk)
                    if k % 2 == 0: place(out, pan(pluck(f / 2, vel * 0.4, r, dur=0.4, bright=0.8), -0.2), tk)
            else:
                for k in range(3):
                    tk = tb + k * BEAT * 1.4
                    if tk < t1:
                        place(out, pan(glock(m2f(root + 12 + ch[k % 3]), 0.3, r, dur=2.2), 0.2 * (k - 1)), tk)
                place(out, pad([m2f(root + i) for i in ch], min(bar * 1.4, t1 - tb), 0.22, r), tb)
    place(out, st(cymbal(0.45, r)) * 0.5, FLASH)
    place(out, st(timpani(m2f(38), 0.9, r)) * 0.8, W["crashes"])
    place(out, st(cymbal(0.6, r)) * 0.6, W["lifts"])
    place(out, st(triangle(0.6, r)) * 0.5, W["lift"])
    # sad trombone on "It never flew again": four falling notes
    for i, (m, d) in enumerate([(58, 0.32), (57, 0.32), (56, 0.32), (55, 0.9)]):
        place(out, st(brass(m2f(m), d, 0.7, r, kind="horn", fall=-1.0 if i == 3 else 0.0)) * 0.9, W["never"] - 0.2 + i * 0.34)
    place(out, st(glock(m2f(84), 0.5, r)) * 0.6, W["crashed"] + 0.6)
    ir = make_ir(1.2, 3)
    out = 0.8 * out + 0.25 * convolve_st(out, ir)[:, :N]
    return out


def engine(dur, r, rate=11.0):
    n = ns(dur); t = np.arange(n) / SR
    pulses = np.zeros(n)
    k = 0.0
    while k < dur:
        i = ns(k); pulses[i:i + 40] += np.hanning(80)[:40][: max(0, min(40, n - i))] if n - i > 0 else 0
        k += 1 / rate * (1 + r.uniform(-0.06, 0.06))
    y = lp(np.convolve(pulses, np.exp(-np.arange(1200) / 200) * np.sin(np.arange(1200) * 2 * np.pi * 70 / SR), "same"), 900) * 3
    y += 0.25 * bp(r.standard_normal(n), 200, 1800) * (0.6 + 0.4 * np.sin(2 * np.pi * rate * t))
    return y


def sfx():
    r = rng(13)
    out = np.zeros((2, N))
    P = lambda x, t, g=1.0, p=0.0: place(out, pan(x, p) if x.ndim == 1 else x, t, g)
    for c in CUTS:
        P(whoosh(0.5, r, peak=0.22, tail=0.15), c - 0.22, 0.22)
    # hook: engine and propellers flying by
    P(engine(4.8, r), 0.0, 0.5)
    # Dayton: hammer on the bike, street birds
    t = W["brothers"]
    while t < 9.2: P(hammer_hit(r, 0.35), t, 0.3, -0.2); t += 0.4
    P(bird_chirps(4.0, r, 0.6), 9.3, 0.4)
    P(babble(2.5, r, 150, 1.0), W["everyone"], 0.35) if False else None
    P(applause(0.1, r, 2), W["impossible"], 0.01)
    # river: splash
    P(bubbles(1.6, r, 12, f_lo=200, f_hi=1500), W["river"] - 0.05, 0.7)
    P(wood_crack(r) * 0.4, W["river"] - 0.05, 0.5)
    # wind tunnel fan
    P(engine(6.2, r, rate=28.0) * 0.4, 18.4, 0.35)
    # car: road rumble + wind on the hand
    P(breeze(7.3, r, 1.0, gust=0.3, bright=1600), 24.8, 0.6)
    P(rattle(7.3, r, density=18), 24.8, 0.12)
    # camp wind
    for t0, t1 in [(32.2, 46.0), (48.7, 64.5), (64.5, DUR)]:
        P(breeze(t1 - t0, r, 1.0, gust=0.35, bright=900), t0, 0.5)
    # coin ting
    P(glock(m2f(96), 0.5, r), W["flip"], 0.35)
    P(glock(m2f(91), 0.4, r), W["first11"], 0.3)
    # Wilbur: engine, crash in the sand
    P(engine(2.4, r), W["wilbur"] - 0.4, 0.55)
    P(wood_crack(r), W["crashes"], 0.7)
    P(whoosh(0.8, r, peak=0.05, f_lo=300, f_hi=2500, tail=0.4), W["crashes"], 0.5)
    # Dec 17: engine starts, roars, run, flight, landing
    P(engine(5.3, r), W["engine"], 0.75)
    P(engine(2.5, r, rate=9.0), 54.0, 0.45)
    P(wood_crack(r) * 0.3, 55.55, 0.4)
    P(applause(2.8, r, 6), W["luckily"] - 0.4, 0.5)
    # the gust
    P(whoosh(2.2, r, peak=0.6, f_lo=200, f_hi=1500, tail=0.8), W["gust"] - 0.3, 0.8)
    P(wood_crack(r), W["flipped"] + 0.3, 0.6)
    P(wood_crack(r) * 0.6, W["flipped"] + 1.0, 0.5)
    # Wilbur's long flight
    P(engine(6.0, r), 68.6, 0.6)
    P(wood_crack(r) * 0.3, W["crashed"], 0.4)
    P(applause(2.5, r, 6), W["notbad"], 0.4)
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
