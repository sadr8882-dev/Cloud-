// The "Everyone Is Smiling" cast (was: the "Wanted: One Dad" cast): detailed 3D blocky rigs placed from here, plus unlit effect cards (the WANTED poster,
// candidate cards, foam, snores, beeps, the map, the letters, the photo, the star). The world turns the placements
// into rigs, the dog, the cows, the duck and the small props.
import * as THREE from "three";
import { Pen, bodyFront, Outfit, Expr, FrontOpts, SKINS } from "./toon";
import { OBST, SHOTS, FPS, V3, SC, HERO_DAY, LEO_WIN, ROOM, BED, RWIN, LHIN, smooth, clamp01, lin, linR } from "./story";
import * as X from "./fx";
import { NOINK } from "./ink";
import type { RigOpts } from "./blocky";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216;
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);

export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    } else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
let SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

// ---------------- blinks, faces ----------------
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number) => {
  const f = Math.round(t * FPS);
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
const OUTKEY = new WeakMap<Outfit, string>(); let OK = 0;
const okeyOf = (o: Outfit) => { let k = OUTKEY.get(o); if (!k) { k = "o" + OK++; OUTKEY.set(o, k); } return k; };
const person = (cam: CamInfo, i: number, o: Outfit, x: number, y: number, z: number, fo: FrontOpts, scale = 1): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2 * scale, z)) / scale;
  const [w, h, k] = tier(d);
  const f2: FrontOpts = { ...fo, light: light2D(cam, false), seed: ((i * 5 + 3) % 7) + 1 };
  return { key: `F|${okeyOf(o)}|${fkey(f2)}`, x, y, z, scale, draw: (p) => bodyFront(p, o, f2), size: [w, h, k], rig: { o, front: f2 } };
};
const mood = (t: number, i: number, set: Expr[]): Expr => set[Math.floor((t + hh(i, 7) * 3) / (1.5 + hh(i, 8) * 1.5)) % set.length];
const glance = (t: number, i: number) => { const k = Math.floor((t + hh(i, 9) * 4) / (1.2 + hh(i, 10) * 1.8)); return [0, 0, -1, 0, 1, 0.5, -0.5][(k + i) % 7]; };
const HAPPY: Expr[] = ["smile", "grin", "laugh", "smile_closed", "grin"], CALM: Expr[] = ["smile", "neutral", "smile_closed", "smile"], SCARED: Expr[] = ["shock", "nervous", "shock", "nervous"];
type Mood = Expr[] | Expr;

// ---------------- placements ----------------
export type Place = {
  nosep?: boolean; key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number]; rig?: RigOpts;
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; face?: boolean; yaw?: number; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[]; ropes: [V3, V3][] };

// ---------------- helpers ----------------
let TNOW = 0;
let CAM: CamInfo;
let OUT: Stage;
type Extra = Partial<FrontOpts> & { yaw?: number; y?: number; roll?: number };
const put = (i: number, o: Outfit, p: V3, sc: number, ex: Mood, fo: Extra = {}) => {
  const { yaw, y, roll, ...rest } = fo;
  const expr = typeof ex === "string" ? ex : mood(TNOW, i, ex);
  const pl = person(CAM, i, o, p[0], (y ?? p[1]), p[2], { mode: "stand", blink: lidAt(TNOW, i), look: glance(TNOW, i), expr, ...rest }, sc);
  if (yaw !== undefined) pl.yaw = yaw;
  if (roll !== undefined) pl.roll = roll;
  OUT.places.push(pl);
  return pl;
};
const fx = (key: string, cw: number, ch: number, draw: (p: Pen) => void, p: V3, w: number, h: number, o: { flat?: boolean; face?: boolean; yaw?: number; rot?: number; soft?: boolean } = {}) =>
  OUT.fx.push({ key, cw, ch, draw, x: p[0], y: p[1], z: p[2], w, h, ...o });
