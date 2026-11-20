// The Pisa cast as lit flat cards in the 3D world (canvas pool, yaw-only billboards shaded by cardShade, soft contact
// blobs), plus unlit effect cards (drips, water drops in the clay, soil chunks, leaves, tape). Our own characters:
// medieval masons, an old bearded mason, a kid with a sponge, 1934 workers, 1990 engineers, modern tourists.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, KID, fxBurst, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, SKINS, Prop } from "./toon";
import { FPS, SHOTS, V3, W, TowerState, towerPt, topOf, scaffoldTop, R_OUT, LEVEL_H, CUTZ, TUB, BANANA_AT, smooth, clamp01 } from "./story";
import { NOINK } from "./ink";
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
  scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; face?: boolean; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[]; plumb?: V3 };

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
const MASON: Outfit = { jacket: "#b5653f", pants: "#6b5a48", boots: "#4a3426", hat: "cap", cap: "#eadcbc", skin: SK[1] };
const MASON2: Outfit = { jacket: "#5d7a3a", pants: "#5a4a3a", boots: "#4a3426", hat: "hair", hair: "#3a2a1e", skin: SK[0] };
const MASON3: Outfit = { jacket: "#8c3b4a", pants: "#4a4038", boots: "#3a2a20", hat: "cap", cap: "#c9a46a", moustache: "#4a3020", build: "stout", skin: SK[2] };
const OLD: Outfit = { ...MASON, cap: "#d9cfb6", beard: "#f6f3ec", skin: "#f3d2b4", jacket: "#9a6045" };
const OLD2: Outfit = { ...MASON3, beard: "#f2efe7", moustache: "#f2efe7", jacket: "#7a4040" };
const FOLK: Outfit[] = [
  { jacket: "#3f6fb5", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#5a3b2a", skin: SK[0] },
  { jacket: "#c25a7a", pants: "#3b3f52", boots: "#4a3426", hat: "bonnet", dress: "#d9a441", skin: SK[1] },
  { jacket: "#5d7a3a", pants: "#4a4038", boots: "#4a3426", hat: "cap", cap: "#8c3b4a", skin: SK[3] },
  { jacket: "#2f5f6a", pants: "#3b3f52", boots: "#4a3426", hat: "bonnet", dress: "#5a8fc2", skin: SK[2] },
  { jacket: "#b5653f", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#2a201a", moustache: "#2a201a", skin: SK[1] },
  { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#4a3426", hat: "bonnet", dress: "#c25a7a", skin: SK[0] },
];
const KID_M: Outfit = { jacket: "#f08a2c", pants: "#6b5a48", boots: "#4a3426", hat: "hair", hair: "#7a4a2a", build: "kid", skin: SK[0] };
const WORKER: Outfit[] = [
  { jacket: "#5b6270", pants: "#3b3f52", boots: "#2a2430", hat: "cap", cap: "#4a4f5a", skin: SK[1] },
  { jacket: "#7a6a52", pants: "#4a4038", boots: "#2a2430", hat: "cap", cap: "#6b5a48", moustache: "#3a2a1e", skin: SK[0] },
  { jacket: "#3f4f6a", pants: "#3b3f52", boots: "#2a2430", hat: "cap", cap: "#2e2a36", build: "stout", skin: SK[2] },
];
const ENGINEER: Outfit[] = [
  { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#3a2a20", hat: "helmet", cap: "#f2c230", skin: SK[0] },
  { jacket: "#f08a2c", pants: "#3b3f52", boots: "#3a2a20", hat: "helmet", cap: "#f4f1ea", moustache: "#4a3426", skin: SK[3] },
  { jacket: "#e2453c", pants: "#3b5b9a", boots: "#3a2a20", hat: "helmet", cap: "#f2c230", build: "stout", skin: SK[1] },
];
const TOURIST: Outfit[] = [
  { jacket: "#3fa0c8", pants: "#c9b48a", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", skin: SK[0] },
  { jacket: "#f3d35a", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hair: "#2a201a", skin: SK[3] },
  { jacket: "#e2453c", pants: "#2f3a52", boots: "#f4f1ea", hat: "hair", hair: "#c98b3a", dress: "#3fa0c8", skin: SK[1] },
  { jacket: "#6bb04e", pants: "#c9b48a", boots: "#4a3426", hat: "cap", cap: "#f4f1ea", moustache: "#5a3b2a", build: "stout", skin: SK[2] },
  { ...KID, skin: SK[0] },
  { jacket: "#c25a7a", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hair: "#5a3b2a", skin: SK[0] },
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
    return { key: `S|${okeyOf(o)}|${fkey(s2)}`, x, y, z, scale, mirror, draw: (p) => bodySide(p, o, s2), size: [w, h, k] };
  }
  const f2: FrontOpts = { ...fo, light, seed };
  return { key: `F|${okeyOf(o)}|${fkey(f2)}`, x, y, z, scale, draw: (p) => bodyFront(p, o, f2), size: [w, h, k] };
};

// ---------------- ground shadows ----------------
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
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
const drop = (p: Pen, col = "#5fb2e6") => { p.poly([[100, 20], [150, 120], [140, 160], [100, 180], [60, 160], [50, 120]], col, 10); p.ell(84, 120, 12, 22, "#ffffff", 0); };
const leaf = (p: Pen, c: string) => { p.poly([[20, 100], [100, 30], [180, 100], [100, 170]], c, 8); p.stroke([[30, 100], [170, 100]], 5); };
const hammerFx = (p: Pen) => {
  p.band([[40, 150], [190, 70]], "#8a5a34", 20, 6, "round");
  p.poly([[170, 30], [240, 60], [215, 115], [145, 85]], "#7d848c", 7);
};
const chunk = (p: Pen, c: string) => p.poly([[30, 60], [80, 20], [150, 40], [170, 110], [110, 160], [40, 130]], c, 9);
const tapeFx = (p: Pen) => {
  p.g.fillStyle = "#f2c230"; p.g.fillRect(0, 12, 1024, 40);
  p.g.fillStyle = "#3a2a1e"; for (let x = 0; x < 1024; x += 32) p.g.fillRect(x, 12, 3, x % 128 ? 14 : 26);
  p.g.strokeStyle = "#241726"; p.g.lineWidth = 4; p.g.strokeRect(0, 12, 1024, 40);
};
const zzz = (p: Pen) => { for (const [x, y, s] of [[40, 160, 1], [110, 90, 1.4]] as const) p.stroke([[x, y], [x + 40 * s, y], [x, y + 40 * s], [x + 40 * s, y + 40 * s]], 9); };
const sweat = (p: Pen) => drop(p, "#9fd4ff");
const splat = (p: Pen, t: number) => {
  const r = 40 + 120 * t;
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; p.ell(150 + Math.cos(a) * r, 150 + Math.sin(a) * r * 0.6, 22 * (1 - t) + 6, 16 * (1 - t) + 5, "#a6a6a2", 5); }
};
const pressLines = (p: Pen, t: number) => {
  for (let i = 0; i < 5; i++) { const x = 40 + i * 55, y = 40 + 50 * t; p.stroke([[x, y], [x, y + 70]], 9, "#2c2229"); p.poly([[x - 16, y + 60], [x + 16, y + 60], [x, y + 90]], "#2c2229", 0); }
};

// ---------------- per-shot staging ----------------
/** scaffold crew: angle around the tower (rad, 0 = +z) on the upper planks of the top level */
const crewSpot = (ts: TowerState, a: number, r = 8.2): V3 => towerPt(ts, topOf(ts).k, Math.sin(a) * r, scaffoldTop(ts), Math.cos(a) * r);
const folkAt = (cam: CamInfo, t: number, out: Stage, spots: [number, number][], cheer: [number, number][] = [], base = 300) => {
  const on = cheer.some(([a, b]) => t >= a && t < b);
  spots.forEach(([x, z], i) => {
    const kid = i % 5 === 2, o = kid ? KID_M : FOLK[i % 6], hop = kid && on ? Math.max(0, Math.sin(t * 7 + i)) * 0.18 : 0;
    const expr: Expr = on ? (["laugh", "grin", "laugh", "smile"] as Expr[])[i % 4] : (["smile", "neutral", "smile_closed", "neutral"] as Expr[])[i % 4];
    const fo: FrontOpts = { mode: "stand", expr, wave: on && i % 3 !== 2 ? q(Math.sin(t * 9 + i * 1.3), 30) : undefined, blink: lidAt(t, i + base) };
    out.places.push(person(cam, base + i, o, x, hop, z, fo, kid ? 0.72 : 1));
    blob(out, x, 0, z, kid ? 0.72 : 1, hop > 0 ? 0.6 : 1);
  });
};

export const stage = (id: number, t: number, ts: TowerState, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  LNAME = SHOTS[id - 1].light;
  SUN = cam.sun.clone().normalize();
  const L = LEAD;
  switch (id) {
    case 1: { // scaffold crew freezes as the tower goes over
      const shock = t > W.padat - L;
      [[0.07, MASON, "grin"], [0.3, MASON3, "smile"], [0.5, MASON2, "neutral"]].forEach(([a, o, e], i) => {
        const [x, y, z] = crewSpot(ts, a as number);
        const expr: Expr = shock ? (i === 1 ? "shock" : "nervous") : (e as Expr);
        out.places.push(person(cam, i, o as Outfit, x, y, z, { mode: "stand", expr, blink: shock ? 0 : lidAt(t, i), prop: i === 0 && !shock ? ["hammer", q(Math.abs(Math.sin(t * 5)), 20)] : null, look: shock ? (i ? -1 : 1) : 0 }));
      });
      folkAt(cam, t, out, [[-6, 16], [-3.5, 18], [5, 17], [8.5, 15.5], [12, 19]], [], 300);
      if (t > W.dostroili - L) out.places.forEach((p) => { /* everyone below looks up in shock: handled by expressions */ });
      break;
    }
    case 2: { // masons at the stub; folk watching in the aerial
      if (t < W.kolokolnyu - 0.1) folkAt(cam, t, out, [[-10, 14], [-12.5, 16], [9.5, 15], [12, 13.5], [14.5, 17], [-15, 12]], [[W.piza - L, W.piza + 1.2]], 300);
      const hit = (t * 1.6) % 1;
      out.places.push(person(cam, 10, MASON, -0.2, 0, 9.8, { mode: "stand", expr: "stern", prop: ["hammer", q(hit < 0.25 ? smooth(hit / 0.25) : 1 - smooth((hit - 0.25) / 0.75), 20)], blink: lidAt(t, 10) }));
      blob(out, -0.2, 0, 9.8);
      out.places.push(person(cam, 11, MASON2, 1.0, 0, 10.9, { mode: "stand", expr: "smile", prop: "block", blink: lidAt(t, 11) }));
      blob(out, 1.0, 0, 10.9);
      out.places.push(person(cam, 12, MASON3, 2.2, 0, 10.0, { mode: "stand", expr: "neutral", prop: "bucket", blink: lidAt(t, 12) }));
      blob(out, 2.2, 0, 10.0, 1.1);
      if (hit < 0.12 && t > W.kolokolnyu) out.fx.push({ key: `burst${q(hit / 0.12, 10)}`, cw: 300, ch: 300, draw: (p) => fxBurst(p, q(hit / 0.12, 10), "#fff3b0", 8, 30, 140), x: 0.25, y: 1.2, z: 10.1, w: 0.6, h: 0.6 });
      break;
    }
    case 3: case 11: { // crew on top while the floors go up
      if (ts.scaffold) [[0.2, MASON], [0.79, MASON2]].forEach(([a, o], i) => {
        const [x, y, z] = crewSpot(ts, a as number);
        out.places.push(person(cam, 20 + i, o as Outfit, x, y, z, { mode: "stand", expr: "grin", prop: i ? "block" : ["hammer", q(Math.abs(Math.sin(t * 4 + i)), 12)], blink: lidAt(t, 20 + i) }));
      });
      if (id === 11 && t > W.poetomu - 0.1) { // the mason with the banana in the foreground
        const [x, , z] = BANANA_AT, laugh = t > W.banan - L;
        out.places.push(person(cam, 25, MASON3, x, 0, z, { mode: "stand", expr: laugh ? "laugh" : "grin", prop: t > W.izognuta - 0.4 ? "banana" : null, blink: laugh ? 0 : lidAt(t, 25), facing: 1 }));
      }
      if (id === 11 && t < W.poetomu) folkAt(cam, t, out, [[-9, 18], [10, 16], [14, 20]], [], 330);
      break;
    }
    case 4: { // the mason with the plumb line, then everyone shocked
      const shock = t > W.krenitsya - L;
      const [x, y, z] = crewSpot(ts, 0.59);
      out.places.push(person(cam, 30, MASON, x, y, z, { mode: "stand", expr: shock ? "shock" : t > W.neskolko + 0.6 ? "nervous" : "neutral", prop: ["plumb", 0], blink: shock ? 0 : lidAt(t, 30) }));
      const [x2, y2, z2] = crewSpot(ts, 0.2);
      out.places.push(person(cam, 31, MASON2, x2, y2, z2, { mode: "stand", expr: shock ? "nervous" : "smile", blink: lidAt(t, 31), look: 1 }));
      folkAt(cam, t, out, [[-8, 17], [-5, 19.5], [6, 18], [10, 16.5]], [], 340);
      break;
    }
    case 5: case 10: case 14: { // cutaway effects on the soil face
      const face = CUTZ + 0.05;
      if (id === 5) { // drops glistening in the wet clay, press lines under the low side
        for (let i = 0; i < 14; i++) {
          const x = -7 + hh(i, 1) * 15, y = -1.5 - hh(i, 2) * 9, wob = 0.04 * Math.sin(t * 3 + i);
          out.fx.push({ key: "drop", cw: 200, ch: 200, draw: (p) => drop(p), x, y: y + wob, z: face, w: 0.7, h: 0.7, face: true });
        }
        if (t > W.prosedaet - 0.2) { const u = q(((t - W.prosedaet) * 1.2) % 1, 15); out.fx.push({ key: `press${u}`, cw: 320, ch: 220, draw: (p) => pressLines(p, u), x: 6, y: 1.4, z: face + 0.3, w: 3.6, h: 2.5, face: true }); }
      }
      if (id === 10) { // the tower squeezes: drops leave the clay outward and down
        const k = clamp01((t - (W.bashnya2 - 0.2)) / 3.4);
        for (let i = 0; i < 18; i++) {
          const sx = hh(i, 3) < 0.5 ? -1 : 1, x0 = sx * (1.0 + hh(i, 1) * 4.5), y0 = -1.5 - hh(i, 2) * 6;
          const u = clamp01(k * 1.4 - hh(i, 4) * 0.4);
          const x = x0 + sx * u * 7, y = y0 - u * 6;
          if (u >= 1) continue;
          out.fx.push({ key: "drop", cw: 200, ch: 200, draw: (p) => drop(p), x, y, z: face, w: 0.75 * (1 - 0.4 * u), h: 0.75 * (1 - 0.4 * u), face: true });
        }
        if (t < W.krepche) { const u = q((t * 1.3) % 1, 15); out.fx.push({ key: `press${u}`, cw: 320, ch: 220, draw: (p) => pressLines(p, u), x: 0, y: 1.6, z: face + 0.3, w: 4.4, h: 3.0, face: true }); }
      }
      if (id === 14) { // soil chunks ride up the auger; engineers carry buckets away
        const dir = new THREE.Vector3(Math.cos(-0.49), Math.sin(-0.49), 0);
        const len = 6 + 4.5 * smooth((t - (W.inzhenery - 0.3)) / 2.2);
        for (let i = 0; i < 6; i++) {
          const u = 1 - (((t * 0.5 + i / 6) % 1));
          const p0 = new THREE.Vector3(-14.5, 0.3, CUTZ - 2.0).addScaledVector(dir, len * u);
          out.fx.push({ key: "chunk", cw: 200, ch: 180, draw: (p) => chunk(p, "#8c7a68"), x: p0.x, y: p0.y, z: CUTZ + 0.75, w: 0.55, h: 0.5, face: true, rot: t * 3 + i });
        }
        [[-18.2, 0], [-11.0, 1]].forEach(([x0, i]) => {
          const walk = Math.sin(t * 1.3 + i * 2) * 1.6;
          const so: SideOpts = { mode: "march", phase: q((t * 1.4 + i * 0.5) % 1, 40), expr: "smile", stomp: 0.4, stride: 0.6, blink: lidAt(t, 60 + i) };
          out.places.push(person(cam, 60 + i, ENGINEER[i], x0 + walk, 0, CUTZ - 1.4 - i * 0.6, {}, 1, { so, mirror: Math.cos(t * 1.3 + i * 2) < 0 }));
        });
        out.places.push(person(cam, 62, ENGINEER[2], -15.8, 0, CUTZ - 3.6, { mode: "stand", expr: t > W.vypryamilas ? "laugh" : "stern", prop: "bucket", blink: lidAt(t, 62) }));
      }
      break;
    }
    case 6: { // a break: masons put the tools down
      const free = t > W.schastyu1 - L, wave = t > W.pereryv1 - L;
      [[-1.3, 10.6, MASON], [0.2, 11.2, MASON2], [1.6, 10.4, MASON3]].forEach(([x, z, o], i) => {
        const expr: Expr = !free ? "neutral" : wave ? (["laugh", "grin", "laugh"] as Expr[])[i] : (["relief_open", "relief", "grin"] as Expr[])[i];
        const prop: Prop = !free ? (i === 0 ? ["hammer", 0.3] : i === 1 ? "block" : "bucket") : null;
        out.places.push(person(cam, 40 + i, o as Outfit, x as number, 0, z as number, { mode: "stand", expr, prop, wave: wave && i !== 1 ? q(Math.sin(t * 9 + i), 30) : undefined, blink: lidAt(t, 40 + i) }));
        blob(out, x as number, 0, z as number, i === 2 ? 1.1 : 1);
      });
      if (free) out.fx.push({ key: "hammerGround", cw: 260, ch: 180, draw: hammerFx, x: -0.7, y: 0.03, z: 11.4, w: 0.7, h: 0.48, flat: true, rot: 0.4 });
      break;
    }
    case 7: { // a hundred years later: two old masons, beards, a leaf falling, zzz
      out.places.push(person(cam, 50, OLD, 0.55, 0, 10.2, { mode: "sit", expr: t > W.sto - L ? "dazed" : "neutral", blink: lidAt(t, 50) }));
      blob(out, 0.55, 0, 10.2, 1.1);
      out.places.push(person(cam, 51, OLD2, -0.95, 0, 10.0, { mode: "sit", expr: "dazed", blink: 1 }));
      blob(out, -0.95, 0, 10.0, 1.1);
      const u = q((t * 0.35) % 1, 30);
      out.fx.push({ key: "zzz", cw: 220, ch: 220, draw: zzz, x: -0.7, y: 1.85 + 0.3 * u, z: 10.0, w: 0.45, h: 0.45, rot: 0.1 });
      for (let i = 0; i < 3; i++) {
        const v = ((t * 0.25 + i / 3) % 1);
        out.fx.push({ key: `leaf${i % 2}`, cw: 200, ch: 200, draw: (p) => leaf(p, i % 2 ? "#e2a03a" : "#c8643f"), x: -1.6 + i * 1.2 + Math.sin(t * 2 + i) * 0.4, y: 4 - v * 4, z: 10.8, w: 0.25, h: 0.25, rot: t * 2 + i });
      }
      break;
    }
    case 8: folkAt(cam, t, out, [[-9, 15], [-6, 17.5], [-3, 15.8], [3.5, 16.5], [6.5, 18.5], [9, 15.5], [12, 17], [-12, 18]], [[W.spas - L, W.spas + 1.5]], 360); break;
    case 9: { // the kid squeezes a sponge over the tub
      const sq = Math.max(...[W.sozhmi + 0.15, W.voda + 0.1].map((s0) => Math.max(0, 1 - Math.abs(t - s0) / 0.45))), firm = t > W.tverdeet - L;
      const k = firm ? 0.85 : sq;
      out.places.push(person(cam, 70, KID_M, TUB[0], 0, TUB[2], { mode: "stand", expr: firm ? "grin" : sq > 0.3 ? "smile_closed" : "smile", prop: ["sponge", q(k, 20)], blink: lidAt(t, 70) }, 0.85));
      blob(out, TUB[0], 0, TUB[2], 0.85);
      const wet = t < W.tverdeet + 0.2;
      for (let i = 0; i < 6; i++) {
        const v = ((t * 1.6 + i / 6) % 1);
        if (!wet && v > 0.2) continue;
        const rate = sq > 0.2 ? 1 : 0.35;
        if (hh(i, Math.floor(t * 1.6 + i / 6)) > rate) continue;
        out.fx.push({ key: "drop", cw: 200, ch: 200, draw: (p) => drop(p), x: TUB[0] - 0.1 + (i % 3) * 0.1, y: 0.7 - v * 0.34, z: TUB[2] + 0.42, w: 0.05, h: 0.06 });
      }
      folkAt(cam, t, out, [[16, 18], [27, 20]], [], 380);
      break;
    }
    case 12: { // 1934 workers pour cement; the tower lurches
      const shock = t > W.naklonilas - L;
      out.places.push(person(cam, 80, WORKER[0], 11.2, 0, 13.4, { mode: "stand", expr: shock ? "shock" : "smile", blink: lidAt(t, 80) }));
      blob(out, 11.0, 0, 13.6);
      out.places.push(person(cam, 81, WORKER[1], 7.6, 0, 10.6, { mode: "stand", expr: shock ? "shock" : "grin", blink: lidAt(t, 81), look: -1 }));
      blob(out, 7.6, 0, 10.6);
      out.places.push(person(cam, 82, WORKER[2], 9.4, 0, 12.4, { mode: "stand", expr: shock ? "nervous" : "stern", blink: lidAt(t, 82), facing: -1 }));
      blob(out, 9.4, 0, 12.4, 1.1);
      if (t > W.zalili - 0.3 && t < W.naklonilas) { const u = q(((t - W.zalili) * 1.5) % 1, 12); out.fx.push({ key: `splat${u}`, cw: 300, ch: 300, draw: (p) => splat(p, u), x: 6.9, y: 0.25, z: 8.8, w: 1.1, h: 1.1 }); }
      break;
    }
    case 13: { // 1990 engineers measure how far the top hangs out
      const top = towerPt(ts, 7, R_OUT + 0.15, LEVEL_H[7] - 5.6, 0); top[0] = Math.max(top[0], R_OUT + 2.5);
      const base = R_OUT + 0.45;
      out.places.push(person(cam, 90, ENGINEER[0], top[0] + 0.5, 0, 1.4, { mode: "stand", expr: t > W.metra - L ? "shock" : "neutral", prop: "tape", blink: lidAt(t, 90) }));
      blob(out, top[0] + 0.5, 0, 1.4);
      out.places.push(person(cam, 91, ENGINEER[1], base + 0.6, 0, 1.8, { mode: "stand", expr: t > W.metra - L ? "nervous" : "smile", blink: lidAt(t, 91), facing: 1 }));
      blob(out, base + 0.6, 0, 1.8);
      const L2 = top[0] - base;
      out.fx.push({ key: "tape", cw: 1024, ch: 64, draw: tapeFx, x: base + L2 / 2, y: 0.03, z: 0.9, w: L2, h: 0.07, flat: true });
      out.places.push(person(cam, 92, ENGINEER[2], -4, 0, 15.5, { mode: "stand", expr: "stern", blink: lidAt(t, 92) }));
      break;
    }
    case 15: case 16: { // tourists
      const spots: [number, number, Prop][] = id === 15
        ? [[10.4, 27.4, "camera"], [12.3, 28.6, null], [9.4, 25.0, "icecream"], [12.0, 26.0, "camera"], [10.0, 29.6, null], [8.6, 27.8, "camera"]]
        : t < W.ochen - 0.2 ? [[4.6, 19.6, "camera"], [2.6, 18.2, null], [5.8, 17.4, "camera"]]
        : [[-4.0, 28.4, "camera"], [-2.4, 27.0, null], [-5.6, 26.6, "icecream"], [-1.4, 29.4, "camera"], [-3.4, 25.0, null], [-5.9, 29.6, "camera"]];
      spots.forEach(([x, z, pr], i) => {
        const o = TOURIST[i % TOURIST.length], kid = o.build === "kid";
        
        const bored = id === 16 && t > W.ochen - L;
        out.places.push(person(cam, 100 + i, o, x, 0, z, { mode: "stand", expr: bored ? (i % 2 ? "neutral" : "smile_closed") : (["smile", "grin", "smile_closed", "grin"] as Expr[])[i % 4], prop: kid ? "icecream" : pr, blink: lidAt(t, 100 + i) }, kid ? 0.72 : 1));
        blob(out, x, 0, z, kid ? 0.72 : 1);
      });
      if (id === 16) { // the tourist holding the tower up, still holding at the end
        const tired = t > W.ochen - L;
        const [hx, hz] = tired ? [-5.0, 30.6] : [3.0, 24.4];
        out.places.push(person(cam, 110, TOURIST[0], hx, 0, hz, { mode: "stand", expr: tired ? "nervous" : "grin", prop: "holdup", blink: lidAt(t, 110) }));
        blob(out, hx, 0, hz);
        if (tired) { const u = q((t * 0.8) % 1, 20); out.fx.push({ key: "sweat", cw: 200, ch: 200, draw: sweat, x: hx - 0.25, y: 1.95 - 0.2 * u, z: hz + 0.1, w: 0.08, h: 0.09 }); }
      }
      break;
    }
  }
  return out;
};
