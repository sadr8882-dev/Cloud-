// Timeline of "The Tower That Took a Break" (Pisa, edu mode): shots timed to the Russian narration
// (pisa-short/voice/words.json), tower state per shot (floors built, lean, banana curve, scaffolding) and the camera
// grammar of the style study: continuous slow push-ins, symmetric smootherstep glides, hard cuts on big reframes,
// 7-frame flip-sign kicks on impacts, no hand-held float.
import * as THREE from "three";

export const FPS = 30;
export const TOTAL = 2340; // 78.0 s (voice 77.2 s + tail)
export const D0 = 0; // ground level of the piazza
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * smooth((x - x0) / (x1 - x0)));
  }
  return pts[pts.length - 1][1];
};

// ---------------- word times (s), from words.json ----------------
export const W = {
  padat: 1.332, dostroili: 3.049, god: 6.587, piza: 6.793, kolokolnyu: 8.86, mramora: 10.055,
  etazh: 10.723, etazhom: 11.491, neskolko: 13.355, krenitsya: 14.64,
  pod: 15.602, glina: 16.632, zemlya: 18.349, odna: 19.011, prosedaet: 19.669,
  schastyu1: 21.316, pereryv1: 23.832, neschastyu: 24.659, sto: 26.852, schastyu2: 27.567, spas: 29.917,
  sozhmi: 31.135, voda: 32.679, gubka: 34.082, tverdeet: 34.432,
  bashnya2: 35.504, vyzhimala: 36.247, zemlya2: 38.002, krepche: 38.745,
  potom: 39.803, vyshe: 42.1, nizkoy: 42.674, poetomu: 44.264, izognuta: 45.952, banan: 47.285,
  v1934: 48.229, zalili: 50.887, tsement: 51.304, naklonilas: 53.243, silnee: 54.2,
  k1990: 55.238, verkh: 57.376, chetyre: 58.536, metra: 59.819,
  inzhenery: 60.486, vynuli: 61.672, zemlyu: 62.11, vypryamilas: 64.282, sorok: 65.527,
  teper: 66.723, sotni: 68.133, smeshnoe: 69.818, sama: 72.514, esche: 73.084, chetyre2: 73.435, ochen: 74.964, medlenno: 75.731,
};
const F = (s: number) => Math.round(s * FPS);