const yawTo = (a: V3, b: V3) => Math.atan2(b[0] - a[0], b[2] - a[2]);
const mixV = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const Q = (t: number, n = 15) => Math.floor(t * n) / n;
const bubble = (key: string, s: string, size: number, p: V3, w: number, t0: number, o: { jag?: boolean; tail?: -1 | 1; fill?: string; ink?: string; t1?: number } = {}) => {
  if (TNOW < t0 || (o.t1 !== undefined && TNOW > o.t1)) return;
  const k = smooth((TNOW - t0) / 0.15), cw = 480, ch = 240;
  fx(`say|${key}`, cw, ch, (pp) => X.say(pp, s, size, { w: cw, h: ch, jag: o.jag, tail: o.tail, fill: o.fill, ink: o.ink }), p, w * k + 0.01, w * 0.5 * k + 0.005);
};
const word = (s: string, fill: string, p: V3, w: number, t0: number, dur = 0.8, burst = "#fff07a") => {
  if (TNOW < t0 || TNOW > t0 + dur) return;
  const k = 1 + 0.35 * (1 - smooth((TNOW - t0) / 0.12));
  fx(`word|${s}|${fill}|${burst}`, 512, 256, (pp) => X.word(pp, s, fill, burst), p, w * k, w * 0.5 * k, { rot: 0.06 * Math.sin(TNOW * 20) });
};


// ---------------- outfits ----------------
const SK = ["#f6c99f", "#efb98c", "#d9a074", "#a8704a"]; void SKINS;
/** Leo, 16: black swept hair, handsome, navy hoodie under an open yellow raincoat, black jeans, white sneakers, the key */
const LEO: Outfit = { jacket: "#f6f6f2", stripes: "plain", pants: "#b4cbe8", boots: "#f6f6f2", sole: "#e8e8e4", hat: "hair", hairStyle: "puffy", hair: "#24242c",
  skin: "#f2d0b0", chill: true, raincoat: "#3f7fd6" };
const LEO_BED: Outfit = { ...LEO, raincoat: undefined, jacket: "#f6f6f2", pants: "#3a4a6a" };
const TOWN: Outfit[] = [
  { jacket: "#3f6fb5", stripes: "stripe", pants: "#3b3f52", boots: "#4a3426", hat: "cap", cap: "#24365e", moustache: "#5a3b2a", skin: SK[0], build: "stout", waist: "#3a2a1e" },                 // fisherman
  { jacket: "#e07a9a", pants: "#3b3f52", boots: "#f4f1ea", hat: "hair", hairStyle: "bun", hair: "#5a3b2a", dress: "#e07a9a", skin: SK[1], lashes: true, apron: "#fbf6ea" },                   // baker's wife
  { jacket: "#fbfbf8", stripes: "plain", pants: "#3b3f52", boots: "#2a2420", hat: "chef", apron: "#fbfbf8", moustache: "#3a2a1e", build: "stout", skin: SK[0], buttons: "#c9c9c9" },             // baker
  { jacket: "#3f6fb5", stripes: "plain", pants: "#24365e", boots: "#2a2420", hat: "cap", cap: "#24365e", skin: SK[2], buttons: "#e9c24a", pocket: true, waist: "#2a2420" },                     // mailman
  { jacket: "#9a5aa8", pants: "#3b3f52", boots: "#2e2a36", hat: "hair", hairStyle: "bun", hair: "#e8e4dc", dress: "#9a5aa8", skin: SK[1], glasses: "#8a5a34" },                                   // grandma
  { jacket: "#2f8a4f", stripes: "plaid", pants: "#4a4038", boots: "#4a3426", hat: "hair", hairStyle: "side", hair: "#2a201a", skin: SK[3], pocket: true },                                       // neighbour
  { jacket: "#d9a441", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hairStyle: "long", hair: "#c98b3a", dress: "#d9a441", skin: SK[0], lashes: true },                                       // teacher
  { jacket: "#c23a3a", stripes: "plain", pants: "#3d5a8a", boots: "#4a3426", hat: "capback", cap: "#f2c94c", build: "kid", skin: SK[2] },                                                          // kid
  { jacket: "#5a6a7a", stripes: "plain", pants: "#2e3a52", boots: "#2a2420", hat: "hair", hairStyle: "bald", hair: "#8a8a8a", beard: "#d8d8d8", skin: SK[1], build: "stout" },                   // old sailor
  { jacket: "#e98a6e", pants: "#3b3f52", boots: "#f4f1ea", hat: "hair", hairStyle: "pigtails", hair: "#3a2a1e", dress: "#e98a6e", build: "kid", skin: SK[3], lashes: true },                     // girl
];
const PJC = ["#c8463a", "#3a9a5a", "#e0a82a", "#8a4ab0"];
const PJ = (o: Outfit, k: number): Outfit => ({ ...o, jacket: PJC[k % 4], stripes: "stripe", pants: PJC[k % 4], dress: o.dress ? PJC[k % 4] : undefined, apron: undefined, hat: o.hat === "chef" || o.hat === "cap" ? "hair" : o.hat, hairStyle: o.hat === "chef" || o.hat === "cap" ? "side" : o.hairStyle, waist: undefined, buttons: undefined, boots: "#5a4a6a" });
const KEEPER: Outfit = { jacket: "#2f4a3a", stripes: "plain", pants: "#3a3a42", boots: "#2a2420", hat: "cap", cap: "#24365e", skin: SK[1], build: "stout", raincoat: "#2f4a3a", glasses: "#8a5a34" };

