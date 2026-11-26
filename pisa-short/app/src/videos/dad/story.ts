// Timeline of "Wanted: One Dad" (our own two-part story): shots timed to the narration (dad-short/voice/p1|p2),
// everyone's marks and the cameras. The part comes from Remotion inputProps { part: 1 | 2 }.
import { getInputProps } from "remotion";
export const FPS = 30;
export const PART: 1 | 2 = (getInputProps() as { part?: number }).part === 2 ? 2 : 1;
export const DURS = { 1: 2205, 2: 2295 } as const; // 73.5 s (voice 71.0 + end card), 76.5 s (voice 73.5 + end card)
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
  father: 1.74, except: 2.82, me: 3.18, tom: 4.02, shoulders: 5.36, lily: 7.46, wagon: 8.6, horse: 9.84, max: 11.28, kites: 12.44,
  shark: 14.34, mom: 16.06, goldfish: 16.64, idea: 17.8, sign: 19.18, wanted: 19.72, pancakes: 21.36, snore: 22.52, dinos: 23.46,
  town: 25.3, door: 26.46, tree: 27.12, cow: 28.58, cand1: 29.6, fire: 30.96, burned: 32.18, putout: 33.7, kitchen: 35.88,
  cand2: 36.86, clown: 38.16, asleep: 39.3, snored: 40.36, pigeons: 41.76, cand3: 43.28, robot: 44.64, dino: 46.24, screamed: 47.02,
  beeps: 47.56, ran: 48.26, post: 49.48, cand4: 50.32, dog: 52.12, ate: 52.9, ate2: 54.2, backup: 54.54, porch: 56.44, nodad: 57.1,
  okay: 58.52, mailman: 60.0, letter: 60.88, stamp: 62.14, said: 63.0, oak: 65.5, ran2: 66.82, inside: 67.52, glowing: 69.04,
};
export const W2 = {
  oak: 1.48, map: 3.54, find: 4.78, know: 6.2, cap: 8.14, tower: 9.8, climbed: 10.82, stairs: 11.74, wind: 12.76, noway: 14.36,
  rod: 16.48, pond: 17.18, duck: 18.0, back: 20.0, laps: 21.22, won: 22.76, gave: 24.04, book: 26.92, bakery: 27.54, page: 28.9,
  pancakes: 30.86, son: 31.66, map2: 33.5, treehouse: 34.42, noticed: 35.68, box: 37.9, photo: 39.54, man: 40.66, baby: 41.66,
  ears: 43.12, letter: 45.08, reading: 46.52, big: 47.36, cant: 48.3, cap2: 50.58, rod2: 51.28, pancakes2: 52.24, every: 53.36,
  love: 55.82, dad: 56.18, read: 57.44, home: 59.02, night: 60.18, burned: 62.54, perfect: 63.92, plate: 65.74, cap3: 67.24,
  window: 69.78, star: 70.8, winked: 71.08,
};

// ---------------- places ----------------
export const TOWER: V3 = [0, 0, -18];
export const TOWER_H = 20, TOP_Y = 20.55, VANE: V3 = [0, 28.2, -18];
export const CLOCK: V3 = [TOWER[0], 15, TOWER[2] + 3.05];
export const STOOL: V3 = [0, TOP_Y, -16.4];   // the stool on the tower deck with Dad's cap (part 2)
export const CAP_TOP: V3 = [0, TOP_Y + 0.62, -16.4];
export const HALL: V3 = [13, 0, -6];
export const DOG0: V3 = [13, 0, 1.6];
export const DOGY: V3 = [0.6, 0, 9.4];       // the giant dog sitting in the street in front of our house
export const HOUSE_FRONT = 18;              // our house (x -4.4, front at z 18) with a porch
export const PORCH_Y = 0.36;
export const STEP: V3 = [-4.4, PORCH_Y, 16.95]; // where I sit on the porch
export const PORCHD: V3 = [-4.4, 0, 15.6];  // in front of the porch steps
export const DOOR: V3 = [-4.4, PORCH_Y, 17.8];
export const OAK: V3 = [3.4, 0, 15.6], HOLLOW: V3 = [3.4, 1.65, 16.72];
export const POND: V3 = [10.2, 0, 13.4], POND_R = 3.1;
export const TREEHOUSE: V3 = [13.6, 0, 21.2];
export const BAKERY: V3 = [-15.2, 0, 8.6], BAKER: V3 = [-12.15, 0, 8.6];
export const PAD: V3 = [-14.5, 0, -3.0];
export const COWS: V3[] = [[-15.8, 0, -4.4], [-13.2, 0, -2.0], [-15.2, 0, -0.8]];
export const LAMP: V3 = [-6.2, 0, 11.8];    // the lamp post the robot runs into
export const KIT: V3 = [46, 0, 0];          // kitchen + living room set (open toward +z)
export const ROOM: V3 = [46, 0, 34];        // inside the tree house set (open toward +z)
export const STOVE: V3 = [KIT[0] - 2.4, 0, KIT[2] - 2.45], TABLE: V3 = [KIT[0] - 0.4, 0, KIT[2] + 0.5], COUCH: V3 = [KIT[0] + 2.7, 0, KIT[2] - 0.6];
export const WINDOW: V3 = [KIT[0] + 0.3, 1.7, KIT[2] - 2.95];
export const CHEST: V3 = [ROOM[0], 0, ROOM[2] - 0.4];
export const HERO: V3 = [-1.0, 0, 6.0];
export const SC = { hero: 0.8, kid: 0.72, adult: 1, giant: 5, duck: 1 };
export const faceY = (sc: number) => 1.72 * sc;