// ---------------- the tower ----------------
// level 0: ground floor (blind arcade), levels 1-6: galleries, level 7: belfry. Heights in metres.
export const LEVEL_H = [10.5, 6.2, 6.2, 6.2, 6.2, 6.2, 6.2, 6.0];
export const LEVEL_BASE = LEVEL_H.reduce<number[]>((a, h, i) => (a.push(i ? a[i - 1] + LEVEL_H[i - 1] : 0), a), []);
export const R_OUT = 7.6;
export type Era = "1173" | "1272" | "1934" | "1990" | "now";
export type TowerState = { floors: number; lean: number; curve: number; scaffold: boolean; era: Era };
const deg = (d: number) => (d * Math.PI) / 180;
/** counter-tilt of each level relative to the one below (the "banana": upper floors built taller on the low side) */
export const CURVE_K = [0, 0, 0, 0.35, 0.45, 0.55, 0.65, 0.8];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; cut?: boolean; tower: (t: number) => TowerState };
const T0 = (floors: number, lean: number, scaffold = true, era: Era = "1173", curve = 0): TowerState => ({ floors, lean, curve, scaffold, era });
const LEAN_A = 3.6; // after the first sinking (cartoon scale)
export const SHOTS: ShotDef[] = [
  // 1 hook (flash-forward): half-built tower starts to go over, builders on the scaffold freeze
  { id: 1, a: 0, b: 124, light: "day", tower: (t) => T0(4.6, lin([[0, 1.2], [W.padat, 2.0], [W.dostroili + 0.4, 4.4]], t) + 0.12 * Math.sin(t * 9) * smooth((t - 1.4) / 2)) },
  // 2 1173, Pisa: the first floor goes up, masons with marble
  { id: 2, a: 124, b: 319, light: "day", tower: (t) => T0(lin([[4.4, 0.45], [10.4, 0.75]], t), 0) },
  // 3 floor after floor
  { id: 3, a: 319, b: 372, light: "day", tower: (t) => T0(lin([[W.etazh - 0.15, 1.0], [W.etazh + 0.6, 2.0], [W.etazhom - 0.05, 2.15], [W.etazhom + 0.6, 3.15]], t), 0) },
  // 4 it starts to lean
  { id: 4, a: 372, b: 464, light: "day", tower: (t) => T0(lin([[12.4, 3.15], [15.4, 3.4]], t), lin([[W.krenitsya - 0.1, 0], [W.krenitsya + 0.55, 2.6]], t)) },
  // 5 cutaway: soft wet clay, one side sinks faster
  { id: 5, a: 464, b: 630, light: "day", cut: true, tower: (t) => T0(3.4, lin([[W.prosedaet - 0.1, 2.6], [W.prosedaet + 1.1, LEAN_A]], t)) },
  // 6 luckily, a break
  { id: 6, a: 630, b: 735, light: "day", tower: () => T0(3.4, LEAN_A) },
  // 7 unluckily, almost a hundred years (golden, grown over)
  { id: 7, a: 735, b: 822, light: "golden", tower: () => T0(3.4, LEAN_A) },
  // 8 luckily, the break saved it
  { id: 8, a: 822, b: 928, light: "day", tower: () => T0(3.4, LEAN_A, false) },
  // 9 sponge insert
  { id: 9, a: 928, b: 1061, light: "day", tower: () => T0(3.4, LEAN_A, false) },
  // 10 cutaway: the tower squeezes the water out of the clay
  { id: 10, a: 1061, b: 1190, light: "day", cut: true, tower: () => T0(3.4, LEAN_A, false) },
  // 11 1272: building again, taller on the low side -> the banana
  { id: 11, a: 1190, b: 1440, light: "day", tower: (t) => {
    const fl = lin([[W.potom, 3.4], [W.nizkoy + 0.8, 7.0], [W.poetomu - 0.1, 7.0], [W.poetomu + 0.2, 8.0]], t);
    return T0(fl, lin([[W.potom, LEAN_A], [W.poetomu, 4.1]], t), t < W.poetomu - 0.05, "1272", lin([[W.potom + 0.5, 0], [W.nizkoy + 0.8, 1.0], [W.izognuta, 1.0], [W.izognuta + 0.6, 1.35]], t));
  } },
  // 12 1934: cement under the tower -> it leans even more
  { id: 12, a: 1440, b: 1640, light: "day", tower: (t) => T0(8, lin([[W.naklonilas - 0.05, 4.6], [W.naklonilas + 0.35, 5.5]], t), false, "1934", 1.0) },
  // 13 1990: the top hangs 4.5 m out
  { id: 13, a: 1640, b: 1806, light: "day", tower: () => T0(8, 5.5, false, "1990", 1.0) },
  // 14 cutaway: engineers take soil from under the high side, the tower comes back ~40 cm
  { id: 14, a: 1806, b: 1995, light: "day", cut: true, tower: (t) => T0(8, lin([[W.vypryamilas - 0.2, 5.5], [W.sorok + 0.6, 4.1]], t), false, "1990", 1.0) },
  // 15 now: safe for hundreds of years
  { id: 15, a: 1995, b: 2072, light: "day", tower: () => T0(8, 4.1, false, "now", 1.0) },
  // 16 and since then it straightens by itself, very, very slowly
  { id: 16, a: 2072, b: TOTAL, light: "day", tower: (t) => T0(8, lin([[W.sama - 0.4, 4.1], [W.medlenno + 0.6, 3.92]], t), false, "now", 1.0) },
];
/** crossfades at time jumps; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 7: 10, 8: 10, 11: 8, 12: 8, 13: 8, 15: 8 };
export const FLASH_AT = 124;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};
export const towerAt = (id: number, t: number) => SHOTS[id - 1].tower(t);

/** world matrices of every level's base (level k local frame: y up from that level's floor, centre on the axis) */
export const towerMats = (s: TowerState): THREE.Matrix4[] => {
  const out: THREE.Matrix4[] = [];
  let m = new THREE.Matrix4().makeRotationZ(-deg(s.lean));
  for (let k = 0; k < LEVEL_H.length; k++) {
    if (k > 0) m = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, LEVEL_H[k - 1], 0)).multiply(new THREE.Matrix4().makeRotationZ(deg(CURVE_K[k] * s.curve)));
    out.push(m);
  }
  return out;
};
const tv = new THREE.Vector3();
/** a point in level k's frame, in world space */
export const towerPt = (s: TowerState, k: number, x: number, y: number, z: number): V3 => {
  tv.set(x, y, z).applyMatrix4(towerMats(s)[k]);
  return [tv.x, tv.y, tv.z];
};
/** top of the built part: level index and height inside it */
export const topOf = (s: TowerState) => {
  const k = Math.min(LEVEL_H.length - 1, Math.max(0, Math.ceil(s.floors) - 1));
  const frac = s.floors >= LEVEL_H.length ? 1 : Math.max(0.12, s.floors - k);
  return { k, y: LEVEL_H[k] * frac };
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
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });

