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
