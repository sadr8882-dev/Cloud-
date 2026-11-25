// The Pisa cast as lit flat cards in the 3D world (canvas pool, yaw-only billboards shaded by cardShade, soft contact
// blobs), plus unlit effect cards (drips, water drops in the clay, soil chunks, leaves, tape). Our own characters:
// medieval masons, an old bearded mason, a kid with a sponge, 1934 workers, 1990 engineers, modern tourists.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, SKINS } from "./toon";
import { FPS, SHOTS, V3, W, LAMP, TABLE, TOWER, VANE, pipAt, sisAt, smooth, clamp01 } from "./story";
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
export type Stage = { places: Place[]; fx: FxPlace[]; ropes: [V3, V3][] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
let SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
let LNAME: "day" | "golden" = "day";
const tmp = new THREE.Vector3();
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

// ---------------- outfits ----------------
const SK = SKINS;
const MILA: Outfit = { jacket: "#f3d35a", pants: "#3b5b9a", boots: "#d23b3b", hat: "hair", hair: "#2a201a", dress: "#f3d35a", build: "kid", skin: SK[1] };
const PIP: Outfit = { jacket: "#6bb04e", pants: "#3b5b9a", boots: "#e2453c", hat: "cap", cap: "#3f6fb5", build: "kid", skin: SK[1] };
const FOLK: Outfit[] = [
  { jacket: "#3f6fb5", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#5a3b2a", skin: SK[0] },
  { jacket: "#c25a7a", pants: "#3b3f52", boots: "#4a3426", hat: "bonnet", dress: "#d9a441", skin: SK[2] },
  { jacket: "#5d7a3a", pants: "#4a4038", boots: "#4a3426", hat: "cap", cap: "#8c3b4a", moustache: "#3a2a1e", skin: SK[3] },
  { jacket: "#2f5f6a", pants: "#3b3f52", boots: "#4a3426", hat: "bonnet", dress: "#5a8fc2", skin: SK[1] },
  { jacket: "#b5653f", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#2a201a", build: "stout", skin: SK[0] },
];
const GRANDPA: Outfit = { jacket: "#7a5a3e", pants: "#4a4038", boots: "#2e2a36", hat: "cap", cap: "#5b6270", beard: "#f2efe7", moustache: "#f2efe7", build: "stout", skin: SK[2] };
const KIDS: Outfit[] = [
  { jacket: "#e2453c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#f3d35a", build: "kid", skin: SK[0] },
  { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#f4f1ea", hat: "hair", hair: "#c98b3a", dress: "#7b5ac9", build: "kid", skin: SK[3] },
  { jacket: "#2f8a4f", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hair: "#2a201a", build: "kid", skin: SK[1] },
];

// ---------------- blinks ----------------
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
const LEAD = 2 / FPS;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

let OUTKEY = new WeakMap<Outfit, string>(); let OK = 0;
const okeyOf = (o: Outfit) => { let k = OUTKEY.get(o); if (!k) { k = "o" + OK++; OUTKEY.set(o, k); } return k; };
/** one character card at (x, y, z) */
const person = (cam: CamInfo, i: number, o: Outfit, x: number, y: number, z: number, fo: FrontOpts, scale = 1, side?: { so: SideOpts; mirror: boolean }): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2 * scale, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = !!side?.mirror, light = light2D(cam, mirror), seed = ((i * 5 + 3) % 7) + 1;
  if (side) {
    const s2: SideOpts = { ...side.so, light, seed };
    return { key: `S|${okeyOf(o)}|${fkey(s2)}`, x, y, z, scale, mirror, draw: (p) => bodySide(p, o, s2), size: [w, h, k], rig: { o, side: s2 } };
  }
  const f2: FrontOpts = { ...fo, light, seed };
  return { key: `F|${okeyOf(o)}|${fkey(f2)}`, x, y, z, scale, draw: (p) => bodyFront(p, o, f2), size: [w, h, k], rig: { o, front: f2 } };
};

// ---------------- ground shadows ----------------
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const NO_BLOB = true as boolean; // real soft shadows now
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => { if (NO_BLOB) return;
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h;
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc, w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- effect drawings ----------------
const dogFx = (p: Pen, k: number) => {
  p.ell(150, 150, 85, 48, "#c98b3a", 8); p.ell(235, 112, 42, 38, "#c98b3a", 8); p.ell(255, 80, 14, 24, "#8a5a34", 6, 0, 360, 20);
  p.dot(248, 106, 6); p.ell(272, 122, 9, 7, "#241726", 0);
  for (const x of [95, 130, 175, 205]) p.stroke([[x, 185], [x + 6 * Math.sin(k * 6 + x), 235]], 12, "#8a5a34");
  p.stroke([[68, 135], [30, 100 + 10 * Math.sin(k * 8)]], 10, "#8a5a34"); p.ell(210, 150, 30, 8, "#d23b3b", 4);
};
const floatFx = (kind: number) => (p: Pen) => {
  if (kind === 0) { p.ell(100, 110, 70, 62, "#e2453c", 8); p.stroke([[100, 50], [115, 25]], 8, "#5a3b2a"); p.ell(130, 30, 22, 10, "#6bb04e", 4); }        // apple
  else if (kind === 1) { p.poly([[30, 150], [170, 150], [150, 60], [50, 60]], "#3f6fb5", 8); p.ell(100, 150, 90, 16, "#2f5fa8", 8); }               // hat
  else if (kind === 2) { p.poly([[40, 40], [160, 40], [145, 170], [55, 170]], "#8d949c", 8); p.arc(100, 40, 60, 40, 180, 360, 6); }               // bucket
  else { p.poly([[20, 60], [180, 60], [180, 140], [20, 140]], "#f7f1e1", 8); p.stroke([[20, 100], [180, 100]], 4, "#d23b3b"); }                   // letter
};
const rays = (p: Pen, t: number) => { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r0 = 60 + 40 * t; p.stroke([[150 + Math.cos(a) * r0, 150 + Math.sin(a) * r0], [150 + Math.cos(a) * (r0 + 50), 150 + Math.sin(a) * (r0 + 50)]], 10, "#fff3b0"); } };

// ---------------- helpers ----------------
const stand = (cam: CamInfo, out: Stage, i: number, o: Outfit, x: number, z: number, fo: FrontOpts, sc = 1, y = 0, shadow = true) => {
  out.places.push(person(cam, i, o, x, y, z, { mode: "stand", blink: lidAt(0, i), ...fo }, sc));
  if (shadow && y < 0.3) blob(out, x, 0, z, sc);
};
/** someone floating: arms up, legs splayed (the "fall" pose), bobbing and turning slowly */
const floater = (cam: CamInfo, out: Stage, i: number, o: Outfit, x: number, y: number, z: number, t: number, expr: Expr, sc = 1, tiltAmp = 18) => {
  out.places.push({ ...person(cam, i, o, x, y + 0.08 * Math.sin(t * 1.6 + i), z, { mode: "fall", expr, blink: lidAt(t, i), tilt: q(tiltAmp * Math.sin(t * 0.7 + i), 4) }, sc) });
};
const rope = (out: Stage, a: V3, b: V3) => out.ropes.push([a, b]);
const drifting = (out: Stage, t: number, cx: number, cz: number, n: number, y0 = 1, spread = 10) => {
  for (let i = 0; i < n; i++) {
    const u = ((t * 0.12 + hh(i, 4)) % 1);
    out.fx.push({ key: `float${i % 4}`, cw: 200, ch: 200, draw: floatFx(i % 4), x: cx + (hh(i, 1) - 0.5) * spread, y: y0 + u * 14, z: cz + (hh(i, 2) - 0.5) * spread, w: 0.45, h: 0.45, rot: t * (hh(i, 3) - 0.5) * 2 });
  }
};
const tiedTown = (cam: CamInfo, out: Stage, t: number, noon: boolean, base = 300) => {
  const spots: [number, number][] = [[-7, 2], [-4.5, -3], [6.5, 1], [9, -4], [-9.5, -6], [2, -6.5]];
  spots.forEach(([x, z], i) => {
    const y = noon ? 1.2 + 0.25 * Math.sin(t * 1.3 + i) : 0;
    if (noon) floater(cam, out, base + i, FOLK[i % 5], x, y, z, t, (["neutral", "smile_closed", "stern", "neutral", "smile"] as Expr[])[i % 5], 1, 8);
    else stand(cam, out, base + i, FOLK[i % 5], x, z, { expr: (["smile", "neutral", "smile_closed", "neutral", "grin"] as Expr[])[i % 5], blink: lidAt(t, base + i) });
    rope(out, [x + 0.5, 0.02, z + 0.4], [x + 0.05, y + 1.05, z]);
  });
};

// ---------------- per-shot staging ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [], ropes: [] };
  LNAME = SHOTS[id - 1].light;
  SUN = cam.sun.clone().normalize();
  const L = LEAD, noon = SHOTS[id - 1].noon, pip = pipAt(t), sis = sisAt(t);
  const girl = (expr: Expr, fo: Partial<FrontOpts> = {}) => stand(cam, out, 1, MILA, sis[0], sis[2], { expr, blink: lidAt(t, 1), ...fo }, 0.82, sis[1]);
  const boy = (expr: Expr, fo: Partial<FrontOpts> = {}) => stand(cam, out, 2, PIP, pip[0], pip[2], { expr, blink: lidAt(t, 2), ...fo }, 0.64, pip[1]);
  switch (id) {
    case 1: case 2: {
      tiedTown(cam, out, t, true); drifting(out, t, 0, 0, 14);
      if (id === 2 && t > W.twelve + 0.6) { const u = clamp01((t - W.twelve - 0.6) / 2.5); out.fx.push({ key: "float2", cw: 200, ch: 200, draw: floatFx(2), x: -8, y: 1.0 + 5 * u, z: 2, w: 0.9, h: 0.9, rot: u * 3 }); }
      if (id === 2 && t > W.twelve - 0.1 && t < W.twelve + 0.5) { const u = q((t - W.twelve + 0.1) / 0.6, 10); out.fx.push({ key: `rays${u}`, cw: 300, ch: 300, draw: (p) => rays(p, u), x: TOWER[0], y: 18.6, z: TOWER[2] + 3.3, w: 4, h: 4 }); }
      break;
    }
    case 3: tiedTown(cam, out, t, false); break;
    case 4: { // dog on a leash to a stake
      const k = (t * 1.5) % 1;
      out.fx.push({ key: `dog${q(k, 6)}`, cw: 320, ch: 260, draw: (p) => dogFx(p, q(k, 6)), x: -2.4, y: 0.42, z: 6.4, w: 1.0, h: 0.8 });
      rope(out, [-3.2, 0.02, 6.2], [-2.1, 0.5, 6.4]);
      out.fx.push({ key: "blob|contact|#a8aab8", cw: 128, ch: 128, draw: (p) => fxContact(p, "#a8aab8"), x: -2.4, y: 0.02, z: 6.4, w: 1.0, h: 0.5, flat: true });
      break;
    }
    case 5: {
      stand(cam, out, 50, GRANDPA, 5.6, 7.2, { expr: t > W.iron ? "grin" : "neutral", blink: lidAt(t, 50) });
      for (const dx of [-0.13, 0.13]) out.fx.push({ key: "ironboot", cw: 200, ch: 160, draw: (p) => { p.poly([[40, 20], [120, 20], [120, 90], [190, 100], [190, 150], [30, 150]], "#3b3f52", 9); p.poly([[30, 135], [190, 135], [190, 150], [30, 150]], "#24262d", 0); p.ell(80, 55, 10, 10, "#8d949c", 4); }, x: 5.6 + dx, y: 0.13, z: 7.25, w: 0.3, h: 0.24 });
      break;
    }
    case 6: break;
    case 7: { // kids float like balloons on their ropes
      KIDS.concat(KIDS).forEach((o, i) => {
        const x = -2.6 + i * 1.0, z = 2 - (i % 2) * 1.6, y = 2.6 + 0.8 * Math.sin(t * 0.9 + i) + (i % 3) * 0.7;
        floater(cam, out, 70 + i, o, x, y, z, t, (["laugh", "grin", "laugh"] as Expr[])[i % 3], 0.7, 25);
        rope(out, [x + 0.3 * Math.sin(i), 0.02, z + 0.5], [x, y + 0.8, z]);
      });
      drifting(out, t, 0, 0, 6);
      break;
    }
    case 8: girl(t > W.heights - L ? "nervous" : "neutral"); boy("grin"); break;
    case 9: { // hugging the lamp, eyes shut, her rope tied to it; folk float behind
      girl(t > W.lamppost - L ? "neutral" : "nervous", { blink: t > W.lamppost - L ? 1 : lidAt(t, 1), prop: "hug" });
      rope(out, [LAMP[0], 0.7, LAMP[2]], [sis[0] + 0.1, sis[1] + 0.5, sis[2]]);
      boy("laugh", { wave: q(Math.sin(t * 8), 20) }); rope(out, [LAMP[0] - 1.0, 0.02, LAMP[2] + 1.0], [pip[0], pip[1] + 0.7, pip[2]]);
      tiedTown(cam, out, t, true, 320); drifting(out, t, LAMP[0], LAMP[2] - 6, 8);
      break;
    }
    case 10: { // Pip, his rope left on the ground
      boy(t > W.rope - L ? "grin" : "smile"); girl("smile");
      out.fx.push({ key: "ropeground", cw: 300, ch: 120, draw: (p) => p.stroke([[20, 60], [80, 30], [140, 80], [200, 40], [280, 70]], 14, "#c9a46a"), x: pip[0] + 0.6, y: 0.03, z: pip[2] + 0.5, w: 1.0, h: 0.4, flat: true });
      break;
    }
    case 11: boy(t > W.rising - L ? "shock" : "grin"); if (t < W.roofs) { girl("shock"); rope(out, [LAMP[0], 0.7, LAMP[2]], [sis[0] + 0.1, sis[1] + 0.5, sis[2]]); } drifting(out, t, 0, -4, 8, 2); break;
    case 12: tiedTown(cam, out, t, true, 340); out.places.forEach((p) => { p.key = p.key.replace(/"expr":"[a-z_]+"/, '"expr":"shock"'); }); boy("nervous"); break;
    case 13: boy("nervous"); break;
    case 14: girl(t > W.scariest - L ? "stern" : "nervous", { prop: "hug" }); break;
    case 15: girl(t > W.letgo + 0.2 ? "shock" : "stern"); break;
    case 16: floater(cam, out, 1, MILA, sis[0], sis[1], sis[2], t, t > W.fish - L ? "grin" : "stern", 0.82, 30); boy("nervous"); break;
    case 17: floater(cam, out, 1, MILA, sis[0], sis[1], sis[2], t, t > W.sneaker - L ? "grin" : "stern", 0.82, 10); boy(t > W.sneaker - L ? "relief_open" : "nervous"); break;
    case 18: case 19: {
      floater(cam, out, 1, MILA, sis[0], sis[1], sis[2], t, id === 19 ? "nervous" : "stern", 0.82, 6); boy("nervous");
      const th = clamp01((t - (W.vane - 0.8)) / 0.8), tip: V3 = [sis[0] + (VANE[0] - sis[0]) * th, sis[1] + 1 + (VANE[1] + 0.2 - sis[1] - 1) * th, sis[2] + (VANE[2] - sis[2]) * th];
      if (t > W.vane - 0.8) rope(out, [sis[0], sis[1] + 1.0, sis[2]], tip);
      break;
    }
    case 20: case 21: {
      stand(cam, out, 1, MILA, sis[0], sis[2], { mode: "fall", expr: id === 21 ? "relief" : t > W.clothesline ? "relief_open" : "shock", blink: lidAt(t, 1) }, 0.82, sis[1], false);
      stand(cam, out, 2, PIP, pip[0], pip[2], { mode: "fall", expr: t > W.laughed - L || t > W.swung ? "laugh" : "shock", blink: 0 }, 0.64, pip[1], false);
      rope(out, [VANE[0], VANE[1] + 0.2, VANE[2]], [sis[0], sis[1] + 1.0, sis[2]]);
      break;
    }
    case 22: case 23: { // the holiday: everyone lets go
      const spots: [number, number][] = [[-6, 2], [-3, -3], [5, 1], [8, -4], [-8, -5], [2, -7], [0, 4], [-2, 7]];
      spots.forEach(([x, z], i) => floater(cam, out, 400 + i, i % 3 === 2 ? KIDS[i % 3] : FOLK[i % 5], x, 2.5 + 1.5 * Math.sin(t * 0.8 + i) + (i % 3), z, t, (["laugh", "grin", "laugh", "smile"] as Expr[])[i % 4], i % 3 === 2 ? 0.7 : 1, 30));
      const by = 3.2 + 0.3 * Math.sin(t);
      floater(cam, out, 1, MILA, 0.3, by, 6, t, id === 23 && t > W.heights2 - L && t < W.brother - L ? "nervous" : "smile", 0.82, 6);
      floater(cam, out, 2, PIP, 1.0, by + 0.2, 6, t, "laugh", 0.64, 10);
      drifting(out, t, 0, 0, 10, 2);
      break;
    }
  }
  return out;
};
