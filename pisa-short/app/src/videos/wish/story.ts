// Timeline of "One Wish" (our own two-part story): shots timed to the narration (wish-short/voice/p1|p2), the dog's
// path, everyone's marks and the cameras. The part comes from Remotion inputProps { part: 1 | 2 }.
import { getInputProps } from "remotion";
export const FPS = 30;
export const PART: 1 | 2 = (getInputProps() as { part?: number }).part === 2 ? 2 : 1;
export const DURS = { 1: 2250, 2: 1935 } as const; // 75.0 s (voice 73.0 + end card), 64.5 s
export const TOTAL = DURS[PART];
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * smooth((x - x0) / (x1 - x0)); }
  return pts[pts.length - 1][1];
};
export const linR = (pts: [number, number][], x: number) => { // straight (unsmoothed) interpolation
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  return pts[pts.length - 1][1];
};
const F = (s: number) => Math.round(s * FPS);

// ---------------- word times (whisper) ----------------
export const W1 = {
  wish: 2.5, birthday: 3.6, rings: 5.64, comes: 6.34, take: 7.3, bonks: 11.86, mailman: 13.68, fast: 14.52, letters: 15.66, fire: 17.0,
  drop: 20.74, pan: 21.1, sweat: 25.12, mayor: 27.14, got: 29.46, nobody: 32.06, ever: 32.94, notebook: 36.22, ten: 38.56,
  cake: 40.98, candles: 41.52, clock: 41.98, pip: 44.06, leaned: 44.38, blew: 45.74, candles2: 46.24, icecream: 48.66, rang: 49.92,
  gasped: 50.5, wish2: 51.5, giant: 52.92, sky: 54.38, happy: 55.14, not: 56.3, smelled: 58.0, woke: 60.08, snapped: 61.14,
  chain: 61.68, ran: 62.1, pip2: 64.0, ringing: 65.04, made: 66.6, breath: 69.56, closed: 70.3, yelled: 71.22,
};
export const W2 = {
  mine: 2.72, running: 6.9, clock: 8.14, yelled: 9.48, iwish: 11.44, tiny: 12.58, flash: 13.88, pop: 14.42, silence: 15.18,
  dog: 16.2, cheered: 18.52, second: 19.7, because: 20.96, barked: 21.64, grandpa: 23.24, catch: 24.1, missed: 24.8,
  mailman: 26.54, fire: 28.54, mom: 29.38, heard: 30.9, peace: 31.96, then: 33.64, ate: 34.48, four: 36.78, looked: 38.22,
  pip: 39.48, burped: 41.28, mayor: 43.74, crying: 44.8, not: 45.78, lap: 48.94, waited: 49.64, gave: 51.74, medal: 52.32,
  momsays: 54.98, think: 57.56, besides: 59.0, forever: 61.22,
};

