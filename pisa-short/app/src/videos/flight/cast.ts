// The Pisa cast as lit flat cards in the 3D world (canvas pool, yaw-only billboards shaded by cardShade, soft contact
// blobs), plus unlit effect cards (drips, water drops in the clay, soil chunks, leaves, tape). Our own characters:
// medieval masons, an old bearded mason, a kid with a sponge, 1934 workers, 1990 engineers, modern tourists.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, KID, fxBurst, fxShadow, fxContact, fxSplash, fxStars, fxPuff, Outfit, Expr, FrontOpts, SideOpts, SKINS, Prop } from "./toon";
import * as THREE2 from "three";
import { FPS, SHOTS, V3, W, PlaneState, RAIL, DAYTON, RIVER, ROAD, TUNNEL, carX, planeAt, smooth, clamp01 } from "./story";
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
const WILBUR: Outfit = { jacket: "#3a3d47", pants: "#3b3f52", boots: "#1e1a22", hat: "cap", cap: "#6b7080", skin: SK[0], belt: null };
const ORVILLE: Outfit = { jacket: "#7a5a3e", pants: "#4a4038", boots: "#2a2024", hat: "hair", hair: "#5a3b2a", moustache: "#5a3b2a", skin: SK[1] };
const SAVER: Outfit[] = [
  { jacket: "#2f3a52", pants: "#2f3a52", boots: "#1e1a22", hat: "cap", cap: "#2f3a52", skin: SK[1], moustache: "#3a2a1e" },
  { jacket: "#2f3a52", pants: "#3b3f52", boots: "#1e1a22", hat: "cap", cap: "#2f3a52", skin: SK[3] },
  { jacket: "#3f4f6a", pants: "#2f3a52", boots: "#1e1a22", hat: "hair", hair: "#2a201a", skin: SK[2], build: "stout" },
  { jacket: "#2f3a52", pants: "#2f3a52", boots: "#1e1a22", hat: "cap", cap: "#f4f1ea", skin: SK[0], moustache: "#a07850" },
  { jacket: "#4a5a3a", pants: "#3b3f52", boots: "#1e1a22", hat: "hair", hair: "#5a3b2a", skin: SK[1] },
];
const FOLK: Outfit[] = [
  { jacket: "#3f6fb5", pants: "#3b3f52", boots: "#4a3426", hat: "tophat", skin: SK[0] },
  { jacket: "#c25a7a", pants: "#3b3f52", boots: "#4a3426", hat: "bonnet", dress: "#d9a441", skin: SK[1] },
  { jacket: "#5d7a3a", pants: "#4a4038", boots: "#4a3426", hat: "tophat", moustache: "#3a2a1e", skin: SK[3] },
  { jacket: "#2f5f6a", pants: "#3b3f52", boots: "#4a3426", hat: "bonnet", dress: "#5a8fc2", skin: SK[2] },
  { jacket: "#b5653f", pants: "#3b3f52", boots: "#4a3426", hat: "cap", cap: "#4a4f5a", moustache: "#2a201a", skin: SK[1], build: "stout" },
];
const KID_C: Outfit = { ...KID, skin: SK[0] };

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
const birdFx = (p: Pen, k: number) => { const w = 60 * (0.5 + 0.5 * Math.cos(k * Math.PI * 2)); p.stroke([[20, 100 - w * 0.4], [100, 100], [180, 100 - w * 0.4]], 14); };
const coinFx = (p: Pen, k: number) => { const sx = Math.abs(Math.cos(k * Math.PI)); p.ell(100, 100, 80 * Math.max(0.12, sx), 80, k % 1 < 0.5 ? "#e8c45a" : "#c9a23a", 9); if (sx > 0.4) p.ell(100, 100, 45 * sx, 45, null, 5); };
const streakFx = (p: Pen, k: number, up = 0) => {
  p.g.globalAlpha = 0.85;
  for (let i = 0; i < 5; i++) {
    const y = 40 + i * 32, x0 = ((k * 400 + i * 97) % 500) - 140;
    p.g.strokeStyle = "#ffffff"; p.g.lineWidth = 9; p.g.lineCap = "round";
    p.g.beginPath(); p.g.moveTo(x0 + 240, y); p.g.quadraticCurveTo(x0 + 120, y - up * (i < 3 ? 1 : 0.3) * 40, x0, y - up * (i < 3 ? 1 : 0.3) * 70); p.g.stroke();
  }
  p.g.globalAlpha = 1;
};
const handFx = (p: Pen) => { // bare forearm from the left and a big flat mitten hand (cartoon), thumb up
  p.band([[0, 124], [170, 118]], "#ffe2c2", 40, 7, "round");
  p.ell(240, 116, 88, 40, "#ffe2c2", 8);
  p.ell(206, 74, 18, 30, "#ffe2c2", 7, 0, 360, -20);
  p.ell(240, 116, 88, 40, null, 8);
  for (const y of [104, 126]) p.stroke([[262, y], [314, y]], 4, "#d9a98a");
};
const sandFx = (p: Pen, k: number) => {
  for (let i = 0; i < 9; i++) { const a = Math.PI * (0.1 + 0.8 * (i / 8)), r = 30 + 150 * k; p.ell(200 + Math.cos(a) * r * 1.4, 220 - Math.sin(a) * r, 34 * (1 - k) + 10, 26 * (1 - k) + 8, "#e2c99a", 6 * (1 - k) + 2); }
};
const hatFx = (p: Pen) => { p.poly([[60, 160], [140, 160], [130, 40], [70, 40]], "#2e2a36", 8); p.ell(100, 160, 70, 14, "#1d1b22", 8); };
const dashFx = (p: Pen) => { p.g.fillStyle = "#e2453c"; for (let x = 0; x < 2048; x += 64) p.g.fillRect(x, 8, 36, 48); };
const tripodFx = (p: Pen) => {
  p.stroke([[150, 160], [80, 420]], 9); p.stroke([[150, 160], [220, 420]], 9); p.stroke([[150, 160], [150, 420]], 9);
  p.poly([[90, 70], [210, 70], [210, 170], [90, 170]], "#5a3b2a", 8); p.ell(225, 120, 22, 30, "#2e2a36", 6);
  p.poly([[40, 60], [100, 60], [100, 180], [40, 180]], "#2e2a36", 6);
};
const bikeFx = (p: Pen) => {
  for (const cx of [90, 330]) { p.ell(cx, 200, 80, 80, null, 12); p.ell(cx, 200, 10, 10, "#2e2a36", 4); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.stroke([[cx, 200], [cx + Math.cos(a) * 76, 200 + Math.sin(a) * 76]], 2.5, "#5b6270"); } }
  p.band([[90, 200], [190, 110], [300, 110], [330, 200]], "#2f6a43", 12, 5, "round");
  p.band([[190, 110], [215, 200], [300, 110]], "#2f6a43", 12, 5, "round");
  p.band([[180, 80], [200, 110]], "#2f6a43", 10, 4); p.poly([[160, 70], [215, 70], [205, 84], [168, 84]], "#3a2a1e", 4);
  p.band([[300, 110], [310, 70]], "#c9ccd2", 8, 3); p.band([[290, 66], [340, 66]], "#c9ccd2", 8, 3);
};
const tinyWing = (p: Pen, k: number) => { p.poly([[10, 60 - k * 10], [90, 40], [190, 50], [190, 62], [90, 58], [10, 70]], "#c9ccd2", 6); };
const wingtipLines = (p: Pen) => { for (let i = 0; i < 3; i++) p.stroke([[20, 40 + i * 50], [180, 30 + i * 50]], 8, "#ffffff"); };

