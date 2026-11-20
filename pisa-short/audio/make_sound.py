"""Soundtrack for the Pisa short: an original light Italian-flavoured score (mandolin-like plucks with tremolo,
glockenspiel, soft tuba bass, pad), synthesized SFX on the picture's events, and the mix with the Russian voice.
Usage: python make_sound.py <voice_dir> <out_dir>   ->  mix.wav (48 kHz stereo, exact length), music.wav, sfx.wav
Mix rule (skill): music +3 dB, SFX -6 dB relative to their reference level, voice unchanged; music ducked under speech.
"""
import json, sys
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, place, st, pan, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav, dbg, fades
from instruments import m2f, pluck, glock, brass, pad, triangle, timpani, cymbal, snare
from sfx_gen import hammer_hit, whoosh, wood_crack, creak, bubbles, bird_chirps, crickets, breeze, hurrah, applause, stroll_step, rattle

FPS = 30
TOTAL = 2340
DUR = TOTAL / FPS
N = ns(DUR)
# picture time constants (mirrors story.ts W / SHOTS)
W = dict(padat=1.332, dostroili=3.049, piza=6.793, kolokolnyu=8.86, etazh=10.723, etazhom=11.491, neskolko=13.355, krenitsya=14.64,
         pod=15.602, glina=16.632, prosedaet=19.669, schastyu1=21.316, pereryv1=23.832, neschastyu=24.659, sto=26.852, schastyu2=27.567,
         spas=29.917, sozhmi=31.135, voda=32.679, gubka=34.082, tverdeet=34.432, bashnya2=35.504, krepche=38.745, potom=39.803,
         nizkoy=42.674, poetomu=44.264, banan=47.285, v1934=48.229, zalili=50.887, naklonilas=53.243, k1990=55.238, chetyre=58.536,
         metra=59.819, inzhenery=60.486, vypryamilas=64.282, teper=66.723, smeshnoe=69.818, sama=72.514, esche=73.084, ochen=74.964,
         medlenno=75.731)
CUTS = [f / FPS for f in [38, 89, 124, 264, 319, 372, 399, 437, 464, 568, 630, 735, 822, 928, 1061, 1190, 1326, 1440, 1595, 1640, 1754, 1806, 1926, 1995, 2072, 2190, 2243]]
FLASH = 124 / FPS
BPM = 104
BEAT = 60 / BPM


def music():
    r = rng(7)
    out = np.zeros((2, N))
    # sections: (t0, t1, key root midi, mood)
    secs = [(0, 4.1, 50, "tense"), (4.1, 21.0, 53, "play"), (21.0, 24.5, 53, "play"), (24.5, 27.4, 48, "slow"), (27.4, 39.7, 53, "play"),
            (39.7, 48.0, 55, "play"), (48.0, 54.7, 50, "tense"), (54.7, 66.5, 53, "play"), (66.5, DUR, 53, "end")]
    prog = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]]  # I IV V I
    mel = [12, 14, 16, 12, 17, 16, 14, 11, 12, 16, 19, 17, 16, 14, 12, -99]  # a little tarantella-like line (8ths)
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
                        place(out, st(pluck(m2f(root - 12 + (0 if k % 2 == 0 else 1)), 0.5, r, dur=0.4)) * 0.6, tk)
                place(out, pad([m2f(root + i) for i in (0, 3, 7)], min(bar, t1 - tb), 0.25, r, att=0.3, rel=0.4), tb)
                continue
            vel = 0.45 if mood in ("slow", "end") else 0.6
            # bass: soft tuba on 1 and 3, mandolin chord plucks on 2 and 4 (oom-pah)
            for k in range(4):
                tk = tb + k * BEAT * (1.4 if mood == "slow" else 1.0)
                if tk >= t1:
                    break
                if k % 2 == 0:
                    place(out, st(brass(m2f(root - 12 + ch[0] + (7 if k == 2 else 0)), BEAT * 0.6, vel * 0.55, r, kind="soft")), tk)
                else:
                    for i, iv in enumerate(ch):
                        place(out, pan(pluck(m2f(root + iv), vel * 0.5, r, dur=0.5, bright=0.6), -0.3 + 0.3 * i), tk + i * 0.012)
            # melody: mandolin tremolo (fast repeated plucks) + glock doubling on strong notes
            if mood != "slow":
                for k in range(8):
                    tk = tb + k * BEAT / 2
                    note = mel[(b * 8 + k) % 16]
                    if tk >= t1 or note < -50:
                        continue
                    f = m2f(root + note)
                    for j in range(3):
                        place(out, pan(pluck(f, vel * (0.42 - 0.08 * j), r, dur=0.3, bright=0.8), 0.25), tk + j * BEAT / 6)
                    if k % 4 == 0:
                        place(out, pan(glock(f * 2, vel * 0.35, r), -0.2), tk)
            else:
                for k in range(3):
                    tk = tb + k * BEAT * 1.4
                    if tk < t1:
                        place(out, pan(glock(m2f(root + 12 + ch[k % 3]), 0.3, r, dur=2.2), 0.2 * (k - 1)), tk)
                place(out, pad([m2f(root + i) for i in ch], min(bar * 1.4, t1 - tb), 0.22, r), tb)
    # stingers
    place(out, st(timpani(m2f(38), 0.9, r)) * 0.9, W["krenitsya"])
    place(out, st(timpani(m2f(36), 1.0, r)) * 1.0, W["naklonilas"])
    place(out, st(cymbal(0.45, r)) * 0.5, FLASH)
    place(out, st(triangle(0.6, r)) * 0.6, W["banan"])
    place(out, st(glock(m2f(84), 0.5, r)) * 0.6, W["medlenno"] + 0.4)
    # reverb
    ir = make_ir(1.4, 3)
    out = 0.8 * out + 0.25 * convolve_st(out, ir)[:, :N]
    return out