// ---------------- places ----------------
export const TOWER: V3 = [0, 0, -18];       // clock tower (base 6 x 6, clock face on +z at y 15, roof 20..24, vane on top)
export const TOWER_H = 20, VANE: V3 = [0, 25.6, -18];
export const CLOCK: V3 = [TOWER[0], 15, TOWER[2] + 3.05];
export const BELL: V3 = [TOWER[0], 18.6, TOWER[2] + 3.2];
export const HALL: V3 = [13, 0, -6];        // town hall: 9.6 x 7 x 8, front (columns) at z = -2.5
export const DOG0: V3 = [13, 0, 1.6];       // the giant dog asleep in front of town hall, facing -x
export const POST: V3 = [17.6, 0, 3.0];     // chain post
export const TABLE: V3 = [-1.0, 0, 5.6];    // birthday table (top at 0.82), the cake on it
export const CAKE: V3 = [-1.0, 0.82, 5.6];
export const HERO: V3 = [-1.2, 0, 4.75];
export const PIP0: V3 = [0.1, 0, 4.85];
export const PIPICE: V3 = [2.0, 0, 4.3];
export const ICE: V3 = [3.2, 0, 3.0];       // where the giant ice cream lands (cone tip in the lawn)
export const EAT: V3 = [3.2, 0, 4.1];       // tiny dog eating spot
export const T0: V3 = [9.3, 0, 2.8];        // where the dog shrinks
export const T1: V3 = [6.4, 0, 1.6];        // where it dodges grandpa to
export const G0: V3 = [6.6, 0, 6.9];        // grandpa (part 2)
export const DOOR: V3 = [-4.4, 0, 18];      // the door grandpa bonks (house front at z = 18)
export const BENCH: V3 = [-4, 0, 9];
export const MAYOR1: V3 = [8.4, 0, 4.9];
export const MAYOR2: V3 = [-3.6, 0, 2.6];
export const MOM2: V3 = [-4.4, 0, 6.2];
export const NOTE: V3 = [-8, 0, 14.5];
export const KID1: V3 = [-6, 0, 1];
export const SC = { hero: 0.82, pip: 0.64, adult: 1, grandpa: 1.5, giant: 5, tiny: 0.14 };
export const faceY = (sc: number) => 1.72 * sc;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; party: boolean };
const mk = (cuts: number[], end: number, gold: number[] = [], noParty: number[] = []): ShotDef[] =>
  cuts.map((s, i) => ({ id: i + 1, a: F(s), b: i + 1 < cuts.length ? F(cuts[i + 1]) : end, light: gold.includes(i + 1) ? "golden" : "day", party: !noParty.includes(i + 1) }));
