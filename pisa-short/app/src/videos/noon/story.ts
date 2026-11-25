// Timeline of "The Minute Without Gravity" (our own story, inspired only by the "strange town rule" format):
// shots timed to the narration (noon-short/voice/lines.json + words.json), floating physics per shot, cameras.
export const FPS = 30;
export const TOTAL = 1980; // 66.0 s
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * smooth((x - x0) / (x1 - x0)); }
  return pts[pts.length - 1][1];
};
export const W = {
  twelve: 4.94, tied: 9.04, leashes: 10.76, iron: 12.92, lid: 14.7, kids: 15.45, balloons: 17.9, notme: 18.93, heights: 20.22,
  everynoon: 21.0, lamppost: 22.1, oneday: 25.38, pip: 26.78, rope: 27.6, rang: 28.44, rising: 29.4, roofs: 30.42, tower: 31.64,
  everyone: 32.45, reach: 34.48, forty: 35.3, fall: 37.76, scariest: 39.28, letgo: 41.06, lamppost2: 41.86, kicked: 43.04, chimney: 43.6,
  fish: 45.36, ten: 45.94, sneaker: 47.32, five: 48.02, vane: 49.9, three: 50.66, two: 51.02, one: 51.28, gravity: 51.86, swung: 53.26,
  clothesline: 55.18, laughed: 56.34, holiday: 59.04, lets: 60.24, me: 61.42, heights2: 62.5, brother: 63.66,
};
const F = (s: number) => Math.round(s * FPS);

// ---------------- places ----------------
export const TOWER: V3 = [0, 0, -18];       // clock tower (base 6 x 6, clock face on +z at y 15, roof 20..24, vane on top)
export const TOWER_H = 20, VANE: V3 = [0, 25.6, -18];
export const LAMP: V3 = [3.6, 0, 5.0];      // the lamppost she hugs
export const CHIMNEY: V3 = [9.0, 12.4, -6.0];
export const TABLE: V3 = [-6.5, 0, 6.5];    // soup table

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; noon: boolean };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 125, light: "day", noon: true },      // hook: noon, things float up over the square
  { id: 2, a: 125, b: 236, light: "day", noon: true },    // the bell rings twelve, an untied cart floats away
  { id: 3, a: 236, b: 302, light: "day", noon: false },   // everything is tied down
  { id: 4, a: 302, b: 352, light: "day", noon: false },   // dog on a leash
  { id: 5, a: 352, b: 412, light: "day", noon: false },   // grandpa's iron boots
  { id: 6, a: 412, b: 460, light: "day", noon: false },   // even the soup has a lid
  { id: 7, a: 460, b: 565, light: "day", noon: true },    // kids float like balloons
  { id: 8, a: 565, b: 627, light: "day", noon: true },    // but not me: scared of heights
  { id: 9, a: 627, b: 758, light: "day", noon: true },    // hugs the lamppost, eyes shut
  { id: 10, a: 758, b: 843, light: "day", noon: false },  // Pip forgot his rope
  { id: 11, a: 843, b: 970, light: "day", noon: true },   // he rises over the roofs, past the clock tower
  { id: 12, a: 970, b: 1057, light: "day", noon: true },  // nobody can reach him
  { id: 13, a: 1057, b: 1157, light: "day", noon: true }, // forty seconds left
  { id: 14, a: 1157, b: 1229, light: "day", noon: true }, // the scariest thing
  { id: 15, a: 1229, b: 1286, light: "day", noon: true }, // she lets go
  { id: 16, a: 1286, b: 1376, light: "day", noon: true }, // kicks off a chimney, swims like a fish
  { id: 17, a: 1376, b: 1440, light: "day", noon: true }, // ten seconds: grabs his sneaker
  { id: 18, a: 1440, b: 1517, light: "day", noon: true }, // five: rope around the weather vane
  { id: 19, a: 1517, b: 1554, light: "day", noon: true }, // three, two, one
  { id: 20, a: 1554, b: 1684, light: "day", noon: false },// gravity back: they swing onto the roof
  { id: 21, a: 1684, b: 1745, light: "day", noon: false },// Pip laughed all the way down
  { id: 22, a: 1745, b: 1838, light: "golden", noon: true }, // noon is a holiday
  { id: 23, a: 1838, b: TOTAL, light: "golden", noon: true }, // I just like my brother more
];
export const XFADE: Record<number, number> = { 3: 8, 7: 8, 10: 8, 22: 12 };
export const FLASH_AT = 125;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the kids' flight paths ----------------
/** Pip: stands by the lamp, rises from the bell (28.44) over the roofs and past the tower, hangs high until grabbed,
 *  then rides with his sister; after gravity returns they swing on the rope from the vane and land on the roof. */
