// Timeline of "The Brother Who Crashed First" (Wright brothers, edu mode): shots timed to the English narration
// (flight-short/voice/words.json), the Flyer's flight state per shot, and the style's camera grammar (slow push-ins,
// smootherstep glides, hard cuts, flip-sign kicks on impacts).
export const FPS = 30;
export const TOTAL = 2316; // 77.2 s
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + (y1 - y0) * smooth((x - x0) / (x1 - x0));
  }
  return pts[pts.length - 1][1];
};
const plin = (pts: [number, number][], x: number) => { // plain linear
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); }
  return pts[pts.length - 1][1];
};

// ---------------- word times (s), from words.json ----------------
export const W = {
  jumbo: 3.793, jet: 4.162, nineteen: 5.52, brothers: 7.026, bicycles: 8.388, dream: 9.76, flying: 10.96, machine: 11.384,
  everyone: 12.491, impossible: 13.61, famous: 15.066, plane4: 16.251, falls: 16.646, river: 17.515,
  so: 18.597, wind: 19.91, box: 20.894, fan: 21.484, test: 22.26, tiny: 23.654, wings: 23.964,
  secret: 25.506, stick: 26.094, hand: 26.682, window: 27.596, tilt: 28.184, up7: 28.576,
  air: 29.315, pushes: 29.527, up8: 30.092, push: 30.728, lift: 31.577,
  wing9: 32.506, same: 33.311, bigger: 34.519, december: 35.756, windy: 37.943, beach: 38.274,
  flip: 39.403, coin: 39.85, first11: 41.119, wilbur: 42.016, wins: 42.41, three: 43.066, crashes: 44.379, sand: 45.298,
  days: 46.553, orville: 47.593, turn: 48.147, lies: 49.068, wing14: 49.679, engine: 50.358, roars: 50.765, lifts: 52.055, off: 52.395,
  twelve: 53.152, seconds15: 53.559, thirty: 54.236, metres: 54.982, luckily: 56.042, change: 57.526, world: 58.06,
  unluckily: 58.835, gust: 59.8, flipped: 60.489, day17: 62.073, never: 62.887, again: 63.565,
  today: 64.667, jumbo2: 65.351, longer: 66.513, whole: 67.471, flight19: 67.812,
  wilbur2: 68.965, longest: 70.088, flight20: 70.524, fifty: 71.823, seconds21: 72.404, notbad: 73.05, crashed: 74.472, first21: 74.924,
};
const F = (s: number) => Math.round(s * FPS);