const P1CUTS = [0, 4.4, 8.5, 13.43, 17.72, 22.45, 26.82, 30.21, 33.75, 36.9, 39.31, 43.14, 47.05, 49.48, 52.7, 57.09, 59.16, 60.9, 64.92, 68.92];
const P2CUTS = [0, 4.83, 8.03, 11.34, 13.45, 16.1, 18.4, 20.86, 23.17, 26.43, 29.75, 33.52, 38.07, 39.41, 40.66, 43.66, 45.66, 51.65, 54.9, 59.32];
export const SHOTS: ShotDef[] = PART === 1 ? mk(P1CUTS, TOTAL, [], [3, 4, 5, 6, 9]) : mk(P2CUTS, TOTAL, [20]);
export const XFADE: Record<number, number> = PART === 1 ? {} : { 20: 12 };
export const FLASH_AT = PART === 2 ? F(W2.flash) : -100;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the dog ----------------
export type DogState = {
  p: V3; yaw: number; scale: number; pose: "sleep" | "stand" | "run" | "bark" | "eat" | "sit"; rise?: number; phase?: number;
  eye?: number; jaw?: number; belly?: number; head?: number; wag?: number; look?: number; sniff?: number; hidden?: boolean; lap?: boolean; held?: boolean;
};
const yawTo = (a: V3, b: V3) => Math.atan2(b[0] - a[0], b[2] - a[2]);
export const dogAt = (t: number): DogState => {
  const G = SC.giant, face = -Math.PI / 2;
  if (PART === 1) {
    if (t < 61.0) {
      const eye = t < W1.woke ? 0 : t < W1.woke + 0.25 ? 1 : 2;
      return { p: DOG0, yaw: face, scale: G, pose: "sleep", rise: 0, eye, head: t > W1.woke + 0.3 ? -0.45 * smooth((t - W1.woke - 0.3) / 0.4) : 0, sniff: t > 57.6 && t < 60.2 ? 1 : 0, jaw: 0 };
    }
    if (t < 62.0) return { p: DOG0, yaw: face, scale: G, pose: "sleep", rise: smooth((t - 61.0) / 0.8), eye: 2, head: -0.3, jaw: 0.3 };
    const ph = t < 63.6 ? (t - 62) * 2.2 : 1.6 * 2.2 + (t - 63.6) * 0.55;
    const x = linR([[62.0, 13], [63.6, 10.6], [75, 9.8]], t), z = linR([[62, 1.6], [63.6, 2.5], [75, 2.6]], t);
    return { p: [x, 0, z], yaw: face, scale: G, pose: "run", phase: ph, eye: 2, jaw: 0.5 };
  }
  // part 2
  if (t < W2.flash) return { p: [linR([[0, 9.8], [W2.flash, 9.45]], t), 0, 2.6], yaw: face, scale: G, pose: "run", phase: 6.3 + t * 0.55, eye: 2, jaw: 0.5 };
  const tiny = SC.tiny;
  if (t < W2.pop) return { p: T0, yaw: 0, scale: tiny, pose: "sit", hidden: true };
  if (t < W2.because) return { p: T0, yaw: yawTo(T0, [-1, 0, 12]), scale: tiny, pose: "sit", eye: t < W2.dog ? 2 : 1, look: Math.sin(t * 1.3), wag: 1 };
  if (t < 23.2) {
    const k = t - W2.barked, bark = k > 0 && k < 1.2 ? Math.max(0, Math.sin(k * Math.PI / 0.6)) : 0;
    return { p: T0, yaw: yawTo(T0, [-1, 0, 12]), scale: tiny, pose: "bark", eye: 2, jaw: bark, wag: 1 };
  }
  if (t < 24.15) return { p: T0, yaw: yawTo(T0, G0), scale: tiny, pose: "stand", eye: 3, wag: 1 };
  if (t < 26.43) {
    const k = clamp01((t - 24.15) / 0.55);
    return { p: [T0[0] + (T1[0] - T0[0]) * k, 0, T0[2] + (T1[2] - T0[2]) * k], yaw: k < 1 ? yawTo(T0, T1) : yawTo(T1, G0), scale: tiny, pose: k < 1 ? "run" : "stand", phase: t * 6, eye: 2, wag: 1, jaw: k < 1 ? 0.4 : 0.2 };
  }
  if (t < W2.then) { // chased round and round the ice cream
    const th = -0.5 + (t - 26.43) * 2.4, r = 2.4;
    return { p: [ICE[0] + Math.cos(th) * r, 0, ICE[2] + Math.sin(th) * r], yaw: Math.atan2(-Math.sin(th), Math.cos(th)), scale: tiny, pose: "run", phase: t * 7, eye: 2, jaw: 0.5, wag: 1 };
  }
  if (t < 38.07) {
    const k = clamp01((t - W2.ate) / 2.9);
    return { p: EAT, yaw: Math.PI, scale: tiny, pose: t < W2.ate ? "stand" : "eat", eye: t < W2.ate ? 2 : 0, belly: 1 + 0.75 * k, wag: 1 };
  }
  if (t < 45.66) {
    const k = t - W2.burped, j = k > 0 && k < 0.7 ? Math.sin((k * Math.PI) / 0.7) : 0;
    return { p: EAT, yaw: yawTo(EAT, PIPICE), scale: tiny, pose: "sit", eye: 2, belly: 1.75, jaw: j, head: -0.2 };
  }
  if (t < W2.gave) return { p: BENCH, yaw: 0, scale: tiny, pose: "sit", eye: t > W2.waited ? 0 : 2, belly: 1.6, lap: true, wag: 1 };
  return { p: HERO, yaw: 0, scale: tiny, pose: "sit", eye: 2, belly: 1.5, held: true, wag: 1 };
};
/** where the ice cream is: y offset of the tip and its scale (0 = gone) */
export const iceAt = (t: number) => {
  if (PART === 1) {
    if (t < W1.giant) return { y: 0, s: 0 };
    const k = clamp01((t - W1.giant) / (54.2 - W1.giant));
    return { y: 48 * (1 - k * k), s: 1, landed: k >= 1 };
  }
  if (t < W2.ate) return { y: 0, s: 1, landed: true };
  return { y: 0, s: 1 - clamp01((t - W2.ate) / 2.95), landed: true };
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) { const k = keys[i]; if (f < k.f) break; cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24))); }
  return cur;
};
const T = (f: number) => f / FPS;
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, f - f0));
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const at = (p: V3, y: number): V3 => [p[0], y, p[2]];
/** orbit camera: distance d from look, elevation el (deg), azimuth az (deg; 0 = from +z, 90 = from +x) */
const orb = (look: V3, d: number, el: number, az: number, fov = 40, roll = 0): Shot => {
  const e = (el * Math.PI) / 180, a = (az * Math.PI) / 180;
  return { pos: [look[0] + d * Math.sin(a) * Math.cos(e), look[1] + d * Math.sin(e), look[2] + d * Math.cos(a) * Math.cos(e)], look, fov, roll };
};
const push = (look: V3, d: number, el: number, az: number, fov: number, f0: number, rate: number, roll = 0) => (f: number) => orb(look, d * pushK(f, f0, rate), el, az, fov, roll);
const key = (s: number, fn: (f: number) => Shot, cut = true, dur?: number): Key => ({ f: F(s), cut, dur, s: fn });
const fixed = (sh: Shot) => () => sh;
const heroF = at(HERO, faceY(SC.hero)), pipF = at(PIP0, faceY(SC.pip)), pipIceF = at(PIPICE, faceY(SC.pip));
const dogHead = (t: number): V3 => { const d = dogAt(t), s = d.scale; return [d.p[0] + Math.sin(d.yaw) * 0.7 * s, d.p[1] + (d.pose === "sleep" && !(d.rise ?? 0) ? 0.55 : 1.0) * s, d.p[2] + Math.cos(d.yaw) * 0.7 * s]; };
const bellCam = (s: number) => key(s, (f) => orb(add(BELL, [0, -0.6, 0]), 7.5 * pushK(f, F(s), 0.004), -8, 12, 40, 0.02));

