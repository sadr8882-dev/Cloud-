// The "Wrong Button" cast: 3D blocky rigs placed from here, plus unlit effect cards (speech bubbles, BOOP / MOO /
// CLICK bursts, spaghetti, fireworks, lemonade jets, eggs with letters ...). The world turns the placements into
// rigs, the dog, the cows and the chicken mailman.
import * as THREE from "three";
import { Pen, bodyFront, Outfit, Expr, FrontOpts, SKINS } from "./toon";
import {
  FPS, V3, PART, W1, W2, HERO, PIP0, PIPT, HEROT, GPT, BTN_TOP, TOP_Y, MAYOR1, LECTERN, STAGE_Y, PAD, COWS, GP, GP2, GM, MAIL0, NEIGH0,
  FOUNTAIN, BAKERY, MOMP, MOMS, MOMT, DOG0, DOGM, NOSE_TOP, TOWER, CH2, SC, dogAt, DogState, smooth, clamp01, lin, stairAt, stairOut, heroStairU, runPips,
  heroIsPip, henWalk, mayorTiny, mailChicken, spaghettiOn, lemonadeOn, fireworksOn, cowAt,
} from "./story";
import * as X from "./fx";
import { NOINK } from "./ink";
import type { RigOpts } from "./blocky";
import type { CowPose, HenPose } from "./critters";
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
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number]; rig?: RigOpts;
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; face?: boolean; yaw?: number; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[]; dog?: DogState; cows: (CowPose | null)[]; hen?: HenPose; choc: number };

