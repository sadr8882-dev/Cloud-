// The mayor's dog (our own design): a blocky golden dog with floppy ears, a white muzzle, a red collar with a gold tag,
// a jaw that opens to bark or chomp, painted eyes (open / shut / wide) and poses: sleep, rise, stand, run, bark, eat, sit.
// Built at 1 unit = a 1.2 m long dog facing +z; the world scales it (5 = the giant, 0.14 = hamster size).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { twoTone } from "./shade";

export type DogPose = {
  x: number; y: number; z: number; yaw: number; scale: number;
  pose: "sleep" | "stand" | "run" | "bark" | "eat" | "sit"; rise?: number; // rise 0 = lying .. 1 = standing (sleep -> stand blend)
  phase?: number; eye?: number; jaw?: number; belly?: number; head?: number; wag?: number; look?: number; sniff?: number;
};

const FUR = "#d9954a", MUZ = "#f6e3c4", EAR = "#a8622e", INK = "#241726";
const mats = new Map<string, THREE.Material>();
const mat = (c: string) => { let m = mats.get(c); if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ color: c })); mats.set(c, m); } return m; };
const furMat = (() => {
  let m: THREE.Material | null = null;
  return () => {
    if (m) return m;
    const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d")!;
    g.fillStyle = FUR; g.fillRect(0, 0, 128, 128);
    for (let k = 0; k < 900; k++) { g.fillStyle = k % 2 ? "rgba(120,60,20,0.10)" : "rgba(255,230,180,0.10)"; g.fillRect((k * 37) % 128, (k * 91) % 128, 2, 6); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    m = twoTone(new THREE.MeshLambertMaterial({ map: t })); return m;
  };
})();
const eyes = new Map<string, THREE.Material>();
const eyeMat = (open: number, look: number) => {
  const st = open < 0.25 ? 0 : open < 0.75 ? 1 : open < 1.25 ? 2 : 3, lk = Math.round(look * 2) / 2, key = st + "|" + lk;
  let m = eyes.get(key);
  if (m) return m;
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 128; const g = cv.getContext("2d")!;
  g.fillStyle = FUR; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = INK; g.fillStyle = INK; g.lineCap = "round"; g.lineWidth = 9;
  for (const x of [72, 184]) {
    if (st === 0) { g.beginPath(); g.arc(x, 58, 20, Math.PI * 0.1, Math.PI * 0.9); g.stroke(); continue; }
    const wide = st === 3, ry = st === 1 ? 10 : wide ? 30 : 24;
    g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(x, 64, wide ? 28 : 22, ry, 0, 0, 7); g.fill(); g.lineWidth = 6; g.stroke();
    g.fillStyle = INK; g.beginPath(); g.ellipse(x + lk * 8, 66, wide ? 10 : 13, Math.min(ry - 2, wide ? 12 : 17), 0, 0, 7); g.fill();
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(x + lk * 8 + 5, 58, 5, 0, 7); g.fill();
    if (st === 1) { g.fillStyle = FUR; g.fillRect(x - 30, 20, 60, 36); g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.moveTo(x - 24, 56); g.lineTo(x + 24, 56); g.stroke(); }
    g.lineWidth = 9; g.strokeStyle = INK;
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  m = twoTone(new THREE.MeshLambertMaterial({ map: t })); eyes.set(key, m); return m;
};
const rb = (w: number, h: number, d: number, r = 0.04) => new RoundedBoxGeometry(w, h, d, 3, r);

export class Dog {
  root = new THREE.Group();
  private body = new THREE.Group(); private head = new THREE.Group(); private jaw = new THREE.Group(); private tail = new THREE.Group();
  private legs: THREE.Group[] = []; private ears: THREE.Group[] = []; private belly: THREE.Mesh; private eyes: THREE.Mesh; private tongue: THREE.Mesh;
  constructor(parent: THREE.Object3D) {
    const M = (g: THREE.BufferGeometry, m: THREE.Material, p: THREE.Object3D) => { const x = new THREE.Mesh(g, m); x.castShadow = true; x.receiveShadow = true; p.add(x); return x; };
    this.body.position.y = 0.62; this.root.add(this.body);
    this.belly = M(rb(0.6, 0.52, 1.15, 0.12), furMat(), this.body);
    M(rb(0.5, 0.2, 0.9, 0.06).translate(0, -0.2, 0.02), mat(MUZ), this.body); // pale belly
    // legs: front pair at z +0.4, back pair at z -0.4, hip pivots at the body's lower edge
    for (const [x, z] of [[-0.19, 0.38], [0.19, 0.38], [-0.19, -0.38], [0.19, -0.38]]) {
      const g = new THREE.Group(); g.position.set(x, -0.12, z); this.body.add(g); this.legs.push(g);
      M(rb(0.18, 0.5, 0.2, 0.05).translate(0, -0.25, 0), furMat(), g);
      M(rb(0.2, 0.1, 0.26, 0.04).translate(0, -0.47, 0.03), mat(MUZ), g);
    }
    // head on a neck pivot at the front top
    this.head.position.set(0, 0.22, 0.55); this.body.add(this.head);
    M(rb(0.56, 0.5, 0.48, 0.1).translate(0, 0.2, 0.12), furMat(), this.head);
    M(rb(0.34, 0.2, 0.3, 0.06).translate(0, 0.08, 0.48), mat(MUZ), this.head); // muzzle
    M(rb(0.13, 0.09, 0.08, 0.03).translate(0, 0.17, 0.63), mat(INK), this.head); // nose
    this.eyes = M(new THREE.PlaneGeometry(0.44, 0.22).translate(0, 0.32, 0.365), eyeMat(1, 0), this.head);
    this.jaw.position.set(0, 0.0, 0.34); this.head.add(this.jaw);
    M(rb(0.3, 0.07, 0.3, 0.03).translate(0, -0.02, 0.13), mat(MUZ), this.jaw);
    M(new THREE.BoxGeometry(0.26, 0.03, 0.26).translate(0, 0.02, 0.13), mat("#5a1e28"), this.jaw);
    this.tongue = M(rb(0.13, 0.03, 0.2, 0.012).translate(0, 0.03, 0.2), mat("#e86e78"), this.jaw);
    for (const s of [-1, 1]) {
      const e = new THREE.Group(); e.position.set(s * 0.3, 0.4, 0.1); this.head.add(e); this.ears.push(e);
      M(rb(0.1, 0.36, 0.22, 0.04).translate(0, -0.16, 0), mat(EAR), e);
    }
    M(rb(0.6, 0.09, 0.3, 0.03).translate(0, 0.0, 0.08), mat("#d23b3b"), this.head); // collar
    M(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 14).rotateX(Math.PI / 2).translate(0, -0.08, 0.24), mat("#e9c24a"), this.head); // tag
    this.tail.position.set(0, 0.16, -0.56); this.body.add(this.tail);
    M(rb(0.1, 0.1, 0.42, 0.04).translate(0, 0, -0.2), furMat(), this.tail);
    this.root.visible = false; parent.add(this.root);
  }
  set(d: DogPose, t: number) {
    const r = this.root; r.visible = true; r.position.set(d.x, d.y, d.z); r.rotation.set(0, d.yaw, 0); r.scale.setScalar(d.scale);
    const rise = d.pose === "sleep" ? d.rise ?? 0 : 1, lie = 1 - rise;
    const ph = (d.phase ?? 0) * Math.PI * 2, bel = d.belly ?? 1;
    this.belly.scale.set(bel, 1 + (bel - 1) * 0.6, 1 + (bel - 1) * 0.2);
    let by = 0.62 - lie * 0.4, pitch = 0, hp = (d.head ?? 0), jaw = d.jaw ?? 0, wag = d.wag ?? 0;
    const L = [0, 0, 0, 0];
    if (d.pose === "run") {
      const a = 0.85; L[0] = Math.sin(ph) * a; L[1] = Math.sin(ph + 0.5) * a; L[2] = Math.sin(ph + Math.PI) * a; L[3] = Math.sin(ph + Math.PI + 0.5) * a;
      by += Math.abs(Math.sin(ph)) * 0.09; pitch = 0.12 * Math.sin(ph); hp += -0.1; jaw = Math.max(jaw, 0.35);
    } else if (d.pose === "sit") {
      pitch = -0.55; by = 0.5; L[0] = L[1] = 0.55; L[2] = L[3] = -1.0;
    } else if (d.pose === "eat") {
      hp += 0.55 + 0.08 * Math.sin(t * 22); jaw = 0.4 + 0.4 * Math.abs(Math.sin(t * 11));
    } else if (d.pose === "bark") {
      hp += -0.35; by += 0.02;
    } else if (d.pose === "sleep") {
      for (let i = 0; i < 4; i++) L[i] = lie * (i < 2 ? -1.45 : 1.45);
      by += lie * 0.025 * Math.sin(t * 1.6); hp += lie * 0.5;
    }
    this.body.position.y = by; this.body.rotation.x = pitch;
    this.legs.forEach((g, i) => { g.rotation.x = L[i] - (d.pose === "sit" ? 0 : 0) - pitch * 0; });
    // keep feet down while sitting: the back legs fold under the rear
    if (d.pose === "sit") { this.legs[2].rotation.x = -1.2 + 0.55; this.legs[3].rotation.x = -1.2 + 0.55; this.legs[0].rotation.x = 0.55; this.legs[1].rotation.x = 0.55; }
    const sn = d.sniff ? 0.06 * Math.sin(t * 30) * d.sniff : 0;
    this.head.rotation.set(hp + sn - (d.pose === "sit" ? -0.55 : 0) * 0 + (d.pose === "sit" ? 0.5 : 0), (d.look ?? 0) * 0.5, 0);
    this.jaw.rotation.x = jaw * 0.6; this.tongue.visible = jaw > 0.2;
    this.ears.forEach((e, i) => { e.rotation.z = (i ? -1 : 1) * (0.15 + (d.pose === "run" ? 0.5 * Math.abs(Math.sin(ph)) : 0)); e.rotation.x = d.pose === "run" ? -0.6 : 0; });
    this.tail.rotation.set(d.pose === "run" ? 0.1 : -0.7 + lie * 0.6, wag * 0.6 * Math.sin(t * 14), 0);
    this.eyes.material = eyeMat(d.eye ?? 1, d.look ?? 0);
  }
  hide() { this.root.visible = false; }
}
