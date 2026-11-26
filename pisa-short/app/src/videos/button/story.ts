// Timeline of "The Wrong Button" (our own two-part story): shots timed to the narration (button-short/voice/p1|p2),
// everyone's marks, the magic states (tiny mayor, chicken mailman, floating cows, spaghetti, dancing houses, two Pips)
// and the cameras. The part comes from Remotion inputProps { part: 1 | 2 }.
import { getInputProps } from "remotion";
export const FPS = 30;
export const PART: 1 | 2 = (getInputProps() as { part?: number }).part === 2 ? 2 : 1;
export const DURS = { 1: 2250, 2: 2325 } as const; // 75.0 s (voice 72.2 + end card), 77.5 s (voice 75.0 + end card)
export const TOTAL = DURS[PART];
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * smooth((x - x0) / (x1 - x0)); }
  return pts[pts.length - 1][1];
};
export const linR = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  return pts[pts.length - 1][1];
};
const F = (s: number) => Math.round(s * FPS);

// ---------------- word times (whisper) ----------------
export const W1 = {
  button: 1.98, top: 2.48, nobody: 3.86, sign: 5.92, press: 7.12, grandpa: 7.78, town: 9.32, mayor: 10.08, emerg: 11.02,
  pip: 12.82, him: 13.72, fair: 15.3, balloons: 16.18, music: 16.76, pie: 17.26, mayorS: 18.1, speech: 19.44,
  listening: 21.08, disappeared: 21.92, saw: 23.3, top2: 24.22, button2: 26.26, yelled: 27.14, no: 27.8, pressed: 28.22,
  dog: 29.58, talking: 30.16, deep: 31.18, good: 32.62, pressed2: 33.94, cows: 35.24, float: 36.0, again2: 36.62,
  shrank: 37.5, mouse: 38.5, speech2: 39.36, squeaky: 40.14, again3: 41.08, turned: 42.12, chicken: 42.82, delivered: 43.84,
  again4: 45.0, raining: 45.9, spaghetti: 46.24, ran: 47.44, stairs: 48.56, pip3: 49.5, nine: 50.12, grandma: 51.54,
  fireworks: 52.68, fountain: 53.72, lemonade: 54.26, houses: 55.36, dancing: 56.0, reached: 57.2, grabbed: 58.2,
  time: 59.74, looked: 60.84, smiled: 61.44, one: 62.56, pressed3: 63.56, other: 64.4, flash: 65.82, opened: 66.72,
  eyes: 67.2, was: 68.36, pip4: 68.54, another: 69.32, pip5: 69.58,
};
export const W2 = {
  two: 1.26, pips: 1.52, me: 2.88, said: 3.78, real: 4.5, brother: 4.96, squeaky: 6.18, other: 7.16, same: 8.24,
  even: 9.06, ran: 10.5, mom: 11.14, momlooked: 11.82, dog: 13.0, dogsaid: 13.92, momsaid: 15.42, way: 16.72, brought: 17.96,
  cake: 18.74, realpip: 19.56, bite: 21.04, share: 22.3, ate: 23.4, fainted: 24.96, meanwhile: 25.48, mess: 27.18,
  chicken: 27.94, laying: 28.76, eggs: 29.7, cows: 30.78, bakery: 31.88, spaghetti: 32.9, tiny: 34.62, nose: 36.16,
  shouting: 36.9, nobody: 37.48, grandpa: 39.06, idea: 39.84, button: 40.88, undo: 42.1, climbed: 43.42, whole: 44.92,
  cows2: 45.62, top: 47.1, turned: 47.8, over: 48.5, back: 49.42, blue: 50.46, undo2: 51.98, looked: 53.44, both: 54.24,
  reached: 55.62, stopped: 56.82, together: 59.34, click: 60.22, landed: 60.9, mayor: 61.72, grew: 61.88, confetti: 62.88,
  me2: 65.1, pipwas: 65.76, mom2: 66.7, woke: 66.9, almost: 67.72, normal: 69.3, except: 70.12, chicken2: 71.64, happier: 73.12,
};