// ---------------- outfits ----------------
const SK = ["#f6c99f", "#efb98c", "#d9a074", "#a8704a"]; void SKINS;
const BOY: Outfit = { jacket: "#d2323c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hair: "#4a2c1a", build: "kid", skin: SK[0] };
const PIP: Outfit = { jacket: "#4cb050", pants: "#3b5b9a", boots: "#e2453c", hat: "cap", cap: "#2f6fd8", build: "kid", skin: SK[0] };
const FOLK: Outfit[] = [
  { jacket: "#3f6fb5", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#5a3b2a", skin: SK[0] },
  { jacket: "#c25a7a", pants: "#3b3f52", boots: "#4a3426", hat: "bonnet", dress: "#d9a441", skin: SK[2] },
  { jacket: "#5d7a3a", pants: "#4a4038", boots: "#4a3426", hat: "cap", cap: "#8c3b4a", moustache: "#3a2a1e", skin: SK[3] },
  { jacket: "#2f5f6a", pants: "#3b3f52", boots: "#4a3426", hat: "bonnet", dress: "#5a8fc2", skin: SK[1] },
  { jacket: "#b5653f", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#2a201a", build: "stout", skin: SK[0] },
  { jacket: "#8a5ac9", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#c98b3a", dress: "#8a5ac9", skin: SK[1] },
  { jacket: "#e08a3a", pants: "#4a4038", boots: "#4a3426", hat: "cap", cap: "#3b5b9a", skin: SK[2] },
];
const GRANDPA: Outfit = { jacket: "#7a5a3e", pants: "#4a4038", boots: "#2e2a36", hat: "cap", cap: "#5b6270", beard: "#f2efe7", moustache: "#f2efe7", build: "stout", skin: SK[2] };
const GRANDMA: Outfit = { jacket: "#9a5aa8", pants: "#3b3f52", boots: "#2e2a36", hat: "hair", hair: "#e8e4dc", dress: "#9a5aa8", skin: SK[1] };
const MAYOR: Outfit = { jacket: "#2b2f45", pants: "#2b2f45", boots: "#1e1c24", hat: "tophat", hair: "#d8d4cc", moustache: "#d8d4cc", belt: "#d23b3b", build: "stout", skin: SK[1] };
const MAIL: Outfit = { jacket: "#3f6fb5", pants: "#24365e", boots: "#2a2420", hat: "cap", cap: "#24365e", skin: SK[2] };
const MOM: Outfit = { jacket: "#e07a9a", pants: "#3b3f52", boots: "#f4f1ea", hat: "hair", hair: "#5a3b2a", dress: "#e07a9a", skin: SK[0] };
const FARMER: Outfit = { jacket: "#c23a3a", pants: "#3d5a8a", boots: "#4a3426", hat: "cap", cap: "#e8c25a", moustache: "#5a3b2a", build: "stout", skin: SK[2] };
const KIDS: Outfit[] = [
  { jacket: "#e2453c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#f3d35a", build: "kid", skin: SK[0] },
  { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#f4f1ea", hat: "hair", hair: "#c98b3a", dress: "#7b5ac9", build: "kid", skin: SK[3] },
  { jacket: "#2f8a4f", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hair: "#2a201a", build: "kid", skin: SK[1] },
];

// ---------------- helpers ----------------
let TNOW = 0;
let CAM: CamInfo;
let OUT: Stage;
let SID = 0;
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
const pop = (p: V3, t0: number, size = 2.2) => { if (TNOW > t0 && TNOW < t0 + 0.9) { const k = Q((TNOW - t0) / 0.9, 15); fx(`pop${k}`, 512, 512, (pp) => X.pop(pp, k), p, size, size, { soft: true }); } };
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
const rays = (p: V3, s: number, t0: number, dur = 0.6) => { if (TNOW > t0 && TNOW < t0 + dur) { const u = Q((TNOW - t0) / dur, 12); fx(`rays${u}`, 256, 256, X.sparkle, p, s * (0.6 + u), s * (0.6 + u), { soft: true, rot: u }); } };
const HAPPYS: Expr[] = HAPPY;

// ---------------- the town's people ----------------
// the fair audience (facing the stage), then everybody else at their marks
const AUD: [number, number, Outfit, number][] = [[-3.2, -4.6, FOLK[0], 1], [-1.9, -5.1, KIDS[0], 0.7], [1.4, -4.9, FOLK[1], 1], [2.8, -4.3, FOLK[2], 1], [-4.5, -2.8, FOLK[3], 1],
  [3.9, -2.5, KIDS[1], 0.7], [0.7, -3.6, FOLK[4], 1], [-2.7, -3.5, MOM, 1], [2.2, -1.3, FOLK[5], 1], [-3.6, -0.6, KIDS[2], 0.7], [4.8, -4.0, FOLK[6], 1]];
const STAGEC: V3 = [0, 0, -8.6];
const audience = (ex: Mood, fo: Extra = {}, faceStage = true) =>
  AUD.forEach(([x, z, o, sc], i) => put(300 + i, o, [x, 0, z], sc, ex, { ...(faceStage ? { yaw: yawTo([x, 0, z], STAGEC) } : {}), ...fo }));
const FARM_P: V3 = [-11.4, 0, -1.0], JUDGE_P: V3 = [-7.2, 0, -4.35], KEEP: V3[] = [[-10.6, 0, 3.4], [9.4, 0, 7.0], [-8.6, 0, -10.2]];
const mayorAt = (ex: Mood, fo: Extra = {}) => {
  const tiny = mayorTiny(TNOW);
  if (PART === 1) {
    if (!tiny) put(61, MAYOR, MAYOR1, 1, ex, { yaw: 0, ...fo });
    else put(61, MAYOR, [LECTERN[0], LECTERN[1] + 1.0, LECTERN[2] + 0.05], SC.tinyMayor, ex, { yaw: 0, ...fo });
  } else {
    if (tiny) put(61, MAYOR, NOSE_TOP, SC.tinyMayor, ex, { yaw: -Math.PI / 2 + 0.5, ...fo });
    else put(61, MAYOR, MAYOR1, 1, ex, { yaw: 0, ...fo });
  }
};
const henDefault = (): HenPose => ({ x: 2.6, y: 0, z: 2.0, yaw: -0.6 + 0.4 * Math.sin(TNOW * 0.7), walk: 0.4, peck: Math.max(0, Math.sin(TNOW * 4)) * 0.6 });
const PILES: V3[] = [[-2.4, 0.03, 0.6], [1.8, 0.03, -0.4], [3.5, 0.03, 3.2], [-1.2, 0.03, 4.2], [-6.6, 0.03, 0.4], [6.2, 0.03, 1.4], [0.6, STAGE_Y + 0.02, -8.0], [-4.0, 0.95, 9.05],
  [4.2, 0.95, 5.65], [-8.4, 0.03, -2.0], [8.6, 0.03, 4.2], [-3.0, 0.03, -6.4], [2.8, 0.03, -6.8], [-5.0, 0.03, 7.4], [0.2, 0.03, 7.0], [-7.2, 0.86, -3.5]];
const spaghettiPiles = (t0: number) => PILES.forEach((p, i) => { const k = PART === 1 ? smooth((TNOW - t0 - (i % 5) * 0.15) / 0.4) : 1; if (k > 0.01) fx(`pile${i % 3}`, 256, 256, (pp) => X.pile(pp, i % 3), p, 1.0 * k + 0.01, 0.75 * k + 0.01, { flat: true, rot: i * 1.3 }); });
const noodleRain = (c: V3, n = 40, spread = 9, top = 8) => {
  for (let i = 0; i < n; i++) {
    const u = (TNOW * (0.55 + hh(i, 3) * 0.4) + hh(i, 4)) % 1, x = c[0] + (hh(i, 1) - 0.5) * spread, z = c[2] + (hh(i, 2) - 0.5) * spread;
    fx(`noodle${i % 6}`, 64, 240, (pp) => X.noodle(pp, i % 6), [x, top - u * top, z], 0.22, 0.82, { rot: 0.4 * Math.sin(TNOW * 3 + i) });
  }
};
const fireworkHair = (p: V3, sc = 1) => {
  for (let i = 0; i < 4; i++) {
    const k = (TNOW * 0.85 + i * 0.27) % 1, hgt = 1.9 * sc + 0.8 + i * 0.45, bx = p[0] + (hh(i, 6) - 0.5) * 1.4, bz = p[2] + 0.1;
    if (k < 0.3) { const u = k / 0.3; fx("spark", 128, 128, X.sparkle, [p[0] + (bx - p[0]) * u, 1.85 * sc + (hgt - 1.85 * sc) * u, bz], 0.25, 0.25, { soft: true }); }
    else { const kk = Q((k - 0.3) / 0.7, 12); fx(`fw${i % 4}|${kk}`, 512, 512, (pp) => X.firework(pp, kk, i), [bx, hgt, bz], 1.5, 1.5, { soft: true }); }
  }
  const s = Q(TNOW, 10); fx(`sparkle${s}`, 256, 256, X.sparkle, [p[0], 1.82 * sc, p[2] + 0.1], 0.5 + 0.15 * Math.sin(TNOW * 20), 0.5, { soft: true, rot: s * 3 });
};
const lemonade = () => { const k = Q(TNOW, 10); fx(`jets${k}`, 512, 512, (pp) => X.jets(pp, k), [FOUNTAIN[0], 2.6, FOUNTAIN[2]], 3.6, 3.6); };
const cowsOn = (moo: number[] = [], over: ((i: number) => V3) | null = null) => {
  OUT.cows = COWS.map((c, i) => {
    const s = cowAt(i, TNOW), p = over ? over(i) : c;
    const y = over ? p[1] + 0.3 * Math.sin(TNOW * 1.2 + i) : s.y;
    return { x: p[0], y, z: p[2], yaw: [0.6, -1.9, 2.4][i] + (over ? TNOW * 0.15 : 0), float: over ? 1 : s.float, spin: s.spin, moo: moo.includes(i) && Math.sin(TNOW * 3 + i) > -0.3, seed: i };
  });
};
const mooAt = (i: number, p: V3, t0: number, dur = 1.6) => { if (TNOW > t0 && TNOW < t0 + dur) bubble(`moo${i}`, "MOO!", 92, [p[0] + 0.6, p[1] + 2.3, p[2]], 1.4, t0, { jag: true, fill: "#ffffff" }); };

/** hero: the boy, or a second Pip after the flash */
const hero = (ex: Mood, fo: Extra = {}, p: V3 = HERO) => heroIsPip(TNOW) ? put(1, PIP, p, SC.pip, ex, fo) : put(1, BOY, p, SC.hero, ex, fo);
const pip = (ex: Mood, fo: Extra = {}, p: V3 = PIP0) => put(2, PIP, p, SC.pip, ex, fo);

// ---------------- per-shot staging ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [], cows: [], choc: 0 };
  OUT = out; CAM = cam; TNOW = t; SID = id;
  SUN = cam.sun.clone().normalize();
  out.dog = dogAt(t, id);
  if (PART === 1) p1(id, t); else p2(id, t);
  void SID;
  return out;
};

const p1 = (id: number, t: number) => {
  const W = W1;
  const after = t > W.pressed;
  // ---- everybody at their marks (the frustum skips what the lens cannot see) ----
  const listening = t < 22.0;
  if ((id !== 3 || t < 10.0) && id !== 2) audience(listening ? (id === 6 ? ["smile_closed", "neutral", "smile"] : CALM) : after ? SCARED : ["neutral", "nervous", "neutral"], listening ? {} : { look: 0 }, listening || !after);
  if (id === 2) audience(CALM, { headTilt: -24, look: 0 }, false);
  if (!(id === 3 && t > 10.0) && !(id === 11 && t > 37.1)) mayorAt(t < W.shrank ? (after ? "shock" : ["grin", "smile", "laugh"]) : "shout", { prop: t < W.shrank && !after ? "point" : undefined, wave: mayorTiny(t) ? Q(Math.sin(t * 9), 10) : undefined });
  if (id !== 3) put(64, GRANDPA, GP, 1.05, after ? SCARED : CALM, { yaw: yawTo(GP, STAGEC) });
  if (id !== 15) put(65, GRANDMA, GM, 1, after ? SCARED : CALM, { yaw: yawTo(GM, STAGEC) });
  if (fireworksOn(t) && id !== 15) fireworkHair(GM);
  put(66, FARMER, FARM_P, 1, t > 35.1 ? "shock" : CALM, { yaw: yawTo(FARM_P, PAD) + (t > 35.1 ? 0 : 0), headTilt: t > 35.6 ? -25 : 0 });
  put(67, FOLK[1], JUDGE_P, 1, id === 5 && t > 17.15 && t < 18.0 ? "laugh" : CALM, { yaw: 0 });
  KEEP.forEach((p, i) => put(68 + i, [FOLK[4], FOLK[6], FOLK[5]][i], p, 1, after ? SCARED : CALM, { yaw: [Math.PI / 2, -Math.PI / 2, 0][i] }));
  if (!mailChicken(t)) { if (id !== 12) put(62, MAIL, MAIL0, 1, after ? "nervous" : "smile", { prop: "carry" }); }
  else if (id !== 12) OUT.hen = henDefault();
  if (id !== 12) put(63, FOLK[0], NEIGH0, 1, after ? SCARED : CALM, { yaw: yawTo(NEIGH0, STAGEC) });
  cowsOn(t > 35.2 ? [0, 2] : []);
  if (t < 35.1) mooAt(9, [COWS[1][0], 0, COWS[1][2]], 99);
  if (spaghettiOn(t)) spaghettiPiles(45.55);
  if (lemonadeOn(t)) lemonade();
  // hero + Pip
  const pipOnTop = t > W.disappeared;
  if (!pipOnTop) { if (id !== 4 && id !== 6) pip(listening ? ["smile", "grin"] : "grin", { yaw: yawTo(PIP0, STAGEC) }); }
  else if (![17, 19, 20].includes(id) && !(id === 7 && t > 25.5)) pip(t > W.pressed ? "laugh" : "grin", { yaw: -Math.PI / 2, prop: t > W.pressed ? "point" : undefined, wave: t < W.pressed ? Q(Math.sin(t * 7), 10) : undefined }, PIPT);
  const onStair = t > 47.1 && t < 57.1;
  if (t < 47.1 && ![6, 7, 8].includes(id)) hero(listening ? "smile" : after ? "shock" : "nervous", { yaw: listening ? yawTo(HERO, STAGEC) : undefined });
  if (onStair && id !== 14) { const s = stairAt(heroStairU(t)); hero("stern", { mode: "run", phase: t * 3.2, yaw: s.yaw }, s.p); }
  if (t > 63.2 || after) { /* glow handled by the world */ }

  switch (id) {
    case 1: {
      if (t > 1.85 && t < 3.3) { const s = Q(t, 8); fx(`tw${s}`, 256, 256, X.sparkle, [BTN_TOP[0] + 0.22, BTN_TOP[1] + 0.2, BTN_TOP[2] + 0.2], 0.2 + 0.07 * Math.sin(t * 12), 0.2 + 0.07 * Math.sin(t * 12), { soft: true, rot: s * 2 }); }
      break;
    }
    case 2: {
      if (t > 3.95 && t < 5.6) [[-3.2, -4.6], [1.4, -4.9], [2.8, -4.3], [0.7, -3.6], [-2.7, -3.5], [-4.5, -2.8]].forEach(([x, z], i) => { const s = smooth((t - 3.95 - i * 0.1) / 0.2); if (s > 0) fx("q", 128, 128, X.question, [x, 2.45 + 0.08 * Math.sin(t * 4 + i), z], 0.55 * s + 0.01, 0.55 * s + 0.01); });
      break;
    }
    case 3: {
      if (t < 10.0) {
        put(64, GRANDPA, GP, 1.05, t < 8.4 ? "grin" : ["smile", "grin", "smile_closed"], { prop: "point", lean: 6 });
        if (t > 8.4) { const s = smooth((t - 8.4) / 0.25); fx("towerAlone", 512, 420, X.towerAlone, [GP[0] + 0.75, 2.8, GP[2] + 0.3], 1.2 * s + 0.01, 1.0 * s + 0.01); }
      } else {
        mayorAt(t < W.emerg ? "stern" : "shout", { prop: "point", headTilt: -6 });
        if (t > 10.6) { const k = Q(t, 8); fx(`siren${k}`, 256, 256, (p) => X.siren(p, k), [MAYOR1[0] - 0.42, STAGE_Y + 2.42, MAYOR1[2] + 0.25], 0.5, 0.5); }
        audience(CALM, {}, true);
      }
      break;
    }
    case 4: {
      pip(t < W.pip ? "grin" : "laugh", { prop: t > 12.7 ? "holdup" : undefined, look: 0 });
      if (t > 12.7) { const s = smooth((t - 12.7) / 0.2); fx("mine", 256, 256, X.mineSign, [PIP0[0], 1.25 + 0.05 * Math.sin(t * 9), PIP0[2] + 0.1], 0.75 * s + 0.01, 0.75 * s + 0.01, { rot: 0.08 * Math.sin(t * 6) }); }
      hero("smile", { look: 1 });
      break;
    }
    case 5: {
      if (t > 16.6) { const k = Q(t, 10); fx(`notes${k}`, 256, 256, (p) => X.notes(p, k), [2.1, STAGE_Y + 3.0, -7.9], 1.2, 1.2, { soft: true }); }
      if (t > 17.15 && t < 18.0) for (let i = 0; i < 6; i++) { const u = ((t - 17.15) * 1.6 + hh(i, 4)) % 1; fx(`crumb${i % 3}`, 64, 64, (p) => X.crumbs(p, i), [JUDGE_P[0] + (hh(i, 1) - 0.5) * 0.6, 1.4 - u * 0.6, JUDGE_P[2] + 0.4], 0.07, 0.07); }
      if (t > 18.15) bubble("blah", "...AND SO,\nBLAH BLAH...", 50, [MAYOR1[0] + 1.05, STAGE_Y + 2.65, MAYOR1[2] + 0.3], 1.6, 18.15, { tail: -1 });
      break;
    }
    case 6: {
      if (t < W.disappeared) pip("smile_closed", { yaw: yawTo(PIP0, STAGEC) });
      hero(t < 21.9 ? "smile_closed" : "nervous", { yaw: t < 22.0 ? yawTo(HERO, STAGEC) : undefined, look: t > 22.1 ? 1 : 0 });
      [[-1.9, -5.1], [2.8, -4.3]].forEach(([x, z], i) => fx("zzz", 256, 256, X.zzz, [x + 0.35, 2.4 + i * 0.1 + 0.1 * Math.sin(t * 2 + i), z], 0.5, 0.5, { soft: true }));
      if (t > W.disappeared - 0.05) {
        pop([PIP0[0], 0.7, PIP0[2]], W.disappeared - 0.05, 1.6);
        const k = clamp01((t - W.disappeared) / 1.2); fx(`poofO${Q(k, 10)}`, 256, 512, (p) => X.poofOutline(p, Q(k, 10)), [PIP0[0], 0.62, PIP0[2]], 0.62, 1.24);
      }
      break;
    }
    case 7: {
      hero("shock", { headTilt: t < 23.75 ? -22 : 0, look: 0 });
      if (t > 25.5) { pip("laugh", { wave: Q(Math.sin(t * 7), 10) }, PIPT); word("HI!", "#4cb050", [PIPT[0] + 0.35, TOP_Y + 1.45, PIPT[2] + 0.3], 0.55, 25.6, 1.2, "#ffffff"); }
      if (t > 23.75 && t < 25.5) fx("excl", 256, 256, X.bang, [PIPT[0] + 0.6, TOP_Y + 2.4, PIPT[2] + 0.6], 1.8, 1.8);
      break;
    }
    case 8: {
      hero(t < W.yelled ? "shock" : "shout", { prop: t > W.yelled ? "point" : undefined, headTilt: -14, lean: t > W.yelled ? 8 : 0 });
      if (t > 27.45 && t < 28.0) bubble("no", "PIP,\nNO!!!", 80, [HERO[0] - 0.42, 1.98, HERO[2] + 0.25], 0.85, 27.45, { jag: true, tail: 1 });
      word("BOOP!", "#e2453c", [BTN_TOP[0] - 0.32, BTN_TOP[1] + 0.32, BTN_TOP[2] + 0.12], 0.6, W.pressed);
      rays(BTN_TOP, 0.9, W.pressed, 0.5);
      break;
    }
    case 9: {
      if (t < 29.5) { const k = clamp01((t - 28.6) / 0.9); fx("ring", 512, 512, X.ring, [0, 0.4, -14], 70 * k + 0.1, 70 * k + 0.1, { flat: true }); fx("ring", 512, 512, X.ring, [0, 0.5, -14], 40 * k + 0.1, 40 * k + 0.1, { flat: true }); }
      const DH: V3 = [DOG0[0] - 2.6, DOG0[1] + 6.4, DOG0[2]];
      if (t > 30.1 && t < 31.6) bubble("ahem", "AHEM...", 80, [DH[0] - 1.0, DH[1] + 2.0, DH[2] + 1.2], 3.0, 30.1, { tail: 1 });
      if (t > 32.55) bubble("good", "GOOD\nAFTERNOON.", 66, [DH[0] - 1.0, DH[1] + 1.25, DH[2] - 0.4], 2.6, 32.55, { tail: 1 });
      if (t > 31.3) fx("monocle", 128, 140, X.monocle, [DOG0[0] - 3.64, DOG0[1] + 6.47, DOG0[2] + 0.48], 0.5, 0.55, { face: true, yaw: -Math.PI / 2 });
      put(320, FOLK[3], [7.4, 0, 3.4], 1, "shock", { yaw: yawTo([7.4, 0, 3.4], DOG0), headTilt: -18 });
      put(321, KIDS[0], [8.2, 0, 4.4], 0.7, t > 32.6 ? "laugh" : "shock", { yaw: yawTo([8.2, 0, 4.4], DOG0), headTilt: -25 });
      break;
    }
    case 10: {
      word("BOOP!", "#e2453c", [BTN_TOP[0] + 0.3, BTN_TOP[1] + 0.32, BTN_TOP[2] + 0.12], 0.6, W.pressed2);
      rays(BTN_TOP, 0.8, W.pressed2, 0.5);
      COWS.forEach((c, i) => { const s = cowAt(i, t); mooAt(i, [c[0], s.y, c[2]], 35.6 + i * 0.5, 1.2); });
      break;
    }
    case 11: {
      word("BOOP!", "#e2453c", [BTN_TOP[0] + 0.3, BTN_TOP[1] + 0.32, BTN_TOP[2] + 0.12], 0.6, W.again2 + 0.05);
      if (t > 37.1) {
        mayorAt(t < W.shrank ? "grin" : t < 38.4 ? "shock" : "shout", { prop: t < W.shrank ? "point" : undefined, wave: mayorTiny(t) ? Q(Math.sin(t * 10), 10) : undefined });
        pop([MAYOR1[0], STAGE_Y + 1.1, MAYOR1[2]], W.shrank - 0.05, 2.0);
        if (t > 39.25) bubble("squeak", "squeak squeak!", 46, [LECTERN[0] + 0.05, LECTERN[1] + 1.46, LECTERN[2] + 0.1], 0.45, 39.25, { tail: -1 });
      }
      break;
    }
    case 12: {
      word("BOOP!", "#e2453c", [BTN_TOP[0] - 0.3, BTN_TOP[1] + 0.32, BTN_TOP[2] + 0.12], 0.6, W.again3 + 0.05);
      const nb = NEIGH0;
      put(63, FOLK[0], nb, 1, t < 43.4 ? "neutral" : t < 44.2 ? "shock" : "dazed", { yaw: yawTo(nb, MAIL0), prop: t > 44.25 ? "carry" : undefined });
      if (t < 42.55) put(62, MAIL, MAIL0, 1, t < 42.1 ? "smile" : "shock", { prop: "carry", mode: t < 42.0 ? "walk" : "stand", phase: t * 0.9, yaw: yawTo(MAIL0, nb) });
      else {
        const k = clamp01((t - 43.45) / 0.8), hp = mixV(MAIL0, [nb[0] - 0.75, 0, nb[2] - 0.45], k);
        OUT.hen = { x: hp[0], y: 0, z: hp[2], yaw: yawTo(MAIL0, nb), walk: k > 0 && k < 1 ? 1 : 0, flap: t < 43.1 ? 1 : 0 };
        if (t < 44.3) fx("env", 128, 112, X.envelope, [hp[0] + Math.sin(yawTo(MAIL0, nb)) * 0.4, 0.95, hp[2] + Math.cos(yawTo(MAIL0, nb)) * 0.4], 0.28, 0.24);
        else fx("env", 128, 112, X.envelope, [nb[0], 1.15, nb[2] + 0.35], 0.32, 0.27);
        for (let i = 0; i < 6; i++) { const u = clamp01((t - 42.55) / 1.2); if (u < 1) fx("feather", 128, 128, X.drop, [MAIL0[0] + (hh(i, 1) - 0.5) * 1.6 * u, 1.6 - u * 1.2 + hh(i, 2) * 0.5, MAIL0[2] + (hh(i, 3) - 0.5) * 1.2 * u], 0.16, 0.16, { rot: t * 3 + i }); }
      }
      pop([MAIL0[0], 1.0, MAIL0[2]], 42.5, 2.2);
      break;
    }
    case 13: {
      word("BOOP!", "#e2453c", [BTN_TOP[0] + 0.3, BTN_TOP[1] + 0.32, BTN_TOP[2] + 0.12], 0.6, W.again4 + 0.05);
      if (t > 45.5) noodleRain([-1, 0, 0], 70, 16, 9);
      break;
    }
    case 14: {
      if (t < 49.45) {
        const s = stairAt(heroStairU(t));
        hero("stern", { mode: "run", phase: t * 3.2, yaw: s.yaw }, s.p);
        const back: V3 = [s.p[0] - Math.sin(s.yaw) * 0.9, s.p[1] + 0.8, s.p[2] - Math.cos(s.yaw) * 0.9];
        fx("speedS", 512, 256, X.speed, back, 1.4, 0.7, { face: true, yaw: s.yaw + Math.PI / 2 });
        if (t > 48.3) bubble("200", "200 STAIRS?!", 60, [s.p[0] + stairOut(heroStairU(t))[0] * 0.8, s.p[1] + 1.5, s.p[2] + stairOut(heroStairU(t))[2] * 0.8], 1.6, 48.3, { jag: true });
      } else {
        const n = Math.min(9, Math.max(1, Math.floor((t - 49.7) / 0.25) + 1));
        if (t > 49.7) fx(`cnt${n}`, 256, 256, (p) => X.counter(p, n), [BTN_TOP[0] - 0.38, BTN_TOP[1] + 0.52, BTN_TOP[2] + 0.35], 0.4, 0.4);
        for (let i = 0; i < 9; i++) rays(BTN_TOP, 0.7, 49.7 + i * 0.25, 0.25);
      }
      break;
    }
    case 15: {
      put(65, GRANDMA, GM, 1, t < 52.4 ? "shock" : t < 53.0 ? "shock" : "laugh", { headTilt: t > 52.4 ? -10 : 0 });
      if (fireworksOn(t)) fireworkHair(GM);
      put(330, KIDS[2], [-2.4, 0, 6.0], 0.7, t > 54.3 ? "laugh" : "shock", { prop: t > 54.3 ? "holdup" : undefined, yaw: yawTo([-2.4, 0, 6.0], FOUNTAIN) + 0.6 });
      put(331, FOLK[4], [-5.8, 0, 6.6], 1, "laugh", { prop: "carry" });
      if (t > 55.2) { const k = Q(t, 10); for (const p of [[-13, 7, 18], [-4.4, 8.5, 18], [4.2, 7, 18], [12.8, 8, 18]] as V3[]) fx(`notes${k}`, 256, 256, (pp) => X.notes(pp, k), p, 2.6, 2.6, { soft: true }); }
      break;
    }
    case 16: {
      const k = clamp01((t - 57.1) / 1.0);
      if (t > 57.1) {
        const p = k < 0.35 ? mixV([-3.65, 20.3, -14.35], [-3.0, TOP_Y, -14.7], k / 0.35) : mixV([-3.0, TOP_Y, -14.7], HEROT, (k - 0.35) / 0.65);
        hero(t < W.grabbed ? "pained" : "stern", { mode: k < 1 ? "run" : "stand", phase: t * 3, yaw: k < 1 ? yawTo([-3.0, 0, -14.7], HEROT) : yawTo(HEROT, PIPT), prop: t > W.grabbed ? "point" : undefined }, p);
        if (k < 1) { const u = (t * 1.4) % 1; fx("drop", 128, 128, X.drop, [p[0] + 0.25, p[1] + 1.5 - u * 0.4, p[2] + 0.2], 0.12, 0.12); }
      }
      if (t > W.grabbed) word("GOTCHA!", "#4cb050", [HEROT[0] - 0.45, TOP_Y + 1.32, HEROT[2] + 0.3], 0.55, W.grabbed, 0.9, "#ffffff");
      break;
    }
    case 17: {
      pip(t < W.smiled ? "neutral" : t < 62.4 ? "grin" : "laugh", { look: 0 }, PIPT);
      hero("stern", { prop: "point", yaw: yawTo(HEROT, PIPT) }, HEROT);
      if (t > W.one - 0.05) bubble("onemore", "ONE\nMORE!", 92, [PIPT[0] + 0.1, TOP_Y + 1.22, PIPT[2] + 0.35], 0.5, W.one - 0.05, { tail: 1 });
      break;
    }
    case 18: {
      hero("shock", { prop: "point", yaw: yawTo(HEROT, PIPT) }, HEROT);
      const g = smooth((t - 63.6) / 1.6);
      if (t > 63.6) { const u = Q(t, 10); fx(`glow${u}`, 256, 256, X.sparkle, [BTN_TOP[0], BTN_TOP[1] + 0.15, BTN_TOP[2]], 0.4 + 1.4 * g, 0.4 + 1.4 * g, { soft: true, rot: u * 2 }); }
      word("BOOP!", "#e2453c", [BTN_TOP[0] + 0.32, BTN_TOP[1] + 0.32, BTN_TOP[2] + 0.12], 0.6, W.pressed3 + 0.06);
      break;
    }
    case 19: {
      if (t < W.flash) { pip("laugh", { prop: "point", yaw: -Math.PI / 2 }, PIPT); hero("shock", { prop: "point", yaw: yawTo(HEROT, PIPT) }, HEROT); const g = smooth((t - 65.3) / 0.6); fx("glowB", 256, 256, X.sparkle, [BTN_TOP[0], BTN_TOP[1] + 0.2, BTN_TOP[2]], 1 + 2.5 * g, 1 + 2.5 * g, { soft: true, rot: t }); }
      else {
        pip("dazed", { look: 0, yaw: yawTo(PIPT, HEROT) }, PIPT); hero("dazed", { yaw: yawTo(HEROT, PIPT) }, HEROT);
        for (const p of [PIPT, HEROT]) { const k = Q(t, 12); fx(`dizzy${k}`, 256, 128, (pp) => X.dizzy(pp, k), [p[0], TOP_Y + 1.42, p[2]], 0.7, 0.35); }
      }
      break;
    }
    case 20: {
      const look2 = t > W.another;
      hero(t < W.pip4 ? "nervous" : "shock", { prop: !look2 ? "carry" : undefined, headTilt: !look2 ? 25 : 0, yaw: undefined }, HEROT);
      pip(look2 ? "shock" : "dazed", { look: 1 }, PIPT);
      if (t > W.pip4 && t < 69.4) word("?!", "#e2453c", [HEROT[0] + 0.1, TOP_Y + 1.45, HEROT[2] + 0.2], 0.45, W.pip4, 1.0, "#ffffff");
      if (t > 69.9) for (const p of [PIPT, HEROT]) fx("excl", 256, 256, X.bang, [p[0], TOP_Y + 1.42, p[2] + 0.1], 0.3, 0.3);
      break;
    }
  }
};

const DECK: [number, number, Outfit, number][] = [[-2.4, -18.7, FOLK[0], 1], [-1.2, -19.3, FOLK[1], 1], [0.4, -19.4, FOLK[4], 1], [1.8, -19.0, FOLK[3], 1], [2.7, -18.0, KIDS[0], 0.7], [-2.9, -17.0, FOLK[2], 1], [2.9, -16.6, FOLK[5], 1], [-1.6, -17.9, KIDS[1], 0.7], [1.0, -18.2, GRANDMA, 1]];
const p2 = (id: number, t: number) => {
  const W = W2;
  const clicked = t > W.click;
  // ---- magic leftovers everywhere ----
  if (spaghettiOn(t)) spaghettiPiles(0);
  if (lemonadeOn(t)) lemonade();
  if (t > W.confetti) for (let i = 0; i < 40; i++) { const u = ((t - W.confetti) * 0.35 + hh(i, 4)) % 1; fx(`conf${i % 6}`, 64, 32, (p) => X.confetti(p, i), [-1 + (hh(i, 1) - 0.5) * 14, 7 - u * 7, (hh(i, 2) - 0.5) * 14], 0.16, 0.08, { rot: t * (3 + (i % 4)) }); }
  const overBakery = (i: number): V3 => [BAKERY[0] + 1.5 - i * 2.0, 7.0 + i * 1.3, BAKERY[2] - 1.5 + i * 1.6];
  if (id === 12) cowsOn([1], (i) => [5.2 + i * 1.8, 9 + i * 2.2 + (t - 42.8) * 0.8, -12.5 - i * 1.4]);
  else if (id === 17 && t > 60.5) cowsOn([]);
  else if (!clicked) cowsOn([0, 1, 2], overBakery); else cowsOn([]);
  // townsfolk in the square (shots that look at the town)
  const town = ![1, 2, 3, 8, 12, 13, 14, 15, 16, 18].includes(id) || (id === 17 && t > 60.5) || (id === 18 && t < 64.0);
  if (town && id !== 10) {
    AUD.forEach(([x, z, o, sc], i) => { if (o === MOM || o === GRANDMA) return; put(300 + i, o, [x + 0.6 * Math.sin(i), 0, z + 4.5], sc, clicked ? HAPPYS : ["nervous", "shock", "dazed"], { look: 0 }); });
  }
  mayorAt(mayorTiny(t) ? "shout" : clicked ? "laugh" : "stern", { wave: mayorTiny(t) ? Q(Math.sin(t * 10), 10) : undefined });
  if (id !== 8 && id !== 20) OUT.hen = henDefault();
  if (fireworksOn(t) && ![12, 13, 14, 15, 16].includes(id)) { put(65, GRANDMA, GM, 1, "nervous"); fireworkHair(GM); }
  put(66, FARMER, FARM_P, 1, clicked ? "laugh" : "nervous", { headTilt: clicked ? 0 : -25, yaw: yawTo(FARM_P, PAD) });
  // the two Pips / mom / grandpa by section
  const momDown = t > W.fainted && t < W.woke + 0.1;
  if (id <= 3) {
    hero(id === 2 ? "shout" : id === 1 ? (t < W.me ? "shock" : "nervous") : "nervous", { prop: id === 1 && t > 2.2 ? "point" : id === 2 ? "holdup" : undefined }, HEROT);
    pip(id === 3 ? "shout" : "shock", { prop: id === 3 ? "holdup" : undefined }, PIPT);
  }
  if ((id >= 13 && id <= 17 && !(id === 17 && t > 60.5)) || (id === 18 && t < 66.5)) {
    DECK.forEach(([x, z, o, sc], i) => put(340 + i, o, [x, TOP_Y, z], sc, clicked ? HAPPYS : id === 15 && t > W.looked ? "shock" : ["nervous", "neutral", "shock"], { yaw: yawTo([x, 0, z], [0.8, 0, -16.2]), look: 0, prop: clicked && i % 2 ? "holdup" : undefined }));
    put(64, GRANDPA, GPT, 1.05, t > 47.6 && t < 51 ? "grin" : clicked ? "laugh" : "stern", { yaw: Math.PI / 2, prop: t > 47.6 && t < 48.9 ? "carry" : undefined });
  }
  if (id >= 13 && id <= 17 && !clicked) {
    const reach = id === 15 && t > 55.4, hold = id === 16, both = id === 16 && t > 57.75;
    hero(both ? "grin" : hold ? "stern" : "nervous", { yaw: both ? -Math.PI / 2 + 0.3 : yawTo(HEROT, PIPT), prop: hold ? "point" : undefined, look: 0 }, HEROT);
    pip(both ? "grin" : reach ? "grin" : hold ? "nervous" : "nervous", { yaw: reach || both ? -Math.PI / 2 : yawTo(PIPT, HEROT) - 0.3, prop: reach || both ? "point" : undefined, look: 0 }, PIPT);
  }
  if (id >= 4 && id <= 7) { // Mom's yard
    const MP = id >= 6 ? MOMS : MOMP, kids: V3 = [-4.4, 0, 14.45];
    put(60, MOM, MP, 1, momDown ? "dazed" : t < W.momlooked ? "neutral" : t < W.momsaid ? "nervous" : t < 23.4 ? "stern" : "shock",
      momDown ? { mode: "dive", pitch: -86 * smooth((t - W.fainted) / 0.35), y: 0.2 * smooth((t - W.fainted) / 0.35), yaw: yawTo(MP, kids), look: 0 } : { yaw: yawTo(MP, kids), look: t > W.momlooked && t < W.dog ? Q(Math.sin(t * 5), 2) : t > W.dog && t < W.momsaid ? 1 : 0, prop: id === 5 && t < 17.6 ? "point" : undefined });
    const A: V3 = [-5.0, 0, 14.45], B: V3 = [-3.8, 0, 14.45];
    if (id === 4 && t < 11.7) { const p = runPips(t); hero("laugh", { mode: "run", phase: t * 3, yaw: yawTo(p, MOMP) }, [p[0] - 0.4, 0, p[2]]); pip("laugh", { mode: "run", phase: t * 3 + 0.4, yaw: yawTo(p, MOMP) }, [p[0] + 0.4, 0, p[2] - 0.5]); }
    else {
      const ate = t > W.ate + 0.25;
      hero(ate ? "laugh" : id === 6 ? "nervous" : "neutral", { yaw: 0, look: 0 }, A);
      pip(ate ? "laugh" : id === 6 ? "grin" : "neutral", { yaw: 0, look: 0 }, B);
      if (ate && t < 24.6) for (let i = 0; i < 10; i++) { const u = ((t - W.ate) * 1.6 + hh(i, 4)) % 1; fx(`chocC${i % 3}`, 64, 64, (p) => X.crumbs(p, 2), [-4.4 + (hh(i, 1) - 0.5) * 1.4, 1.0 - u * 0.7, 14.8 + (hh(i, 2) - 0.5) * 0.6], 0.07, 0.07); }
    }
    if (momDown) { const k = Q(t, 12); fx(`dizzy${k}`, 256, 128, (p) => X.dizzy(p, k), [MOMS[0] - 0.4, 0.55, MOMS[2] + 1.1], 0.8, 0.4); }
    OUT.choc = t < W.brought ? 0 : t < W.ate ? smooth((t - W.brought) / 0.3) : 1 - smooth((t - W.ate) / 0.25);
    if (id === 4) OUT.dog = dogAt(t, 4);
  }
  if (id >= 8 && id <= 12 && id !== 10) { put(60, MOM, MOMS, 1, "dazed", { mode: "dive", pitch: -86, y: 0.2, yaw: yawTo(MOMS, [-4.4, 0, 14.45]) }); }

  switch (id) {
    case 1: {
      if (t > 0.5) for (const p of [PIPT, HEROT]) fx("excl", 256, 256, X.bang, [p[0], TOP_Y + 1.45 + 0.03 * Math.sin(t * 8), p[2] + 0.1], 0.3, 0.3);
      break;
    }
    case 2: bubble("real1", "I'M THE REAL\nBIG BROTHER!", 56, [HEROT[0] + 0.1, TOP_Y + 1.38, HEROT[2] + 0.3], 0.85, 3.9, { jag: true, tail: -1 });
      if (t > 5.5) for (let i = 0; i < 3; i++) fx("sq", 256, 128, (p) => X.say(p, "squeak!", 34, { w: 256, h: 128 }), [HEROT[0] - 0.35 + i * 0.3, TOP_Y + 1.05 + i * 0.12, HEROT[2] + 0.35], 0.32, 0.16);
      break;
    case 3: {
      bubble("real2", "I'M THE REAL\nBIG BROTHER!", 34, [PIPT[0] - 0.1, TOP_Y + 1.38, PIPT[2] + 0.3], 0.85, 7.2, { jag: true, tail: 1, t1: 8.95 });
      if (t > W.even) {
        for (let i = 0; i < 7; i++) { const u = (t - W.even) * (0.5 + hh(i, 1) * 0.4); fx(`bird${Q(t + i, 10)}`, 128, 128, (p) => X.bird(p, Q(t + i, 10)), [(hh(i, 2) - 0.5) * 6 + (hh(i, 3) - 0.5) * 10 * u, TOP_Y + 3.6 + u * 3, -16.4 + (hh(i, 4) - 0.2) * 6 * u], 0.45, 0.45); }
        fx("crack", 256, 256, X.crack, [-1.8, TOP_Y + 2.2, -14.4], 1.0, 1.0);
        bubble("sq2", "squeeeak!", 40, [PIPT[0] - 0.3, TOP_Y + 1.8, PIPT[2] + 0.4], 1.0, W.even);
      }
      break;
    }
    case 4: {
      if (t > W.dogsaid) bubble("dlm", "DON'T LOOK\nAT ME.", 66, [DOGM[0] - 4.6, 5.0, DOGM[2] + 0.9], 2.8, W.dogsaid, { tail: 1 });
      if (t < 11.7) { const p = runPips(t); fx("speedR", 512, 256, X.speed, [p[0] + 1.6, 0.6, p[2] - 1.6], 2, 1); }
      break;
    }
    case 5: {
      if (t < 17.6) bubble("oneway", "THERE'S ONLY\nONE WAY TO KNOW!", 44, [MOMP[0] - 0.7, 2.4, MOMP[2] - 0.3], 1.3, 16.0, { tail: -1 });
      if (t > 18.0) rays([MOMT[0], 1.35, MOMT[2]], 0.45, 18.0, 0.8);
      break;
    }
    case 6: {
      if (t > W.realpip - 0.05) { const s = smooth((t - W.realpip + 0.05) / 0.2); fx("thinkBite", 400, 320, (p) => X.thinkBite(p, false), [-3.4, 1.75, 14.5], 0.95 * s + 0.01, 0.76 * s + 0.01); }
      if (t > 21.65) { const s = smooth((t - 21.65) / 0.2); fx("thinkShare", 400, 320, (p) => X.thinkBite(p, true), [-5.6, 1.75, 14.5], 0.95 * s + 0.01, 0.76 * s + 0.01); }
      break;
    }
    case 7: {
      word("CHOMP!", "#6a3a22", [-4.4, 1.55, 15.0], 1.2, W.ate, 0.9);
      if (t > W.fainted) word("THUD!", "#3f6fb5", [MOMS[0] + 0.3, 0.9, MOMS[2] - 0.4], 0.8, W.fainted + 0.25, 0.8, "#ffffff");
      break;
    }
    case 8: {
      const hp: V3 = [2.5, 0, 2.0];
      OUT.hen = { x: hp[0], y: 0, z: hp[2], yaw: 0.5, squat: t > W.laying - 0.1 && t < 29.9 ? 1 : 0, flap: t > W.laying && t < 29.8 ? 0.6 : 0, happy: t > 29.8 };
      const eggs = [28.95, 29.45, 29.85].filter((e) => t > e).length;
      for (let i = 0; i < eggs; i++) fx("eggL", 256, 256, X.eggLetter, [hp[0] - 0.35 + i * 0.32, 0.17, hp[2] + 0.45], 0.32, 0.32);
      if (t > 28.95) word("PLOP!", "#e2453c", [hp[0] - 0.4, 1.3, hp[2] + 0.4], 0.75, 28.95, 0.6, "#ffffff");
      put(350, FOLK[1], [3.4, 0, 1.0], 1, t > 29.9 ? "shock" : "neutral", { yaw: yawTo([3.4, 0, 1.0], [3.65, 0, 4.0]), prop: "carry" });
      if (t > 29.9) fx("eggL", 256, 256, X.eggLetter, [3.42, 1.12, 1.4], 0.3, 0.3);
      break;
    }
    case 9: {
      COWS.forEach((_, i) => { const p = overBakery(i); mooAt(i, [p[0], p[1] - 1.5, p[2]], 30.6 + i * 0.6, 1.4); });
      put(360, KIDS[0], [-3.4, 0, 8.4], 0.7, "laugh", { prop: "carry" }); put(361, KIDS[1], [-4.8, 0, 8.6], 0.7, "grin", { prop: "carry" });
      put(362, FOLK[2], [-2.4, 0, 3.9], 1, "dazed", {});
      if (t > 32.6) noodleRain([-4, 0, 5], 26, 7, 6);
      break;
    }
    case 10: {
      bubble("order", "ORDER! ORDER!", 40, [NOSE_TOP[0] - 0.05, NOSE_TOP[1] + 0.62, NOSE_TOP[2] + 0.2], 0.55, 36.85, {});
      if (t > 37.3) {
        AUD.forEach(([x, z, o, sc], i) => { if (o === MOM || o === GRANDMA) return; const p: V3 = [4 + (i % 4) * 1.2, 0, -1 + Math.floor(i / 4) * 1.6]; put(300 + i, o, p, sc, ["laugh", "smile", "grin", "neutral"], { yaw: yawTo(p, [2, 0, 0]) + (i % 2 ? 2.4 : -2.4), prop: i % 3 === 0 ? "carry" : undefined }); });
        word("...?", "#3f6fb5", [NOSE_TOP[0], NOSE_TOP[1] + 1.4, NOSE_TOP[2] + 0.5], 1.4, 37.9, 1.0, "#ffffff");
      }
      break;
    }
    case 11: {
      put(64, GRANDPA, GP2, 1.05, t < W.idea ? "neutral" : "grin", { prop: t > 40.5 ? "point" : undefined, yaw: t > 40.5 ? yawTo(GP2, TOWER) : undefined, headTilt: t > 40.5 ? -12 : 0 });
      if (t > W.idea - 0.1) { const s = smooth((t - W.idea + 0.1) / 0.2); fx("bulb", 256, 256, X.bulb, [GP2[0], 2.6 + 0.05 * Math.sin(t * 6), GP2[2] + 0.1], 0.7 * s + 0.01, 0.7 * s + 0.01); }
      hero("nervous", { look: 1 }, [GP2[0] + 0.9, 0, GP2[2] + 0.3]); pip("nervous", { look: -1 }, [GP2[0] + 1.55, 0, GP2[2] + 0.2]);
      break;
    }
    case 12: {
      const who: [number, Outfit, number][] = [[0.15, FOLK[0], 1], [0.45, KIDS[0], 0.7], [0.75, FOLK[1], 1], [1.05, FOLK[4], 1], [1.35, FOLK[3], 1], [1.65, KIDS[1], 0.7], [1.95, FOLK[2], 1], [2.25, FOLK[5], 1]];
      const adv = (t - 42.8) * 0.13;
      who.forEach(([u, o, sc], i) => { const s = stairAt(u + adv); put(370 + i, o, s.p, sc, ["stern", "nervous", "neutral"], { mode: "walk", phase: t * 1.3 + i * 0.3, yaw: s.yaw }); });
      const g = stairAt(2.75 + adv); put(64, GRANDPA, g.p, 1.05, "stern", { mode: "walk", phase: t * 1.3, yaw: g.yaw });
      const a = stairAt(2.5 + adv), b = stairAt(2.6 + adv);
      hero("stern", { mode: "walk", phase: t * 1.6, yaw: a.yaw }, a.p); pip("stern", { mode: "walk", phase: t * 1.6 + 0.4, yaw: b.yaw }, b.p);
      COWS.forEach((_, i) => { if (t > W.cows2 - 0.1) mooAt(i, [5.2 + i * 1.8, 9 + i * 2.2 + (t - 42.8) * 0.8 - 1.4, -12.5 - i * 1.4], W.cows2 + i * 0.25, 1.0); });
      break;
    }
    case 13: {
      if (t > 49.0) { const s = Q(t, 8); fx(`tw${s}`, 256, 256, X.sparkle, [0, TOP_Y + 0.98, -16.4], 0.3 + 0.1 * Math.sin(t * 12), 0.3, { soft: true, rot: s * 2 }); }
      break;
    }
    case 14: {
      const s = Q(t, 8); fx(`tw${s}`, 256, 256, X.sparkle, [0.12, TOP_Y + 1.0, -16.3], 0.18 + 0.06 * Math.sin(t * 12), 0.18, { soft: true, rot: s * 2 });
      break;
    }
    case 15: {
      if (t > 55.1) { /* the other Pip reaches */ }
      break;
    }
    case 16: break;
    case 17: {
      if (t < 60.5) { word("CLICK!", "#3f8fe0", [BTN_TOP[0] + 0.32, BTN_TOP[1] + 0.32, BTN_TOP[2] + 0.12], 0.65, W.click, 0.6, "#ffffff"); rays(BTN_TOP, 1.2, W.click, 0.4); }
      if (t > 60.5 && t < 61.5) COWS.forEach((c, i) => { if (Math.abs(t - W.landed - 0.1) < 0.35) { const k = Q(clamp01((t - W.landed + 0.25) / 0.7), 12); fx(`dust${k}`, 512, 300, (p) => X.dust(p, k), [c[0], 0.4, c[2] + 0.5], 2.4, 1.4, { soft: true }); } });
      if (t > 61.5 && t < 62.7) { pop([MAYOR1[0], STAGE_Y + 1.1, MAYOR1[2]], W.grew - 0.1, 2.4); audience(HAPPYS, { prop: "clap" }); }
      break;
    }
    case 18: {
      if (t < 66.5) {
        hero("laugh", { prop: "hug", yaw: yawTo(HEROT, PIPT) }, HEROT); pip("laugh", { prop: "hug", yaw: yawTo(PIPT, HEROT) }, PIPT);
        const k = Q(t, 10); fx(`hearts${k}`, 256, 256, (p) => X.hearts(p, k), [1.0, TOP_Y + 1.6, -16.1], 0.9, 0.9, { soft: true });
      } else {
        const my = yawTo(MOMS, [-4.4, 0, 14.45]);
        put(60, MOM, MOMS, 1, t < W.woke + 0.2 ? "dazed" : "smile", t < W.woke ? { mode: "dive", pitch: -86, y: 0.2, yaw: my } : { mode: "sit", yaw: my, y: 0.0 });
        if (t < W.woke + 0.6) { const k = Q(t, 12); fx(`dizzy${k}`, 256, 128, (p) => X.dizzy(p, k), [MOMS[0], 1.3, MOMS[2]], 0.8, 0.4); }
      }
      break;
    }
    case 19: {
      AUD.forEach(([x, z, o, sc], i) => put(300 + i, o, [x * 1.1, 0, z + 5.5], sc, HAPPYS, { prop: i % 2 ? "holdup" : "clap", look: 0 }));
      hero("laugh", { prop: "holdup" }, [-0.6, 0, 3.0]); pip("laugh", { prop: "holdup" }, [0.2, 0, 3.1]);
      put(64, GRANDPA, [1.4, 0, 2.6], 1.05, "laugh", { prop: "clap" }); put(60, MOM, [-1.8, 0, 2.8], 1, "laugh", { prop: "clap" });
      break;
    }
    case 20: {
      const k = clamp01((t - 69.95) / 2.2), hp = henWalk(t);
      OUT.hen = { x: hp[0], y: 0, z: hp[2], yaw: 0.32, walk: k < 1 ? 1 : 0.3, happy: t > 72.2, flap: t > 72.3 ? 0.5 * Math.max(0, Math.sin(t * 3)) : 0 };
      fx("env", 128, 112, X.envelope, [hp[0] - 0.42, 0.92, hp[2] + 0.25], 0.26, 0.23);
      if (t > 72.2) { const kk = Q(t, 10); fx(`hearts${kk}`, 256, 256, (p) => X.hearts(p, kk), [hp[0], 1.7, hp[2]], 0.8, 0.8, { soft: true }); }
      put(380, FOLK[0], [-0.6, 0, 3.0], 1, "laugh", { yaw: yawTo([-0.6, 0, 3.0], hp), prop: "carry" });
      put(381, KIDS[2], [2.4, 0, 3.0], 0.7, "laugh", { yaw: yawTo([2.4, 0, 3.0], hp) });
      hero("smile", {}, [-1.6, 0, 3.4]); pip("laugh", { look: 1 }, [-0.9, 0, 3.2]); put(64, GRANDPA, [3.4, 0, 2.6], 1.05, "laugh");
      break;
    }
  }
  void lin; void SC; void DOGM;
};
