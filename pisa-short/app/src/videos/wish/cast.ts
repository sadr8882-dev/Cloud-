// The "One Wish" cast (3D blocky rigs placed from here) plus unlit effect cards. Formerly: the Pisa cast as lit flat cards in the 3D world (canvas pool, yaw-only billboards shaded by cardShade, soft contact
// blobs), plus unlit effect cards (drips, water drops in the clay, soil chunks, leaves, tape). Our own characters:
// medieval masons, an old bearded mason, a kid with a sponge, 1934 workers, 1990 engineers, modern tourists.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, SKINS } from "./toon";
import { FPS, SHOTS, V3, PART, W1, W2, HERO, PIP0, PIPICE, ICE, EAT, T0, T1, G0, DOOR, BENCH, MAYOR1, MAYOR2, MOM2, NOTE, KID1, POST, CAKE, BELL, SC, dogAt, iceAt, candle, CANDLES_OUT, DogState, smooth, clamp01, lin } from "./story";
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

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number]; rig?: RigOpts;
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; face?: boolean; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[]; ropes: [V3, V3][]; chains: [V3, V3][]; dog?: DogState; ice: { y: number; s: number } };

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

// ---------------- outfits ----------------
const SK = ["#f6c99f", "#efb98c", "#d9a074", "#a8704a"]; void SKINS;
const BOY: Outfit = { jacket: "#d2323c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hair: "#4a2c1a", build: "kid", skin: SK[0] }; // the hero: a boy in a red plaid shirt
const PIP: Outfit = { jacket: "#4cb050", pants: "#3b5b9a", boots: "#e2453c", hat: "cap", cap: "#2f6fd8", build: "kid", skin: SK[0] };
const FOLK: Outfit[] = [
  { jacket: "#3f6fb5", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#5a3b2a", skin: SK[0] },
  { jacket: "#c25a7a", pants: "#3b3f52", boots: "#4a3426", hat: "bonnet", dress: "#d9a441", skin: SK[2] },
  { jacket: "#5d7a3a", pants: "#4a4038", boots: "#4a3426", hat: "cap", cap: "#8c3b4a", moustache: "#3a2a1e", skin: SK[3] },
  { jacket: "#2f5f6a", pants: "#3b3f52", boots: "#4a3426", hat: "bonnet", dress: "#5a8fc2", skin: SK[1] },
  { jacket: "#b5653f", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#2a201a", build: "stout", skin: SK[0] },
];
const GRANDPA: Outfit = { jacket: "#7a5a3e", pants: "#4a4038", boots: "#2e2a36", hat: "cap", cap: "#5b6270", beard: "#f2efe7", moustache: "#f2efe7", build: "stout", skin: SK[2] };
const MAYOR: Outfit = { jacket: "#2b2f45", pants: "#2b2f45", boots: "#1e1c24", hat: "tophat", hair: "#d8d4cc", moustache: "#d8d4cc", belt: "#d23b3b", build: "stout", skin: SK[1] };
const MAIL: Outfit = { jacket: "#3f6fb5", pants: "#24365e", boots: "#2a2420", hat: "cap", cap: "#24365e", skin: SK[2] };
const MOM: Outfit = { jacket: "#e07a9a", pants: "#3b3f52", boots: "#f4f1ea", hat: "hair", hair: "#5a3b2a", dress: "#e07a9a", skin: SK[0] };
const NEIGH: Outfit = { jacket: "#f3d35a", pants: "#5a7a9a", boots: "#4a3426", hat: "hair", hair: "#2a201a", build: "stout", skin: SK[1] };
const KIDS: Outfit[] = [
  { jacket: "#e2453c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#f3d35a", build: "kid", skin: SK[0] },
  { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#f4f1ea", hat: "hair", hair: "#c98b3a", dress: "#7b5ac9", build: "kid", skin: SK[3] },
  { jacket: "#2f8a4f", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hair: "#2a201a", build: "kid", skin: SK[1] },
];

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

// ---------------- helpers ----------------
let TNOW = 0;
let CAM: CamInfo;
let OUT: Stage;
type Extra = Partial<FrontOpts> & { yaw?: number; y?: number };
const put = (i: number, o: Outfit, p: V3, sc: number, ex: Mood, fo: Extra = {}) => {
  const { yaw, y, ...rest } = fo;
  const expr = typeof ex === "string" ? ex : mood(TNOW, i, ex);
  const pl = person(CAM, i, o, p[0], (y ?? p[1]), p[2], { mode: "stand", blink: lidAt(TNOW, i), look: glance(TNOW, i), expr, ...rest }, sc);
  if (yaw !== undefined) pl.yaw = yaw;
  OUT.places.push(pl);
  return pl;
};
const fx = (key: string, cw: number, ch: number, draw: (p: Pen) => void, p: V3, w: number, h: number, o: { flat?: boolean; face?: boolean; rot?: number; soft?: boolean } = {}) =>
  OUT.fx.push({ key, cw, ch, draw, x: p[0], y: p[1], z: p[2], w, h, ...o });
const yawTo = (a: V3, b: V3) => Math.atan2(b[0] - a[0], b[2] - a[2]);
const mixV = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const Q = (t: number, n = 15) => Math.floor(t * n) / n; // quantised time for animated card keys

// the party crowd (generic townsfolk) and the named townsfolk at their party marks
const GEN: [number, number, Outfit, number][] = [[-5.0, 3.4, FOLK[0], 1], [-3.8, 7.4, KIDS[0], 0.7], [1.9, 7.4, FOLK[1], 1], [3.8, 6.6, KIDS[1], 0.7], [-2.4, 1.4, FOLK[3], 1], [0.6, 1.0, KIDS[2], 0.7], [-6.2, 1.4, FOLK[2], 1]];
const NEIGH_P: V3 = [-6.6, 0, 4.6], MAIL_P: V3 = [5.2, 0, 8.0], GRAN_P1: V3 = [-6.8, 0, 8.6];
const crowd = (ex: Mood, fo: Extra = {}, skip: string[] = []) => {
  GEN.forEach(([x, z, o, sc], i) => put(300 + i, o, [x, 0, z], sc, ex, fo));
  if (!skip.includes("mom")) put(60, MOM, MOM2, 1, ex, fo);
  if (!skip.includes("mayor")) put(61, MAYOR, MAYOR2, 1, ex, fo);
  if (!skip.includes("mail")) put(62, MAIL, MAIL_P, 1, ex, fo);
  if (!skip.includes("neigh")) { put(63, NEIGH, NEIGH_P, 1, ex === "laugh" ? ex : "nervous", fo); miniSun(NEIGH_P, 1); }
  if (!skip.includes("gran")) put(64, GRANDPA, PART === 1 ? GRAN_P1 : [6.9, 0, 7.8], SC.grandpa, ex, fo);
};
const miniSun = (p: V3, sc: number) => fx(`sun${Q(TNOW, 6)}`, 256, 256, (pp) => X.miniSun(pp, Q(TNOW, 6) * 0.6), [p[0], 3.5 * sc + 0.1 * Math.sin(TNOW * 2), p[2]], 0.9, 0.9, { soft: true });
const sweat = (p: V3, top: number, n = 4) => { for (let i = 0; i < n; i++) { const u = (TNOW * 1.4 + hh(i, 3)) % 1; fx("drop", 128, 128, X.drop, [p[0] + (hh(i, 1) - 0.5) * 0.7, top - u * 0.9, p[2] + 0.2], 0.12, 0.12); } };
const confetti = (c: V3, t0: number, n = 26, spread = 3) => {
  if (TNOW < t0) return;
  for (let i = 0; i < n; i++) {
    const u = TNOW - t0, y = c[1] + 2.4 * Math.min(u, 0.4) / 0.4 - Math.max(0, u - 0.4) * 0.7 + hh(i, 5);
    fx(`conf${i % 6}`, 64, 32, (p) => X.confetti(p, i), [c[0] + (hh(i, 1) - 0.5) * spread, Math.max(0.05, y), c[2] + (hh(i, 2) - 0.5) * spread], 0.14, 0.07, { rot: TNOW * (3 + i % 4) });
  }
};
const flamesOn = (lit: boolean, smokeFrom = -1) => {
  for (let i = 0; i < 10; i++) {
    const c = candle(i);
    if (lit) fx(`flame${Q(TNOW + i * 0.07, 10)}`, 128, 160, (p) => X.flame(p, Q(TNOW + i * 0.07, 10)), [c[0], c[1] + 0.05, c[2]], 0.05, 0.065, { soft: true });
    else if (smokeFrom >= 0 && TNOW - smokeFrom < 1.6) { const k = Q(TNOW - smokeFrom, 10); fx(`smoke${k}`, 128, 256, (p) => X.smoke(p, k), [c[0], c[1] + 0.12 + k * 0.1, c[2]], 0.07, 0.14, { soft: true }); }
  }
};
const hero = (ex: Mood, fo: Extra = {}, p: V3 = HERO) => put(1, BOY, p, SC.hero, ex, fo);
const pip = (ex: Mood, fo: Extra = {}, p: V3 = PIP0) => put(2, PIP, p, SC.pip, ex, fo);
const dogPos = (d: DogState) => d.p;
const neck = (d: DogState): V3 => [d.p[0] + Math.sin(d.yaw) * 0.6 * d.scale, d.p[1] + (0.84 - (d.pose === "sleep" ? (1 - (d.rise ?? 0)) * 0.4 : 0)) * d.scale, d.p[2] + Math.cos(d.yaw) * 0.6 * d.scale];
const nose = (d: DogState): V3 => [d.p[0] + Math.sin(d.yaw) * 1.25 * d.scale, d.p[1] + (0.95 - (d.pose === "sleep" ? (1 - (d.rise ?? 0)) * 0.55 : 0)) * d.scale, d.p[2] + Math.cos(d.yaw) * 1.25 * d.scale];
const zzz = (d: DogState, big = 1) => { const n = nose(d), u = (TNOW * 0.5) % 1; fx("zzz", 256, 256, X.zzz, [n[0] + 0.6, n[1] + 1.2 + u * 1.5, n[2]], 1.4 * big, 1.4 * big, { soft: true }); };
const chain = (d: DogState, snapped: boolean) => {
  const a = neck(d), b: V3 = [POST[0], 1.0, POST[2]];
  if (!snapped) { OUT.chains.push([a, b]); return; }
  OUT.chains.push([b, [b[0] - 0.4, 0.05, b[2] + 1.2]]);
  OUT.chains.push([a, [a[0] + 0.5, Math.max(0.05, a[1] - 1.6), a[2] + 0.2]]);
};

// ---------------- per-shot staging ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [], ropes: [], chains: [], ice: iceAt(t) };
  OUT = out; CAM = cam; TNOW = t;
  SUN = cam.sun.clone().normalize();
  const d = dogAt(t);
  if (!d.hidden && !d.lap && !d.held) out.dog = d;
  if (PART === 1) p1(id, t, d); else p2(id, t, d);
  return out;
};

const p1 = (id: number, t: number, d: DogState) => {
  const W = W1;
  const party = id >= 10 || id === 1;
  if (d.pose === "sleep" && (d.rise ?? 0) < 0.5 && t < W.woke) zzz(d, id === 8 ? 1.3 : 1);
  if (party || id === 7 || id === 8 || id === 16 || id === 17) chain(d, t > W.chain);
  const lit = t < CANDLES_OUT;
  if (party) flamesOn(lit, CANDLES_OUT);
  switch (id) {
    case 1: {
      crowd(CALM); hero("smile"); pip(HAPPY);
      if (t > 2.2 && t < 3.8) { const u = (t - 2.2) / 1.6; fx("sparkle", 256, 256, X.sparkle, [-18 + 34 * u, 20 - 6 * u, -8], 2.2, 2.2, { soft: true, rot: u * 4 }); }
      break;
    }
    case 2: {
      if (t > W.rings - 0.1 && t < W.rings + 0.6) { const u = q((t - W.rings + 0.1) / 0.7, 10); fx(`rays${u}`, 300, 300, (p) => X.sparkle(p), [BELL[0], BELL[1], BELL[2] + 0.4], 1.4 + 2 * u, 1.4 + 2 * u, { soft: true, rot: u }); }
      if (t > 6.2) {
        put(70, KIDS[0], KID1, 0.7, t > W.comes ? "laugh" : "smile", { wave: t > W.comes ? q(Math.sin(t * 6), 10) : undefined });
        if (t > W.comes) { const k = smooth((t - W.comes) / 0.3); fx("balloons", 256, 420, X.balloons, [KID1[0] + 0.45, 1.25 + 0.5 * k, KID1[2] - 0.2], 0.7 * k + 0.01, 1.15 * k + 0.01); }
        if (t > W.take) { const k = 1 + 0.6 * (1 - smooth((t - W.take) / 0.12)); fx("stamp", 512, 220, X.stamp, [KID1[0] - 0.1, 0.55, KID1[2] + 0.6], 1.2 * k, 0.52 * k); }
        put(71, FOLK[1], [KID1[0] - 1.4, 0, KID1[2] - 1.6], 1, t > W.comes ? "shock" : CALM);
      }
      break;
    }
    case 3: { // grandpa, 3 m tall, walks into a doorway
      const bonk = W.bonks;
      const z = t < bonk ? lin([[8.5, 13.6], [bonk, 17.38]], t) : lin([[bonk, 17.38], [bonk + 0.3, 16.9]], t);
      const gp: V3 = [DOOR[0], 0, z];
      put(50, GRANDPA, gp, SC.grandpa, t < bonk ? (t < 10.4 ? "grin" : "smile") : t < bonk + 0.5 ? "shock" : "dazed", t < bonk ? { mode: "walk", phase: t * 0.9, yaw: 0.05 } : { yaw: 0.25, lean: t < bonk + 0.3 ? -10 : 0 });
      if (t > bonk && t < bonk + 0.55) { const k = q((t - bonk) / 0.55, 10); fx(`bonk${k}`, 300, 300, (p) => X.bonk(p, k), [DOOR[0] + 0.3, 2.75, 17.6], 1.5, 1.5); }
      if (t > bonk + 0.3) { const k = Q(t, 12); fx(`dizzy${k}`, 256, 128, (p) => X.dizzy(p, k), [gp[0], 3.25, gp[2]], 1.0, 0.5); }
      break;
    }
    case 4: { // the mailman zooms past; a neighbour gets a letter on fire
      const u = clamp01((t - 13.55) / 1.0);
      if (u > 0 && u < 1) { const x = -16 + 32 * u; put(51, MAIL, [x, 0, 10.5], 1, "grin", { mode: "run", phase: t * 4, yaw: Math.PI / 2 }); fx("speed", 512, 256, X.speed, [x - 2.2, 1.1, 10.5], 4, 2); }
      const who: V3 = [0.6, 0, 10.6];
      put(52, FOLK[0], who, 1, t < 16.3 ? (t < 15.4 ? "neutral" : "smile") : "shock", { prop: t > 15.4 ? "carry" : undefined });
      if (t > 14.9 && t < 15.45) { const k = (t - 14.9) / 0.55; fx(`letter${Q(t, 10)}`, 256, 256, (p) => X.burningLetter(p, Q(t, 10)), [-6 + 6.6 * k, 1.4 + 0.8 * Math.sin(k * Math.PI), 10.9], 0.45, 0.45, { rot: k * 6 }); }
      if (t > 15.45) fx(`letter${Q(t, 10)}`, 256, 256, (p) => X.burningLetter(p, Q(t, 10)), [who[0], 1.3, who[2] + 0.45], 0.45, 0.45);
      break;
    }
    case 5: { // mum: peace and quiet
      const mp: V3 = [-9, 0, 10.5];
      put(53, MOM, mp, 1, t < W.drop ? "smile_closed" : t < 21.4 ? "smile" : "smile_closed", { prop: t < W.drop ? "carry" : undefined });
      const k = clamp01((t - W.drop) / 0.28), y = t < W.drop ? 0.98 : Math.max(0.03, 0.98 - 0.95 * k * k);
      fx("pan", 256, 256, X.pan, [mp[0] + 0.15, y, mp[2] + 0.45], 0.55, 0.55, k >= 1 ? { flat: true, rot: 0.4 } : { rot: k * 3 });
      if (t > 21.15) { const s = smooth((t - 21.15) / 0.2); fx("silence", 256, 256, X.silence, [mp[0] + 0.55, 2.05, mp[2] + 0.3], 0.6 * s + 0.01, 0.6 * s + 0.01); }
      break;
    }
    case 6: { // the neighbour who wished for summer forever
      const np: V3 = [9.5, 0, 10.5];
      put(54, NEIGH, np, 1, t < W.sweat ? "nervous" : mood(t, 54, ["nervous", "pained"]), { wave: q(Math.sin(t * 9), 10), blink: 0.4 });
      miniSun(np, 1); sweat(np, 2.1, 6);
      break;
    }
    case 7: put(55, MAYOR, MAYOR1, 1, t < W.got ? "grin" : "laugh", { wave: t < W.got ? q(Math.sin(t * 5), 10) : undefined }); break;
    case 8: {
      if (t < 31.98) for (const [i, x] of [[0, 6.4], [1, 5.3]] as const) { const z = lin([[30.2, 6.4 - i], [33.7, 2.6 - i]], t); put(56 + i, FOLK[1 + i], [x - 1.2, 0, z], 1, "nervous", { mode: "walk", phase: t * 0.55, yaw: Math.PI, lean: 12 }); }
      break;
    }
    case 9: {
      hero(t < 35.6 ? "grin" : "smile", { prop: "notebook", yaw: 0 }, NOTE);
      const page = t < 34.6 ? 0 : t < 35.4 ? 1 : 2;
      fx(`note${page}`, 512, 360, (p) => X.notebook(p, page), [NOTE[0], 0.84, NOTE[2] + 0.36], 0.52, 0.366, { face: true });
      break;
    }
    case 10: {
      crowd(HAPPY, { prop: undefined }); hero(t < 37.6 ? "grin" : "laugh", { prop: t > 38.0 ? "holdup" : undefined }); pip("laugh");
      confetti([HERO[0], 2.6, HERO[2] + 0.3], 37.15);
      if (t > W.ten - 0.3) { const k = smooth((t - W.ten + 0.3) / 0.4); fx("ten", 320, 330, X.ten, [HERO[0] + 0.85, 1.4 + 0.6 * k, HERO[2] - 0.1], 0.9, 0.93, { rot: 0.1 * Math.sin(t * 2) }); }
      break;
    }
    case 11: crowd(HAPPY); hero("smile"); pip(HAPPY); break;
    case 12: { // Pip leans over the cake and blows the candles out
      const k = smooth((t - W.leaned) / 0.4), pp = mixV(PIP0, [-0.4, 0, 5.05], k);
      pip(t < W.blew - 0.3 ? "grin" : t < 46.3 ? "whistle" : "laugh", { yaw: k > 0.1 ? yawTo(pp, [CAKE[0], 0, CAKE[2]]) : undefined, lean: 28 * k * (t < 46.6 ? 1 : 1 - smooth((t - 46.6) / 0.3)) }, pp);
      hero(t < 46.0 ? "smile" : "shock", { look: 1 });
      crowd(t < 46.0 ? CALM : SCARED, {}, ["gran", "mail"]);
      if (t > W.blew - 0.2 && t < 46.15) { const kk = Q(t, 12); fx(`wind${kk}`, 256, 200, (p) => X.wind(p, kk), [-0.7, 1.08, 5.35], 0.5, 0.4, { rot: Math.PI }); }
      break;
    }
    case 13: {
      pip(t < W.icecream - 0.2 ? "grin" : "laugh", { look: 0.5 });
      if (t > W.icecream - 0.15) { const s = smooth((t - W.icecream + 0.15) / 0.25); fx("thought", 400, 320, X.thought, [PIP0[0] + 0.3, 1.43, PIP0[2] + 0.15], 0.5 * s + 0.01, 0.4 * s + 0.01); }
      hero("smile");
      break;
    }
    case 14: {
      if (t < 50.4) { const u = Q((t - 49.6) % 0.5, 10); fx(`rays${u}`, 256, 256, X.sparkle, [BELL[0], BELL[1], BELL[2] + 0.4], 1.4 + 2 * u, 1.4 + 2 * u, { soft: true, rot: u }); }
      crowd(t < W.gasped ? CALM : "shock", { look: 0 }); pip(t < W.gasped ? "grin" : "laugh");
      hero(t < W.wish2 ? "shock" : t < 51.9 ? "shock" : "pained");
      break;
    }
    case 15: {
      const landed = t > 54.2, shotC = t < W.happy - 0.05;
      crowd(landed ? "shock" : SCARED, { headTilt: shotC && !landed ? -22 : 0, look: 0 });
      hero(t < W.not ? "shock" : "stern", { headTilt: shotC && !landed ? -18 : 0 });
      if (t < 55.0) pip("shock", { headTilt: -20 }); else pip("laugh", { prop: "hug" }, PIPICE);
      if (landed && t < 55.4) { const k = Q((t - 54.2) / 1.2, 12); fx(`dust${k}`, 512, 300, (p) => X.dust(p, k), [ICE[0], 0.5, ICE[2] + 0.6], 4.5, 2.6, { soft: true }); }
      break;
    }
    case 16: {
      crowd(CALM, {}, ["mail", "gran"]); pip("laugh", { prop: "hug", yaw: yawTo(PIPICE, ICE) + 0.9 }, PIPICE); hero("stern");
      const n = nose(d);
      for (let i = 0; i < 4; i++) { const u = ((t - 57.1) * 0.45 + i * 0.25) % 1; const p = mixV([ICE[0] + 0.5, 3.4, ICE[2]], [n[0] - 0.5, n[1] + 0.2, n[2]], u); fx(`smell${Q(t + i, 8)}`, 512, 240, (pp) => X.smell(pp, Q(t + i, 8)), p, 1.6, 0.75, { soft: true }); }
      break;
    }
    case 17: {
      if (t > W.woke + 0.2) { const s = smooth((t - W.woke - 0.2) / 0.15), n = nose(d); fx("bang", 256, 256, X.bang, [n[0] + 1.2, n[1] + 2.4, n[2] + 0.8], 1.6 * s + 0.01, 1.6 * s + 0.01); }
      break;
    }
    case 18: {
      crowd(t < 61.5 ? "shock" : SCARED, { look: 0 }, ["gran"]); hero("shock");
      pip(t < W.pip2 ? "laugh" : "shock", t < W.pip2 ? { prop: "hug", yaw: yawTo(PIPICE, ICE) + 0.9 } : { look: 1 }, PIPICE);
      if (t > W.chain - 0.05 && t < W.chain + 0.35) { const n = neck(d); fx("bang", 256, 256, X.bang, [n[0] + 2, n[1], n[2] + 1.5], 1.4, 1.4); }
      break;
    }
    case 19: {
      if (t < 66.5) { const u = Q((t - 64.9) % 0.5, 10); fx(`rays${u}`, 256, 256, X.sparkle, [BELL[0], BELL[1], BELL[2] + 0.4], 1.4 + 2 * u, 1.4 + 2 * u, { soft: true, rot: u }); }
      hero(t < 67.7 ? "stern" : "nervous", { look: t < 67.4 ? 0.8 : 0, headTilt: -8 });
      crowd(SCARED, { look: 0 }, ["gran"]); pip("shock", {}, PIPICE);
      break;
    }
    case 20: {
      const sh = t > W.yelled;
      hero(sh ? "shout" : t > W.closed ? "stern" : "nervous", { blink: t > W.closed && !sh ? 1 : 0, look: 0, prop: sh ? "holdup" : undefined, headTilt: sh ? -10 : 0 });
      crowd(SCARED, { look: 0 }, ["gran"]); pip("shock", {}, PIPICE);
      break;
    }
  }
};

const p2 = (id: number, t: number, d: DogState) => {
  const W = W2;
  flamesOn(false);
  // named townsfolk default marks (shots move them)
  const gran = () => { if (t > 26.43 || id < 9) put(64, GRANDPA, t > 26.43 ? [6.9, 0, 7.8] : G0, SC.grandpa, id < 9 ? SCARED : CALM); };
  switch (id) {
    case 1: {
      crowd(SCARED, { look: 0 }, ["gran"]); gran(); hero("shock", { look: 1 });
      pip("laugh", { prop: "hug", yaw: yawTo(PIPICE, ICE) + 0.9 }, PIPICE);
      break;
    }
    case 2: crowd(SCARED, {}, ["gran"]); pip(t < W.running ? "laugh" : "shock", t < W.running ? { prop: "hug", yaw: yawTo(PIPICE, ICE) + 0.9 } : { look: 1 }, PIPICE); break;
    case 3: {
      if (t < 9.4) { const u = Q(t % 0.5, 10); fx(`rays${u}`, 256, 256, X.sparkle, [BELL[0], BELL[1], BELL[2] + 0.4], 1.4 + 2 * u, 1.4 + 2 * u, { soft: true, rot: u }); }
      hero("stern", { headTilt: -6 }); crowd(SCARED, { look: 0 }, ["gran"]); pip("shock", {}, PIPICE);
      break;
    }
    case 4: hero("shout", { prop: "holdup", headTilt: -10 }); crowd(SCARED, { look: 0 }, ["gran"]); pip("shock", {}, PIPICE); break;
    case 5: {
      crowd("shock", { look: 0, blink: 0 }, ["gran"]); hero("shout", { prop: t < W.flash ? "holdup" : undefined }); pip("shock", {}, PIPICE); gran();
      if (t > W.pop && t < W.pop + 1.3) { const k = Q((t - W.pop) / 1.3, 15); fx(`pop${k}`, 512, 512, (p) => X.pop(p, k), [T0[0], 2.6, T0[2]], 6.5, 6.5, { soft: true }); }
      break;
    }
    case 6: crowd("shock", { look: 0 }, ["gran"]); gran(); put(320, FOLK[0], [T0[0] + 0.45, 0, T0[2] - 0.35], 1, "shock", { headTilt: 25, look: 0 }); break;
    case 7: {
      const cheer = t < W.second;
      crowd(cheer ? "laugh" : "neutral", { prop: cheer ? "holdup" : undefined, look: 0 }, ["gran"]); hero(cheer ? "laugh" : "neutral", { prop: cheer ? "holdup" : undefined }); pip(cheer ? "laugh" : "neutral", {}, PIPICE);
      if (cheer) confetti([-1, 3.2, 4.4], 18.55, 30, 6);
      break;
    }
    case 8: {
      const blown = t > W.barked + 0.08;
      crowd(blown ? "shock" : "neutral", { lean: blown ? -14 : 0, look: 0 }, ["gran"]); hero(blown ? "shock" : "neutral", { lean: blown ? -14 : 0 }); pip(blown ? "shock" : "neutral", { lean: blown ? -14 : 0 }, PIPICE);
      if (blown && t < W.barked + 1.4) {
        const k = Q((t - W.barked) / 1.4, 15);
        if (t < W.barked + 0.1 + 0.02) fx(`woof${k}`, 512, 512, (p) => X.woof(p, k), [T0[0] - 0.25, 0.3, T0[2] + 0.2], 0.55, 0.55);
        fx(`woof${k}`, 512, 512, (p) => X.woof(p, k), [-1, 2.9, 6.5], 2.4, 2.4);
      }
      if (t > W.barked - 0.05 && t < W.barked + 0.1) fx("woof0", 512, 512, (p) => X.woof(p, 0), [T0[0] - 0.25, 0.32, T0[2] + 0.25], 0.5, 0.5);
      break;
    }
    case 9: { // grandpa dives and misses by three metres
      crowd("shock", { look: 0 }, ["gran", "mail"]);
      const dir: V3 = [T0[0] - G0[0], 0, T0[2] - G0[2]], L = Math.hypot(dir[0], dir[2]), ux = dir[0] / L, uz = dir[2] / L, yaw = Math.atan2(ux, uz);
      if (t < W.catch) put(64, GRANDPA, G0, SC.grandpa, "stern", { yaw, lean: 8 });
      else {
        const k = clamp01((t - W.catch) / 0.5), fwd = 1.2 * k, y = 1.1 * Math.sin(Math.PI * Math.min(1, k)) * (1 - k) + 0.32 * k;
        put(64, GRANDPA, [G0[0] + ux * fwd, 0, G0[2] + uz * fwd], SC.grandpa, k < 1 ? "stern" : "dazed", { mode: "dive", pitch: 20 + 68 * k, yaw, y });
        if (t > 24.95) { const s = smooth((t - 24.95) / 0.25), hand: V3 = [G0[0] + ux * 4.4, 0.35, G0[2] + uz * 4.4], mid = mixV(hand, T1, 0.5); fx("measure", 512, 200, X.measure, [mid[0], 0.9, mid[2] + 0.3], 3.0 * s + 0.01, 1.17 * s + 0.01); }
      }
      break;
    }
    case 10: { // the mailman chases it round and round the ice cream, and catches fire again
      crowd(SCARED, { look: 0 }, ["mail", "gran"]); gran(); pip("shock", {}, PIPICE); hero("shock");
      const th = -0.5 + (t - 26.43) * 2.4 - 1.0, r = 2.95, mp: V3 = [ICE[0] + Math.cos(th) * r, 0, ICE[2] + Math.sin(th) * r];
      put(62, MAIL, mp, 1, t < W.fire ? "stern" : "shock", { mode: "run", phase: t * 3.2, yaw: Math.atan2(-Math.sin(th), Math.cos(th)) });
      if (t > W.fire) { const k = Q(t, 12); fx(`fire${k}`, 256, 256, (p) => X.flames(p, k, 1.2), [mp[0], 2.0, mp[2]], 1.4, 1.4, { soft: true }); }
      break;
    }
    case 11: {
      put(60, MOM, MOM2, 1, t < 31.3 ? "shout" : t < W.peace ? "neutral" : "smile_closed", { headTilt: t < 31.3 ? -8 : 0, lean: t < 31.3 ? 10 : 0 });
      if (t > W.heard - 0.1) { const s = smooth((t - W.heard + 0.1) / 0.2); fx("silence", 256, 256, X.silence, [MOM2[0] + 0.6, 2.25, MOM2[2] + 0.3], 0.55 * s + 0.01, 0.55 * s + 0.01); }
      crowd("neutral", {}, ["mom", "gran"]);
      break;
    }
    case 12: {
      crowd(t < W.four ? "shock" : "shock", { look: 0 }, ["gran"]); pip("shock", { look: 1 }, PIPICE); hero("shock");
      if (t > W.ate && t < 37.5) for (let i = 0; i < 8; i++) { const u = ((t - W.ate) * 1.8 + hh(i, 4)) % 1; fx(`crumb${i % 3}`, 64, 64, (p) => X.crumbs(p, i), [EAT[0] + (hh(i, 1) - 0.5) * 1.2, 0.1 + Math.sin(u * Math.PI) * 0.8, EAT[2] - 0.3 + (hh(i, 2) - 0.5) * 0.8], 0.09, 0.09); }
      break;
    }
    case 13: pip("neutral", { look: 1, headTilt: 14 }, PIPICE); break;
    case 14: pip(t < 40.2 ? "neutral" : "stern", { look: 1, headTilt: 16 }, PIPICE); break;
    case 15: {
      const b = t > W.burped && t < W.burped + 1.4;
      pip(t < W.burped ? "stern" : t < W.burped + 0.6 ? "shock" : "laugh", { headTilt: 10, look: 1 }, PIPICE);
      if (b) {
        const s = smooth((t - W.burped) / 0.15);
        fx("burp", 400, 240, X.burp, [PIPICE[0] - 0.15, 1.6, PIPICE[2] + 0.2], 0.95 * s + 0.01, 0.57 * s + 0.01);
        fx("burp", 400, 240, X.burp, [EAT[0] + 0.25, 0.42, EAT[2] + 0.2], 0.5 * s + 0.01, 0.3 * s + 0.01);
      }
      break;
    }
    case 16: {
      put(61, MAYOR, MAYOR2, 1, t < W.crying - 0.1 ? "pained" : "cry", {});
      if (t > W.crying) { const k = Q(t, 10); fx(`tears${k}`, 256, 300, (p) => X.tears(p, k), [MAYOR2[0], 1.7, MAYOR2[2] + 0.3], 0.75, 0.88, { soft: true }); }
      crowd("neutral", {}, ["mayor", "gran"]);
      break;
    }
    case 17: { // the mayor on the bench with his dog on his lap
      const mp: V3 = [BENCH[0], -0.03, BENCH[2] - 0.05];
      put(61, MAYOR, mp, 1, t < 47.5 ? "cry" : t < W.waited ? "smile_closed" : "laugh", { mode: "sit", prop: t > W.waited ? "hug" : undefined, yaw: 0, look: 0 });
      OUT.dog = { ...d, p: [BENCH[0], 0.84, BENCH[2] + 0.42], yaw: 0, scale: SC.tiny };
      if (t > 47.5) { const k = Q(t, 10); fx(`hearts${k}`, 256, 256, (p) => X.hearts(p, k), [BENCH[0] + 0.1, 2.3, BENCH[2] + 0.2], 0.9, 0.9, { soft: true }); }
      if (t < 47.5) { const k = Q(t, 10); fx(`tears${k}`, 256, 300, (p) => X.tears(p, k), [mp[0], 1.65, mp[2] + 0.3], 0.75, 0.88, { soft: true }); }
      break;
    }
    case 18: {
      const mp: V3 = [-2.45, 0, 4.7];
      put(61, MAYOR, mp, 1, "laugh", { prop: "carry", yaw: yawTo(mp, HERO) * 0.4 });
      OUT.dog = { ...d, p: [mp[0] + 0.1, 1.08, mp[2] + 0.42], yaw: 0.3, scale: SC.tiny };
      hero(t < W.medal ? "smile" : "laugh"); pip("laugh"); crowd("laugh", { prop: "clap" }, ["mayor", "gran"]);
      if (t > W.medal) { const s = smooth((t - W.medal) / 0.2); fx("medal", 256, 256, X.medal, [HERO[0], 0.92, HERO[2] + 0.22], 0.3 * s + 0.01, 0.3 * s + 0.01, { face: true }); }
      confetti([-1.2, 3.0, 4.6], 52.3, 30, 5);
      break;
    }
    case 19: {
      const mp: V3 = [-0.3, 0, 4.0];
      put(60, MOM, mp, 1, t < W.think ? "stern" : "smile_closed", { yaw: t < W.think ? yawTo(mp, HERO) : undefined });
      hero(t < W.think ? "nervous" : "grin", { look: t < W.think ? -1 : 0 });
      fx("medal", 256, 256, X.medal, [HERO[0], 0.92, HERO[2] + 0.22], 0.3, 0.3, { face: true });
      crowd(CALM, {}, ["mom", "gran"]);
      break;
    }
    case 20: {
      hero(t < 60.4 ? "smile" : "grin"); pip(t < 60.6 ? "nervous" : "laugh", { look: -1 }, [-0.05, 0, 4.85]);
      fx("medal", 256, 256, X.medal, [HERO[0], 0.92, HERO[2] + 0.22], 0.3, 0.3, { face: true });
      crowd(HAPPY, {}, ["gran", "mayor"]); put(61, MAYOR, [-3.4, 0, 3.6], 1, "laugh");
      break;
    }
  }
  void dogPos; void nose; void T1;
};
