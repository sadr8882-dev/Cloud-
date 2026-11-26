// The "Wanted: One Dad" cast: detailed 3D blocky rigs placed from here, plus unlit effect cards (the WANTED poster,
// candidate cards, foam, snores, beeps, the map, the letters, the photo, the star). The world turns the placements
// into rigs, the dog, the cows, the duck and the small props.
import * as THREE from "three";
import { Pen, bodyFront, Outfit, Expr, FrontOpts, SKINS } from "./toon";
import {
  FPS, V3, PART, W1, W2, HERO, COWS, DOGY, DOGY_YAW, PORCH_Y, STEP, PORCHD, DOOR, HOUSE_FRONT, OAK, HOLLOW, POND, POND_R, TREEHOUSE, BAKER,
  LAMP, KIT, STOVE, TABLE, COUCH, WINDOW, CHEST, CAP_TOP, TOP_Y, SC, dogAt, DogState, smooth, clamp01, lin, linR, stairAt, heroStairU,
  stroll, wagonAt, lapAt, robotRun,
} from "./story";
import * as X from "./fx";
import { NOINK } from "./ink";
import type { RigOpts } from "./blocky";
import type { CowPose, DuckPose, PropPlace } from "./critters";
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
export type Stage = { places: Place[]; fx: FxPlace[]; dog?: DogState; cows: (CowPose | null)[]; duck?: DuckPose; props: PropPlace[]; ropes: [V3, V3][] };