// ---------------- per-shot staging ----------------
const leo = (ex: Mood, fo: Extra, p: V3, o: Outfit = LEO) => put(1, o, p, SC.hero, ex, fo);
/** everyone tilts their head the same way at the same moment (the town moves as one) */
const sync = (t: number, amp = 14) => amp * Math.sin(t * 1.1) * smooth((Math.sin(t * 0.55) + 1) / 2);
const creep = (i: number, p: V3, fo: Extra = {}, o?: Outfit) => put(100 + i, o ?? TOWN[i % TOWN.length], p, (o ?? TOWN[i % TOWN.length]).build === "kid" ? SC.kid : 1, "creepy", { blink: 0, look: 0, headRoll: sync(TNOW), breathe: 1, ...fo });

/** keep standing figures from walking through each other: push apart any two closer than their shoulder widths */
const separate = (ps: Place[]) => {
  const st = ps.filter((q) => q.rig && !q.nosep && (q.rig.front?.mode ?? "stand") !== "lie");
  for (let it = 0; it < 12; it++) for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) {
    const a = st[i], b2 = st[j], need = 0.64 * ((a.scale ?? 1) + (b2.scale ?? 1)), dx = b2.x - a.x, dz = b2.z - a.z, d = Math.hypot(dx, dz);
    if (d >= need || Math.abs(a.y - b2.y) > 1.2) continue;
    const k = (need - d) / 2 / (d || 1), ux = d ? dx : 1, uz = d ? dz : 0;
    a.x -= ux * k; a.z -= uz * k; b2.x += ux * k; b2.z += uz * k;
  }
  for (const q of st) for (const [ox, oz, r] of OBST) { // and out of the well, crates, barrels, posts
    const dx = q.x - ox, dz = q.z - oz, d = Math.hypot(dx, dz), need = r + 0.55 * (q.scale ?? 1);
    if (d < need) { q.x = ox + (dx / (d || 1)) * need; q.z = oz + (dz / (d || 1)) * need; }
  }
};
export const stage = (id: number, tg: number, cam: CamInfo): Stage => {
  const t = tg - SHOTS[id - 1].a / FPS; // shot-local time
  const out: Stage = { places: [], fx: [], ropes: [] };
  OUT = out; CAM = cam; TNOW = t;
  SUN = cam.sun.clone().normalize();
  const toCam = (p: V3) => Math.atan2(cam.pos.x - p[0], cam.pos.z - p[2]);
  switch (id) {
    case 1: { // day: the town waves at the camera, every smile the same
      const spots: V3[] = [[0.5, 0, 1.0], [-1.6, 0, -0.5], [2.2, 0, -1.8], [-3.2, 0, -2.0], [1.0, 0, -4.2], [3.4, 0, -5.6], [-0.6, 0, -6.6], [2, 0.35, -12], [2.6, 0.35, -16], [-4, 0, -6.8], [4.2, 0, -7.6], [-2.4, 0, -8.0]];
      spots.forEach((p, i) => {
        if (i === 7 || i === 8) { const z = p[2] - ((t * 1.1 + i) % 6); creep(i, [p[0], p[1], z], { mode: "walk", phase: t * 1.4 + i * 0.5, yaw: Math.PI, headYaw: 160 * smooth((t - 0.6) / 0.8) }); return; } // walking down the pier, the head turning all the way back to look
        creep(i, p, { yaw: toCam(p), wave: 0.5 + 0.5 * Math.sin(t * 6), headRoll: sync(t, 18) }); // all waving in perfect step
      });
      break;
    }
    case 2: { // Leo looks round; behind him two neighbours slowly turn their heads to stare at him
      leo(t < 1.1 ? "neutral" : "smile", { yaw: toCam(HERO_DAY) + 0.15 - 0.25 * smooth((t - 0.4) / 0.8), look: lin([[0, -0.6], [0.9, 0.5], [1.6, 0]], t), blink: lidAt(t, 1), breathe: 1 }, HERO_DAY);
      for (const [i, p] of [[5, [6.5, 0, -3.5]], [1, [-1.5, 0, -2.5]]] as [number, V3][]) creep(i, p, { yaw: Math.atan2(HERO_DAY[0] - p[0], HERO_DAY[2] - p[2]) - 1.2 + 1.2 * smooth((t - 0.3) / 1.2), headRoll: 0 });
      break;
    }
    case 3: { // the neighbours at the door: three smiles, nobody blinks
      const door: V3 = [0, 0, 6.2];
      const lean = 10 * smooth(t / 1.8); // they lean in, slowly, all together
      creep(1, [door[0] - 0.75, 0, door[2]], { yaw: toCam(door), lean, headTilt: -lean * 0.5 }); creep(0, [door[0] + 0.7, 0, door[2] + 0.1], { yaw: toCam(door), lean, headTilt: -lean * 0.5 }); creep(7, [door[0] + 0.05, 0, door[2] + 0.25], { yaw: toCam(door), lean }); creep(4, [door[0] - 1.6, 0, door[2] - 0.2], { yaw: toCam(door), lean, headTilt: -lean * 0.5 });
      leo("scared", { yaw: Math.atan2(door[0] + 1.0, door[2] - 4.4), blink: 0, look: 0.5 }, [-1.0, 0, 4.4]);
      break;
    }
    case 4: { // night: the whole town in pajamas, in rows, staring up at Leo's window
      for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) {
        const p: V3 = [-5.1 + k * 1.7 + (r % 2) * 0.6, 0, 4.8 - r * 1.7]; const i = r * 7 + k, o = TOWN[i % TOWN.length];
        const turn = smooth((t - 0.15 * ((i * 7) % 11) * 0.12) / 0.5); // one by one the heads snap up to the window
        creep(i, p, { yaw: Math.atan2(LEO_WIN[0] - p[0], LEO_WIN[2] - p[2]), headTilt: -32 * turn, headRoll: sync(t, 10) * turn }, PJ(o, i));
      }
      break;
    }
    case 5: { // wide night: rows of tiny figures in the fog under the window
      for (let r = 0; r < 3; r++) for (let k = 0; k < 9; k++) { const p: V3 = [-6.8 + k * 1.7, 0, 4.8 - r * 1.7], i = r * 9 + k; creep(i, p, { yaw: Math.atan2(LEO_WIN[0] - p[0], LEO_WIN[2] - p[2]), headTilt: -28 }, PJ(TOWN[i % TOWN.length], i)); }
      break;
    }
    case 6: leo("neutral", { mode: "lie", yaw: 0, blink: 1, y: 0.83, breathe: 1.5, headYaw: 8 * Math.sin(t * 0.7) }, [BED[0], 0.62, BED[2] + 1.12], LEO_BED); break;
    case 7: { // faces at the window over the sleeping boy
      leo("neutral", { mode: "lie", yaw: 0, blink: 1, y: 0.83 }, [BED[0], 0.62, BED[2] + 1.12], LEO_BED);
      const wz = RWIN[2] - 0.86; // the window wall is 0.3-0.5 m behind RWIN; keep their chests and noses clear of glass and sill
      [[-0.36, 0.02, 0], [0.36, 0.06, 0], [0.0, 0.14, -0.7]].forEach(([dx, dy, dz], i) => (creep(i + 3, [RWIN[0] + dx, dy - (1.62 - RWIN[1]) - 0.05 - 0.75 * (1 - smooth((t - 0.2 - i * 0.35) / 0.9)), wz + dz], { yaw: 0.15 * dx, headTilt: 6, headRoll: sync(t, 12) }, PJ(TOWN[(i + 3) % TOWN.length], i)).nosep = true));
      break;
    }
    case 8: put(400, KEEPER, [LHIN[0] - 1.1, 0, LHIN[2] + 0.6], 1, t < 1.2 ? "neutral" : "smile", { headYaw: -70 + 70 * smooth((t - 0.5) / 0.9), breathe: 1, yaw: toCam([LHIN[0] - 1.1, 0, LHIN[2] + 0.6]) + 0.35, look: -0.6, blink: lidAt(t, 400) }); break;
  }
  separate(out.places);
  void ROOM; void smooth; void clamp01; void lin; void linR; void bubble; void word; void yawTo; void mixV; void Q; void fx; void HAPPY; void SCARED; void CALM;
  return out;
};