// ---------------- helpers ----------------
const eul = new THREE2.Euler(), m4 = new THREE2.Matrix4(), v3 = new THREE2.Vector3();
/** a point in the Flyer's frame (x forward, y up, z span), in world space */
const onPlane = (p: PlaneState, x: number, y: number, z: number): V3 => {
  eul.set(p.roll, 0, p.pitch, "XYZ"); m4.makeRotationFromEuler(eul).setPosition(p.x, p.y, p.z);
  v3.set(x, y, z).applyMatrix4(m4); return [v3.x, v3.y, v3.z];
};
/** the pilot lying prone on the lower wing, left of the engine, head forward: a side-view figure drawn rotated
 *  90 degrees into the bottom of an upright card (rolling the card itself made it vanish) */
const lyingDraw = (o: Outfit, so: SideOpts) => (p: Pen) => {
  const k = p.g.getTransform().a, off = document.createElement("canvas");
  off.width = Math.round(600 * k); off.height = Math.round(1000 * k);
  const og = off.getContext("2d")!; og.setTransform(k, 0, 0, k, 0, 0);
  bodySide(new Pen(og), o, so);
  const g = p.g; g.save(); g.translate(300, 795); g.rotate(Math.PI / 2); g.scale(0.6, 0.6); g.drawImage(off, -300, -500, 600, 1000); g.restore();
};
const pilot = (cam: CamInfo, out: Stage, p: PlaneState, t: number, expr: Expr) => {
  if (!p.pilot) return;
  const sgn = cam.right.x >= 0 ? 1 : -1, sc = 1.6, who = p.pilot === "wilbur" ? WILBUR : ORVILLE;
  const [x, y, z] = onPlane(p, -0.45, 0.86 - 180 * SU * sc, -0.45);
  const so: SideOpts = { mode: "stand", expr, blink: lidAt(t, p.pilot === "wilbur" ? 1 : 2), seed: 3 };
  const d = cam.pos.distanceTo(tmp.set(x, y + 0.6, z)) / sc;
  const [w, h, kk] = tier(d);
  out.places.push({ key: `LY|${p.pilot}|${fkey(so)}`, x, y, z, scale: sc, mirror: sgn < 0, roll: sgn * p.pitch, draw: lyingDraw(who, so), size: [w, h, kk] });
};
const stand = (cam: CamInfo, out: Stage, i: number, o: Outfit, x: number, z: number, fo: FrontOpts, sc = 1, y = 0) => {
  out.places.push(person(cam, i, o, x, y, z, { mode: "stand", blink: lidAt(0, i), ...fo }, sc));
  blob(out, x, y, z, sc);
};
const runner = (cam: CamInfo, out: Stage, i: number, o: Outfit, x: number, z: number, t: number, dir: 1 | -1, expr: Expr = "grin", rate = 1.8) => {
  const so: SideOpts = { mode: "march", phase: q((t * rate + i * 0.3) % 1, 40), expr, stomp: 0.7, stride: 0.9, blink: lidAt(t, i) };
  out.places.push(person(cam, i, o, x, 0, z, {}, 1, { so, mirror: dir * cam.right.x < 0 }));
  blob(out, x, 0, z);
};
const witnesses = (cam: CamInfo, out: Stage, t: number, spots: [number, number][], cheer: boolean) =>
  spots.forEach(([x, z], i) => stand(cam, out, 300 + i, SAVER[i % 5], x, z, { expr: cheer ? (["laugh", "grin", "laugh", "grin", "smile"] as Expr[])[i % 5] : (["neutral", "smile", "stern", "smile_closed", "neutral"] as Expr[])[i % 5], wave: cheer && i % 2 === 0 ? q(Math.sin(t * 9 + i), 30) : undefined, blink: lidAt(t, 300 + i) }));