// ---------------- outfits (detailed rigs) ----------------
const SK = ["#f6c99f", "#efb98c", "#d9a074", "#a8704a"]; void SKINS;
const HERO_O: Outfit = { jacket: "#ffb02e", stripes: "stripe", pants: "#3b5b9a", boots: "#e2453c", hat: "hair", hairStyle: "mop", hair: "#6a3c1e", build: "kid", skin: SK[0], freckles: true, blush: true, backpack: "#3fa8ff", collar: "#f4f1ea" };
const HERO_CAP: Outfit = { ...HERO_O, hat: "cap", cap: "#c92a2a", backpack: undefined };
const MOM: Outfit = { jacket: "#e07a9a", pants: "#3b3f52", boots: "#f4f1ea", hat: "hair", hairStyle: "bun", hair: "#5a3b2a", dress: "#e07a9a", skin: SK[0], lashes: true, blush: true };
const MOM_K: Outfit = { ...MOM, apron: "#fbf6ea" };
const TOM_DAD: Outfit = { jacket: "#c23a3a", stripes: "plaid", pants: "#3d5a8a", boots: "#4a3426", hat: "capback", cap: "#2f8a4f", beard: "#6a3c1e", build: "stout", skin: SK[2], buttons: "#f4f1ea", waist: "#3a2a1e", watch: "#3b3f52" };
const TOM: Outfit = { jacket: "#3f8fe0", stripes: "plain", pants: "#3b3f52", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", build: "kid", skin: SK[2], blush: true };
const LILY_DAD: Outfit = { jacket: "#f4f1ea", stripes: "plain", pants: "#4a4f5a", boots: "#2a2420", hat: "hair", hairStyle: "side", hair: "#2a201a", glasses: "#241726", tie: "#3f6fb5", waist: "#2a2420", buttons: "#c9c9c9", pocket: true, skin: SK[1] };
const LILY: Outfit = { jacket: "#ffd23a", pants: "#3b3f52", boots: "#e2453c", hat: "hair", hairStyle: "pigtails", hair: "#c98b3a", dress: "#ffd23a", build: "kid", skin: SK[1], lashes: true, blush: true, freckles: true };
const MAX_DAD: Outfit = { jacket: "#7a8494", stripes: "plain", pants: "#2e3a52", boots: "#f4f1ea", hat: "hair", hairStyle: "curly", hair: "#1e1a1a", skin: SK[3], watch: "#e9c24a", pocket: true, moustache: "#1e1a1a" };
const MAX: Outfit = { jacket: "#4cb050", stripes: "stripe", pants: "#3b5b9a", boots: "#2e2a36", hat: "hair", hairStyle: "curly", hair: "#1e1a1a", build: "kid", skin: SK[3], blush: true };
const DAD4: Outfit = { jacket: "#8a5ac9", stripes: "stripe", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hairStyle: "bald", hair: "#5a3b2a", skin: SK[1], glasses: "#8a5a34", moustache: "#5a3b2a", build: "stout", waist: "#3a2a1e" };
const KID4: Outfit = { jacket: "#e2453c", stripes: "dots", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hairStyle: "side", hair: "#c98b3a", build: "kid", skin: SK[1], freckles: true };
const FIRE: Outfit = { jacket: "#c9a24a", stripes: "fire", pants: "#c9a24a", boots: "#1e1c24", hat: "fire", moustache: "#5a3b2a", skin: SK[1], buttons: "#2e2a36", build: "stout", waist: "#2e2a36" };
const CLOWN: Outfit = { jacket: "#7b5ac9", stripes: "dots", pants: "#ffb02e", boots: "#ff3a3a", hat: "clown", clownNose: true, bigShoes: true, skin: "#fbf3ea", blush: true, buttons: "#ffe14a", collar: "#ffffff" };
const ROBOT: Outfit = { jacket: "#a8b4c4", pants: "#8a96a4", boots: "#5a6470", robot: true, hat: null };
const MAIL: Outfit = { jacket: "#3f6fb5", stripes: "plain", pants: "#24365e", boots: "#2a2420", hat: "cap", cap: "#24365e", skin: SK[2], buttons: "#e9c24a", pocket: true, waist: "#2a2420" };
const BAKER_O: Outfit = { jacket: "#fbfbf8", stripes: "plain", pants: "#3b3f52", boots: "#2a2420", hat: "chef", apron: "#fbfbf8", moustache: "#3a2a1e", build: "stout", skin: SK[0], buttons: "#c9c9c9", blush: true };
const FOLK: Outfit[] = [
  { jacket: "#3f6fb5", stripes: "plaid", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hairStyle: "side", hair: "#5a3b2a", skin: SK[0], buttons: "#f4f1ea" },
  { jacket: "#c25a7a", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hairStyle: "long", hair: "#2a201a", dress: "#d9a441", skin: SK[2], lashes: true },
  { jacket: "#5d7a3a", stripes: "plain", pants: "#4a4038", boots: "#4a3426", hat: "cap", cap: "#8c3b4a", moustache: "#3a2a1e", skin: SK[3], pocket: true },
  { jacket: "#9a5aa8", pants: "#3b3f52", boots: "#2e2a36", hat: "hair", hairStyle: "bun", hair: "#e8e4dc", dress: "#9a5aa8", skin: SK[1], glasses: "#8a5a34" },
];

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
const prop = (q: PropPlace) => OUT.props.push(q);
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
const card = (n: number, p: V3, t0: number, w = 1.5) => { if (TNOW < t0) return; const k = smooth((TNOW - t0) / 0.2); fx(`cand${n}`, 512, 180, (pp) => X.candidate(pp, n), p, w * k + 0.01, w * 0.35 * k + 0.005, { rot: -0.04 }); };
const dizzy = (p: V3, s = 0.7) => { const k = Q(TNOW, 12); fx(`dizzy${k}`, 256, 128, (pp) => X.dizzy(pp, k), p, s, s * 0.5); };
const HAPPYS: Expr[] = HAPPY;

/** the hero: the boy (with Dad's cap once he has found it, part 2) */
const heroO = () => (PART === 2 && TNOW > W2.noway - 0.3 ? HERO_CAP : HERO_O);
const hero = (ex: Mood, fo: Extra = {}, p: V3 = HERO) => put(1, heroO(), p, SC.hero, ex, fo);
const momAt = (ex: Mood, fo: Extra = {}, p: V3 = DOOR, kitchen = false) => put(60, kitchen ? MOM_K : MOM, p, 1, ex, fo);
/** dad + kid pairs strolling across the square */
const PAIRS: [Outfit, Outfit, "ride" | "hand"][] = [[TOM_DAD, TOM, "ride"], [LILY_DAD, LILY, "hand"], [MAX_DAD, MAX, "hand"], [DAD4, KID4, "ride"]];
const pairAt = (i: number, ex: Mood = HAPPYS) => {
  const s = stroll(i, TNOW), [d, k, how] = PAIRS[i], ph = TNOW * 0.9 + i * 0.3;
  put(200 + i * 2, d, s.p, 1, ex, { mode: "walk", phase: ph, yaw: s.yaw, prop: how === "ride" ? "up" : undefined, look: 0 });
  if (how === "ride") put(201 + i * 2, k, [s.p[0] - Math.sin(s.yaw) * 0.06, 1.0, s.p[2] - Math.cos(s.yaw) * 0.06], SC.kid, "laugh", { mode: "ride", yaw: s.yaw, prop: "holdup" });
  else { const sx = Math.cos(s.yaw) * 0.75, sz = -Math.sin(s.yaw) * 0.75; put(201 + i * 2, k, [s.p[0] + sx, 0, s.p[2] + sz], SC.kid, "laugh", { mode: "walk", phase: ph * 1.3, yaw: s.yaw }); }
};
const townsfolk = (ex: Mood = CALM) => {
  put(310, FOLK[0], [-6.5, 0, -2.0], 1, ex, { yaw: 0.6 }); put(311, FOLK[1], [6.0, 0, -3.5], 1, ex, { yaw: -2.2 });
  put(312, FOLK[2], [STL1[0] - 1.0, 0, STL1[2]], 1, ex, { yaw: Math.PI / 2 }); put(313, FOLK[3], [-7.2, 0, 7.4], 1, ex, { yaw: 0.3 });
};
const STL1: V3 = [-9.6, 0, 3.4];

// ---------------- per-shot staging ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [], cows: [], props: [], ropes: [] };
  OUT = out; CAM = cam; TNOW = t;
  SUN = cam.sun.clone().normalize();
  out.dog = dogAt(t, id);
  out.cows = COWS.map((c, i) => ({ x: c[0], y: 0, z: c[2], yaw: [0.6, -1.9, 2.4][i], float: 0, spin: 0, moo: false, seed: i }));
  if (PART === 1) p1(id, t); else p2(id, t);
  return out;
};