def sfx():
    r = rng(11)
    out = np.zeros((2, N))
    P = lambda x, t, g=1.0, p=0.0: place(out, pan(x, p) if x.ndim == 1 else x, t, g)
    for c in CUTS:
        P(whoosh(0.5, r, peak=0.22, tail=0.15), c - 0.22, 0.25)
    # hook: creak and groan as the half-built tower goes over
    P(creak(2.2, r, rate0=60, rate1=120), 1.1, 0.7, 0.2)
    P(wood_crack(r) * 0.35, W["dostroili"], 0.5)
    # masons' hammers (shot 2) at the drawn rate 1.6/s
    t = W["kolokolnyu"]
    while t < 10.6:
        P(hammer_hit(r, 0.6), t, 0.45, -0.2); t += 1 / 1.6
    # floors rising: stone thuds
    for t in (W["etazh"] + 0.2, W["etazhom"] + 0.2):
        P(wood_crack(r) * 0.5, t, 0.6)
    # lean: deep stone groan + creak
    P(creak(1.6, r, rate0=40, rate1=70), W["krenitsya"] - 0.1, 0.9)
    # clay: squelch bubbles, sinking groan
    P(bubbles(1.4, r, 9, f_lo=150, f_hi=900), W["glina"], 0.5)
    P(creak(1.4, r, rate0=35, rate1=55), W["prosedaet"], 0.7)
    # tools dropped, cheerful break
    P(hammer_hit(r, 0.5), W["schastyu1"] + 0.15, 0.5, -0.3)
    # golden hundred years: crickets + breeze
    P(crickets(3.2, r), 24.4, 0.35)
    P(breeze(3.2, r, 0.6), 24.4, 0.4)
    # day ambience: birds on the open piazza shots
    for t0, t1 in [(4.1, 10.6), (27.4, 31.0), (39.7, 48.0), (54.7, 60.2), (66.5, DUR)]:
        P(bird_chirps(t1 - t0, r, 0.35), t0, 0.25)
    # cheer at "spas"
    P(applause(1.8, r, 20), W["spas"], 0.35)
    # sponge drips
    for t in np.arange(W["sozhmi"] + 0.1, W["tverdeet"], 0.17):
        P(bubbles(0.12, r, 1, f_lo=900, f_hi=2600), t + r.uniform(0, 0.05), 0.35)
    # cutaway squeeze: slow wet bubbling
    P(bubbles(3.4, r, 4, f_lo=200, f_hi=1200), W["bashnya2"], 0.4)
    # banana: little boing (glide pluck)
    # 1934: cement pouring gurgle, then the lurch
    P(bubbles(2.2, r, 14, f_lo=100, f_hi=500), W["zalili"], 0.6)
    P(wood_crack(r), W["naklonilas"], 0.8)
    P(creak(1.5, r, rate0=40, rate1=60), W["naklonilas"] + 0.1, 0.8)
    # 1990: tape measure zip
    P(whoosh(0.35, r, peak=0.05, f_lo=2500, f_hi=6000, tail=0.2), W["chetyre"] + 0.1, 0.35, 0.3)
    # drilling: rattle of the auger, soil buckets
    P(rattle(5.5, r, density=40), W["inzhenery"], 0.35, -0.3)
    P(creak(1.8, r, rate0=50, rate1=90), W["vypryamilas"], 0.6)
    # tourists: steps and camera clicks
    for k, t in enumerate(np.arange(66.8, DUR - 0.5, 1.7)):
        click = hp(r.standard_normal(ns(0.04)), 2500) * np.exp(-tt(0.04) / 0.004)
        P(click, t, 0.35, 0.4 if k % 2 else -0.4)
    for t in np.arange(66.6, 69.0, 0.45):
        P(stroll_step(r, 0.3), t, 0.25)
    P(creak(1.0, r, rate0=30, rate1=36), W["esche"] + 0.2, 0.4)
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