// ---------------- places ----------------
export const RAIL = { x0: -2, x1: 16, z: 0 }; // launching rail at the Kitty Hawk camp, wind from +x
export const PATHZ = 0;
export const DAYTON: V3 = [-500, 0, 0];   // bicycle shop street
export const RIVER: V3 = [500, 0, 0];     // the Potomac houseboat
export const ROAD: V3 = [0, 0, 700];      // the car with the hand out of the window
export const JET: V3 = [31, 0, 46];       // jumbo jet parked by the flight path (only in shots 1 and 18)
export const JET_SPAN = 64;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Place = "camp" | "dayton" | "river" | "road";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; jet?: boolean };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 144, light: "day", place: "camp", jet: true },        // hook: the whole first flight fits under a jumbo wing
  { id: 2, a: 144, b: 280, light: "day", place: "dayton" },               // 1903, bicycle shop
  { id: 3, a: 280, b: 368, light: "day", place: "dayton" },               // they dream of flying (birds)
  { id: 4, a: 368, b: 440, light: "day", place: "dayton" },               // everyone laughs
  { id: 5, a: 440, b: 552, light: "day", place: "river" },                // the famous inventor's plane falls in the river
  { id: 6, a: 552, b: 744, light: "day", place: "dayton" },               // the wind tunnel, 200 tiny wings
  { id: 7, a: 744, b: 965, light: "day", place: "road" },                 // hand out of the car window: lift
  { id: 8, a: 965, b: 1062, light: "day", place: "camp" },                // a wing works the same way
  { id: 9, a: 1062, b: 1168, light: "day", place: "camp" },               // windy beach in December
  { id: 10, a: 1168, b: 1255, light: "day", place: "camp" },              // coin toss
  { id: 11, a: 1255, b: 1381, light: "day", place: "camp" },              // Wilbur wins, crashes into the sand
  { id: 12, a: 1381, b: 1462, light: "golden", place: "camp" },           // three days later: Orville's turn (cold early light)
  { id: 13, a: 1462, b: 1590, light: "day", place: "camp" },              // engine roars, lift-off
  { id: 14, a: 1590, b: 1675, light: "day", place: "camp" },              // twelve seconds, thirty-seven metres
  { id: 15, a: 1675, b: 1760, light: "day", place: "camp" },              // luckily: changed the world
  { id: 16, a: 1760, b: 1876, light: "day", place: "camp" },              // a gust flips the plane
  { id: 17, a: 1876, b: 1934, light: "day", place: "camp" },              // it never flew again
  { id: 18, a: 1934, b: 2058, light: "day", place: "camp", jet: true },   // jumbo wings longer than the whole flight
  { id: 19, a: 2058, b: 2148, light: "day", place: "camp" },              // Wilbur's longest flight
  { id: 20, a: 2148, b: TOTAL, light: "day", place: "camp" },             // 59 seconds
];
export const XFADE: Record<number, number> = { 5: 8, 6: 8, 7: 8, 8: 8, 12: 10, 13: 10, 18: 8, 19: 8 };
export const FLASH_AT = 144;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the Flyer ----------------
/** x forward along +x, y up; pitch + = nose up (rad), roll about the flight axis, flip = tumble angle about z (gust) */
export type PlaneState = { x: number; y: number; z: number; pitch: number; roll: number; spin: number; pilot: "orville" | "wilbur" | null; wreck: number; visible: boolean };
const deg = (d: number) => (d * Math.PI) / 180;
const ON_RAIL = 0.42; // skids on the rail top
const parked = (x: number, pilot: PlaneState["pilot"] = null, spin = 0): PlaneState => ({ x, y: ON_RAIL, z: PATHZ, pitch: 0, roll: 0, spin, pilot, wreck: 0, visible: true });
/** propeller angle: spinning at ~8 rev/s once the engine runs (from t0) */
const prop = (t: number, t0: number) => (t < t0 ? 0 : (t - t0) * 50 + 0.4 * (t - t0) ** 2);
export const planeAt = (id: number, t: number): PlaneState => {
  switch (id) {
    case 1: { const x = 8 + 6.5 * t; return { x, y: 2.6 + 0.25 * Math.sin(t * 2.1), z: PATHZ, pitch: deg(3 + 2 * Math.sin(t * 2.1 + 1)), roll: deg(2 * Math.sin(t * 1.3)), spin: prop(t, -5), pilot: "orville", wreck: 0, visible: true }; }
    case 8: return { ...parked(RAIL.x0 + 3, "orville"), y: ON_RAIL + 0.25 * smooth((t - W.wing9) / 0.6) * (1 - smooth((t - W.bigger - 0.3) / 0.5)) + 0.04 * Math.sin(t * 6) };
    case 9: return parked(RAIL.x0 + 3);
    case 10: return parked(RAIL.x0 + 3);
    case 11: { // Wilbur: rail run, climbs too steeply, stalls, nose into the sand
      const t0 = W.wins + 0.1, tl = t0 + 0.9, tp = tl + 0.55, ti = W.crashes;
      const sp = prop(t, W.wilbur - 0.6);
      if (t < t0) return parked(RAIL.x0 + 3, "wilbur", sp);
      if (t < tl) { const u = t - t0; return { ...parked(RAIL.x0 + 3 + 2.5 * u + 4.5 * u * u, "wilbur", sp) }; }
      const xl = RAIL.x0 + 3 + 2.5 * 0.9 + 4.5 * 0.81;
      if (t < ti) {
        const u = (t - tl) / (ti - tl);
        const x = xl + 9 * u, y = ON_RAIL + 4.2 * Math.sin(Math.PI * Math.min(1, u * 0.95)) * (u < 0.6 ? u / 0.6 : 1) * (1 - Math.max(0, (u - 0.6) / 0.4) ** 1.6);
        const pitch = t < tp ? deg(lin([[tl, 0], [tp, 24]], t)) : deg(lin([[tp, 24], [ti - 0.25, 10], [ti, -28]], t));
        return { x, y: Math.max(0.3, y), z: PATHZ, pitch, roll: deg(6 * u), spin: sp, pilot: "wilbur", wreck: 0, visible: true };
      }
      return { x: xl + 9, y: 0.32, z: PATHZ, pitch: deg(-12), roll: deg(6), spin: Math.min(sp, prop(ti, W.wilbur - 0.6) + (t - ti) * 6), pilot: "wilbur", wreck: 0.35, visible: true };
    }
    case 12: return parked(RAIL.x0 + 3, "orville");
    case 13: { // Dec 17: engine roars, rail run, lifts off on "lifts"
      const sp = prop(t, W.engine), t0 = W.roars + 0.15, tl = W.lifts;
      if (t < t0) return parked(RAIL.x0 + 3, "orville", sp);
      const u = t - t0, run = (tl - t0), a = (RAIL.x1 - 2 - (RAIL.x0 + 3)) / (run * run);
      if (t < tl) return parked(RAIL.x0 + 3 + a * u * u, "orville", sp);
      const v = 2 * a * run, xl = RAIL.x1 - 2, w = t - tl;
      return { x: xl + v * w, y: ON_RAIL + 2.2 * smooth(w / 0.9), z: PATHZ, pitch: deg(8 * Math.sin(Math.min(1, w / 0.9) * Math.PI)), roll: 0, spin: sp, pilot: "orville", wreck: 0, visible: true };
    }
    case 14: { // the flight itself, compressed: from the rail end to the landing spot 37 m on
      const sp = prop(t, W.engine), x0 = RAIL.x1 - 2 + 6, x1 = RAIL.x1 - 2 + 37;
      const u = clamp01((t - 53.0) / (55.55 - 53.0));
      const y = t < 55.55 ? ON_RAIL + 2.6 - 0.5 * Math.sin(u * Math.PI * 2.2) - 2.3 * smooth((u - 0.82) / 0.18) : ON_RAIL - 0.12;
      return { x: x0 + (x1 - x0) * u, y, z: PATHZ, pitch: deg(t < 55.55 ? 4 * Math.cos(u * Math.PI * 2.2) - 6 * smooth((u - 0.8) / 0.2) : 0), roll: deg(3 * Math.sin(u * 7)), spin: t < 55.55 ? sp : prop(55.55, W.engine) + (t - 55.55) * 10, pilot: "orville", wreck: 0, visible: true };
    }
    case 15: return { ...parked(RAIL.x1 - 2 + 37, "orville"), y: ON_RAIL - 0.12 };
    case 16: { // the gust: nose up, flips over backwards, rolls, comes to rest broken
      const x0 = RAIL.x1 - 2 + 37, tg = W.gust + 0.1;
      const k = clamp01((t - tg) / 2.0);
      const flip = t < tg ? 0 : plin([[0, 0], [0.25, 0.6], [0.6, Math.PI], [0.85, Math.PI * 1.85], [1, Math.PI * 2]], k);
      const hop = Math.sin(Math.PI * clamp01(k / 0.85)) * 3.2;
      return { x: x0 - 9 * smooth(k), y: ON_RAIL - 0.12 + hop, z: PATHZ, pitch: flip, roll: deg(18 * smooth((k - 0.7) / 0.3)), spin: 0, pilot: null, wreck: smooth((k - 0.55) / 0.3), visible: true };
    }
    case 17: return { x: RAIL.x1 - 2 + 28, y: ON_RAIL - 0.2, z: PATHZ, pitch: deg(-4), roll: deg(18), spin: 0, pilot: null, wreck: 1, visible: true };
    case 18: return { ...parked(RAIL.x1 - 2, null), y: ON_RAIL - 0.12 };
    case 19: case 20: { // Wilbur's 59-second flight over the dunes (compressed); lands on "crashed first"
      const t0 = 68.6, td = W.crashed;
      const x = RAIL.x1 + 4 + 7 * (Math.min(t, td) - t0) + (t > td ? 3 * easeOut((t - td) / 0.8) : 0);
      const y = t < td - 0.8 ? 3.0 + 0.5 * Math.sin(t * 1.7) : ON_RAIL - 0.12 + (3.0 + 0.5 * Math.sin((td - 0.8) * 1.7) - ON_RAIL + 0.12) * (1 - smooth((t - (td - 0.8)) / 0.8));
      return { x, y, z: PATHZ, pitch: deg(t < td - 0.8 ? 3 * Math.sin(t * 1.7 + 1) : -4 * Math.sin(Math.PI * clamp01((t - td + 0.8) / 1.0))), roll: deg(4 * Math.sin(t * 0.9)), spin: t < td + 0.2 ? prop(t, 60) : prop(td + 0.2, 60) + (t - td - 0.2) * 8, pilot: "wilbur", wreck: 0, visible: true };
    }
    default: return { ...parked(RAIL.x0 + 3), visible: false };
  }
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
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, f - f0));
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** a camera that rides along with the plane (offset from its position), looking at it */
const follow = (id: number, off: V3, lookOff: V3, fov: number, roll = 0) => (f: number): Shot => {
  const p = planeAt(id, T(f)), P: V3 = [p.x, p.y, p.z];
  return { pos: add(P, off), look: add(P, lookOff), fov, roll };
};
export const carX = (t: number) => ROAD[0] - 60 + 14 * (t - 24.8); // the car drives along +x at 14 m/s
export const TUNNEL: V3 = [DAYTON[0] + 4, 0, DAYTON[2] - 22];

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: (f) => { const p = planeAt(1, T(f)); return { pos: [p.x - 2, 0.9, -21], look: [p.x + 3, 4.2, 8], fov: 48 }; } },
    { f: F(W.jumbo) - 16, dur: 30, s: (f) => zoom([JET[0] - 4, 34, -62], [JET[0] - 2, 2, 24], 48, pushK(f, 100, 0.0015)) },
  ],
  2: [
    { f: 140, s: (f) => dolly(add(DAYTON, [3.0, 1.8, 14.5]), add(DAYTON, [0.6, 2.4, 3]), pushK(f, 140, 0.002), { fov: 44 }) },
    { f: F(W.brothers) - 2, cut: true, s: (f) => dolly(add(DAYTON, [1.6, 1.4, 9.6]), add(DAYTON, [0.4, 1.0, 5.6]), pushK(f, 209, 0.0025), { fov: 40 }) },
  ],
  3: [{ f: 280, s: (f) => dolly(add(DAYTON, [0.6, 0.7, 10.5]), add(DAYTON, [0.2, 6.5, -6]), pushK(f, 280, 0.0025), { fov: 52, roll: 0.03 }) }],
  4: [
    { f: 368, s: (f) => dolly(add(DAYTON, [0.8, 1.7, 13.5]), add(DAYTON, [0.2, 1.4, 6.0]), pushK(f, 368, 0.0028), { fov: 44 }) },
    { f: F(W.impossible) - 6, dur: 18, s: (f) => dolly(add(DAYTON, [0.5, 1.6, 11.0]), add(DAYTON, [0.2, 1.4, 6.0]), pushK(f, 402, 0.003), { fov: 42, roll: -0.04 }) },
  ],
  5: [
    { f: 436, s: (f) => dolly(add(RIVER, [26, 4, 30]), add(RIVER, [0, 5, 0]), pushK(f, 436, 0.002), { fov: 46 }) },
    { f: F(W.falls) - 2, cut: true, s: (f) => dolly(add(RIVER, [14, 2.5, 16]), add(RIVER, [5, 2.5, 2]), pushK(f, 499, 0.002), { fov: 48, roll: 0.04 }) },
  ],
  6: [
    { f: 548, s: (f) => dolly(add(TUNNEL, [2.4, 1.9, 5.6]), add(TUNNEL, [0, 1.1, 0]), pushK(f, 548, 0.0025), { fov: 42 }) },
    { f: F(W.test) - 2, cut: true, s: (f) => dolly(add(TUNNEL, [-1.6, 1.6, 2.6]), add(TUNNEL, [-1.6, 0.95, 0.2]), pushK(f, 666, 0.003), { fov: 40 }) },
  ],
  7: [
    { f: 740, s: (f) => { const x = carX(T(f)); return { pos: [x + 9, 1.6, ROAD[2] + 9], look: [x + 0.5, 1.1, ROAD[2]], fov: 46 }; } },
    { f: F(W.hand) - 2, cut: true, s: (f) => { const x = carX(T(f)); return { pos: [x - 0.2, 1.5, ROAD[2] + 3.4], look: [x - 0.9, 1.4, ROAD[2] + 0.9], fov: 42, roll: 0.02 }; } },
  ],
  8: [
    { f: 961, s: (f) => dolly([RAIL.x0 + 4, 1.4, 14], [RAIL.x0 + 3.5, 1.4, 0], pushK(f, 961, 0.0025), { fov: 46 }) },
    { f: F(W.bigger) - 12, dur: 24, s: (f) => dolly([RAIL.x0 + 7, 2.2, 18], [RAIL.x0 + 3.5, 1.6, 0], pushK(f, 1023, 0.002), { fov: 48, roll: 0.03 }) },
  ],
  9: [{ f: 1058, s: (f) => zoom([RAIL.x0 + 30, 7, 40], [RAIL.x0 - 4, 4, -10], 50, pushK(f, 1058, 0.0016)) }],
  10: [
    { f: 1168, s: (f) => dolly([RAIL.x0 + 2.2, 1.6, 9.4], [RAIL.x0 + 1.4, 1.7, 3.4], pushK(f, 1168, 0.0025), { fov: 40 }) },
    { f: F(W.flip) - 2, dur: 20, s: (f) => dolly([RAIL.x0 + 2.0, 1.2, 8.6], [RAIL.x0 + 1.4, 3.2, 3.4], pushK(f, 1180, 0.002), { fov: 44 }) },
  ],
  11: [
    { f: 1255, s: (f) => dolly([RAIL.x0 + 4.5, 1.6, 9.5], [RAIL.x0 + 3.2, 1.6, 2.6], pushK(f, 1255, 0.003), { fov: 42 }) },
    { f: F(W.wins) + 4, cut: true, s: (f) => zoom([RAIL.x0 + 12, 2.2, 26], [RAIL.x0 + 12, 2.4, 0], 52, pushK(f, 1280, 0.0012)) },
    { f: F(W.crashes) - 2, cut: true, s: (f) => dolly([RAIL.x0 + 25, 1.5, 21], [RAIL.x0 + 16, 1.0, 0], pushK(f, 1329, 0.0025), { fov: 44, roll: -0.04 }) },
  ],
  12: [{ f: 1376, s: (f) => dolly([RAIL.x0 + 7, 1.5, 17], [RAIL.x0 + 2.5, 1.2, 1.0], pushK(f, 1376, 0.0025), { fov: 42 }) }],
  13: [
    { f: 1457, s: (f) => dolly([RAIL.x0 + 9.5, 1.5, -8.0], [RAIL.x0 + 2.6, 0.95, -0.4], pushK(f, 1457, 0.003), { fov: 30 }) },
    { f: F(W.engine) - 2, cut: true, s: (f) => dolly([RAIL.x0 - 4.5, 1.8, 9], [RAIL.x0 + 1.5, 1.4, 1.0], pushK(f, 1509, 0.003), { fov: 46 }) },
    { f: F(W.lifts) - 16, cut: true, s: (f) => zoom([RAIL.x1 + 4, 1.4, 22], [RAIL.x1 - 2, 2.2, 0], 50, pushK(f, 1545, 0.001)) },
  ],
  14: [
    { f: 1590, s: follow(14, [2, 0.8, 20], [1.0, 0.6, 0], 44) },
  ],
  15: [
    { f: 1675, s: (f) => dolly([RAIL.x1 + 30, 1.6, 16], [RAIL.x1 + 34, 1.6, 0], pushK(f, 1675, 0.0025), { fov: 48 }) },
    { f: F(W.change) - 12, dur: 26, s: (f) => zoom([RAIL.x1 + 30, 1.0, 16], [RAIL.x1 + 34, 5, 0], 54, pushK(f, 1714, 0.0015)) },
  ],
  16: [
    { f: 1760, s: (f) => dolly([RAIL.x1 + 32, 1.4, 17], [RAIL.x1 + 34, 1.6, 0], pushK(f, 1760, 0.0025), { fov: 46 }) },
    { f: F(W.gust) - 2, cut: true, s: (f) => zoom([RAIL.x1 + 22, 2.4, 24], [RAIL.x1 + 30, 2.6, 0], 50, pushK(f, 1792, 0.0012)) },
  ],
  17: [{ f: 1876, s: (f) => dolly([RAIL.x1 + 25, 1.6, 17], [RAIL.x1 + 26, 1.2, 0], pushK(f, 1876, 0.003), { fov: 44, roll: -0.03 }) }],
  18: [
    { f: 1930, s: (f) => zoom([JET[0] + 2, 95, -20], [JET[0], 0, 20], 48, pushK(f, 1930, 0.0015)) },
    { f: F(W.whole) - 14, dur: 28, s: (f) => zoom([JET[0] - 6, 40, -50], [JET[0] - 2, 1, 18], 46, pushK(f, 2000, 0.0015)) },
  ],
  19: [{ f: 2054, s: follow(19, [-3, 1.2, 19], [1.5, 0.6, 0], 44) }],
  20: [
    { f: 2148, s: follow(20, [7.5, 0.9, -7.6], [0.2, 0.45, -0.4], 30, 0.03) },
    { f: F(W.notbad) - 2, cut: true, s: (f) => { const x = planeAt(20, T(f)).x; return dolly([x + 3, 1.5, 19], [x, 1.4, 0], pushK(f, 2189, 0.002), { fov: 46 }); } },
  ],
};

const KICKS: [number, number][] = [[W.crashes, 1.1], [W.river, 0.6], [W.flipped, 0.9], [W.crashed + 0.05, 0.5]];
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
  { f: F(W.brothers) - 2, cInf: 12 },       // brothers fixing the bike
  { f: 280, cInf: 0 },
  { f: 368, cInf: 10 },                      // laughing townsfolk
  { f: 440, cInf: 0 },
  { f: 552, cInf: 10 },                      // wind tunnel
  { f: 744, cInf: 0 },
  { f: F(W.hand) - 2, cInf: 13 },            // hand out of the window
  { f: 965, cInf: 0 },
  { f: 1168, cInf: 11 },                     // coin toss
  { f: 1255, cInf: 10 },
  { f: F(W.wins) + 4, cInf: 0 },
  { f: 1381, cInf: 9 },                      // Orville's turn
  { f: 1462, cInf: 0 },
  { f: 1876, cInf: 8 },                      // the wreck
  { f: 1934, cInf: 0 },
  { f: 2148, cInf: 10 },                     // Wilbur grinning in the air
  { f: F(W.notbad) - 2, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
