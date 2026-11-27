// "Everyone Is Smiling" (our own two-part horror story): a seaside town on the rocks with a lighthouse.
// PREVIEW timeline: a handful of key shots (45 frames each) to show the look before the full story is timed to the voice.
import { getInputProps } from "remotion";
export const FPS = 30;
export const PART: 1 | 2 = (getInputProps() as { part?: number }).part === 2 ? 2 : 1;
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
export const D0 = 0;

// ---------------- places ----------------
export const SEA_Y = -0.6;           // the sea north of the quay (z < QUAY)
export const QUAY = -9;              // stone quay edge
export const PIER: [V3, V3] = [[2, 0.35, -9], [2, 0.35, -34]];
export const LH: V3 = [-26, 0, -32];  // the lighthouse rock
export const LH_BASE = 5.5, LH_H = 16, LAMP_Y = LH_BASE + LH_H + 1.4;
export const LAMP: V3 = [LH[0], LAMP_Y, LH[2]];
export const STREET_Z = 3;           // the main street (x along), houses north (front z -1) and south (front z 7)
export const LEO_HOUSE: V3 = [0, 0, 11]; // front at z 7, facing -z
export const LEO_WIN: V3 = [0, 4.6, 7.0]; // his bedroom window (2nd floor, front)
export const ROOM: V3 = [300, 0, 0];   // his bedroom set (window in the -z wall)
export const BED: V3 = [ROOM[0] + 0.6, 0, ROOM[2] + 0.4];
export const RWIN: V3 = [ROOM[0], 1.75, ROOM[2] - 2.5];
export const LHIN: V3 = [300, 0, 60];  // inside the lighthouse (gears, the shelves of faces)
/** round obstacles on the ground [x, z, radius] that figures are kept out of (well, crates, barrels, lamp posts, net racks) */
export const OBST: [number, number, number][] = [[-2, -3.5, 1.25], [5, -6, 0.6], [5.8, -6.4, 0.6], [5.3, -7.1, 0.6], [-6, -7, 0.45], [-5.2, -7.4, 0.45],
  [-20, 0, 0.2], [-6.5, 0, 0.2], [6.5, 0, 0.2], [20, 0, 0.2], [-14, 6.4, 0.2], [14, 6.4, 0.2], [-4.5, -8.2, 0.2],
  [1.6, -6.4, 0.85], [-10, 0.6, 0.85], [10, 0.6, 0.85], [-4.5, -6.4, 0.85], [-1.0, 1.0, 0.4], [3.8, 1.0, 0.4], [-12.5, 6.2, 0.4], [12.5, 6.2, 0.4], [-24, 0.8, 0.4], [24, 0.8, 0.4],
  [4.4, -7.0, 0.5], [-5.6, -6.0, 0.5], [7.2, -8.0, 0.45], [8.0, -8.1, 0.45], [-7.2, -8.1, 0.45], [3.6, -8.3, 0.3], [-3.4, -8.4, 0.3], [-17.5, 5.6, 0.25], [6.4, 5.6, 0.25], [-9.5, -0.2, 0.25],
  ...[-1.6, -0.6, 0.4, 1.4].flatMap((dx) => [[8.5 + dx, -7.5, 0.3], [-8.5 + dx, -7.5, 0.3]] as [number, number, number][])];
export const SC = { hero: 1.0, adult: 1.0, kid: 0.72 };
export const faceY = (sc: number) => 1.72 * sc;