const p1 = (id: number, t: number) => {
  const W = W1;
  const postersUp = t > 25.0; // posters on the door, the oak and the cow from shot 8 on
  if (postersUp) {
    fx("posterD", 512, 700, (p) => X.poster(p, 3), [-4.4, PORCH_Y + 1.25, HOUSE_FRONT - 0.13], 0.55, 0.75, { face: true, yaw: Math.PI });
    fx("posterO", 512, 700, (p) => X.poster(p, 3), [OAK[0] - 0.62, 1.75, OAK[2] + 0.92], 0.48, 0.65, { face: true, yaw: -0.55 });
    if (t > 28.0) fx("posterC", 512, 700, (p) => X.poster(p, 3), [COWS[1][0] + 0.49, 1.1, COWS[1][2] + 0.2], 0.55, 0.75, { face: true, yaw: Math.PI / 2 - 1.9 + Math.PI });
  }
  switch (id) {
    case 1: {
      if (t < 2.4) { for (let i = 0; i < 4; i++) pairAt(i); townsfolk(CALM); }
      else hero(t < W.me ? "neutral" : "sad", { yaw: Math.PI, mode: "sit", look: 0 }, STEP);
      break;
    }
    case 2: { pairAt(0); pairAt(1); townsfolk(CALM); break; }
    case 3: {
      const w = wagonAt(t), fw: V3 = [Math.sin(w.yaw), 0, Math.cos(w.yaw)];
      prop({ kind: "wagon", p: w.p, yaw: w.yaw + Math.PI });
      put(203, LILY, [w.p[0], 0.45, w.p[2]], SC.kid, "laugh", { mode: "sit", yaw: w.yaw, prop: "holdup" });
      put(202, LILY_DAD, [w.p[0] + fw[0] * 1.85, 0, w.p[2] + fw[2] * 1.85], 1, t > W.horse ? "laugh" : "grin", { mode: "run", phase: t * 2.2, yaw: w.yaw, prop: "pull" });
      if (t > W.horse - 0.1) bubble("neigh", "NEIGHHH!", 72, [w.p[0] + fw[0] * 1.9, 2.55, w.p[2] + fw[2] * 1.9 + 0.3], 1.2, W.horse - 0.1, { jag: true });
      townsfolk(CALM);
      break;
    }
    case 4: {
      const md: V3 = [-2.6, 0, 3.4], mk: V3 = [-1.8, 0, 3.0], kite: V3 = [-2.6 + 0.6 * Math.sin(t * 1.1), 7.4 + 0.4 * Math.sin(t * 1.7), -0.2];
      put(204, MAX_DAD, md, 1, "laugh", { prop: "point", yaw: yawTo(md, kite) });
      put(205, MAX, mk, SC.kid, t > W.shark ? "laugh" : "grin", { prop: "up", yaw: yawTo(mk, kite), headTilt: -20 });
      fx("kite", 512, 560, X.sharkKite, kite, 1.4, 1.53, { rot: 0.15 * Math.sin(t * 1.3) });
      OUT.ropes.push([[mk[0], 1.25, mk[2]], [kite[0], kite[1] - 0.75, kite[2]]]);
      townsfolk(CALM);
      break;
    }
    case 5: {
      hero(t < W.idea - 0.2 ? (t < 16.4 ? "neutral" : "smile") : "grin", { yaw: Math.PI, mode: "sit", look: t > 16.0 && t < 17.0 ? 1 : 0 }, STEP);
      prop({ kind: "bowl", p: [STEP[0] + 0.55, PORCH_Y, STEP[2] - 0.05] });
      momAt(t > W.mom - 0.2 ? "smile" : "smile_closed", { wave: t > W.mom - 0.2 ? Q(Math.sin(t * 6), 10) : undefined, yaw: Math.PI }, [-3.6, PORCH_Y, 17.55]);
      if (t > W.idea - 0.2) { const s = smooth((t - W.idea + 0.2) / 0.2); fx("bulb", 256, 256, X.bulb, [STEP[0], PORCH_Y + 1.8 + 0.04 * Math.sin(t * 6), STEP[2] + 0.1], 0.55 * s + 0.01, 0.55 * s + 0.01); }
      break;
    }
    case 6: {
      hero("grin", { prop: "wipe", yaw: 0 }, [TABLE[0] + 0.1, 0, TABLE[2] - 0.95]);
      fx(`poster${t > 19.6 ? 3 : 0}`, 512, 700, (p) => X.poster(p, t > 19.6 ? 3 : 0), [TABLE[0], 0.83, TABLE[2] + 0.1], 0.5, 0.68, { flat: true });
      prop({ kind: "bowl", p: [TABLE[0] - 0.5, 0.82, TABLE[2] - 0.3] });
      momAt("smile", { yaw: yawTo([KIT[0] - 2.0, 0, KIT[2] - 1.2], TABLE) }, [KIT[0] - 2.0, 0, KIT[2] - 1.2], true);
      break;
    }
    case 7: {
      const n = t > W.dinos - 0.1 ? 3 : t > W.snore - 0.1 ? 2 : t > W.pancakes - 0.1 ? 1 : 0;
      fx(`poster${n}`, 512, 700, (p) => X.poster(p, n), [TABLE[0], 0.83, TABLE[2] + 0.1], 0.5, 0.68, { flat: true });
      break;
    }
    case 8: {
      // me with the tape, hopping from the door to the oak to the cow
      if (t < 26.85) hero("grin", { prop: "carry", yaw: Math.PI }, [-4.0, PORCH_Y, 17.1]);
      else if (t < 27.55) hero("grin", { prop: "carry", yaw: -0.8 }, [OAK[0] + 1.4, 0, OAK[2] + 1.2]);
      else { hero(t > W.cow ? "laugh" : "grin", { prop: "carry", yaw: yawTo([COWS[1][0] + 1.4, 0, COWS[1][2] + 0.4], COWS[1]) }, [COWS[1][0] + 1.4, 0, COWS[1][2] + 0.8]); if (t > W.cow - 0.2) bubble("moo", "MOO?!", 80, [COWS[1][0] - 0.2, 2.4, COWS[1][2] + 0.4], 1.0, W.cow - 0.2, { jag: true }); }
      if (t > 27.55) OUT.cows[1] = { x: COWS[1][0], y: 0, z: COWS[1][2], yaw: -1.9, float: 0, spin: 0, moo: t > W.cow - 0.2, seed: 1 };
      break;
    }
    case 9: case 11: case 13: {
      const n = id === 9 ? 1 : id === 11 ? 2 : 3, who = id === 9 ? FIRE : id === 11 ? CLOWN : ROBOT, t0 = id === 9 ? 29.4 : id === 11 ? 36.7 : 43.1;
      const k = clamp01((t - t0) / 0.9), p = mixV([PORCHD[0] + 2.6, 0, PORCHD[2] - 2.6], PORCHD, k);
      put(70 + n, who, p, id === 11 ? 1.02 : 1, k < 1 ? "grin" : id === 13 ? "smile" : "laugh", { mode: k < 1 ? "walk" : "stand", phase: t * 1.1, yaw: k < 1 ? yawTo(p, PORCHD) : undefined, wave: k >= 1 && id !== 13 ? Q(Math.sin(t * 6), 10) : undefined, prop: k >= 1 && id === 13 ? "up" : undefined });
      card(n, [PORCHD[0] + 0.1, 2.75, PORCHD[2] + 0.2], t0 + 0.2);
      hero("smile", { yaw: Math.PI, mode: "sit", look: 0 }, STEP);
      if (id === 11 && t > 38.1) word("HONK!", "#e2453c", [PORCHD[0] + 0.7, 1.4, PORCHD[2] + 0.3], 0.7, 38.15, 0.6);
      if (id === 13 && t > 44.6) word("BEEP BOOP", "#3fa8ff", [PORCHD[0] + 0.75, 1.9, PORCHD[2] + 0.3], 0.8, 44.6, 1.0, "#ffffff");
      break;
    }
    case 10: {
      const ff: V3 = [STOVE[0] + 1.1, 0, STOVE[2] + 1.0];
      put(71, FIRE, ff, 1, t < W.burned + 0.3 ? "grin" : t < W.putout ? "shock" : "stern", { yaw: yawTo(ff, STOVE), prop: t > W.putout - 0.2 ? "point" : "flip" });
      prop({ kind: "pan", p: [STOVE[0] - 0.2, 0.97, STOVE[2] - 0.15], burnt: t > W.burned });
      if (t > W.burned && t < W.putout) { const k = Q(t, 12); fx(`flames${k}`, 256, 256, (p) => X.flames(p, k, 1.1), [STOVE[0] - 0.2, 1.3, STOVE[2] - 0.05], 0.6, 0.6, { soft: true }); fx(`smoke${Q(t, 8)}`, 128, 256, (p) => X.smoke(p, Q(t, 8)), [STOVE[0] - 0.1, 1.9, STOVE[2]], 0.5, 1.0, { soft: true }); }
      if (t > W.putout - 0.2) { prop({ kind: "nozzle", p: [ff[0] - 0.5, 1.15, ff[2] - 0.35], yaw: yawTo(ff, STOVE) }); const k = Q(t, 12); fx(`spray${k}`, 512, 256, (p) => X.spray(p, k), [ff[0] - 1.0, 1.15, ff[2] - 0.7], 1.6, 0.8, { rot: -0.4 }); }
      if (t > 34.9) { const n = Math.min(9, Math.floor((t - 34.9) * 8) + 1); for (let i = 0; i < n; i++) { const p: V3 = [KIT[0] - 3.2 + (i % 5) * 1.6, 0.5 + Math.floor(i / 5) * 0.9, KIT[2] - 1.8 + (i % 3) * 1.1]; fx(`foam${i % 3}`, 512, 400, (pp) => X.foam(pp, i), p, 2.2, 1.7); } }
      hero(t < 35.0 ? "shock" : "dazed", { yaw: yawTo([KIT[0] + 1.2, 0, KIT[2] + 1.2], STOVE) }, [KIT[0] + 1.2, 0, KIT[2] + 1.2]);
      momAt(t < 35.0 ? "shock" : "dazed", { yaw: yawTo([KIT[0] + 0.3, 0, KIT[2] - 1.6], STOVE) }, [KIT[0] + 0.3, 0, KIT[2] - 1.6], true);
      if (t > 34.9) word("SPLOOSH!", "#3fa8ff", [KIT[0] - 0.5, 2.6, KIT[2] + 0.5], 2.0, 34.95, 1.0, "#ffffff");
      break;
    }
    case 12: {
      if (t < 41.6) {
        put(72, CLOWN, [COUCH[0] - 0.05, -0.16, COUCH[2]], 1.0, "neutral", { mode: "sit", yaw: -Math.PI / 2, blink: 1, headTilt: -32 });
        const z = Q(t, 6); fx("zzz", 256, 256, X.zzz, [COUCH[0] - 0.6, 1.9 + 0.1 * Math.sin(t * 2), COUCH[2] + 0.4], 0.8, 0.8, { soft: true });
        if (t > W.snored - 0.1) word("SNOOORE!", "#7b5ac9", [COUCH[0] - 1.3, 2.2, COUCH[2] + 0.8], 1.6 + 0.2 * Math.sin(t * 10), W.snored - 0.1, 1.5, "#ffffff"); void z;
        hero("shock", { prop: "up", yaw: yawTo([KIT[0] + 1.5, 0, KIT[2] - 2.2], COUCH) }, [KIT[0] + 1.5, 0, KIT[2] - 2.2]);
        prop({ kind: "bowl", p: [KIT[0] - 3.2, 0.96, KIT[2] - 2.6] });
      } else {
        for (let i = 0; i < 14; i++) { const u = (t - 41.6) * (0.5 + hh(i, 1) * 0.3); fx(`bird${Q(t + i, 10)}`, 128, 128, (p) => X.bird(p, Q(t + i, 10)), [-6 + hh(i, 2) * 12 + u * 6, 6 + hh(i, 3) * 4 + u * 5, -4 - hh(i, 4) * 8], 0.6, 0.6); }
        word("SNOOORE!", "#7b5ac9", [-1.5, 6.5, 2], 3.0, 41.6, 1.6, "#ffffff");
        townsfolk("shock");
      }
      break;
    }
    case 14: {
      const rp = t < 47.6 ? PORCHD : robotRun(t), hit = t > W.post - 0.05;
      if (t < 47.6) put(73, ROBOT, PORCHD, 1, t < W.screamed - 0.2 ? "neutral" : "shock", { yaw: 0, prop: t > W.screamed - 0.2 ? "up" : undefined });
      else put(73, ROBOT, hit ? [LAMP[0] + 0.5, 0, LAMP[2] + 0.45] : rp, 1, hit ? "dazed" : "shock", hit ? { yaw: 2.0, roll: 0.25 } : { mode: "run", phase: t * 3, yaw: yawTo(PORCHD, [LAMP[0], 0, LAMP[2]]), prop: "up" });
      hero(t < W.screamed ? "grin" : "shock", { mode: "stand", prop: "point", yaw: yawTo([-4.4, PORCH_Y, 16.9], PORCHD) }, [-4.4, PORCH_Y, 16.9]);
      const hp: V3 = [-4.4, PORCH_Y, 16.9];
      if (t < 47.6) prop({ kind: "dino", p: [hp[0] + 0.05, hp[1] + 1.0, hp[2] - 0.55], yaw: Math.PI, s: 1.3 });
      if (t > W.screamed - 0.2 && t < 49.3) bubble("beep", "BEEP!! BEEP!!", 56, [rp[0] + 0.5, 2.5, rp[2] + 0.3], 1.3, W.screamed - 0.2, { jag: true, fill: "#d8f0ff" });
      if (hit) { word("BONK!", "#e2453c", [LAMP[0] + 0.3, 2.3, LAMP[2] + 0.6], 1.0, W.post, 0.9); dizzy([LAMP[0] + 0.5, 2.15, LAMP[2] + 0.45]); }
      break;
    }
    case 15: {
      hero("shock", { mode: "stand", headTilt: -28, look: 0, yaw: yawTo(STEP, DOGY) }, [STEP[0] + 0.2, PORCH_Y, STEP[2] - 0.4]);
      card(4, [DOGY[0] - 1.0, 9.2, DOGY[2] + 1.0], 50.4, 3.6);
      break;
    }
    case 16: {
      const dm: V3 = [DOGY[0] + Math.sin(DOGY_YAW) * 4.1, 5.0, DOGY[2] + Math.cos(DOGY_YAW) * 4.1];
      if (t < W.ate) { const k = smooth((t - 52.6) / 0.3); fx("posterFly", 512, 700, (p) => X.poster(p, 3), mixV([PORCHD[0] + 0.6, 1.6, PORCHD[2]], dm, k), 0.5, 0.68, { rot: k * 3 }); }
      else if (t < W.ate + 0.4) fx("posterFly", 512, 700, (p) => X.poster(p, 3), dm, 0.6, 0.82, { rot: 0.3 });
      if (t > 53.85 && t < W.ate2) { const k = smooth((t - 53.85) / 0.35); fx("posterFly2", 512, 700, (p) => X.poster(p, 3), mixV([PORCHD[0] + 0.6, 1.6, PORCHD[2]], dm, k), 0.5, 0.68, { rot: -k * 3 }); }
      if (t > W.ate) word("CHOMP!", "#6a3a22", [dm[0] - 0.5, dm[1] + 1.4, dm[2] + 0.6], 2.2, W.ate, 0.6);
      if (t > W.ate2) word("CHOMP!", "#6a3a22", [dm[0] + 0.5, dm[1] + 1.4, dm[2] + 0.6], 2.2, W.ate2, 0.6);
      if (t > 54.9) word("BURP", "#7ab84a", [dm[0], dm[1] + 1.8, dm[2] + 0.4], 1.8, 54.9, 0.5, "#d8f5c0");
      break;
    }
    case 17: {
      hero(t < 57.0 ? "sad" : "teary", { yaw: Math.PI, mode: "sit", look: 0, headTilt: 10 }, STEP);
      prop({ kind: "bowl", p: [STEP[0] + 0.55, PORCH_Y, STEP[2] - 0.05] });
      break;
    }
    case 18: {
      const k = clamp01((t - 59.55) / 1.0), p = mixV([PORCHD[0] - 2.8, 0, PORCHD[2] - 2.4], [PORCHD[0] + 0.1, 0, PORCHD[2] - 0.1], k);
      put(74, MAIL, p, 1, "smile", { mode: k < 1 ? "walk" : "stand", phase: t, yaw: k < 1 ? yawTo(p, PORCHD) : 0, prop: k >= 1 ? "point" : "carry" });
      hero(t < 60.6 ? "sad" : "shock", t < 60.6 ? { yaw: Math.PI, mode: "sit", look: 0 } : { yaw: Math.PI }, t < 60.6 ? STEP : [STEP[0], PORCH_Y, STEP[2] - 0.1]);
      const ep: V3 = k < 1 ? [p[0] + 0.3, 1.05, p[2] + 0.25] : [PORCHD[0] + 0.15, 1.12, PORCHD[2] + 0.3];
      fx("env", 128, 112, X.envelope, ep, 0.3, 0.26); if (t > 60.9) fx("envGlow", 256, 256, (pp) => X.glow(pp, 0), ep, 0.7, 0.7, { soft: true });
      break;
    }
    case 19: fx("note", 512, 340, X.note, [-4.4, PORCH_Y + 1.0, 16.6], 0.62, 0.41); break;
    case 20: {
      const p: V3 = [linR([[66.3, -3.8], [68.0, 2.2]], t), 0, linR([[66.3, 15.4], [68.0, 17.6]], t)];
      hero(t < 68.0 ? "stern" : "shock", t < 68.0 ? { mode: "run", phase: t * 3, yaw: yawTo([-3.8, 0, 15.4], [2.2, 0, 17.6]) } : { yaw: yawTo(p, HOLLOW) }, p);
      const g = Q(t, 8); fx(`glow${g}`, 256, 256, (pp) => X.glow(pp, g), HOLLOW, 0.75 + 0.1 * Math.sin(t * 5), 0.75 + 0.1 * Math.sin(t * 5), { soft: true });
      break;
    }
  }
  if (id >= 9 && id <= 18 && id !== 10 && id !== 12) townsfolk(CALM);
};