// ---------------- places ----------------
export const TOWER: V3 = [0, 0, -18];       // clock tower (base 6 x 6, clock face on +z at y 15), open deck on top
export const TOWER_H = 20, TOP_Y = 20.55, VANE: V3 = [0, 28.2, -18];
export const CLOCK: V3 = [TOWER[0], 15, TOWER[2] + 3.05];
export const BELL: V3 = [TOWER[0], 18.6, TOWER[2] + 3.2];
export const BTN: V3 = [0, TOP_Y, -16.4];   // the button's pedestal (0.62 high); the button sits on top
export const BTN_TOP: V3 = [0, TOP_Y + 0.74, -16.4];
export const PIPT: V3 = [0.62, TOP_Y, -16.4]; // Pip at the button (faces -x)
export const HEROT: V3 = [1.38, TOP_Y, -16.05];
export const GPT: V3 = [-0.66, TOP_Y, -16.4];  // grandpa at the button (part 2)
export const HALL: V3 = [13, 0, -6];
export const DOG0: V3 = [13, 0, 1.6];       // the mayor's giant dog, sitting in front of town hall, facing -x
export const DOGM: V3 = [5.6, 0, 15.6];     // the dog lying behind Mom's fence (part 2)
export const POST: V3 = [17.6, 0, 3.0];
export const STAGE: V3 = [0, 0, -8.6];      // fair stage 5 x 2.6, 0.6 high
export const STAGE_Y = 0.6;
export const MAYOR1: V3 = [0, STAGE_Y, -9.15]; // mayor behind the lectern
export const LECTERN: V3 = [0, STAGE_Y, -8.35]; // lectern 1.0 high
export const PIE: V3 = [-7.2, 0, -3.5];
export const STL1: V3 = [-9.6, 0, 3.4], STL2: V3 = [8.4, 0, 7.0], STL3: V3 = [-8.6, 0, -9.2];
export const FOUNTAIN: V3 = [-4.0, 0, 5.0];
export const PAD: V3 = [-14.5, 0, -3.0];   // the cow paddock
export const BAKERY: V3 = [-15.2, 0, 8.6];
export const MOMT: V3 = [-4.4, 0, 15.6];   // Mom's yard table (top 0.78)
export const MOMP: V3 = [-4.4, 0, 16.75];
export const MOMS: V3 = [-6.3, 0, 16.0];    // Mom steps aside to the end of the table (shots 6+)
export const HERO: V3 = [-0.9, 0, -2.2];
export const PIP0: V3 = [-0.15, 0, -2.0];
export const GP: V3 = [-6.0, 0, -1.4];     // grandpa (part 1, by the pie table)
export const GP2: V3 = [-1.2, 0, 1.6];     // grandpa (part 2)
export const GM: V3 = [-5.7, 0, 3.0];      // grandma (by the fountain)
export const MAIL0: V3 = [3.0, 0, -0.6];
export const NEIGH0: V3 = [4.5, 0, 0.4];
export const CH2: V3 = [1.6, 0, 4.4];      // the chicken mailman at the end
export const SC = { hero: 0.82, pip: 0.64, adult: 1, giant: 5, tinyMayor: 0.13 };
export const faceY = (sc: number) => 1.72 * sc;

// ---------------- the spiral stair round the tower ----------------
// four flights, one per side, 20 steps each, 5 m rise per side; centre line 3.65 m from the tower axis.
export const SR = 3.65;
export const stairAt = (u: number): { p: V3; yaw: number } => {
  const k0 = Math.max(0, Math.min(3.9999, u)), i = Math.floor(k0), k = k0 - i, tz = TOWER[2];
  const y = i < 3 ? 5 * (i + k) : 15 + 5.3 * k;
  if (i === 0) return { p: [-SR + 2 * SR * k, y, tz + SR], yaw: Math.PI / 2 };
  if (i === 1) return { p: [SR, y, tz + SR - 2 * SR * k], yaw: Math.PI };
  if (i === 2) return { p: [SR - 2 * SR * k, y, tz - SR], yaw: -Math.PI / 2 };
  return { p: [-SR, y, tz - SR + 2 * SR * k], yaw: 0 };
};
/** outward normal of the flight at u (for cameras and railings) */
export const stairOut = (u: number): V3 => { const i = Math.floor(Math.max(0, Math.min(3.9999, u))); return ([[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0]] as V3[])[i]; };
/** where the hero is on the stair (part 1): u 0 at 47.1 s .. 4 at 57.1 s */
export const heroStairU = (t: number) => 4 * clamp01((t - 47.1) / 10.0);