// ---------------- shots (cut on each narration line; smile-short/voice/pN/lines.json) ----------------
export type Light = "day" | "golden" | "night";
export type ShotDef = { id: number; a: number; b: number; light: Light; party: boolean };
const F = (s: number) => Math.round(s * FPS);
export const DURS = { 1: 1995, 2: 2190 } as const; // 66.5 s (voice 63.5 + end card), 73.0 s (voice 69.9 + end card)
export const TOTAL = DURS[PART];
const P1CUTS = [0, 3.3, 6.55, 10.55, 15.45, 17.65, 22.95, 28.15, 31.95, 33.5, 36.0, 39.2, 44.2, 48.1, 50.55, 53.9, 57.75, 60.25];
const P2CUTS = [0, 1.65, 4.85, 9.45, 13.0, 15.6, 19.75, 22.95, 25.55, 30.05, 33.1, 37.15, 42.2, 46.7, 51.6, 54.15, 58.05, 63.6];
const P1L: Light[] = ["day", "day", "day", "day", "day", "day", "day", "day", "night", "night", "night", "night", "night", "night", "night", "night", "night", "night"];
const P2L: Light[] = ["night", "night", "night", "night", "night", "night", "night", "night", "night", "night", "night", "golden", "golden", "night", "night", "night", "night", "night"];
const CUTS = PART === 1 ? P1CUTS : P2CUTS, LS = PART === 1 ? P1L : P2L;
export const SHOTS: ShotDef[] = CUTS.map((c, i) => ({ id: i + 1, a: F(c), b: i + 1 < CUTS.length ? F(CUTS[i + 1]) : TOTAL, light: LS[i], party: false }));
export const FLASH_AT = -100;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
const orb = (look: V3, d: number, el: number, az: number, fov = 40): Cam => {
  const e = (el * Math.PI) / 180, a = (az * Math.PI) / 180;
  return { pos: [look[0] + d * Math.sin(a) * Math.cos(e), look[1] + d * Math.sin(e), look[2] + d * Math.cos(a) * Math.cos(e)], look, fov, roll: 0 };
};
export const HERO_DAY: V3 = [3.0, 0, 2.2];
export const DOOR_LEO: V3 = [0, 0, 7.1];
export const KID: V3 = [2.2, 0, 0.4];
export const LEO_LH: V3 = [LHIN[0] + 0.35, 0, LHIN[2] + 0.75];   // where Leo stands in the lamp room after he bursts in
export const KEEP_LH: V3 = [LHIN[0] - 0.85, 0, LHIN[2] + 0.6];
export const GALLERY_Y = LH_BASE + LH_H + 0.15;
const glide = (u: number) => { const x = clamp01(u); return x * x * (3 - 2 * x); };
/** hand-held shake: smooth pseudo-random wobble (metres), amplitude a */
export const shake = (f: number, a: number) => a * 0.03 * (Math.sin(f * 0.9) * 0.6 + Math.sin(f * 2.3 + 1.3) * 0.3 + Math.sin(f * 5.1 + 0.4) * 0.1);
/** the chase down the street at night: Leo's x along z 2.2 (shot-local time) */
export const chaseX = (t: number) => 7 - 4.6 * t;
/** part 2 shot 1: out of the front door at a run, then away down the street */
export const leoOut = (t: number): V3 => { const k = glide(t / 0.9); return [0.4 - 1.6 * glide((t - 0.7) / 0.9), 0, 7.4 - 4.6 * k]; };
const cam1 = (id: number, k: number, f: number, t: number): Cam => {
  switch (id) {
    case 1: return { pos: [3.2 + k * 1.2, 6.4 - k * 0.8, 6.0 - k * 1.0], look: [-7 + k * 1.5, 1.6, -22], fov: 54, roll: 0 };
    case 2: return orb([KID[0], 1.15, KID[2]], 2.1 - k * 0.4, 4, 15, 36);
    case 3: return orb([HERO_DAY[0], 1.5 + k * 0.15, HERO_DAY[2]], 4.4 - k * 1.3, 3, 14 + k * 14, 36);
    case 4: return { pos: [0.7 - k * 0.2, 1.7, 2.9 - k * 0.6], look: [-0.1, 1.5, 6.4], fov: 46, roll: 0.02 * Math.sin(k * 3) };
    case 5: return { pos: [0.6, 1.8, 3.9 + k * 0.5], look: [0.5, 1.72, 6.2], fov: 30 - k * 4, roll: 0 };
    case 6: return { pos: [2.6, 1.7, -12.5 + k * 0.8], look: [0.5, 1.6, 0], fov: 50, roll: 0 };
    case 7: return { pos: [2.0, 1.75, -10.6 - k * 0.6], look: [2.0, 1.6, -16], fov: 44, roll: 0 };
    case 8: return { pos: [2.3, 1.75, 3.4 + k * 0.3], look: [0.1, 1.6, 6.7], fov: 44, roll: 0 };
    case 9: return { pos: [BED[0] + 0.75 - k * 0.15, 2.35 - k * 0.2, BED[2] + 0.55 - k * 0.1], look: [BED[0], 0.95, BED[2] - 0.75], fov: 46, roll: 0 };
    case 10: return { pos: [BED[0] + 1.0, 0.95 - k * 0.03, BED[2] - 0.15 - k * 0.15], look: [BED[0] + 1.05, 0.78, BED[2] - 0.9], fov: 38, roll: 0 };
    case 11: return { pos: [-7 + k * 1.5, 1.7, 4.4], look: [14, 1.3, -0.5], fov: 50, roll: 0 };
    case 12: return { pos: [-1.4, 0.32, 4.8], look: [1.0, 0.5, 1.6], fov: 40, roll: 0 };
    case 13: return { pos: [0.3, 5.6 + k * 0.4, 6.4 + k * 0.3], look: [-0.6, 0.4 + k * 0.4, -2.5], fov: 54 - k * 6, roll: 0 };
    case 14: return { pos: [BED[0] + 0.6, 2.2 - k * 0.25, BED[2] + 0.3], look: [BED[0], 0.95, BED[2] - 0.75], fov: 42, roll: 0 };
    case 15: return { pos: [BED[0] + 1.3 - k * 0.3, 1.5, BED[2] + 2.0 - k * 0.5], look: [RWIN[0], 1.6, RWIN[2]], fov: 46 - k * 6, roll: 0 };
    case 16: return { pos: [RWIN[0] + 0.25, 1.75, RWIN[2] + 1.2 - k * 0.3], look: [RWIN[0], 1.75, RWIN[2] - 0.9], fov: 46, roll: 0 };
    case 17: { const j = shake(f, 0.6 * (1 - k)); return { pos: [BED[0] + 0.9 - k * 0.25 + j, 1.6 + j, BED[2] + 2.2 - k * 0.7], look: [BED[0], 1.45, BED[2] - 0.6], fov: 48, roll: j * 0.02 }; }
    default: return { pos: [RWIN[0] - 0.25, 1.8, RWIN[2] + 0.95 - glide(t / 3) * 0.35], look: [RWIN[0] - 0.36, 1.8, RWIN[2] - 0.9], fov: 34, roll: 0 };
  }
};
const cam2 = (id: number, k: number, f: number, t: number): Cam => {
  const sh = (a: number) => shake(f, a);
  switch (id) {
    case 1: { const j = sh(1), p = leoOut(t); return { pos: [-2.6 + j, 1.5, 0.6], look: [p[0], 1.2, p[2]], fov: 50, roll: j * 0.02 }; }
    case 2: { const lx = chaseX(t), j = sh(1); return { pos: [lx - 3.6 + j, 1.25 + j * 0.5, 3.6], look: [lx + 1.5, 1.3, 2.0], fov: 52, roll: j * 0.025 }; }
    case 3: return { pos: [-1.4, 0.32, 4.8], look: [1.0, 0.5, 1.6], fov: 40, roll: 0 };
    case 4: return { pos: [2.6 - k * 0.8, 6.8, 6.6 - k * 1.2], look: [-12, 5, -26], fov: 54, roll: 0 };
    case 5: { const j = sh(0.7); return { pos: [LHIN[0] - 1.3 + j, 1.6, LHIN[2] - 1.1], look: [LHIN[0] + 1.8, 1.3, LHIN[2] + 1.9], fov: 58, roll: j * 0.02 }; }
    case 6: return { pos: [LHIN[0] - 0.1 + k * 0.3, 2.3, LHIN[2] - 1.0], look: [LHIN[0] - 0.5, 2.5, LHIN[2] - 3.2], fov: 52, roll: 0 };
    case 7: { const z = LHIN[2] - 1.9 + glide(k) * 1.4; return { pos: [LHIN[0] - 1.9, 2.6, z + 1.2], look: [LHIN[0] - 3.5, 2.3, z], fov: 50, roll: 0 }; }
    case 8: { const z = LHIN[2] - 1.9 + glide(k) * 1.8; return { pos: [LHIN[0] - 2.75, 2.12, z + 0.55], look: [LHIN[0] - 3.4, 2.1, z], fov: 40, roll: 0 }; }
    case 9: { const z = LHIN[2] + 1.1; return { pos: [LHIN[0] - 2.6 + glide(k) * 0.15, 2.15, z + 0.6 - glide(k) * 0.25], look: [LHIN[0] - 3.4, 2.1, z], fov: 40 - k * 6, roll: 0 }; }
    case 10: return { pos: [LHIN[0] - 0.3, 1.7, LHIN[2] + 2.7 - k * 0.3], look: [KEEP_LH[0], 1.55, KEEP_LH[2]], fov: 50, roll: 0 };
    case 11: return orb([KEEP_LH[0], 1.72, KEEP_LH[2]], 1.5 - k * 0.25, 2, 80, 40);
    case 12: return { pos: [-7.2 - k * 0.5, 1.6, 3.6], look: [-10, 1.0, 0.6], fov: 46, roll: 0 };
    case 13: return { pos: [LHIN[0] + 1.7, 1.55, LHIN[2] - 2.5 + k * 0.2], look: [LHIN[0] + 2.2, 1.3, LHIN[2] + 0.35], fov: 46, roll: 0 };
    case 14: return { pos: [LHIN[0] - 0.25, 1.7, LHIN[2] + 3.7 - k * 0.2], look: [LHIN[0] - 0.25, 1.4, LHIN[2] + 0.6], fov: 54, roll: 0 };
    case 15: return orb([LEO_LH[0], 1.55, LEO_LH[2]], 1.9 - k * 0.3, 6, -92, 42);
    case 16: return orb([LEO_LH[0], 1.15, LEO_LH[2]], 1.15 - k * 0.15, 2, -92, 40);
    case 17: return orb([(LEO_LH[0] + KEEP_LH[0]) / 2, 1.7, (LEO_LH[2] + KEEP_LH[2]) / 2], 3.4 - k * 0.4, 4, 25, 44);
    default: return { pos: [LH[0] + 7 + k * 3, 16.5 - k * 1.5, LH[2] + 13 + k * 5], look: [LH[0], GALLERY_Y + 1.2, LH[2] + 1.5], fov: 44, roll: 0 };
  }
};
export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1], k = clamp01((f - s.a) / Math.max(1, s.b - s.a)), t = (f - s.a) / FPS;
  return PART === 1 ? cam1(id, k, f, t) : cam2(id, k, f, t);
};
/** per-shot light direction overrides (camera-relative az, elevation) */
export const SUN_SHOT: Record<number, { az?: number; el?: number }> = PART === 1 ? { 2: { az: 140, el: 30 }, 3: { az: 140, el: 30 }, 4: { az: 150, el: 30 }, 5: { az: 150, el: 30 }, 8: { az: 150, el: 30 } } : { 2: { az: 160, el: 35 }, 3: { az: 150, el: 30 }, 12: { az: 120, el: 12 } };
/** shots with no fog and no moon shadows (faces at the window, interiors where the moon would be blocked) */
export const CLEAR_SHOTS = PART === 1 ? [15, 16, 17, 18] : [];
/** shots without the drifting fog cards (close action, they would wash the frame out) */
export const NO_FOGCARDS = PART === 1 ? [11, 12] : [1, 2, 3];
export const dofAt = (_f: number) => ({ cInf: 0, focus: undefined as undefined | ((f: number) => V3) });