const streaks = (out: Stage, t: number, x: number, y: number, z: number, w: number, up = 0, key = "s") => {
  const k = q((t * 1.4) % 1, 24);
  out.fx.push({ key: `streak${key}${k}${q(up, 10)}`, cw: 400, ch: 220, draw: (p) => streakFx(p, k, up), x, y, z, w, h: w * 0.55, soft: true });
};

// ---------------- per-shot staging ----------------
export const stage = (id: number, t: number, p: PlaneState, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  LNAME = SHOTS[id - 1].light;
  SUN = cam.sun.clone().normalize();
  const L = LEAD, [dx, , dz] = DAYTON, [rx, , rz] = RIVER, [tx, , tz] = TUNNEL;
  switch (id) {
    case 1: pilot(cam, out, p, t, "grin"); break;
    case 2: {
      stand(cam, out, 10, WILBUR, dx - 0.25, dz + 5.5, { expr: "stern", prop: ["hammer", q(Math.abs(Math.sin(t * 5)), 12)], blink: lidAt(t, 10) });
      stand(cam, out, 11, ORVILLE, dx + 1.05, dz + 5.7, { expr: "smile", blink: lidAt(t, 11), facing: -1 });
      out.fx.push({ key: "bike", cw: 420, ch: 300, draw: bikeFx, x: dx + 0.45, y: 0.55, z: dz + 6.3, w: 1.75, h: 1.25, face: true });
      if (t < W.brothers) for (let i = 0; i < 4; i++) { const x = dx - 9 + ((t * 1.2 + i * 5) % 20); runner(cam, out, 400 + i, FOLK[i % 5], x, dz + 9 + (i % 2) * 2, t, 1, "smile", 1.1); }
      break;
    }
    case 3: {
      stand(cam, out, 10, WILBUR, dx - 0.2, dz + 5.6, { expr: "smile", blink: lidAt(t, 10) });
      stand(cam, out, 11, ORVILLE, dx + 0.75, dz + 5.8, { expr: t > W.machine - L ? "grin" : "smile", blink: lidAt(t, 11) });
      for (let i = 0; i < 6; i++) {
        const u = ((t - 9.3) * 0.25 + i * 0.13);
        out.fx.push({ key: `bird${q((t * 2.2 + i * 0.3) % 1, 8)}`, cw: 200, ch: 160, draw: (pp) => birdFx(pp, q((t * 2.2 + i * 0.3) % 1, 8)), x: dx - 8 + u * 18, y: 8 + i * 1.1 + Math.sin(t + i) * 0.4, z: dz - 2 - i * 1.2, w: 1.6, h: 1.25 });
      }
      break;
    }
    case 4: {
      const laugh = t > W.everyone - L;
      stand(cam, out, 10, WILBUR, dx - 0.15, dz + 6.0, { expr: laugh ? "stern" : "neutral", blink: lidAt(t, 10) });
      stand(cam, out, 11, ORVILLE, dx + 0.85, dz + 6.1, { expr: laugh ? "nervous" : "neutral", blink: lidAt(t, 11) });
      ([[-1.3, 7.3], [1.9, 7.1], [-0.9, 4.7], [1.5, 4.9], [0.35, 4.2]] as const).forEach(([ox, oz], i) =>
        stand(cam, out, 420 + i, FOLK[i % 5], dx + ox, dz + oz, { expr: laugh ? (i % 2 ? "laugh" : "grin") : "smile", blink: lidAt(t, 420 + i), facing: ox > 0.4 ? -1 : 1 }));
      break;
    }
    case 5: {
      const shock = t > W.falls - L;
      stand(cam, out, 50, SAVER[1], rx + 0.5, rz + 1.2, { expr: shock ? "shock" : "smile", blink: lidAt(t, 50) }, 1, 4.9);
      stand(cam, out, 51, FOLK[2], rx + 2.4, rz + 1.5, { expr: shock ? "shock" : "grin", blink: lidAt(t, 51) }, 1, 4.9);
      const tImp = W.falls - 0.35 + 1.15;
      if (t > tImp && t < tImp + 1.0) { const u = q((t - tImp) / 1.0, 30); out.fx.push({ key: `splash${u}`, cw: 800, ch: 800, draw: (pp) => fxSplash(pp, u), x: rx + 11, y: 2.4, z: rz, w: 7, h: 7 }); }
      break;
    }
    case 6: {
      stand(cam, out, 60, WILBUR, tx - 0.15, tz - 0.95, { expr: t > W.test - L ? "smile_closed" : "neutral", blink: lidAt(t, 60), look: -1 });
      stand(cam, out, 61, ORVILLE, tx - 1.4, tz - 0.9, { expr: "grin", blink: lidAt(t, 61), look: 1 });
      for (let i = 0; i < 24; i++) out.fx.push({ key: `tw${i % 4}`, cw: 200, ch: 100, draw: (pp) => tinyWing(pp, i % 4), x: tx - 2.45 + (i % 8) * 0.13, y: 0.905, z: tz - 0.35 + Math.floor(i / 8) * 0.28, w: 0.11, h: 0.055, flat: true, rot: 0.1 * (i % 3) });
      streaks(out, t, tx, 1.15, tz + 0.27, 1.4, 0, "t");
      break;
    }
    case 7: {
      const x = carX(t);
      out.places.push(person(cam, 70, KID_C, x - 1.05, 0.6, ROAD[2] + 0.1, { mode: "stand", expr: t > W.pushes - L ? "laugh" : "grin", blink: lidAt(t, 70) }, 0.62));
      const tilt = smooth((t - (W.tilt - 0.05)) / 0.35), rise = smooth((t - (W.pushes - 0.05)) / 0.5) * 0.22 + 0.03 * Math.sin(t * 9) * smooth((t - W.pushes) / 0.5);
      out.fx.push({ key: "hand", cw: 340, ch: 200, draw: handFx, x: x - 0.75, y: 1.33 + rise, z: ROAD[2] + 1.1, w: 0.58, h: 0.34, rot: 0.38 * tilt });
      if (t > W.hand) streaks(out, t, x - 0.6, 1.3 + rise * 0.5, ROAD[2] + 1.15, 1.2, smooth((t - W.air) / 0.4), "h");
      break;
    }
    case 8: {
      pilot(cam, out, p, t, "smile");
      stand(cam, out, 80, WILBUR, p.x + 2.6, 6.9, { expr: t > W.bigger - L ? "grin" : "smile", blink: lidAt(t, 80) });
      if (t > W.wing9 - 0.3) streaks(out, t, p.x, p.y + 0.4, 6.4, 3.2, smooth((t - W.wing9) / 0.5), "w");
      break;
    }
    case 9: {
      stand(cam, out, 90, WILBUR, RAIL.x0 + 1.5, 4.0, { expr: "smile", blink: lidAt(t, 90) });
      stand(cam, out, 91, ORVILLE, RAIL.x0 + 3.0, 4.3, { expr: "grin", blink: lidAt(t, 91) });
      witnesses(cam, out, t, [[-14, -10], [-11.5, -9.5], [-9, -10.5]], false);
      for (let i = 0; i < 5; i++) { const u = ((t * 0.9 + i * 0.21) % 1); out.fx.push({ key: `sandpuff${q(u, 10)}`, cw: 200, ch: 200, draw: (pp) => fxPuff(pp, q(u, 10)), x: 20 - u * 30, y: 0.4 + u * 0.6, z: -4 + i * 3, w: 1.6, h: 1.0, soft: true }); }
      break;
    }
    case 10: {
      const won = t > W.wilbur - L;
      stand(cam, out, 100, WILBUR, RAIL.x0 + 0.8, 3.4, { expr: won ? "laugh" : "smile", blink: lidAt(t, 100), wave: won ? q(Math.sin(t * 9), 30) : undefined });
      stand(cam, out, 101, ORVILLE, RAIL.x0 + 2.05, 3.45, { expr: won ? "neutral" : "grin", blink: lidAt(t, 101) });
      const t0 = W.flip, t1 = W.first11;
      if (t > t0 - 0.1 && t < t1 + 0.1) {
        const u = clamp01((t - t0) / (t1 - t0)), y = 1.35 + 2.6 * Math.sin(Math.PI * u);
        out.fx.push({ key: `coin${q((t * 6) % 1, 12)}`, cw: 200, ch: 200, draw: (pp) => coinFx(pp, q((t * 6) % 1, 12)), x: RAIL.x0 + 1.15 + 0.1 * u, y, z: 3.55, w: 0.16, h: 0.16 });
      }
      break;
    }
    case 11: {
      pilot(cam, out, p, t, t < W.crashes ? "grin" : "dazed");
      stand(cam, out, 110, ORVILLE, RAIL.x0 + 1.2, 2.6, { expr: t > W.crashes - L ? "shock" : "smile", blink: lidAt(t, 110) });
      witnesses(cam, out, t, [[RAIL.x0 + 9, 6.5], [RAIL.x0 + 10.5, 7.2], [RAIL.x0 + 12, 6.4]], false);
      if (t > W.crashes && t < W.crashes + 0.8) { const u = q((t - W.crashes) / 0.8, 20); out.fx.push({ key: `sand${u}`, cw: 400, ch: 300, draw: (pp) => sandFx(pp, u), x: p.x + 3.4, y: 0.7, z: 0.6, w: 3.2, h: 2.4 }); }
      if (t > W.crashes + 0.4) { const u = (t * 0.9) % 1; out.fx.push({ key: `stars${q(u, 30)}`, cw: 420, ch: 210, draw: (pp) => fxStars(pp, q(u, 30)), x: p.x - 0.4, y: 1.7, z: -0.2, w: 0.9, h: 0.45 }); }
      break;
    }
    case 12: {
      pilot(cam, out, p, t, "grin");
      stand(cam, out, 120, WILBUR, RAIL.x0 + 5.6, 6.8, { expr: "smile", blink: lidAt(t, 120) });
      witnesses(cam, out, t, [[RAIL.x0 + 7.6, 3.8], [RAIL.x0 + 9.0, 4.4]], false);
      out.fx.push({ key: "tripod", cw: 300, ch: 440, draw: tripodFx, x: RAIL.x0 + 6.6, y: 0.75, z: 3.6, w: 0.9, h: 1.32 });
      break;
    }
    case 13: {
      pilot(cam, out, p, t, t > W.lifts - L ? "laugh" : "grin");
      const runX = Math.min(p.x + 0.4, RAIL.x1 - 1.6);
      if (t < W.roars + 0.15) stand(cam, out, 130, WILBUR, p.x - 1.6, 6.9, { expr: "smile", blink: lidAt(t, 130) });
      else runner(cam, out, 130, WILBUR, runX, 6.7, t, 1, t > W.lifts - L ? "laugh" : "grin", 2.2);
      witnesses(cam, out, t, [[RAIL.x1 + 2, 7.5], [RAIL.x1 + 3.6, 8.2], [RAIL.x1 + 5.2, 7.6]], t > W.lifts);
      if (t > W.engine) for (let i = 0; i < 3; i++) { const u = ((t * 1.6 + i / 3) % 1); const [ex, ey, ez] = onPlane(p, -0.2 - u * 1.4, 1.2 + u * 0.6, 0.75); out.fx.push({ key: `puff${q(u, 10)}`, cw: 200, ch: 200, draw: (pp) => fxPuff(pp, q(u, 10)), x: ex, y: ey, z: ez, w: 0.5 + u * 0.6, h: 0.5 + u * 0.6, soft: true }); }
      break;
    }
    case 14: pilot(cam, out, p, t, "laugh"); break;
    case 15: {
      pilot(cam, out, p, t, "grin");
      const cheer = t > W.luckily - L;
      witnesses(cam, out, t, [[p.x - 3, 4.2], [p.x - 1.5, 5.4], [p.x + 0.5, 4.6], [p.x + 2.4, 5.6], [p.x + 4, 4.4]], cheer);
      runner(cam, out, 150, WILBUR, p.x - 8 + Math.min(4, (t - 55.8) * 2.4), 3.0, t, 1, "laugh", 2.2);
      if (t > W.change - L) for (let i = 0; i < 3; i++) { const u = clamp01((t - W.change + i * 0.15) / 1.6); out.fx.push({ key: "hat", cw: 200, ch: 200, draw: hatFx, x: p.x - 1.5 + i * 2, y: 2.0 + 3.5 * Math.sin(Math.PI * u), z: 5, w: 0.35, h: 0.35, rot: u * 9 }); }
      break;
    }
    case 16: {
      const shock = t > W.gust - L;
      streaks(out, t, p.x + 4, 1.6, 3, 6, 0.2, "g");
      streaks(out, t + 0.37, p.x + 1, 3.2, 2, 5, 0.1, "g2");
      runner(cam, out, 160, WILBUR, p.x - 5 + (shock ? (t - W.gust) * 1.6 : 0), 4.5, t, 1, shock ? "shock" : "smile", shock ? 2.2 : 0.01);
      runner(cam, out, 161, ORVILLE, p.x - 7 + (shock ? (t - W.gust) * 1.4 : 0), 5.4, t, 1, shock ? "shock" : "grin", shock ? 2.0 : 0.01);
      runner(cam, out, 162, SAVER[0], p.x - 3 + (shock ? (t - W.gust) * 1.2 : 0), 6.2, t, 1, shock ? "nervous" : "smile", shock ? 2.0 : 0.01);
      break;
    }
    case 17: {
      stand(cam, out, 170, WILBUR, p.x - 1.6, 2.6, { expr: "neutral", blink: lidAt(t, 170) });
      stand(cam, out, 171, ORVILLE, p.x + 1.7, 2.9, { expr: t > W.again - L ? "nervous" : "neutral", blink: lidAt(t, 171) });
      break;
    }
    case 18: {
      if (t > W.today) { const k = smooth((t - W.today) / 1.4); out.fx.push({ key: "dash", cw: 2048, ch: 64, draw: dashFx, x: RAIL.x1 - 2 + 18.5 * k, y: 0.06, z: 0, w: 37 * k + 0.01, h: 0.5, flat: true }); }
      break;
    }
    case 19: pilot(cam, out, p, t, "grin"); break;
    case 20: {
      pilot(cam, out, p, t, t > W.notbad - L ? "laugh" : "grin");
      if (t > W.notbad - 0.2) {
        witnesses(cam, out, t, [[p.x - 4, 4.6], [p.x - 2.4, 5.6], [p.x + 2.6, 5.0]], true);
        runner(cam, out, 200, ORVILLE, p.x - 6 + Math.min(4, (t - W.notbad) * 2.2), 3.2, t, 1, "laugh", 2.2);
      }
      break;
    }
  }
  return out;
};