// ---------------- magic states ----------------
export const heroIsPip = (t: number) => (PART === 1 ? t > W1.flash + 0.05 : t < W2.click + 0.05);
export const mayorTiny = (t: number) => (PART === 1 ? t > W1.shrank : t < W2.grew);
export const mailChicken = (t: number) => (PART === 1 ? t > 42.55 : true);
export const spaghettiOn = (t: number) => (PART === 1 ? t > 45.55 : t < W2.confetti);
export const lemonadeOn = (t: number) => (PART === 1 ? t > 53.8 : t < W2.click);
export const fireworksOn = (t: number) => (PART === 1 ? t > 52.45 : t < W2.click);
/** 0..1 house dance amount */
export const danceAt = (t: number) => (PART === 1 ? smooth((t - 55.3) / 0.3) : 1 - smooth((t - W2.click) / 0.4));
/** cow i: height above the paddock floor and a slow spin */
export const cowAt = (i: number, t: number) => {
  const base = [0.0, 0.0, 0.0][i] ?? 0;
  if (PART === 1) {
    const k = clamp01((t - 35.1 - i * 0.25) / 4.0);
    return { y: base + k * (2.8 + i * 1.6) + (k > 0 ? 0.25 * Math.sin(t * 1.3 + i) * k : 0), spin: k * (0.6 + 0.3 * i) * Math.sin(t * 0.5 + i), float: k };
  }
  const hi = 6.5 + i * 1.6 + 0.3 * Math.sin(t * 1.1 + i);
  if (t < W2.landed - 0.3) return { y: hi, spin: 0.5 * Math.sin(t * 0.4 + i), float: 1 };
  const k = clamp01((t - (W2.landed - 0.3)) / 0.45);
  return { y: Math.max(0, hi * (1 - k * k)), spin: 0.5 * Math.sin(t * 0.4 + i) * (1 - k), float: 1 - k };
};
export const COWS: V3[] = [[-15.8, 0, -4.4], [-13.2, 0, -2.0], [-15.2, 0, -0.8]];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; party: boolean };
const mk = (cuts: number[], end: number, gold: number[] = []): ShotDef[] =>
  cuts.map((s, i) => ({ id: i + 1, a: F(s), b: i + 1 < cuts.length ? F(cuts[i + 1]) : end, light: gold.includes(i + 1) ? "golden" : "day", party: true }));