/** height (level-local) of the upper scaffold planks on the top level */
export const scaffoldTop = (s: TowerState) => Math.max(0, topOf(s).y - 4.2) + 3.4 + 0.06;
/** where the scaffold crew stands on top of the built part (shot 1, 4): level-local point -> world */
const topPt = (id: number, f: number, x: number, dy: number, z: number) => {
  const st = towerAt(id, T(f)), { k } = topOf(st);
  return towerPt(st, k, x, scaffoldTop(st) + dy, z);
};
export const CUTZ = 8.25;
/** x of the 1990 plumb rope's foot (shot 13), from the tower at that moment */
export const ropeFoot = () => towerPt(towerAt(13, 56), 7, R_OUT + 0.15, LEVEL_H[7] - 5.6, 0)[0]; // the cutaway plane (soil block front face)
export const TUB: V3 = [21, 0, 29];
export const BANANA_AT: V3 = [-1.0, 0, 89.4];

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: (f) => dolly([16, 1.7, 40], [2.5, 15, 0], pushK(f, 0, 0.0028), { fov: 48 }) },
    { f: F(W.padat) - 2, cut: true, s: (f) => { const p = topPt(1, f, 2.0, 1.25, 7.9); return dolly([p[0] + 5.0, p[1] + 0.5, p[2] + 6.4], [p[0], p[1], p[2]], pushK(f, 38, 0.003), { fov: 40, roll: -0.04 }); } },
    { f: F(W.dostroili) - 2, cut: true, s: (f) => dolly([-8, 1.3, 26], [3, 17, 0], pushK(f, 89, 0.0035, 0.007, 30), { fov: 52, roll: 0.05 }) },
  ],
  2: [
    { f: 120, s: (f) => zoom([62, 42, 96], [-18, 2, -8], 44, pushK(f, 120, 0.0018)) },
    { f: F(W.kolokolnyu) - 2, cut: true, s: (f) => dolly([2.2, 1.9, 17.2], [1.0, 1.6, 9.9], pushK(f, 264, 0.0025), { fov: 40 }) },
  ],
  3: [{ f: 319, s: (f) => dolly([24, 7, 50], [0, 13, 0], pushK(f, 319, -0.0015), { fov: 46 }) }],
  4: [
    { f: 372, s: (f) => dolly([-6, 8, 44], [0, 12, 0], pushK(f, 372, 0.0025), { fov: 46 }) },
    { f: F(W.neskolko) - 2, cut: true, s: (f) => { const p = topPt(4, F(W.neskolko), 4.7, 1.0, 6.8); return dolly([p[0] + 4.6, p[1] + 0.6, p[2] + 5.6], [p[0] + 0.3, p[1] - 0.1, p[2]], pushK(f, 399, 0.003), { fov: 40 }); } },
    { f: F(W.krenitsya) - 2, cut: true, s: (f) => dolly([-12, 2.5, 46], [1, 13, 0], pushK(f, 437, 0.003), { fov: 48, roll: 0.0 }) },
    { f: F(W.krenitsya) - 2, dur: 22, s: (f) => rolled((g) => dolly([-12, 2.5, 46], [1, 13, 0], pushK(g, 437, 0.003), { fov: 48 }), 0.05)(f) },
  ],
  5: [
    { f: 464, s: (f) => dolly([3, -2.0, CUTZ + 30], [2, 3, 0], pushK(f, 464, 0.002), { fov: 52 }) },
    { f: F(W.glina) - 12, dur: 26, s: (f) => dolly([6.5, -4.2, CUTZ + 13], [6.5, -4.6, CUTZ], pushK(f, 487, 0.002), { fov: 42 }) },
    { f: F(W.odna) - 2, cut: true, s: (f) => dolly([1, -1.0, CUTZ + 34], [2, 4, 0], pushK(f, 568, 0.0025, 0.005, 30), { fov: 52, roll: -0.04 }) },
  ],
  6: [
    { f: 630, s: (f) => dolly([1.2, 1.7, 21.5], [0.2, 1.5, 10.4], pushK(f, 630, 0.0025), { fov: 40 }) },
    { f: F(W.pereryv1) - 14, dur: 28, s: (f) => dolly([2.6, 2.4, 25], [0.2, 2.6, 10.4], pushK(f, 701, 0.002), { fov: 46, roll: 0.035 }) },
  ],
  7: [
    { f: 728, s: (f) => dolly([1.2, 1.4, 17.5], [-0.2, 1.7, 10.1], pushK(f, 728, 0.0025), { fov: 44 }) },
    { f: F(W.sto) - 10, dur: 24, s: (f) => dolly([0.4, 1.2, 14.6], [-0.2, 0.95, 10.1], pushK(f, 796, 0.004), { fov: 38, roll: -0.04 }) },
  ],
  8: [
    { f: 816, s: (f) => dolly([-20, 3.5, 52], [1, 12, 0], pushK(f, 816, 0.002), { fov: 48 }) },
    { f: F(W.spas) - 14, dur: 30, s: (f) => dolly([-14, 1.6, 40], [1, 13, 0], pushK(f, 883, 0.003), { fov: 50, roll: 0.03 }) },
  ],
  9: [
    { f: 928, s: (f) => dolly([TUB[0] + 0.25, 1.15, TUB[2] + 3.4], [TUB[0], 1.0, TUB[2]], pushK(f, 928, 0.0022), { fov: 38 }) },
    { f: F(W.gubka) - 10, dur: 22, s: (f) => dolly([TUB[0] + 0.1, 1.05, TUB[2] + 2.3], [TUB[0], 1.05, TUB[2]], pushK(f, 1012, 0.0025), { fov: 36, roll: 0.035 }) },
  ],
  10: [
    { f: 1061, s: (f) => dolly([2.5, -3.2, CUTZ + 27], [2, 1, 0], pushK(f, 1061, 0.0022), { fov: 52 }) },
    { f: F(W.krepche) - 10, dur: 24, s: (f) => dolly([0.5, -4.5, CUTZ + 18], [0.5, -3.5, 0], pushK(f, 1152, 0.003), { fov: 46 }) },
  ],
  11: [
    { f: 1190, s: (f) => zoom([36, 9, 72], [0, 26, 0], 50, pushK(f, 1190, 0.0012)) },
    { f: F(W.poetomu) - 2, cut: true, s: (f) => zoom([0, 1.7, 96], [0.5, 25, 0], 46, pushK(f, 1326, 0.0018)) },
    { f: F(W.banan) - 12, dur: 24, s: (f) => zoom([-0.4, 1.9, 95], [0, 22, 0], 44, pushK(f, 1407, 0.0025), { roll: 0.035 }) },
  ],
  12: [
    { f: 1436, s: (f) => dolly([21, 2.6, 34], [7.5, 4.0, 6], pushK(f, 1436, 0.0022), { fov: 46 }) },
    { f: F(W.zalili) - 14, dur: 30, s: (f) => dolly([15.5, 1.6, 23.5], [9.0, 1.2, 10.5], pushK(f, 1513, 0.0025), { fov: 42 }) },
    { f: F(W.naklonilas) - 2, cut: true, s: (f) => dolly([-24, 3, 76], [3, 23, 0], pushK(f, 1595, 0.003, 0.006, 30), { fov: 50, roll: -0.045 }) },
  ],
  13: [
    { f: 1636, s: (f) => dolly([-6, 18, 88], [3, 27, 0], pushK(f, 1636, 0.002), { fov: 52 }) },
    { f: F(W.chetyre) - 2, cut: true, s: (f) => { const r = ropeFoot(); const cx = (r + R_OUT + 0.8) / 2; return dolly([cx + 0.6, 1.7, 8.0], [cx, 1.0, 1.4], pushK(f, 1754, 0.0025), { fov: 44 }); } },
  ],
  14: [
    { f: 1806, s: (f) => dolly([-4, -2.0, CUTZ + 34], [-2, 3, 0], pushK(f, 1806, 0.002), { fov: 54 }) },
    { f: F(W.zemlyu) - 12, dur: 26, s: (f) => dolly([-9, -3.6, CUTZ + 16], [-9, -3.8, 0], pushK(f, 1851, 0.002), { fov: 44 }) },
    { f: F(W.vypryamilas) - 2, cut: true, s: (f) => dolly([1, -1.2, CUTZ + 38], [2, 5, 0], pushK(f, 1926, 0.0025), { fov: 54, roll: 0.035 }) },
  ],
  15: [{ f: 1991, s: (f) => zoom([14, 1.6, 36], [3, 12, 0], 56, pushK(f, 1991, 0.0022)) }],
  16: [
    { f: 2072, s: (f) => zoom([3.4, 1.5, 28.2], [5.6, 7.0, 0], 50, pushK(f, 2072, 0.002)) },
    { f: F(W.esche) - 2, cut: true, s: (f) => zoom([9, 2, 62], [3.6, 50, 0], 26, pushK(f, 2190, 0.0018)) },
    { f: F(W.ochen) - 6, cut: true, s: (f) => zoom([-7, 1.6, 36], [3, 12, 0], 56, pushK(f, 2243, 0.0016)) },
  ],
};