const p2 = (id: number, t: number) => {
  const W = W2;
  const HP: V3 = [2.4, 0, 17.4];
  switch (id) {
    case 1: {
      const g = Q(t, 8); fx(`glow${g}`, 256, 256, (pp) => X.glow(pp, g), HOLLOW, 0.75 + 0.1 * Math.sin(t * 5), 0.75 + 0.1 * Math.sin(t * 5), { soft: true });
      hero(t < 2.3 ? "shock" : "grin", { yaw: yawTo(HP, HOLLOW), prop: t > 2.4 ? "carry" : undefined }, HP);
      if (t > 2.6) fx("mapS", 512, 512, X.map, [HP[0] + 0.25, 1.0, HP[2] + 0.35], 0.42, 0.42);
      break;
    }
    case 2: fx("map", 512, 512, X.map, [OAK[0] - 0.5, 1.35, OAK[2] + 1.8], 0.62, 0.62); break;
    case 3: {
      prop({ kind: "cap", p: CAP_TOP, yaw: 0.4 });
      if (t > 8.6) { const s = Q(t, 8); fx(`tw${s}`, 256, 256, X.sparkle, [CAP_TOP[0] + 0.2, CAP_TOP[1] + 0.22, CAP_TOP[2] + 0.1], 0.14 + 0.05 * Math.sin(t * 12), 0.14 + 0.05 * Math.sin(t * 12), { soft: true, rot: s * 2 }); }
      break;
    }
    case 4: {
      if (t < 12.9) { const s = stairAt(heroStairU(t)); hero("stern", { mode: "run", phase: t * 3.4, yaw: s.yaw }, s.p); }
      else {
        const hp: V3 = [0.9, TOP_Y, -15.6], wind = t > W.wind && t < W.noway;
        hero(t < W.noway ? "stern" : "shout", { yaw: yawTo(hp, CAP_TOP) + (t > W.noway ? 0.6 : 0), prop: t > W.noway - 0.2 ? "holdup" : "point", lean: wind ? 10 : 0 }, hp);
        const capP: V3 = t < W.wind ? CAP_TOP : t < W.noway - 0.2 ? [CAP_TOP[0] - 0.8 * smooth((t - W.wind) / 1.2), CAP_TOP[1] + 0.9 * Math.sin(Math.min(1, (t - W.wind) / 1.2) * Math.PI) + 0.3, CAP_TOP[2] + 0.3] : [hp[0], TOP_Y + 1.95, hp[2]];
        if (t < W.noway - 0.3 || PART !== 2) prop({ kind: "cap", p: capP, yaw: t * (wind ? 6 : 0) });
        if (wind) { const k = Q(t, 12); fx(`wind${k}`, 256, 200, (p) => X.wind(p, k), [CAP_TOP[0] + 0.8, CAP_TOP[1] + 0.5, CAP_TOP[2] + 0.4], 1.6, 1.2); }
        if (t > W.noway - 0.1) bubble("noway", "NO WAY!", 90, [hp[0] - 0.45, TOP_Y + 2.15, hp[2] + 0.3], 1.0, W.noway - 0.1, { jag: true });
      }
      break;
    }
    case 5: case 6: case 7: {
      const angry = id === 6;
      if (id === 7 && t < 23.3) {
        const d = lapAt(t, 0.6), h = lapAt(t, 0);
        OUT.duck = { x: d.p[0], y: 0, z: d.p[2], yaw: d.yaw, walk: 1, flap: 0.6, rod: true, angry: true };
        hero("stern", { mode: "run", phase: t * 3.4, yaw: h.yaw }, h.p);
        const n = Math.min(3, Math.floor((t - 20.45) * 2.6 / (Math.PI * 2)) + 1); fx(`lap${n}`, 256, 256, (p) => X.counter(p, n), [POND[0], 2.2, POND[2]], 1.0, 1.0);
        if (t > W.won - 0.1) word("DUCK WINS!", "#e2453c", [POND[0], 3.0, POND[2] + 1], 3.0, W.won - 0.1, 0.9);
      } else {
        const dp: V3 = [POND[0] - POND_R - 0.3, 0, POND[2] + 0.6], hp: V3 = [dp[0] - 1.3, 0, dp[2] + 0.5];
        const given = id === 7 && t > W.gave;
        OUT.duck = { x: dp[0], y: 0, z: dp[2], yaw: yawTo(dp, hp), rod: !given, angry: !given, quack: angry ? Math.max(0, Math.sin(t * 9)) : 0, flap: angry && t > 19.3 ? 0.8 : 0 };
        hero(given ? "laugh" : id === 7 ? "dazed" : id === 6 ? "stern" : "grin", { yaw: yawTo(hp, dp), prop: given ? "holdup" : id === 6 ? "point" : undefined }, hp);
        if (given) prop({ kind: "rod", p: [hp[0] + 0.3, 1.0, hp[2] + 0.1], tilt: 0.3, yaw: 1.2 });
        if (id === 6 && t > 18.8) bubble("quack", "QUACK!!", 72, [dp[0] + 0.1, 1.15, dp[2] + 0.2], 0.75, 18.8, { jag: true });
        if (id === 7 && t > 23.3 && t < W.gave) dizzy([hp[0], 1.55, hp[2]], 0.6);
        if (given) { const k = Q(t, 10); fx(`hearts${k}`, 256, 256, (p) => X.hearts(p, k), [dp[0], 0.9, dp[2]], 0.5, 0.5, { soft: true }); }
      }
      break;
    }
    case 8: {
      put(80, BAKER_O, BAKER, 1, "smile", { yaw: Math.PI / 2 - 0.3, prop: "carry" });
      if (t < 27.0) prop({ kind: "book", p: [BAKER[0] + 0.52, 1.18, BAKER[2] - 0.1], yaw: Math.PI / 2, tilt: -0.3 });
      const hp: V3 = [BAKER[0] + 1.1, 0, BAKER[2] - 0.9];
      hero(t > 27.0 ? "grin" : "smile", { yaw: yawTo(hp, BAKER), prop: t > 27.0 ? "carry" : undefined }, hp);
      if (t > 27.0) prop({ kind: "book", p: [hp[0] - 0.42, 0.98, hp[2] - 0.05], yaw: -Math.PI / 2, tilt: -0.3 });
      for (let i = 0; i < 8; i++) { const u = (t * 0.4 + hh(i, 1)) % 1; fx("flour", 64, 64, (p) => X.crumbs(p, 5), [BAKER[0] + 0.5 + hh(i, 2) * 1.0, 1.6 - u * 1.2, BAKER[2] - 0.5 + hh(i, 3)], 0.05, 0.05); }
      break;
    }
    case 9: fx("recipe", 512, 368, X.recipe, [BAKER[0] + 0.85, 1.35, BAKER[2] + 0.1], 0.6, 0.43, { face: true, yaw: Math.PI / 2 }); break;
    case 10: {
      const hp: V3 = [9.6, 0, 16.8];
      hero(t < 34.4 ? "think" : "shock", { yaw: yawTo(hp, TREEHOUSE), headTilt: t > 34.4 ? -25 : -5, prop: t < 34.4 ? "carry" : undefined }, hp);
      if (t < 34.4) fx("mapS", 512, 512, X.map, [hp[0] + 0.25, 1.0, hp[2] + 0.35], 0.42, 0.42);
      break;
    }
    case 11: case 13: case 15: {
      prop({ kind: "chest", p: CHEST, open: id === 11 ? smooth((t - (W.box - 0.4)) / 0.5) : 1 });
      const hp: V3 = [CHEST[0], 0.05, CHEST[2] - 0.85];
      hero(id === 11 ? (t > W.photo ? "shock" : "think") : id === 13 ? "sad" : "teary", { mode: "sit", yaw: 0, look: 0, headTilt: 14 }, hp);
      if (id === 11 && t > W.photo - 0.2) { const g = Q(t, 8); fx(`glowP${g}`, 256, 256, (pp) => X.glow(pp, g), [CHEST[0], 0.55, CHEST[2]], 0.9, 0.9, { soft: true }); }
      if (id === 13) fx("letterIn", 512, 700, (p) => X.dadLetter(p, 0), [CHEST[0], 0.38, CHEST[2]], 0.3, 0.42, { flat: true, rot: 0.2 });
      if (id === 15) {
        prop({ kind: "cap", p: [CHEST[0] - 0.55, 0.1, CHEST[2] + 0.55], yaw: 0.5 }); prop({ kind: "rod", p: [CHEST[0] + 0.1, 0.12, CHEST[2] + 0.7], tilt: Math.PI / 2, yaw: 1.2 }); prop({ kind: "book", p: [CHEST[0] + 0.6, 0.12, CHEST[2] + 0.5], yaw: 0.3 });
        const g = Q(t, 8); fx(`glowI${g}`, 256, 256, (pp) => X.glow(pp, g), [CHEST[0], 0.35, CHEST[2] + 0.6], 0.9, 0.9, { soft: true });
      }
      break;
    }
    case 12: {
      if (t < 42.3) fx("photo", 384, 480, X.photo, [CHEST[0], 1.25, CHEST[2] + 0.6], 0.42, 0.52);
      else {
        prop({ kind: "chest", p: CHEST, open: 1 });
        hero("teary", { mode: "sit", yaw: 0, prop: "carry", look: 0 }, [CHEST[0], 0.05, CHEST[2] - 0.85]);
        fx("photo", 384, 480, X.photo, [CHEST[0], 0.82, CHEST[2] - 0.42], 0.22, 0.27, { face: true, yaw: 0, rot: 0.1 });
      }
      break;
    }
    case 14: { const n = t < 47.5 ? 2 : t < 49.0 ? 3 : 3; fx(`dl${n}`, 512, 700, (p) => X.dadLetter(p, n), [CHEST[0], 1.25, CHEST[2] + 0.6], 0.42, 0.58); break; }
    case 16: {
      const n = t < W.every ? 7 : t < W.love - 0.1 ? 10 : 12;
      if (t < 55.6) { fx(`dl${n}`, 512, 700, (p) => X.dadLetter(p, n), [CHEST[0], 0.85, CHEST[2] - 0.42], 0.26, 0.36, { face: true, yaw: 0, rot: -0.08 }); }
      prop({ kind: "chest", p: CHEST, open: 1 }); prop({ kind: "cap", p: [CHEST[0] - 0.6, 0.1, CHEST[2] + 0.45], yaw: 0.5 });
      hero(t < W.love ? "teary" : "cry", { mode: "sit", yaw: 0, prop: t > 55.6 ? "hug" : "carry", look: 0, headTilt: 12 }, [CHEST[0], 0.05, CHEST[2] - 0.85]);
      if (t > 54.0) for (let i = 0; i < 2; i++) { const u = ((t - 54) * 0.9 + i * 0.5) % 1; fx("tear", 64, 64, X.tear, [CHEST[0] + (i ? 0.12 : -0.12), 1.2 - u * 0.45, CHEST[2] - 0.55], 0.05, 0.05); }
      break;
    }
    case 17: {
      const p: V3 = [linR([[56.85, -1.2], [59.9, -3.4]], t), 0, linR([[56.85, 9.6], [59.9, 12.6]], t)];
      hero("sad", { mode: "walk", phase: t * 0.8, yaw: yawTo([-1.2, 0, 9.6], [-3.4, 0, 12.6]), prop: "carry" }, p);
      prop({ kind: "rod", p: [p[0] + 0.35, 0.7, p[2] + 0.1], tilt: 0.9, yaw: yawTo([-1.2, 0, 9.6], [-3.4, 0, 12.6]) + 1.4 });
      momAt("smile", { yaw: yawTo(DOOR, p), wave: Q(Math.sin(t * 5), 10) }, [-3.6, PORCH_Y, 17.55]);
      break;
    }
    case 18: {
      if (t < 62.9) {
        const hp: V3 = [STOVE[0] + 0.15, 0.0, STOVE[2] + 0.75];
        hero(t < W.burned ? "stern" : "nervous", { yaw: yawTo(hp, STOVE), prop: "flip" }, hp);
        const fl = Math.max(0, Math.sin((t - 60) * 3)); prop({ kind: "pan", p: [STOVE[0] - 0.05, 0.97 + 0.0, STOVE[2] + 0.05], burnt: t > W.burned - 0.3, yaw: 0.4 });
        if (fl > 0.2) prop({ kind: "plate", p: [STOVE[0] - 0.05, 1.1 + fl * 0.45, STOVE[2] + 0.05], s: 0.6, tilt: fl * 2 });
        if (t > W.burned - 0.3) fx(`smoke${Q(t, 8)}`, 128, 256, (p) => X.smoke(p, Q(t, 8)), [STOVE[0], 1.4, STOVE[2]], 0.35, 0.7, { soft: true });
        momAt("smile", { yaw: yawTo([KIT[0] + 0.6, 0, KIT[2] - 1.0], hp) }, [KIT[0] + 0.6, 0, KIT[2] - 1.0], true);
      } else {
        momAt(t > W.perfect - 0.2 ? "laugh" : "smile", { mode: "sit", yaw: yawTo([TABLE[0] + 0.75, 0, TABLE[2] - 0.8], TABLE) }, [TABLE[0] + 0.75, 0.12, TABLE[2] - 0.8], true);
        hero(t > W.perfect ? "smile" : "nervous", { mode: "sit", yaw: yawTo([TABLE[0] - 0.56, 0, TABLE[2] - 1.0], TABLE) }, [TABLE[0] - 0.56, 0.12, TABLE[2] - 1.0]);
        prop({ kind: "stack", p: [TABLE[0] + 0.35, 0.83, TABLE[2] - 0.4] }); prop({ kind: "plate", p: [TABLE[0] - 0.3, 0.83, TABLE[2] - 0.5] });
        if (t > W.perfect - 0.2) { bubble("perfect", "PERFECT!", 70, [TABLE[0] + 1.2, 2.1, TABLE[2] - 0.6], 0.9, W.perfect - 0.2, { tail: -1 }); const k = Q(t, 10); fx(`hearts${k}`, 256, 256, (p) => X.hearts(p, k), [TABLE[0] + 0.75, 1.9, TABLE[2] - 0.8], 0.6, 0.6, { soft: true }); }
      }
      break;
    }
    case 19: {
      momAt("smile_closed", { mode: "sit", yaw: yawTo([TABLE[0] + 0.75, 0, TABLE[2] - 0.8], TABLE) }, [TABLE[0] + 0.75, 0.12, TABLE[2] - 0.8], true);
      hero(t < W.plate ? "smile" : "sad", { mode: "sit", yaw: yawTo([TABLE[0] - 0.56, 0, TABLE[2] - 1.0], TABLE) }, [TABLE[0] - 0.56, 0.12, TABLE[2] - 1.0]);
      prop({ kind: "stack", p: [TABLE[0] + 0.35, 0.83, TABLE[2] - 0.4] }); prop({ kind: "plate", p: [TABLE[0] - 0.3, 0.83, TABLE[2] - 0.5] });
      if (t > W.plate - 0.3) prop({ kind: "plate", p: [TABLE[0] + 0.45, 0.83, TABLE[2] + 0.3] });
      if (t > W.cap3 - 0.3) prop({ kind: "cap", p: [TABLE[0] + 0.72, 0.84, TABLE[2] + 0.45], yaw: -0.6 });
      break;
    }
    case 20: {
      const hp: V3 = [WINDOW[0] - 0.3, 0, WINDOW[2] + 0.75];
      hero(t < W.star ? "sad" : "teary", { yaw: Math.PI + 0.95, look: -1, headTilt: -6 }, hp);
      prop({ kind: "cap", p: [TABLE[0] + 0.72, 0.84, TABLE[2] + 0.45], yaw: -0.6 }); prop({ kind: "plate", p: [TABLE[0] + 0.45, 0.83, TABLE[2] + 0.3] });
      const k = t > W.star - 0.2 ? clamp01((t - W.winked) / 0.5) : 0;
      fx(`star${Q(k, 10)}`, 256, 256, (p) => X.starWink(p, Q(k, 10)), [WINDOW[0] + 0.45, WINDOW[1] + 0.35, WINDOW[2] + 0.02], 0.22 + 0.25 * Math.sin(Math.PI * k), 0.22 + 0.25 * Math.sin(Math.PI * k), { soft: true, face: true });
      break;
    }
  }
  void FPS; void lin; void HAPPYS; void put;
};