const CAMS1: Record<number, Key[]> = {
  1: [key(0, (f) => ({ pos: [-7, 2.6, 26 - 0.02 * f], look: [3, 6.5, -6], fov: 52, roll: 0.015 }))],
  2: [key(4.4, (f) => orb(CLOCK, 8 * pushK(f, F(4.4), 0.004), -4, 10, 40)),
    key(6.25, push(at(KID1, 1.55), 3.4, 6, 18, 42, F(6.25), 0.003))],
  3: [key(8.5, (f) => orb([-4.4, 2.0, 16.2], 8.6 * pushK(f, F(8.5), 0.001), 6, 112, 48))],
  4: [key(13.43, fixed({ pos: [1.2, 1.3, 16.8], look: [0, 1.3, 10.5], fov: 44 })),
    key(15.15, push([0.6, 1.5, 10.6], 2.8, 4, 12, 40, F(15.15), 0.003))],
  5: [key(17.72, push(at([-9, 0, 10.5], 1.5), 3.2, 4, 8, 42, F(17.72), 0.002)),
    key(20.6, (f) => orb([-9, 0.9, 10.5], 3.2, 6, 8, 44), false, 12)],
  6: [key(22.45, push(at([9.5, 0, 10.5], 2.25), 4.8, 6, 160, 44, F(22.45), 0.0025))],
  7: [key(26.82, push(at(MAYOR1, 1.75), 3.4, 4, 18, 42, F(26.82), 0.002)),
    key(W1.got - 0.05, (f) => ({ pos: [4.5, 2.6, 19 - 0.01 * (f - F(W1.got))], look: [11.2, 2.8, 0.5], fov: 50 }))],
  8: [key(30.21, (f) => ({ pos: [2.5, 2.4, 13.5 - 0.012 * (f - F(30.21))], look: [11.5, 2.8, -0.5], fov: 48 })),
    key(31.98, (f) => orb([9.6, 2.4, 1.6], 7.0 * pushK(f, F(31.98), 0.003), 4, -78, 42))],
  9: [key(33.75, push(add(NOTE, [0, 1.2, 0.1]), 2.2, 4, 6, 40, F(33.75), 0.002)),
    key(36.0, push(add(NOTE, [0, 0.82, 0.38]), 0.85, 10, 0, 40, F(36.0), 0.002))],
  10: [key(36.9, push(heroF, 2.3, 7, 4, 40, F(36.9), 0.003))],
  11: [key(39.31, (f) => ({ pos: [-2.5, 3.4, 16 - 0.012 * (f - F(39.31))], look: [-0.6, 3.6, -3], fov: 50 })),
    key(W1.cake - 0.05, push(add(CAKE, [0, 0.25, 0]), 1.5, 22, 12, 40, F(W1.cake), 0.004)),
    key(W1.candles - 0.05, push(add(CAKE, [0, 0.42, 0]), 0.85, 10, -18, 36, F(W1.candles), 0.004)),
    key(W1.clock - 0.05, (f) => orb(CLOCK, 7 * pushK(f, F(W1.clock), 0.004), -6, -8, 40))],
  12: [key(43.14, push([-0.6, 1.0, 5.35], 2.5, 8, -62, 42, F(43.14), 0.002))],
  13: [key(47.05, push(pipF, 1.6, 3, 16, 40, F(47.05), 0.003))],
  14: [bellCam(49.48),
    key(W1.gasped - 0.05, push([-0.6, 1.4, 4.6], 7.5, 8, 4, 48, F(W1.gasped), 0.002)),
    key(W1.wish2 - 0.05, push(heroF, 1.7, 3, 10, 40, F(W1.wish2), 0.004))],
  15: [key(52.7, (f) => ({ pos: [-4.5, 1.2, 16], look: [ICE[0], Math.max(3.4, iceAt(T(f)).y * 0.85 + 3), ICE[2]], fov: 58 })),
    key(W1.happy - 0.05, push([2.4, 1.6, 4.0], 3.4, 12, 28, 46, F(W1.happy), 0.002)),
    key(W1.not - 0.05, push(heroF, 1.6, 2, 6, 38, F(W1.not), 0.004))],
  16: [key(57.09, (f) => ({ pos: [-0.5, 2.3, 7.5], look: [10, 2.6 + 0.3 * smooth((T(f) - 57.1) / 2), 1.6], fov: 46 }))],
  17: [key(59.16, (f) => orb(add(dogHead(59.2), [-0.8, 0, 0]), 6.0 * pushK(f, F(59.16), 0.004), 6, -70, 48))],
  18: [key(60.9, (f) => ({ pos: [0.5, 1.8, 12.5], look: [9.5, 3.4 - 0.4 * smooth((T(f) - 62) / 1.5), 2.0], fov: 50 })),
    key(W1.pip2 - 0.06, push(add(pipIceF, [0, 0.2, 0]), 2.1, -10, -58, 46, F(W1.pip2), 0.003))],
  19: [bellCam(64.92), key(66.55, push(heroF, 1.9, 2, 12, 40, F(66.55), 0.003))],
  20: [key(68.92, (f) => orb(heroF, 2.3 * pushK(f, F(68.92), 0.006) + 0.75, 2, 4, 40))],
};
const CAMS2: Record<number, Key[]> = {
  1: [key(0, (f) => ({ pos: [-5, 4.2, 19 - 0.015 * f], look: [4, 3.0, 0], fov: 52 })),
    key(W2.mine - 0.08, push([2.3, 1.7, 3.9], 3.6, 10, 25, 46, F(W2.mine), 0.002))],
  2: [key(4.83, (f) => ({ pos: [0.2, 0.55, 5.6], look: [9, 3.2, 2.4], fov: 52, roll: -0.03 + 0 * f }))],
  3: [bellCam(8.03), key(W2.yelled - 0.08, push(heroF, 1.9, 2, 10, 40, F(W2.yelled), 0.004))],
  4: [key(11.34, push(add(heroF, [0, -0.1, 0]), 2.9, 0, -55, 46, F(11.34), 0.006))],
  5: [key(13.45, (f) => ({ pos: [-2.5, 2.6, 15 - 0.01 * (f - F(13.45))], look: [6.2, 2.0, 2.2], fov: 50 }))],
  6: [key(16.1, push([9.35, 0.2, 2.8], 1.5, 12, -40, 44, F(16.1), 0.002))],
  7: [key(18.4, push([-1.2, 1.5, 4.6], 7.0, 6, 0, 48, F(18.4), 0.0015)), key(W2.second - 0.05, push([-1.2, 1.5, 4.6], 4.6, 4, 0, 44, F(W2.second), 0.003))],
  8: [key(20.86, push([9.3, 0.11, 2.8], 0.9, 3, -36, 40, F(20.86), 0.003)),
    key(W2.barked + 0.1, (f) => ({ pos: [-1.5, 1.6, 12.5], look: [-1, 1.6, 4.5], fov: 50, roll: 0.02 * Math.sin(f) }))],
  9: [key(23.17, (f) => ({ pos: [13.8, 2.3, 9.6], look: [7.3, 1.3 - 0.4 * smooth((T(f) - 24) / 1), 5.4], fov: 50 }))],
  10: [key(26.43, (f) => ({ pos: [3.2, 7.0, 13.0 - 0.01 * (f - F(26.43))], look: [3.2, 0.8, 3.0], fov: 46 }))],
  11: [key(29.75, push(at(MOM2, faceY(1) - 0.05), 2.4, 4, 10, 40, F(29.75), 0.002))],
  12: [key(33.52, push([3.1, 1.0, 3.9], 3.4, 14, 35, 44, F(33.52), 0.0015))],
  13: [key(38.07, push(add(EAT, [0, 0.12, 0]), 0.75, 6, -55, 40, F(38.07), 0.002))],
  14: [key(39.41, push(pipIceF, 1.3, -6, 60, 40, F(39.41), 0.003))],
  15: [key(40.66, push([2.8, 0.6, 4.2], 3.0, 6, 55, 46, F(40.66), 0.002))],
  16: [key(43.66, push(at(MAYOR2, faceY(1)), 1.9, 3, 10, 40, F(43.66), 0.003))],
  17: [key(45.66, push(add(BENCH, [0, 1.05, 0]), 3.1, 5, 4, 42, F(45.66), 0.0015))],
  18: [key(51.65, push([-1.7, 1.35, 4.75], 3.4, 12, -28, 44, F(51.65), 0.002))],
  19: [key(54.9, push([-0.8, 1.5, 4.4], 3.8, 12, -15, 46, F(54.9), 0.0015)), key(W2.think - 0.05, push(heroF, 1.7, 3, 8, 40, F(W2.think), 0.002))],
  20: [key(59.12, push([-0.6, 1.15, 4.8], 3.0, 10, -40, 42, F(59.12), 0.001)),
    key(W2.forever - 0.2, (f) => ({ pos: [-1.2, 2.6, 13.5], look: [-0.4, 6.5, -6], fov: 54 }), false, 70)],
};
const CAMS = PART === 1 ? CAMS1 : CAMS2;

const KICKS: [number, number][] = PART === 1 ? [[54.2, 1.3], [61.7, 0.6], [71.25, 0.9]] : [[11.6, 0.6], [W2.flash, 1.0], [W2.barked, 1.5], [24.6, 0.8], [W2.burped, 0.6]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) { const n = Math.floor((t - t0) * FPS + 1e-6); if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1, m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
export const dofAt = (_f: number) => ({ cInf: 0, focus: undefined as undefined | ((f: number) => V3) });

// ---------------- props shared by world + cast ----------------
/** the 10 candles on the cake's top tier (base of the flame) */
export const candle = (i: number): V3 => { const a = (i / 10) * Math.PI * 2; return [CAKE[0] + Math.cos(a) * 0.17, CAKE[1] + 0.47, CAKE[2] + Math.sin(a) * 0.17]; };
export const CANDLES_OUT = PART === 1 ? 45.92 : -1; // part 2: already blown out
export const D0 = 0;