export const swingPt = (t: number): V3 => { // pendulum below the vane, damped, ends sitting on the roof ledge
  // swings in front of the tower (z > tower centre) and settles on the front roof ledge
  const k = clamp01((t - W.gravity) / 3.4), a = 0.64 + 0.55 * (0.5 + 0.5 * Math.cos(k * Math.PI * 2.2)) * (1 - k) ** 1.4, L = 6.2;
  return [VANE[0] + 0.15, VANE[1] - Math.cos(a) * L, VANE[2] + Math.sin(a) * L];
};
export const pipAt = (t: number): V3 => {
  if (t < W.rang) return [LAMP[0] - 1.4, 0, LAMP[2] + 0.6];
  if (t < W.sneaker) {
    const u = t - W.rang;
    return [lin([[0, LAMP[0] - 1.4], [8, 1.0], [20, 0.6]], u), lin([[0, 0], [1.5, 1.2], [4, 9], [7, 22], [11, 30], [20, 33]], u), lin([[0, LAMP[2] + 0.6], [8, -10.5], [20, -12.0]], u)];
  }
  if (t < W.gravity) { const g = sisAt(t); return [g[0] + 0.5, g[1] + 0.7, g[2]]; }
  const p = swingPt(t); return [p[0] + 0.45, p[1] - 0.1, p[2] + 0.05];
};
export const sisAt = (t: number): V3 => {
  if (t < W.letgo + 0.25) return [LAMP[0] - 0.3, 0.15 * smooth((t - 21) / 1) * (t > 18.9 ? 1 : 0), LAMP[2] - 0.22];
  if (t < W.sneaker) {
    const u = t - (W.letgo + 0.25);
    return [lin([[0, LAMP[0] - 0.3], [2, CHIMNEY[0] - 0.4], [6, 0.3]], u), lin([[0, 0.3], [2, CHIMNEY[1] + 0.2], [6, 32.2]], u), lin([[0, LAMP[2] - 0.22], [2, CHIMNEY[2] + 0.6], [6, -12.0]], u)];
  }
  if (t < W.gravity) return [0.3 + 0.05 * Math.sin(t * 2), 32.2 + 0.08 * Math.sin(t * 1.7), -12.0];
  return swingPt(t);
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
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const onPip = (off: V3, lookOff: V3, fov: number, roll = 0) => (f: number): Shot => { const p = pipAt(T(f)); return { pos: add(p, off), look: add(p, lookOff), fov, roll }; };
const onSis = (off: V3, lookOff: V3, fov: number, roll = 0) => (f: number): Shot => { const p = sisAt(T(f)); return { pos: add(p, off), look: add(p, lookOff), fov, roll }; };
const CLOCK: V3 = [TOWER[0], 15, TOWER[2] + 3.05];

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: (f) => zoom([5, 1.4, 22], [0, 9, -6], 54, pushK(f, 0, 0.0015), { roll: 0.02 }) }],
  2: [
    { f: 121, s: (f) => dolly(add(CLOCK, [1.2, -0.4, 7.5]), CLOCK, pushK(f, 121, 0.003), { fov: 40 }) },
    { f: F(W.twelve) + 18, cut: true, s: (f) => dolly([-12, 1.6, 10], [-8, 3.5, 2], pushK(f, 166, 0.0025), { fov: 48 }) },
  ],
  3: [{ f: 232, s: (f) => zoom([14, 3.2, 14], [-2, 2.0, 0], 46, pushK(f, 232, 0.0015)) }],
  4: [{ f: 302, s: (f) => dolly([-1.2, 0.9, 10.6], [-2.4, 0.5, 6.4], pushK(f, 302, 0.004), { fov: 40 }) }],
  5: [{ f: 352, s: (f) => dolly([5.2, 0.9, 11.6], [5.6, 0.9, 7.2], pushK(f, 352, 0.004), { fov: 42 }) }],
  6: [{ f: 412, s: (f) => dolly(add(TABLE, [0.9, 1.6, 2.6]), add(TABLE, [0, 0.95, 0]), pushK(f, 412, 0.004), { fov: 38 }) }],
  7: [{ f: 456, s: (f) => zoom([0.5, 1.6, 9.5], [0, 4.4, 0.5], 52, pushK(f, 456, 0.0016)) }],
  8: [{ f: 565, s: (f) => dolly(add(LAMP, [0.4, 1.3, 3.4]), add(LAMP, [-0.1, 1.1, 0]), pushK(f, 565, 0.004), { fov: 38 }) }],
  9: [
    { f: 627, s: (f) => dolly(add(LAMP, [2.6, 1.6, 6.0]), add(LAMP, [-0.3, 1.3, 0]), pushK(f, 627, 0.0025), { fov: 44 }) },
    { f: F(W.lamppost) + 6, dur: 26, s: (f) => dolly(add(LAMP, [-0.7, 1.2, 2.6]), add(LAMP, [-0.3, 1.1, -0.2]), pushK(f, 669, 0.003), { fov: 40, roll: -0.03 }) },
  ],
  10: [{ f: 754, s: (f) => dolly(add(LAMP, [-1.0, 1.1, 4.0]), add(LAMP, [-1.4, 0.8, 0.6]), pushK(f, 754, 0.0035), { fov: 40 }) }],
  11: [
    { f: 843, s: onPip([2.5, 1.0, 5.5], [0, 0.6, 0], 46) },
    { f: F(W.roofs) - 2, cut: true, s: (f) => zoom([8, 2, 16], [2, 14, -8], 56, pushK(f, 911, 0.001)) },
    { f: F(W.tower) - 2, cut: true, s: (f) => { const p = pipAt(T(f)); return { pos: [CLOCK[0] + 7, CLOCK[1] + 1, CLOCK[2] + 12], look: [p[0], p[1] + 0.6, p[2]], fov: 48, roll: 0.03 }; } },
  ],
  12: [{ f: 970, s: (f) => zoom([1, 1.0, 14], [0, 5.5, 0], 54, pushK(f, 970, 0.0015)) }],
  13: [
    { f: 1057, s: (f) => dolly(add(CLOCK, [0.8, -0.2, 5.0]), CLOCK, pushK(f, 1057, 0.004), { fov: 40 }) },
    { f: F(W.fall) - 30, cut: true, s: onPip([1.2, -2.2, 5.0], [0, 0.4, 0], 40, -0.04) },
  ],
  14: [{ f: 1157, s: (f) => dolly(add(LAMP, [-0.75, 1.25, 2.4]), add(LAMP, [-0.3, 1.15, -0.2]), pushK(f, 1157, 0.005), { fov: 34 }) }],
  15: [{ f: 1229, s: (f) => { const p = sisAt(T(f)); return { pos: [LAMP[0] + 1.5, 1.4 + p[1] * 0.7, LAMP[2] + 6], look: [p[0], p[1] + 1.0, p[2]], fov: 44 }; } }],
  16: [
    { f: 1286, s: onSis([4, 1.0, 6], [0, 0.6, 0], 48) },
    { f: F(W.fish) - 20, dur: 24, s: onSis([-3, -1.2, 5.5], [0, 0.8, 0], 46, 0.04) },
  ],
  17: [{ f: 1376, s: onSis([2.6, 1.0, 4.8], [0.25, 1.0, 0], 40) }],
  18: [
    { f: 1440, s: (f) => { const p = sisAt(T(f)); return { pos: [p[0] + 6, p[1] + 1.5, p[2] + 10], look: [p[0] * 0.5, (p[1] + VANE[1]) / 2, (p[2] + VANE[2]) / 2], fov: 50 }; } },
  ],
  19: [
    { f: 1517, s: (f) => dolly(add(CLOCK, [0.6, 0, 4.2]), CLOCK, pushK(f, 1517, 0.006), { fov: 38 }) },
    { f: F(W.two), cut: true, s: onSis([1.5, 0.4, 3.6], [0.25, 1.0, 0], 36, 0.04) },
    { f: F(W.one), cut: true, s: onSis([-1.6, 0.2, 3.2], [0.25, 1.0, 0], 34, -0.05) },
  ],
  20: [{ f: 1554, s: (f) => zoom([8, 20, 0], [0, 21.8, -14.5], 50, pushK(f, 1554, 0.0012)) }],
  21: [{ f: 1684, s: (f) => { const p = pipAt(T(f)); return dolly([p[0] + 1.0, p[1] + 1.0, p[2] + 3.2], [p[0], p[1] + 0.7, p[2]], pushK(f, 1684, 0.003), { fov: 38 }); } }],
  22: [{ f: 1739, s: (f) => zoom([4, 1.2, 22], [0, 8, -4], 54, pushK(f, 1739, 0.0015)) }],
  23: [
    { f: 1838, s: (f) => dolly([1.6, 4.4, 10.2], [0.6, 4.2, 6], pushK(f, 1838, 0.0025), { fov: 40 }) },
    { f: F(W.brother) - 10, dur: 26, s: (f) => dolly([2.4, 3.6, 13.5], [0.6, 4.6, 6], 1, { fov: 46, roll: 0.03 }) },
  ],
};

const KICKS: [number, number][] = [[W.twelve, 0.5], [W.gravity, 1.2], [W.letgo + 0.3, 0.5]];
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

export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 }, { f: 302, cInf: 12 }, { f: 460, cInf: 0 }, { f: 565, cInf: 13 }, { f: 627, cInf: 9 }, { f: 843, cInf: 8 },
  { f: F(W.roofs) - 2, cInf: 0 }, { f: 1157, cInf: 14 }, { f: 1229, cInf: 6 }, { f: 1376, cInf: 10 }, { f: 1440, cInf: 0 },
  { f: F(W.two), cInf: 12 }, { f: 1554, cInf: 0 }, { f: 1684, cInf: 11 }, { f: 1745, cInf: 0 }, { f: 1838, cInf: 9 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)], k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