// impact kicks: image offset flips sign every frame, decays to 0 in 7 f
const KICKS: [number, number][] = [[W.krenitsya + 0.05, 0.8], [W.naklonilas + 0.05, 1.3], [W.etazh + 0.2, 0.35], [W.etazhom + 0.2, 0.35], [W.prosedaet + 0.1, 0.5]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: F(W.padat) - 2, cInf: 13 }, // scaffold crew MS, focus = look
  { f: F(W.dostroili) - 2, cInf: 0 },
  { f: F(W.kolokolnyu) - 2, cInf: 12 }, // masons MS
  { f: 319, cInf: 0 },
  { f: F(W.neskolko) - 2, cInf: 12 }, // plumb-line mason
  { f: F(W.krenitsya) - 2, cInf: 0 },
  { f: 630, cInf: 10, focus: () => [0.2, 1.6, 10.4] }, // masons' break
  { f: 735, cInf: 8, focus: () => [-0.2, 1.0, 10.1] }, // old masons
  { f: 822, cInf: 0 },
  { f: 928, cInf: 15, focus: () => [TUB[0], 1.2, TUB[2] + 0.4] }, // sponge
  { f: 1061, cInf: 0 },
  { f: F(W.poetomu) - 2, cInf: 9, focus: () => [0, 25, 0] }, // banana: tower sharp, foreground mason soft
  { f: 1440, cInf: 0 },
  { f: F(W.zalili) - 14, dur: 30, cInf: 11 }, // cement pipe
  { f: F(W.naklonilas) - 2, cInf: 0 },
  { f: F(W.chetyre) - 2, cInf: 11 }, // tape measure
  { f: 1806, cInf: 0 },
  { f: 2072, cInf: 0 }, // the tourist holding the tower up: tower and tourist both sharp (the gag needs both)
  { f: F(W.esche) - 2, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};
export const allCams = () => CAMS;
