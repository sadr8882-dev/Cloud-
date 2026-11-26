// Blocky critters for "The Wrong Button" (our own designs, same toy-brick look as the dog):
//  Cow: white with black patches, pink snout, little horns, swinging tail; floats with dangling legs.
//  Chicken: the mailman after the button: white hen with a red comb, a yellow beak, orange legs, flapping wings,
//  still wearing his blue mail cap and brown satchel. 1 unit = 1 m.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { twoTone } from "./shade";

const INK = "#241726";
const mats = new Map<string, THREE.Material>();
const mat = (c: string) => { let m = mats.get(c); if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ color: c })); mats.set(c, m); } return m; };
const rb = (w: number, h: number, d: number, r = 0.04) => new RoundedBoxGeometry(w, h, d, 3, r);
const texMat = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  let m = mats.get(key);
  if (m) return m;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  m = twoTone(new THREE.MeshLambertMaterial({ map: t })); mats.set(key, m); return m;
};
const patches = (seed: number) => texMat("cowHide" + seed, 256, 256, (g) => {
  g.fillStyle = "#f7f4ee"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#26222c";
  for (let i = 0; i < 6; i++) {
    const x = ((i * 97 + seed * 53) % 256), y = ((i * 61 + seed * 29) % 256), r = 26 + ((i * 13 + seed) % 22);
    g.beginPath(); for (let k = 0; k <= 10; k++) { const a = (k / 10) * Math.PI * 2, rr = r * (0.75 + 0.35 * Math.sin(k * 2.3 + i)); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill();
  }
});
const cowFace = (blink: boolean, moo: boolean) => texMat(`cowFace${blink}${moo}`, 256, 256, (g) => {
  g.fillStyle = "#f7f4ee"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#26222c"; g.beginPath(); g.ellipse(70, 60, 50, 40, 0.3, 0, 7); g.fill();
  g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 9; g.lineCap = "round";
  for (const x of [80, 176]) {
    if (blink) { g.beginPath(); g.arc(x, 110, 16, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); continue; }
    g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(x, 112, 20, 24, 0, 0, 7); g.fill(); g.lineWidth = 5; g.stroke();
    g.fillStyle = INK; g.beginPath(); g.ellipse(x + 2, 116, 10, 13, 0, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(x + 6, 110, 4, 0, 7); g.fill();
  }
  void moo;
});
const snout = (moo: boolean) => texMat(`cowSnout${moo}`, 256, 128, (g) => {
  g.fillStyle = "#f4a3b4"; g.fillRect(0, 0, 256, 128); g.fillStyle = "#9a4a5a";
  g.beginPath(); g.ellipse(80, 50, 16, 20, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(176, 50, 16, 20, 0, 0, 7); g.fill();
  if (moo) { g.fillStyle = "#5a1e28"; g.beginPath(); g.ellipse(128, 100, 46, 22, 0, 0, 7); g.fill(); }
  else { g.strokeStyle = "#5a1e28"; g.lineWidth = 7; g.beginPath(); g.arc(128, 70, 40, Math.PI * 0.25, Math.PI * 0.75); g.stroke(); }
});

export type CowPose = { x: number; y: number; z: number; yaw: number; float: number; spin: number; moo?: boolean; seed: number };
export class Cow {
  root = new THREE.Group();
  private body = new THREE.Group(); private head = new THREE.Group(); private tail = new THREE.Group();
  private legs: THREE.Group[] = []; private face: THREE.Mesh; private nose: THREE.Mesh; private hide: THREE.Mesh;
  constructor(parent: THREE.Object3D, seed: number) {
    const M = (g: THREE.BufferGeometry, m: THREE.Material, p: THREE.Object3D) => { const x = new THREE.Mesh(g, m); x.castShadow = true; x.receiveShadow = true; p.add(x); return x; };
    this.body.position.y = 1.0; this.root.add(this.body);
    this.hide = M(rb(0.95, 0.8, 1.7, 0.14), patches(seed), this.body);
    M(rb(0.36, 0.18, 0.36, 0.06).translate(0, -0.46, -0.35), mat("#f4a3b4"), this.body); // udder
    for (const [x, z] of [[-0.3, 0.6], [0.3, 0.6], [-0.3, -0.6], [0.3, -0.6]]) {
      const g = new THREE.Group(); g.position.set(x, -0.32, z); this.body.add(g); this.legs.push(g);
      M(rb(0.22, 0.62, 0.22, 0.05).translate(0, -0.31, 0), mat("#f7f4ee"), g);
      M(rb(0.24, 0.14, 0.26, 0.04).translate(0, -0.6, 0.01), mat("#3a3036"), g);
    }
    this.head.position.set(0, 0.32, 0.88); this.body.add(this.head);
    M(rb(0.62, 0.56, 0.52, 0.1).translate(0, 0.0, 0.2), mat("#f7f4ee"), this.head);
    this.face = M(new THREE.PlaneGeometry(0.56, 0.5).translate(0, 0.02, 0.465), cowFace(false, false), this.head);
    this.nose = M(rb(0.5, 0.26, 0.2, 0.06).translate(0, -0.2, 0.5), mat("#f4a3b4"), this.head);
    M(new THREE.PlaneGeometry(0.46, 0.23).translate(0, -0.2, 0.602), snout(false), this.head).name = "snoutFace";
    for (const s of [-1, 1]) {
      M(new THREE.ConeGeometry(0.06, 0.24, 8).translate(0, 0.12, 0).rotateZ(-s * 0.5).translate(s * 0.22, 0.28, 0.12), mat("#f1e3b4"), this.head);
      M(rb(0.26, 0.1, 0.16, 0.03).translate(s * 0.42, 0.14, 0.12), mat("#f7f4ee"), this.head);
    }
    M(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 14).rotateX(Math.PI / 2).translate(0, -0.42, 0.42), mat("#e9c24a"), this.head); // bell
    this.tail.position.set(0, 0.25, -0.86); this.body.add(this.tail);
    M(rb(0.06, 0.6, 0.06, 0.02).translate(0, -0.3, 0), mat("#f7f4ee"), this.tail);
    M(rb(0.12, 0.16, 0.12, 0.04).translate(0, -0.62, 0), mat("#26222c"), this.tail);
    this.root.visible = false; parent.add(this.root);
  }
  set(c: CowPose, t: number) {
    const r = this.root; r.visible = true; r.position.set(c.x, c.y, c.z); r.rotation.set(0, c.yaw + c.spin, 0);
    const fl = c.float;
    this.body.rotation.set(0.12 * fl * Math.sin(t * 1.1 + c.seed), 0, 0.15 * fl * Math.sin(t * 0.9 + c.seed));
    this.legs.forEach((g, i) => { g.rotation.x = fl * 0.35 * Math.sin(t * 2.6 + i * 1.7); g.rotation.z = fl * (i % 2 ? -0.25 : 0.25); });
    this.tail.rotation.set(0.3, 0, 0.5 * Math.sin(t * 3 + c.seed));
    this.head.rotation.set(c.moo ? -0.25 : 0.05 * Math.sin(t * 1.3), 0.2 * Math.sin(t * 0.7 + c.seed), 0);
    const blink = (Math.floor(t * 30 + c.seed * 17) % 97) < 4;
    this.face.material = cowFace(blink, !!c.moo);
    const sf = this.head.getObjectByName("snoutFace") as THREE.Mesh; sf.material = snout(!!c.moo);
    void this.nose; void this.hide;
  }
  hide2() { this.root.visible = false; }
}

const henFace = (blink: boolean, happy: boolean) => texMat(`henFace${blink}${happy}`, 256, 256, (g) => {
  g.fillStyle = "#fbf8f2"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 9; g.lineCap = "round";
  for (const x of [72, 184]) {
    if (blink || happy) { g.beginPath(); g.arc(x, 120, 18, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); continue; }
    g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(x, 118, 22, 26, 0, 0, 7); g.fill(); g.lineWidth = 5; g.stroke();
    g.fillStyle = INK; g.beginPath(); g.ellipse(x, 122, 10, 13, 0, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(x + 4, 116, 4, 0, 7); g.fill();
  }
  g.fillStyle = "#ff9ab0"; g.globalAlpha = 0.6; g.beginPath(); g.ellipse(46, 168, 20, 12, 0, 0, 7); g.ellipse(210, 168, 20, 12, 0, 0, 7); g.fill(); g.globalAlpha = 1;
});
export type HenPose = { x: number; y: number; z: number; yaw: number; walk?: number; flap?: number; happy?: boolean; squat?: number; peck?: number };
export class Hen {
  root = new THREE.Group();
  private body = new THREE.Group(); private head = new THREE.Group(); private wings: THREE.Group[] = []; private legs: THREE.Group[] = [];
  private face: THREE.Mesh;
  constructor(parent: THREE.Object3D) {
    const M = (g: THREE.BufferGeometry, m: THREE.Material, p: THREE.Object3D) => { const x = new THREE.Mesh(g, m); x.castShadow = true; x.receiveShadow = true; p.add(x); return x; };
    this.body.position.y = 0.5; this.root.add(this.body);
    M(rb(0.62, 0.6, 0.72, 0.18).translate(0, 0.08, 0), mat("#fbf8f2"), this.body);
    M(rb(0.4, 0.34, 0.2, 0.08).rotateX(-0.6).translate(0, 0.38, -0.36), mat("#fbf8f2"), this.body); // tail feathers
    for (const s of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(s * 0.32, 0.22, 0); this.body.add(w); this.wings.push(w);
      M(rb(0.08, 0.36, 0.48, 0.04).translate(0, -0.15, -0.02), mat("#efe9df"), w);
      const l = new THREE.Group(); l.position.set(s * 0.14, -0.2, 0.04); this.body.add(l); this.legs.push(l);
      M(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 6).translate(0, -0.16, 0), mat("#f2a33a"), l);
      M(rb(0.14, 0.04, 0.2, 0.015).translate(0, -0.32, 0.05), mat("#f2a33a"), l);
    }
    // satchel on a strap
    M(rb(0.12, 0.3, 0.32, 0.03).translate(0.36, -0.02, 0.05), mat("#8a5a34"), this.body);
    M(new THREE.BoxGeometry(0.66, 0.05, 0.05).rotateZ(0.7).translate(0.06, 0.18, 0.37), mat("#6a4428"), this.body);
    M(new THREE.PlaneGeometry(0.2, 0.12).rotateY(Math.PI / 2).translate(0.43, 0.1, 0.05), mat("#f7f1e1"), this.body); // letters peeking out
    this.head.position.set(0, 0.42, 0.26); this.body.add(this.head);
    M(rb(0.4, 0.4, 0.38, 0.12).translate(0, 0.18, 0.04), mat("#fbf8f2"), this.head);
    this.face = M(new THREE.PlaneGeometry(0.36, 0.3).translate(0, 0.2, 0.235), henFace(false, false), this.head);
    M(new THREE.ConeGeometry(0.07, 0.18, 4).rotateX(Math.PI / 2).translate(0, 0.12, 0.32), mat("#f6b324"), this.head); // beak
    M(rb(0.08, 0.12, 0.06, 0.02).translate(0, 0.0, 0.25), mat("#e2332e"), this.head); // wattle
    // the mail cap (blue, peaked) sitting on the comb
    M(rb(0.42, 0.13, 0.42, 0.04).translate(0, 0.43, 0.02), mat("#24365e"), this.head);
    M(rb(0.32, 0.03, 0.18, 0.01).translate(0, 0.38, 0.26), mat("#1a2848"), this.head);
    M(rb(0.12, 0.06, 0.02, 0.01).translate(0, 0.44, 0.235), mat("#e9c24a"), this.head); // badge
    for (let i = 0; i < 3; i++) M(rb(0.06, 0.14, 0.08, 0.03).translate(0, 0.53, -0.1 + i * 0.09), mat("#e2332e"), this.head); // comb poking out
    this.root.visible = false; parent.add(this.root);
  }
  set(h: HenPose, t: number) {
    const r = this.root; r.visible = true; r.position.set(h.x, h.y, h.z); r.rotation.set(0, h.yaw, 0);
    const w = h.walk ?? 0, ph = t * 7, fl = h.flap ?? 0, sq = h.squat ?? 0;
    this.legs[0].rotation.x = w * 0.6 * Math.sin(ph); this.legs[1].rotation.x = -w * 0.6 * Math.sin(ph);
    this.body.position.y = 0.5 + w * 0.03 * Math.abs(Math.sin(ph)) - sq * 0.18;
    this.body.rotation.z = w * 0.06 * Math.sin(ph);
    this.wings.forEach((g, i) => { g.rotation.z = (i ? -1 : 1) * (0.05 + fl * (0.6 + 0.6 * Math.sin(t * 24))); });
    this.head.position.z = 0.26 + w * 0.06 * Math.sin(ph * 2) + (h.peck ?? 0) * 0.1;
    this.head.rotation.x = (h.peck ?? 0) * 0.5;
    const blink = (Math.floor(t * 30) % 83) < 4;
    this.face.material = henFace(blink, !!h.happy);
  }
  hide() { this.root.visible = false; }
}

// ---------------- the duck (part 2): white, orange beak and feet, flapping wings; can carry the fishing rod ----------------
const duckFace = (angry: boolean, blink: boolean) => texMat(`duckFace${angry}${blink}`, 256, 128, (g) => {
  g.fillStyle = "#fbf8f2"; g.fillRect(0, 0, 256, 128); g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 8; g.lineCap = "round";
  for (const x of [64, 192]) {
    if (blink) { g.beginPath(); g.moveTo(x - 16, 70); g.lineTo(x + 16, 70); g.stroke(); continue; }
    g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(x, 70, 20, 24, 0, 0, 7); g.fill(); g.lineWidth = 5; g.stroke();
    g.fillStyle = INK; g.beginPath(); g.ellipse(x, 74, 9, 12, 0, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(x + 4, 68, 4, 0, 7); g.fill();
    if (angry) { g.lineWidth = 8; g.beginPath(); g.moveTo(x - 22, x < 128 ? 34 : 46); g.lineTo(x + 22, x < 128 ? 46 : 34); g.stroke(); }
  }
});
export type DuckPose = { x: number; y: number; z: number; yaw: number; walk?: number; flap?: number; angry?: boolean; quack?: number; rod?: boolean };
export class Duck {
  root = new THREE.Group();
  private body = new THREE.Group(); private head = new THREE.Group(); private wings: THREE.Group[] = []; private legs: THREE.Group[] = [];
  private face: THREE.Mesh; private jaw: THREE.Mesh; private rod = new THREE.Group();
  constructor(parent: THREE.Object3D) {
    const M = (g: THREE.BufferGeometry, m: THREE.Material, p: THREE.Object3D) => { const x = new THREE.Mesh(g, m); x.castShadow = true; x.receiveShadow = true; p.add(x); return x; };
    this.body.position.y = 0.26; this.root.add(this.body);
    M(rb(0.34, 0.26, 0.46, 0.12), mat("#fbf8f2"), this.body);
    M(rb(0.2, 0.14, 0.14, 0.05).rotateX(-0.5).translate(0, 0.12, -0.24), mat("#fbf8f2"), this.body);
    for (const s of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(s * 0.17, 0.07, 0); this.body.add(w); this.wings.push(w);
      M(rb(0.05, 0.18, 0.3, 0.03).translate(0, -0.05, -0.02), mat("#ece6dc"), w);
      const l = new THREE.Group(); l.position.set(s * 0.08, -0.12, 0.02); this.body.add(l); this.legs.push(l);
      M(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 6).translate(0, -0.07, 0), mat("#f2a33a"), l);
      M(rb(0.1, 0.02, 0.12, 0.008).translate(0, -0.14, 0.04), mat("#f2a33a"), l);
    }
    this.head.position.set(0, 0.2, 0.16); this.body.add(this.head);
    M(rb(0.12, 0.16, 0.12, 0.05).translate(0, 0.0, 0), mat("#fbf8f2"), this.head); // neck
    M(rb(0.22, 0.2, 0.2, 0.08).translate(0, 0.14, 0.03), mat("#fbf8f2"), this.head);
    this.face = M(new THREE.PlaneGeometry(0.2, 0.1).translate(0, 0.17, 0.132), duckFace(false, false), this.head);
    M(rb(0.13, 0.04, 0.12, 0.015).translate(0, 0.11, 0.19), mat("#f6a324"), this.head);
    this.jaw = M(rb(0.12, 0.03, 0.11, 0.012).translate(0, -0.015, 0.055), mat("#e88a1a"), this.head);
    this.jaw.position.set(0, 0.09, 0.135);
    // the fishing rod held crosswise in the beak
    M(new THREE.CylinderGeometry(0.012, 0.018, 1.5, 8).rotateZ(Math.PI / 2).translate(0.35, 0, 0), mat("#8a5a34"), this.rod);
    M(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12).rotateX(Math.PI / 2).translate(-0.2, -0.04, 0), mat("#3b3f52"), this.rod);
    this.rod.position.set(0, 0.1, 0.2); this.head.add(this.rod);
    this.root.visible = false; parent.add(this.root);
  }
  set(d: DuckPose, t: number) {
    const r = this.root; r.visible = true; r.position.set(d.x, d.y, d.z); r.rotation.set(0, d.yaw, 0);
    const w = d.walk ?? 0, ph = t * 12;
    this.legs[0].rotation.x = w * 0.8 * Math.sin(ph); this.legs[1].rotation.x = -w * 0.8 * Math.sin(ph);
    this.body.rotation.z = w * 0.15 * Math.sin(ph); this.body.position.y = 0.26 + w * 0.02 * Math.abs(Math.sin(ph));
    this.wings.forEach((g, i) => { g.rotation.z = (i ? -1 : 1) * (0.05 + (d.flap ?? 0) * (0.7 + 0.6 * Math.sin(t * 26))); });
    this.head.rotation.x = -0.15 * (d.quack ?? 0);
    this.jaw.rotation.x = 0.5 * (d.quack ?? 0);
    this.rod.visible = !!d.rod;
    const blink = (Math.floor(t * 30) % 71) < 4;
    this.face.material = duckFace(!!d.angry, blink);
  }
  hide() { this.root.visible = false; }
}

// ---------------- small 3D props (pooled per kind) ----------------
export type PropKind = "wagon" | "rod" | "cap" | "book" | "dino" | "pan" | "stack" | "plate" | "chest" | "bowl" | "nozzle";
export type PropPlace = { kind: PropKind; p: [number, number, number]; yaw?: number; s?: number; open?: number; burnt?: boolean; tilt?: number };
const makeProp = (kind: PropKind): THREE.Group => {
  const g = new THREE.Group();
  const M = (geo: THREE.BufferGeometry, c: string | THREE.Material) => { const x = new THREE.Mesh(geo, typeof c === "string" ? mat(c) : c); x.castShadow = true; x.receiveShadow = true; g.add(x); return x; };
  if (kind === "wagon") {
    M(rb(0.7, 0.28, 1.1, 0.04).translate(0, 0.42, 0), "#d8302c"); M(rb(0.6, 0.06, 1.0, 0.02).translate(0, 0.55, 0), "#b8241f");
    for (const [x, z] of [[-0.36, 0.38], [0.36, 0.38], [-0.36, -0.38], [0.36, -0.38]]) { M(new THREE.CylinderGeometry(0.15, 0.15, 0.07, 18).rotateZ(Math.PI / 2).translate(x, 0.15, z), "#2e2a36"); M(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 10).rotateZ(Math.PI / 2).translate(x, 0.15, z), "#c9c9c9"); }
    M(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8).rotateX(Math.PI / 2 - 0.35).translate(0, 0.45, 0.95), "#2e2a36");
    M(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8).rotateZ(Math.PI / 2).translate(0, 0.6, 1.36), "#2e2a36");
  } else if (kind === "rod") {
    M(new THREE.CylinderGeometry(0.012, 0.02, 1.7, 8).translate(0, 0.85, 0), "#8a5a34"); M(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 12).rotateZ(Math.PI / 2).translate(0.04, 0.3, 0), "#3b3f52");
    M(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 8).translate(0, 0.14, 0), "#3a2a1e");
  } else if (kind === "cap") {
    M(new THREE.SphereGeometry(0.15, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1.05), "#c92a2a");
    M(rb(0.24, 0.02, 0.14, 0.008).translate(0, 0.005, 0.18), "#a81f1f"); M(new THREE.SphereGeometry(0.025, 8, 6).translate(0, 0.11, 0), "#a81f1f");
    M(new THREE.PlaneGeometry(0.1, 0.07).translate(0, 0.06, 0.153).rotateX(-0.25), texMat("capD", 64, 48, (c) => { c.fillStyle = "#c92a2a"; c.fillRect(0, 0, 64, 48); c.fillStyle = "#fbf6ea"; c.font = "900 40px Arial Black, DejaVu Sans, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("D", 32, 26); }));
  } else if (kind === "book") {
    M(rb(0.32, 0.06, 0.42, 0.01), "#2f6fa8"); M(new THREE.BoxGeometry(0.3, 0.045, 0.4).translate(0.01, 0, 0), "#fbf3e2");
    M(new THREE.PlaneGeometry(0.2, 0.08).rotateX(-Math.PI / 2).translate(0, 0.031, -0.05), texMat("bookT", 128, 52, (c) => { c.fillStyle = "#2f6fa8"; c.fillRect(0, 0, 128, 52); c.fillStyle = "#f3d35a"; c.font = "900 18px Arial Black, DejaVu Sans, sans-serif"; c.textAlign = "center"; c.fillText("RECIPES", 64, 32); }));
  } else if (kind === "dino") {
    M(rb(0.16, 0.12, 0.26, 0.05).translate(0, 0.12, 0), "#5ac83a"); M(rb(0.11, 0.11, 0.13, 0.04).translate(0, 0.22, 0.15), "#5ac83a");
    M(new THREE.ConeGeometry(0.05, 0.22, 6).rotateX(-Math.PI / 2 - 0.3).translate(0, 0.12, -0.2), "#5ac83a");
    for (const [x, z] of [[-0.05, 0.07], [0.05, 0.07], [-0.05, -0.07], [0.05, -0.07]]) M(rb(0.04, 0.08, 0.04, 0.01).translate(x, 0.04, z), "#4aa82e");
    for (let i = 0; i < 4; i++) M(new THREE.ConeGeometry(0.02, 0.05, 4).translate(0, 0.2, 0.08 - i * 0.07), "#f3d35a");
    M(new THREE.SphereGeometry(0.012, 6, 4).translate(0.045, 0.25, 0.2), INK); M(new THREE.SphereGeometry(0.012, 6, 4).translate(-0.045, 0.25, 0.2), INK);
  } else if (kind === "pan") {
    M(new THREE.CylinderGeometry(0.17, 0.15, 0.04, 22), "#2e2a36"); M(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 8).rotateZ(Math.PI / 2).translate(0.3, 0.01, 0), "#3a2a1e");
    M(new THREE.CylinderGeometry(0.13, 0.13, 0.025, 20).translate(0, 0.03, 0), "#d9954a").name = "cake";
  } else if (kind === "stack") {
    M(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24), "#ffffff");
    for (let i = 0; i < 5; i++) M(new THREE.CylinderGeometry(0.14 - i * 0.003, 0.14, 0.035, 20).translate(0, 0.03 + i * 0.037, 0), i % 2 ? "#c98a3a" : "#d9a04a");
    M(new THREE.CylinderGeometry(0.1, 0.13, 0.02, 20).translate(0, 0.21, 0), "#8a4a1a"); M(rb(0.06, 0.03, 0.05, 0.01).translate(0, 0.235, 0), "#f6e7a6");
  } else if (kind === "plate") {
    M(new THREE.CylinderGeometry(0.2, 0.17, 0.02, 24), "#ffffff"); M(new THREE.CylinderGeometry(0.15, 0.15, 0.022, 24), "#f1ece2");
    M(new THREE.BoxGeometry(0.02, 0.01, 0.22).translate(0.27, 0.0, 0), "#c9c9c9"); M(new THREE.BoxGeometry(0.02, 0.01, 0.22).translate(-0.27, 0.0, 0), "#c9c9c9");
  } else if (kind === "chest") {
    M(rb(0.7, 0.36, 0.46, 0.03).translate(0, 0.18, 0), "#8a5a34"); M(new THREE.BoxGeometry(0.72, 0.04, 0.48).translate(0, 0.3, 0), "#c9a23a");
    const lid = new THREE.Group(); lid.name = "lid"; lid.position.set(0, 0.36, -0.23); g.add(lid);
    const l = new THREE.Mesh(rb(0.72, 0.1, 0.48, 0.03).translate(0, 0.05, 0.23), mat("#7a4a28")); l.castShadow = true; lid.add(l);
    const lk = new THREE.Mesh(rb(0.08, 0.1, 0.03, 0.01).translate(0, 0.02, 0.48), mat("#e9c24a")); lid.add(lk);
    M(new THREE.PlaneGeometry(0.62, 0.38).rotateX(-Math.PI / 2).translate(0, 0.34, 0), mat("#3a2418"));
  } else if (kind === "bowl") {
    const glass = new THREE.MeshLambertMaterial({ color: "#bfe8ff", transparent: true, opacity: 0.45, depthWrite: false });
    M(new THREE.SphereGeometry(0.16, 20, 14).scale(1, 0.9, 1).translate(0, 0.14, 0), glass); M(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 18).translate(0, 0.2, 0), "#7ac8f0");
    M(rb(0.08, 0.05, 0.04, 0.02).translate(0, 0.12, 0), "#ff8a1a"); M(new THREE.ConeGeometry(0.03, 0.05, 4).rotateZ(Math.PI / 2).translate(-0.06, 0.12, 0), "#ff8a1a");
  } else if (kind === "nozzle") {
    M(new THREE.CylinderGeometry(0.035, 0.05, 0.32, 10).rotateX(Math.PI / 2), "#c9a23a"); M(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 10).rotateX(Math.PI / 2).translate(0, 0, -0.18), "#d22e2e");
  }
  return g;
};
export class Props {
  private pool = new Map<PropKind, THREE.Group[]>(); private used = new Map<PropKind, number>();
  constructor(private parent: THREE.Object3D) {}
  begin() { this.used.clear(); }
  place(q: PropPlace) {
    const n = this.used.get(q.kind) ?? 0; this.used.set(q.kind, n + 1);
    let list = this.pool.get(q.kind); if (!list) { list = []; this.pool.set(q.kind, list); }
    while (list.length <= n) { const g = makeProp(q.kind); this.parent.add(g); list.push(g); }
    const g = list[n]; g.visible = true; g.position.set(...q.p); g.rotation.set(q.tilt ?? 0, q.yaw ?? 0, 0); g.scale.setScalar(q.s ?? 1);
    if (q.kind === "chest") { const lid = g.getObjectByName("lid"); if (lid) lid.rotation.x = -1.9 * (q.open ?? 0); }
    if (q.kind === "pan") { const c = g.getObjectByName("cake") as THREE.Mesh; if (c) c.material = mat(q.burnt ? "#5a3418" : "#d9954a"); }
  }
  end() { for (const [k, list] of this.pool) { const n = this.used.get(k) ?? 0; list.forEach((g, i) => { g.visible = i < n; }); } }
}