// ---------------- the spiral stair round the tower ----------------
export const SR = 3.65;
export const stairAt = (u: number): { p: V3; yaw: number } => {
  const k0 = Math.max(0, Math.min(3.9999, u)), i = Math.floor(k0), k = k0 - i, tz = TOWER[2];
  const y = i < 3 ? 5 * (i + k) : 15 + 5.3 * k;
  if (i === 0) return { p: [-SR + 2 * SR * k, y, tz + SR], yaw: Math.PI / 2 };
  if (i === 1) return { p: [SR, y, tz + SR - 2 * SR * k], yaw: Math.PI };
  if (i === 2) return { p: [SR - 2 * SR * k, y, tz - SR], yaw: -Math.PI / 2 };
  return { p: [-SR, y, tz - SR + 2 * SR * k], yaw: 0 };
};
export const stairOut = (u: number): V3 => { const i = Math.floor(Math.max(0, Math.min(3.9999, u))); return ([[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0]] as V3[])[i]; };
/** part 2: my climb, u 0 at 10.5 s .. 4 at 13.0 s (a quick montage), then the deck */
export const heroStairU = (t: number) => 4 * clamp01((t - 10.5) / 2.3);

// ---------------- walkers ----------------
/** a dad + kid pair strolling across the square (part 1 opening) */
export const stroll = (i: number, t: number): { p: V3; yaw: number } => {
  const lanes: [V3, V3][] = [[[-3, 0, -6], [9, 0, -4.5]], [[7, 0, -1.0], [-8, 0, 0.5]], [[-9, 0, 2.5], [6, 0, 4.0]], [[8, 0, 8.0], [-9, 0, 7.2]]];
  const [a, b] = lanes[i % 4], k = ((t * 0.045 + i * 0.27) % 1);
  return { p: [a[0] + (b[0] - a[0]) * k, 0, a[2] + (b[2] - a[2]) * k], yaw: Math.atan2(b[0] - a[0], b[2] - a[2]) };
};
/** Lily's wagon ride (part 1, shot 3): dad pulls the wagon across the lawn */
export const wagonAt = (t: number): { p: V3; yaw: number } => { const k = clamp01((t - 7.3) / 4.0); return { p: [linR([[0, -5.5], [1, 3.5]], k), 0, 3.2 + 0.6 * Math.sin(k * 3)], yaw: Math.PI / 2 + 0.2 * Math.cos(k * 3) }; };
/** the duck and me racing round the pond (part 2, shot 7) */
export const lapAt = (t: number, lead: number): { p: V3; yaw: number } => {
  const th = (t - 20.45) * 2.6 + lead, r = POND_R + 0.75;
  return { p: [POND[0] + Math.cos(th) * r, 0, POND[2] + Math.sin(th) * r], yaw: Math.atan2(-Math.sin(th), Math.cos(th)) };
};
/** the robot fleeing into the lamp post (part 1, shot 14) */
export const robotRun = (t: number): V3 => { const k = clamp01((t - 47.6) / 1.85); return [linR([[0, -2.8], [1, LAMP[0] + 0.45]], k), 0, linR([[0, 14.6], [1, LAMP[2] + 0.4]], k)]; };

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; party: boolean };
const mk = (cuts: number[], end: number, gold: number[] = []): ShotDef[] =>
  cuts.map((s, i) => ({ id: i + 1, a: F(s), b: i + 1 < cuts.length ? F(cuts[i + 1]) : end, light: gold.includes(i + 1) ? "golden" : "day", party: false }));