const P1CUTS = [0, 3.7, 7.6, 12.0, 14.35, 20.15, 22.85, 26.8, 28.55, 33.6, 36.45, 40.9, 44.8, 47.1, 51.35, 56.25, 60.35, 63.25, 65.3, 68.0];
const P2CUTS = [0, 3.45, 6.9, 10.2, 15.25, 19.3, 22.9, 25.35, 30.35, 34.15, 38.7, 42.8, 46.7, 50.95, 53.0, 56.45, 60.05, 64.65, 67.55, 69.95];
export const SHOTS: ShotDef[] = PART === 1 ? mk(P1CUTS, TOTAL) : mk(P2CUTS, TOTAL, [19, 20]);
export const XFADE: Record<number, number> = PART === 1 ? {} : { 19: 10 };
export const FLASH_AT = PART === 1 ? F(W1.flash) : F(W2.click);
export const FLASH = PART === 1 ? [1, 1, 1, 1, 0.95, 0.9, 0.82, 0.72, 0.6, 0.48, 0.36, 0.25, 0.15, 0.07] : [1, 0.85, 0.6, 0.35, 0.15];
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
/** jaw flapping while the dog talks (syllable-ish) */
const talk = (t: number, a: number, b: number) => (t > a && t < b ? 0.15 + 0.45 * Math.abs(Math.sin((t - a) * 11)) * (0.6 + 0.4 * Math.sin(t * 3.7)) : 0);
export const dogAt = (t: number, id = 0): DogState => {
  const G = SC.giant, face = -Math.PI / 2;
  if (PART === 1) return { p: DOG0, yaw: face, scale: G, pose: "sit", eye: t > 32.4 ? 1 : 2, jaw: talk(t, 30.1, 31.6) + talk(t, 32.55, 33.4), wag: 1, look: 0 };
  if (id === 4) return { p: DOGM, yaw: face, scale: G, pose: "sleep", rise: 0, eye: t < W2.dogsaid ? 2 : 1, jaw: talk(t, 13.9, 14.95), head: 0, wag: 1, look: t < 13.4 ? 0.5 : 0 };
  return { p: DOG0, yaw: face, scale: G, pose: "sit", eye: 2, jaw: 0, wag: 1, look: 0 };
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
const P = (look: V3, d: number, el: number, az: number, fov: number, s: number, rate = 0.003) => key(s, push(look, d, el, az, fov, F(s), rate));
const heroF = at(HERO, faceY(SC.hero)), pipF = at(PIP0, faceY(SC.pip));
const BTNL: V3 = [0.15, TOP_Y + 0.92, -16.4]; // button + the presser's hand/face in frame
const pipTopF: V3 = [PIPT[0], TOP_Y + faceY(SC.pip), PIPT[2]], heroTopF: V3 = [HEROT[0], TOP_Y + faceY(SC.pip), HEROT[2]];
const dogHead = (d: DogState): V3 => { const f = d.pose === "sit" ? 0.5 : 0.85; return [d.p[0] + Math.sin(d.yaw) * f * d.scale, d.p[1] + (d.pose === "sit" ? 1.2 : 0.55) * d.scale, d.p[2] + Math.cos(d.yaw) * f * d.scale]; };
const DH1 = dogHead(dogAt(0));
/** dog's nose top (where the tiny mayor stands, part 2) */
export const NOSE_TOP: V3 = [DOG0[0] - 0.8 * SC.giant, DOG0[1] + 1.16 * SC.giant, DOG0[2]];
/** follow the hero up the stair: from outside the flight, a little behind and above */
const stairCam = (f: number): Shot => {
  const t = T(f), u = heroStairU(t), s = stairAt(u), o = stairOut(u), fw: V3 = [Math.sin(s.yaw), 0, Math.cos(s.yaw)];
  const look: V3 = [s.p[0], s.p[1] + 0.9, s.p[2]];
  return { pos: [look[0] + o[0] * 5.0 - fw[0] * 2.4, look[1] + 1.6, look[2] + o[2] * 5.0 - fw[2] * 2.4], look, fov: 50 };
};
/** two running Pips crossing the lawn to Mom's yard (part 2, shot 4) */
export const runPips = (t: number): V3 => [linR([[10.2, -0.6], [11.7, -4.4]], t), 0, linR([[10.2, 9.0], [11.7, 14.4]], t)];

const CAMS1: Record<number, Key[]> = {
  1: [key(0, (f) => ({ pos: [3.6, 1.6, 15 - 0.035 * f], look: [0, 9 + 0.05 * f, -14], fov: 56, roll: -0.012 })),
    P(BTN_TOP, 2.0, 10, 22, 40, 1.85, 0.004),
    key(2.75, (f) => orb([0, 21.8, -16.6], 14 - 0.012 * (f - F(2.75)), 12, 28, 44), false, 26)],
  2: [key(3.7, (f) => ({ pos: [0.6 - 0.004 * (f - F(3.7)), 0.95, -7.0], look: [-0.4, 2.0, -2.6], fov: 54 })),
    P([0, TOP_Y + 0.36, -16.02], 1.9, 4, 8, 38, 5.6, 0.004)],
  3: [P([GP[0] + 0.35, 2.15, GP[2]], 3.4, 3, 14, 44, 7.6, 0.002), P(at(MAYOR1, STAGE_Y + 1.7), 2.4, 4, 10, 42, 10.0, 0.003)],
  4: [P(add(pipF, [0, 0.1, 0]), 1.9, 2, 18, 42, 12.0, 0.003)],
  5: [key(14.35, (f) => ({ pos: [9 - 0.02 * (f - F(14.35)), 7.5 - 0.03 * (f - F(14.35)), 9], look: [-1, 1.5, -5], fov: 50 })),
    P([8.4, 2.6, 7.0], 4.4, 8, -62, 44, 16.05),
    P([2.0, 2.7, -8.2], 3.0, 4, 22, 42, 16.65),
    P([-7.2, 1.1, -3.5], 2.8, 24, 15, 42, 17.15),
    P([0, 2.0, -8.8], 6.0, 8, 0, 44, 18.0, 0.002)],
  6: [key(20.15, (f) => ({ pos: [-0.6 + 0.004 * (f - F(20.15)), 1.6, -7.1], look: [-0.5, 1.0, -2.0], fov: 52 })),
    P([-0.5, 1.0, -2.1], 2.8, 4, -8, 44, 22.0, 0.003)],
  7: [P(heroF, 1.7, -6, 8, 40, 22.85, 0.003),
    key(23.75, (f) => ({ pos: [-2.2, 1.0, 4.5 - 0.01 * (f - F(23.75))], look: [0, 21.2 - 0.002 * (f - F(23.75)), -16], fov: 50 })),
    P(pipTopF, 2.1, 5, 38, 40, 25.5, 0.003)],
  8: [P(add(heroF, [-0.2, 0.15, 0]), 2.5, -2, -12, 42, 26.8, 0.004), P(BTNL, 2.4, 16, 25, 42, 28.05, 0.003)],
  9: [key(28.55, (f) => ({ pos: [15, 30 - 0.03 * (f - F(28.55)), 24], look: [0, 1, -6], fov: 56 })),
    P(DH1, 10.5, 3, -58, 46, 29.45, 0.0015),
    P(DH1, 8.5, 4, -72, 44, 32.35, 0.002)],
  10: [P(BTNL, 2.4, 22, -20, 42, 33.6, 0.003), P([-14.5, 3.4, -2.6], 10.5, 8, 62, 48, 34.75, 0.0015)],
  11: [P(BTNL, 2.4, 18, 45, 42, 36.45, 0.003), P([0, 1.7, -8.8], 5.2, 6, 6, 44, 37.15, 0.002),
    P([0, STAGE_Y + 1.0 + 0.2, -8.35], 1.5, 6, 12, 40, 39.1, 0.002)],
  12: [P(BTNL, 2.4, 16, -55, 42, 40.9, 0.003), P(add(MAIL0, [0.4, 1.3, 0.3]), 4.0, 5, 20, 44, 41.6, 0.002),
    P([3.9, 0.9, 0.0], 3.2, 8, -35, 42, 43.45, 0.002)],
  13: [P(BTNL, 2.4, 14, 5, 42, 44.8, 0.003), key(45.45, (f) => ({ pos: [-6.5, 3.4, 9.5 - 0.01 * (f - F(45.45))], look: [1, 2.0, -3], fov: 52 }))],
  14: [key(47.1, stairCam), P([0.3, TOP_Y + 0.95, -16.4], 2.6, 12, -40, 44, 49.45, 0.002)],
  15: [P(at(GM, 2.7), 4.2, 4, 15, 50, 51.35, 0.0015), P([-4.0, 1.6, 5.0], 5.5, 10, 32, 46, 53.5, 0.002),
    key(55.2, (f) => ({ pos: [0.5, 3.0, 5.0 - 0.01 * (f - F(55.2))], look: [-4, 5.0, 16.5], fov: 56 }))],
  16: [key(56.25, (f) => orb([-2.4, 21.2, -15.0], 5.4 - 0.006 * (f - F(56.25)), 10, -32, 46)), P([1.0, 21.35, -16.2], 1.6, 8, 0, 52, 57.9, 0.002)],
  17: [P(pipTopF, 2.0, 4, 32, 40, 60.35, 0.003)],
  18: [P([0.15, TOP_Y + 0.9, -16.4], 2.3, 22, -22, 42, 63.25, 0.004)],
  19: [P([0, 21.5, -16.4], 6.2, 5, 16, 46, 65.3, 0.002), key(66.15, (f) => orb([0.9, 21.45, -16.2], 2.0 - 0.003 * (f - F(66.15)), 14, 40, 46, 0.08 * Math.sin(T(f) * 2)))],
  20: [P(heroTopF, 1.6, 3, 40, 40, 68.0, 0.002), key(69.45, (f) => orb([1.0, 21.4, -16.2], 2.4 - 0.004 * (f - F(69.45)), 14, 55, 46))],
};
const momF = at(MOMP, faceY(1));
const DHM = dogHead(dogAt(14, 4));
const CAMS2: Record<number, Key[]> = {
  1: [key(0, (f) => orb([0.9, 21.5, -16.2], 12 - 0.03 * f, 14, 30, 44)), P(heroTopF, 1.55, 3, 30, 40, 2.1)],
  2: [P(heroTopF, 2.0, 4, 34, 44, 3.45, 0.003)],
  3: [P(pipTopF, 1.8, 4, -24, 44, 6.9, 0.003), key(8.95, (f) => orb([0.9, 22.2, -16.2], 7.0 - 0.006 * (f - F(8.95)), 18, 22, 50))],
  4: [key(10.2, (f) => { const p = runPips(T(f)); return { pos: [p[0] + 3.6, 1.4, p[2] - 1.2], look: [p[0] - 0.4, 0.8, p[2] + 0.6], fov: 48 }; }),
    P(momF, 1.9, 3, 180, 40, 11.6), P(DHM, 11, 4, -82, 46, 12.65, 0.002), P(DHM, 8.5, 3, -84, 44, 13.55, 0.002)],
  5: [P(momF, 2.1, 3, 172, 42, 15.25), P([-4.4, 1.05, 15.6], 1.6, 26, 10, 40, 17.6, 0.003)],
  6: [P([-4.4, 1.0, 14.9], 3.0, 14, 2, 44, 19.3, 0.0015)],
  7: [P([-4.4, 0.95, 14.9], 2.4, 12, 6, 42, 22.9, 0.002), P(at(MOMS, 0.9), 3.4, 12, 200, 46, 24.65, 0.002)],
  8: [key(25.35, (f) => ({ pos: [10 - 0.01 * (f - F(25.35)), 12, 14], look: [-3, 2.5, -3], fov: 52 })), P([2.5, 0.7, 2.0], 2.4, 8, 30, 42, 27.75, 0.002)],
  9: [key(30.35, (f) => ({ pos: [-6, 2.0, 10.5 - 0.01 * (f - F(30.35))], look: [-14, 6.5, 6.5], fov: 50 })), P([-4.0, 1.0, 8.6], 3.2, 16, 20, 44, 32.6, 0.002)],
  10: [P(add(NOSE_TOP, [0, 0.2, 0]), 1.8, 8, -60, 42, 34.15, 0.002), P([9, 2, 2], 10.5, 6, -58, 48, 37.3, 0.0015)],
  11: [P(at(GP2, 1.85), 2.0, 3, 10, 40, 38.7), key(40.5, (f) => ({ pos: [-0.4, 1.3, 4.2], look: [0, 9.5 + 0.02 * (f - F(40.5)), -16], fov: 56 }))],
  12: [key(42.8, (f) => ({ pos: [9.5, 8.0, 2.5 - 0.01 * (f - F(42.8))], look: [1.5, 7.0, -16], fov: 56 })),
    key(45.45, (f) => ({ pos: [9.5, 10.5, -6.0], look: [3, 12.5 + 0.01 * (f - F(45.45)), -17], fov: 50 }))],
  13: [P([0, 21.4, -16.4], 3.8, 12, 30, 44, 46.7, 0.002), P(BTNL, 2.3, 18, 22, 42, 47.75), P([0, TOP_Y + 0.82, -16.4], 0.95, 42, 15, 38, 49.2, 0.002)],
  14: [P([0, TOP_Y + 0.82, -16.4], 1.0, 56, 6, 38, 50.95, 0.002)],
  15: [P([0.4, 21.5, -16.0], 4.4, 10, -26, 46, 53.0, 0.002), P([0.3, TOP_Y + 0.9, -16.4], 1.9, 22, 10, 42, 55.1)],
  16: [P([0.95, 21.3, -16.2], 2.2, 18, 20, 42, 56.45), P(BTNL, 2.4, 22, 16, 42, 57.7, 0.002)],
  17: [P(BTNL, 2.3, 22, 8, 42, 60.05, 0.003), P([-14.5, 1.6, -2.6], 8.5, 8, 62, 46, 60.55, 0.002), P([0, 1.8, -8.8], 5.0, 6, 6, 44, 61.5, 0.002),
    key(62.7, (f) => ({ pos: [-6.5, 3.4, 9.5 - 0.01 * (f - F(62.7))], look: [1, 2.0, -3], fov: 52 }))],
  18: [P([1.0, 21.3, -16.2], 1.6, 10, 10, 46, 64.65, 0.002), P(at(MOMS, 0.7), 3.2, 18, 200, 44, 66.55, 0.002)],
  19: [key(67.55, (f) => ({ pos: [-3, 2.5, 12.5 - 0.012 * (f - F(67.55))], look: [1, 6, -12], fov: 54 }))],
  20: [P(add(CH2, [0, 0.8, 0]), 2.5, 6, 26, 40, 69.95, 0.0015),
    key(72.2, () => ({ pos: [-1.2, 2.6, 13.5], look: [-0.4, 6.5, -6], fov: 54 }), false, 70)],
};
const CAMS = PART === 1 ? CAMS1 : CAMS2;

const KICKS: [number, number][] = PART === 1
  ? [[W1.pressed, 1.0], [W1.pressed2, 0.6], [W1.again2, 0.6], [W1.again3, 0.6], [W1.again4, 0.6], [W1.pressed3 + 0.2, 1.2], [W1.flash, 1.4]]
  : [[W2.squeaky - 0.6, 0.4], [W2.even, 0.8], [W2.fainted, 0.8], [W2.click, 1.4], [W2.landed, 0.8]];
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

// ---------------- the button ----------------
/** button state: press depth 0..1, glow 0..1, flip 0 (red up) .. 1 (blue up), lift (m) */
const PRESSES1 = [W1.pressed, W1.pressed2, W1.again2 + 0.05, W1.again3 + 0.05, W1.again4 + 0.05, 63.62];
for (let i = 0; i < 9; i++) PRESSES1.push(49.7 + i * 0.25);
const PRESSES2 = [W2.click];
export const buttonAt = (t: number) => {
  let press = 0;
  for (const p of PART === 1 ? PRESSES1 : PRESSES2) { const k = t - p + 0.06; if (k > 0 && k < 0.3) press = Math.max(press, k < 0.08 ? k / 0.08 : 1 - (k - 0.08) / 0.22); }
  const glow = PART === 1 ? 0.35 + 0.25 * Math.sin(t * 4) + (t > 63.4 ? smooth((t - 63.4) / 2.2) * 2.5 : 0) : 0.35 + 0.25 * Math.sin(t * 4);
  const flip = PART === 2 ? smooth((t - 47.85) / 0.7) : 0;
  const lift = PART === 2 ? 0.45 * Math.sin(Math.PI * clamp01((t - 47.7) / 1.0)) : 0;
  return { press, glow, flip, lift };
};
export const D0 = 0;
