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

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night";
export type ShotDef = { id: number; a: number; b: number; light: Light; party: boolean };
const LEN = 60;
const LIGHTS_OF: Light[] = ["day", "day", "day", "night", "night", "night", "night", "night"];
export const SHOTS: ShotDef[] = LIGHTS_OF.map((l, i) => ({ id: i + 1, a: i * LEN, b: (i + 1) * LEN, light: l, party: false }));
export const TOTAL = SHOTS.length * LEN;
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
export const camAt = (id: number, f: number): Cam => {
  const k = (f % LEN) / LEN;
  switch (id) {
    case 1: return { pos: [3.2 + k * 1.2, 6.4 - k * 0.8, 6.0 - k * 1.0], look: [-7 + k * 1.5, 1.6, -22], fov: 54, roll: 0 };
    case 2: return orb([HERO_DAY[0], 1.5 + k * 0.15, HERO_DAY[2]], 4.4 - k * 1.3, 3, 14 + k * 14, 36);
    case 3: return { pos: [0.7 - k * 0.2, 1.7, 2.9 - k * 0.6], look: [-0.1, 1.5, 6.4], fov: 46, roll: 0.02 * Math.sin(k * 3) };
    case 4: return { pos: [0.3, 5.6 + k * 0.4, 6.4 + k * 0.3], look: [-0.6, 0.4 + k * 0.4, -2.5], fov: 54 - k * 6, roll: 0 };
    case 5: return { pos: [2.6 - k * 0.8, 6.8, 6.6 - k * 1.2], look: [-12, 5, -26], fov: 54, roll: 0 };
    case 6: return { pos: [BED[0] + 0.8 - k * 0.15, 1.6 - k * 0.15, BED[2] + 1.6 - k * 0.35], look: [BED[0] - 0.05, 0.72, BED[2] - 0.7], fov: 44, roll: 0 };
    case 7: return { pos: [BED[0] + 1.3 - k * 0.3, 1.5, BED[2] + 2.0 - k * 0.5], look: [RWIN[0], 1.6, RWIN[2]], fov: 46 - k * 6, roll: 0 };
    default: return { pos: [LHIN[0] + 1.9 - k * 0.6, 1.75, LHIN[2] + 2.7 - k * 0.6], look: [LHIN[0] - 2.4, 1.7, LHIN[2] - 1.5], fov: 56, roll: 0 };
  }
};
/** per-shot light direction overrides (camera-relative az, elevation) */
export const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 2: { az: 140, el: 30 }, 3: { az: 150, el: 30 } };
/** shots with no fog and no moon shadows (the faces at the window must read clearly, bodies included) */
export const CLEAR_SHOTS = [7];
export const dofAt = (_f: number) => ({ cInf: 0, focus: undefined as undefined | ((f: number) => V3) });