const P1CUTS = [0, 3.85, 7.3, 11.1, 14.85, 18.6, 20.8, 24.25, 29.4, 31.85, 36.7, 38.85, 43.1, 45.4, 50.15, 52.6, 55.05, 59.55, 62.65, 66.3];
const P2CUTS = [0, 4.05, 7.0, 10.5, 15.15, 17.7, 20.45, 25.4, 27.65, 32.4, 36.85, 40.35, 44.1, 45.9, 49.6, 53.2, 56.85, 59.9, 64.7, 68.75];
export const SHOTS: ShotDef[] = PART === 1 ? mk(P1CUTS, TOTAL) : mk(P2CUTS, TOTAL, [16, 17]);
export const XFADE: Record<number, number> = PART === 1 ? {} : { 17: 12, 18: 12 };
export const FLASH_AT = -100;
export const FLASH: number[] = [];
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
export const DOGY_YAW = Math.atan2(PORCHD[0] - DOGY[0], PORCHD[2] - DOGY[2]);
export const dogAt = (t: number, id = 0): DogState => {
  const G = SC.giant;
  if (PART === 1 && (id === 15 || id === 16)) {
    const chomp = (a: number) => (t > a && t < a + 0.7 ? Math.abs(Math.sin((t - a) * 14)) : 0);
    return { p: DOGY, yaw: DOGY_YAW, scale: G, pose: "sit", eye: t > W1.ate && t < 55.0 ? 0 : 2, jaw: Math.max(chomp(W1.ate), chomp(W1.ate2)), wag: 1, look: 0 };
  }
  return { p: DOG0, yaw: -Math.PI / 2, scale: G, pose: "sit", eye: 2, jaw: 0, wag: 1, look: 0 };
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
const orb = (look: V3, d: number, el: number, az: number, fov = 40, roll = 0): Shot => {
  const e = (el * Math.PI) / 180, a = (az * Math.PI) / 180;
  return { pos: [look[0] + d * Math.sin(a) * Math.cos(e), look[1] + d * Math.sin(e), look[2] + d * Math.cos(a) * Math.cos(e)], look, fov, roll };
};
const push = (look: V3, d: number, el: number, az: number, fov: number, f0: number, rate: number, roll = 0) => (f: number) => orb(look, d * pushK(f, f0, rate), el, az, fov, roll);
const key = (s: number, fn: (f: number) => Shot, cut = true, dur?: number): Key => ({ f: F(s), cut, dur, s: fn });
const P = (look: V3, d: number, el: number, az: number, fov: number, s: number, rate = 0.003) => key(s, push(look, d, el, az, fov, F(s), rate));
const kF = (p: V3, sc = SC.hero) => at(p, p[1] + faceY(sc));
/** follow a moving mark from a fixed offset */
const follow = (fn: (t: number) => V3, off: V3, lookY: number, fov = 46) => (f: number) => { const p = fn(T(f)); return { pos: add(p, off), look: [p[0], p[1] + lookY, p[2]] as V3, fov }; };
const stairCam = (f: number): Shot => {
  const t = T(f), u = heroStairU(t), s = stairAt(u), o = stairOut(u), fw: V3 = [Math.sin(s.yaw), 0, Math.cos(s.yaw)];
  const look: V3 = [s.p[0], s.p[1] + 0.9, s.p[2]];
  return { pos: [look[0] + o[0] * 5.5 - fw[0] * 2.6, look[1] + 1.8, look[2] + o[2] * 5.5 - fw[2] * 2.6], look, fov: 52 };
};
const dogHead = (d: DogState): V3 => [d.p[0] + Math.sin(d.yaw) * 0.5 * d.scale, d.p[1] + 1.2 * d.scale, d.p[2] + Math.cos(d.yaw) * 0.5 * d.scale];
const DHY = dogHead(dogAt(53, 15));

const CAMS1: Record<number, Key[]> = {
  1: [key(0, (f) => ({ pos: [9 - 0.03 * f, 6.5 - 0.02 * f, 14], look: [-1, 1.4, 0], fov: 54 })), P(kF(STEP), 2.4, 4, 188, 42, 2.4, 0.003)],
  2: [key(3.85, follow((t) => stroll(0, t).p, [3.5, 2.4, 5.5], 1.8, 48))],
  3: [key(7.3, follow((t) => wagonAt(t).p, [2.4, 1.8, 5.6], 1.0, 50))],
  4: [key(11.1, () => ({ pos: [-6.5, 1.2, 9.5], look: [-2.0, 4.2, 2.0], fov: 54 })), P([-2.4, 7.5, 0.5], 6.0, -8, 30, 46, 13.15, 0.002)],
  5: [P(kF(STEP), 2.6, 4, 192, 44, 14.85, 0.002), P([-4.0, 1.2, 17.2], 3.6, 6, 200, 46, 16.4, 0.002), P(kF(STEP), 1.8, 3, 186, 40, 17.4, 0.004)],
  6: [P([TABLE[0], 1.05, TABLE[2]], 2.6, 22, 12, 44, 18.6, 0.002)],
  7: [P([TABLE[0], 0.84, TABLE[2] + 0.05], 1.65, 70, 0, 38, 20.8, 0.002)],
  8: [P([-4.4, 1.6, 17.9], 3.4, 4, 198, 44, 24.25, 0.002), P([OAK[0], 1.7, OAK[2] + 1.05], 3.2, 4, 12, 44, 26.85),
    P([COWS[1][0], 1.3, COWS[1][2]], 3.8, 6, 30, 44, 27.55, 0.002)],
  9: [P(kF(PORCHD, 1), 3.6, 4, 190, 46, 29.4, 0.003)],
  10: [P([STOVE[0] + 0.4, 1.3, STOVE[2] + 0.6], 3.6, 10, 18, 46, 31.85, 0.002), key(33.55, () => ({ pos: [KIT[0] + 1.6, 1.7, KIT[2] + 5.2], look: [KIT[0] - 1.4, 1.1, KIT[2] - 1.4], fov: 52 })),
    key(34.85, (f) => ({ pos: [KIT[0] + 0.6, 2.4, KIT[2] + 6.6 + 0.01 * (f - F(34.85))], look: [KIT[0] - 0.4, 1.0, KIT[2] - 0.6], fov: 58 }))],
  11: [P(kF(PORCHD, 1), 3.6, 4, 168, 46, 36.7, 0.003)],
  12: [P([COUCH[0] - 0.3, 1.0, COUCH[2]], 3.2, 8, -38, 46, 38.85, 0.002), key(41.6, (f) => ({ pos: [-2, 2.5, 13], look: [3, 8 + 0.03 * (f - F(41.6)), -6], fov: 58 }))],
  13: [P(kF(PORCHD, 1.02), 3.6, 4, 194, 46, 43.1, 0.003)],
  14: [P([-4.4, 1.2, 16.2], 3.6, 8, 250, 46, 45.4, 0.002), key(47.55, () => ({ pos: [-1.5, 1.6, 10.2], look: [-4.6, 1.2, 13.4], fov: 50 })), P([LAMP[0] + 0.3, 1.5, LAMP[2] + 0.4], 2.6, 6, 40, 44, 49.3)],
  15: [key(50.15, (f) => ({ pos: [-4.0, 1.2, 16.4 - 0.004 * (f - F(50.15))], look: [DOGY[0] - 0.5, 5.2, DOGY[2]], fov: 60 }))],
  16: [P(DHY, 9.5, 2, -35, 48, 52.6, 0.002)],
  17: [P(kF(STEP), 4.2, 8, 190, 46, 55.05, 0.0015), P(kF(STEP), 1.8, 2, 184, 40, 57.0, 0.003)],
  18: [P([-4.3, 1.2, 16.0], 3.6, 4, 205, 46, 59.55, 0.002)],
  19: [P([-4.4, PORCH_Y + 1.0, 16.4], 1.6, 12, 186, 38, 62.65, 0.002)],
  20: [key(66.3, follow((t) => [linR([[66.3, -3.8], [68.0, 2.2]], t), 0, linR([[66.3, 15.4], [68.0, 17.6]], t)], [-0.8, 1.4, 4.0], 1.0, 50)),
    P(HOLLOW, 2.6, 4, 8, 42, 68.0, 0.004)],
};
const CAMS2: Record<number, Key[]> = {
  1: [P([OAK[0], 3.2, OAK[2]], 8.5, 8, 10, 52, 0, 0.002), P(HOLLOW, 2.8, 4, 14, 44, 2.3, 0.003)],
  2: [P([OAK[0] - 0.5, 1.35, OAK[2] + 1.8], 1.5, 40, 0, 40, 4.05, 0.002)],
  3: [key(7.0, (f) => ({ pos: [2.5, 1.2, -4 + 0.01 * (f - F(7.0))], look: [0, 18 + 0.03 * (f - F(7.0)), -16], fov: 54 })), P(CAP_TOP, 1.4, 14, 20, 40, 8.6, 0.003)],
  4: [key(10.5, stairCam), P([0.5, TOP_Y + 1.0, -16.0], 2.8, 10, -60, 46, 12.9, 0.002)],
  5: [P([POND[0] - 2.2, 0.6, POND[2] + 0.4], 8.0, 22, 30, 54, 15.15, 0.0015)],
  6: [P([POND[0] - POND_R - 0.3, 0.45, POND[2] + 0.6], 1.7, 8, -60, 42, 17.7, 0.002)],
  7: [key(20.45, () => ({ pos: [POND[0], 7.5, POND[2] + 8.5], look: [POND[0], 0.4, POND[2]], fov: 52 })), P([POND[0] - POND_R - 1.0, 0.8, POND[2] + 0.7], 3.4, 10, 40, 48, 23.3, 0.002)],
  8: [P([BAKER[0] + 0.6, 1.4, BAKER[2] - 0.3], 3.8, 4, 60, 48, 25.4, 0.002)],
  9: [P([BAKER[0] + 0.85, 1.35, BAKER[2] + 0.1], 1.5, 12, 85, 38, 27.65, 0.002)],
  10: [key(32.4, (f) => ({ pos: [7.5, 1.6, 13.5 - 0.01 * (f - F(32.4))], look: [12.5, 2.5 + 0.06 * (f - F(32.4)), 20], fov: 52 }))],
  11: [P([CHEST[0], 0.75, CHEST[2] - 0.3], 3.0, 16, 8, 46, 36.85, 0.002)],
  12: [P([CHEST[0], 1.25, CHEST[2] + 0.6], 0.8, 8, 0, 38, 40.35, 0.002), key(42.3, (f) => orb([CHEST[0], 1.0, CHEST[2] - 0.75], 1.7 - 0.002 * (f - F(42.3)), 8, 6, 40))],
  13: [P([CHEST[0], 0.7, CHEST[2]], 1.6, 30, -10, 42, 44.1, 0.002)],
  14: [P([CHEST[0], 1.25, CHEST[2] + 0.6], 1.5, 8, 0, 38, 45.9, 0.0015)],
  15: [P([CHEST[0], 0.6, CHEST[2] + 0.5], 2.0, 35, 15, 44, 49.6, 0.002)],
  16: [P([CHEST[0], 1.0, CHEST[2] - 0.75], 1.7, 6, 6, 40, 53.2, 0.0015), key(55.6, (f) => orb([CHEST[0], 0.9, CHEST[2] - 0.4], 3.6 + 0.004 * (f - F(55.6)), 10, 0, 46), false, 40)],
  17: [key(56.85, (f) => ({ pos: [-1.5, 1.6, 4.5 - 0.004 * (f - F(56.85))], look: [-3.6, 1.0, 13.5], fov: 46 }))],
  18: [P([STOVE[0] + 0.5, 1.1, STOVE[2] + 0.75], 2.8, 8, 60, 46, 59.9, 0.002), P([TABLE[0], 1.1, TABLE[2] - 0.2], 4.0, 14, 8, 46, 62.9, 0.0015)],
  19: [P([TABLE[0], 0.95, TABLE[2] - 0.1], 3.4, 24, 10, 46, 64.7, 0.0015), P([TABLE[0] + 0.55, 0.9, TABLE[2] + 0.35], 1.5, 28, 20, 40, 66.8, 0.002)],
  20: [P([WINDOW[0] - 0.1, 1.3, WINDOW[2] + 0.9], 2.6, 4, 55, 44, 68.75, 0.002), key(70.4, (f) => ({ pos: [KIT[0] + 1.3, 1.45, KIT[2] - 0.9], look: [WINDOW[0] + 0.2, 1.85 + 0.002 * (f - F(70.4)), WINDOW[2]], fov: 46 })),
    key(72.6, (f) => ({ pos: [KIT[0] + 0.2, 2.4, KIT[2] + 6.5 + 0.01 * (f - F(72.6))], look: [KIT[0] - 0.2, 1.4, KIT[2] - 1.2], fov: 50 }), false, 60)],
};
const CAMS = PART === 1 ? CAMS1 : CAMS2;
const KICKS: [number, number][] = PART === 1 ? [[W1.putout, 0.6], [W1.snored, 0.8], [W1.post, 1.2], [W1.ate, 0.6]] : [[W2.wind, 0.5], [W2.won, 0.4]];
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
export const D0 = 0;
