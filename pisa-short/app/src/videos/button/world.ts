// "The Wrong Button" town as one three.js scene: lawn, sidewalks, houses (each its own group so they can dance),
// the clock tower with an open deck, a canopy, railings and THE BUTTON on a pedestal, a spiral stair round the
// tower, the fair (stage, lectern, banner, loudspeaker, pie table, stalls, balloons), a fountain, the cow paddock,
// the bakery, Mom's yard, the giant dog, cows and the chicken mailman, all posed per frame from the cast.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, Ray, withSight } from "./build";
import { cloudHD } from "./paint";
import { clockTex, grassReal, sidingReal, brickReal, shingleReal, barkReal, leavesReal } from "./noonpaint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { Blocky } from "./blocky";
import { Dog } from "./dog";
import { Cow, Hen } from "./critters";
import {
  FPS, SHOTS, camAt, ShotDef, V3, TOWER, TOWER_H, TOP_Y, VANE, HALL, BTN, STAGE, STAGE_Y, LECTERN, PIE, STL1, STL2, STL3,
  FOUNTAIN, PAD, BAKERY, MOMT, PART, W2, smooth, clamp01, stairAt, SR, buttonAt, danceAt,
} from "./story";
import { ctex } from "./paint";

export const loadKit = async (): Promise<Kit> => ({});

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const SUN_SHOT: Record<number, { az?: number; el?: number }> = PART === 1 ? {} : { 20: { az: 120, el: 14 } };
const textTex = (key: string, w: number, h: number, bg: string, fg: string, lines: string[], size: number, border = true) => ctex(key, w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); if (border) { g.strokeStyle = fg; g.lineWidth = Math.max(6, h * 0.04); g.strokeRect(8, 8, w - 16, h - 16); }
  g.fillStyle = fg; g.font = `900 ${size}px "Arial Black", "DejaVu Sans", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.1));
});
const stripes = (key: string, a: string, b: string, n = 8) => ctex(key, 256, 256, (g) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect((i * 256) / n, 0, 256 / n + 1, 256); } });

const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 8; f < s.b + 8; f += 3) {
    const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};
const quadUp = (x0: number, x1: number, z0: number, z1: number, u: number, v: number, y = 0) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
};
const beamGeo = (a: THREE.Vector3, b: THREE.Vector3, th: number, round = false) => {
  const g = round ? new THREE.CylinderGeometry(th / 2, th / 2, a.distanceTo(b), 8) : new THREE.BoxGeometry(th, a.distanceTo(b), th);
  return g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()), V(1, 1, 1)));
};

type House = { g: THREE.Group; x: number; z: number; yaw: number; seed: number };

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private hands: THREE.Mesh[] = [];
  private bell: THREE.Mesh;
  private vane = new THREE.Group();
  private bunting = new THREE.Group();
  private balloons = new THREE.Group();
  private houses: House[] = [];
  private rigs: Blocky[] = [];
  private dog!: Dog;
  private cows: Cow[] = [];
  private hen!: Hen;
  private button = new THREE.Group(); private btnCap!: THREE.Mesh; private btnGlow!: THREE.MeshLambertMaterial;
  private choc = new THREE.Group();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit, shadowSize = 2048) {
    void kit;
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunDisc.frustumCulled = false; this.sunDisc.layers.set(NOINK); R.add(this.sunDisc);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(shadowSize, shadowSize);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30; m.position.set(Math.cos(a) * d, 110 + (i % 4) * 40, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }

    const b = new Batch();
    const grass = lam("nGrassReal", () => ({ map: grassReal() }));
    const stone = lam("nStoneR", () => ({ map: brickReal(), color: "#e6d7c4" })), roofT = lam("nRoof", () => ({ color: "#e2453c", side: THREE.DoubleSide }));
    const BRICKS = ["#e9e4d6", "#9fc0d8", "#d6c39a", "#brick", "#bcd4a8", "#f2f0ea", "#brick", "#e0b48e"];
    const ROOFS = ["#4a4f5a", "#6b3f35", "#3b3f52", "#5a5048", "#7a4a3a"];
    const wallMat = (i: number) => BRICKS[i % 8] === "#brick" ? lam("nWallB", () => ({ map: brickReal() })) : lam("nWall" + i % 8, () => ({ map: sidingReal(), color: BRICKS[i % 8] }));
    const win = lam("nWin", () => ({ color: "#5ac8f0" })), frame = lam("nFrame", () => ({ color: "#f4f1ea" })), door = lam("nDoor", () => ({ color: "#7a4f33" }));
    const trim = lam("nTrim", () => ({ color: "#efe3c8" }));
    const wood = lam("nWood", () => ({ color: "#a8724a" })), iron = twoTone(new THREE.MeshLambertMaterial({ color: "#3b3f52" }));
    const brass = twoTone(new THREE.MeshLambertMaterial({ color: "#c9a23a" }));
    const white = lam("nWhite", () => ({ color: "#fbf6ea" }));
    /** box house at the local origin (the group carries position and yaw so it can dance) */
    const blockHouse = (bb: Batch, w: number, d: number, h: number, i: number) => {
      const add = (g: THREE.BufferGeometry, mm: THREE.Material) => bb.add(g, mm);
      const bx = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0); const uv = bx.attributes.uv as THREE.BufferAttribute; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * w / 4, uv.getY(k) * h / 4);
      add(bx, wallMat(i));
      const rm = lam("nR" + i % 5, () => ({ map: shingleReal(), color: ROOFS[i % 5] })), rh = d * 0.45, sl = Math.hypot(d / 2 + 0.4, rh);
      for (const s of [-1, 1]) {
        const slab = new THREE.BoxGeometry(w + 0.6, 0.3, sl); slab.translate(0, 0, s * sl / 2);
        slab.applyMatrix4(new THREE.Matrix4().makeRotationX(s * Math.atan2(rh, d / 2 + 0.4))); slab.translate(0, h + rh, 0);
        add(slab, rm);
      }
      const gab = new THREE.BufferGeometry();
      gab.setAttribute("position", new THREE.Float32BufferAttribute([-w / 2, h, d / 2, -w / 2, h, -d / 2, -w / 2, h + rh, 0, w / 2, h, -d / 2, w / 2, h, d / 2, w / 2, h + rh, 0], 3)); gab.computeVertexNormals();
      gab.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 2, 0, 1, 1, 0, 0, 2, 0, 1, 1], 2)); add(gab, wallMat(i));
      const floors = Math.max(1, Math.floor(h / 3)), n = Math.max(1, Math.floor(w / 2.4));
      for (let f = 0; f < floors; f++) for (let k = 0; k < n; k++) {
        const wx = -w / 2 + (k + 0.5) * (w / n), wy = 1.6 + f * 3;
        if (f === 0 && k === Math.floor(n / 2)) { add(new THREE.BoxGeometry(1.1, 2.1, 0.12).translate(wx, 1.05, d / 2 + 0.05), door); continue; }
        add(new THREE.BoxGeometry(1.2, 1.2, 0.1).translate(wx, wy, d / 2 + 0.04), frame);
        add(new THREE.BoxGeometry(0.95, 0.95, 0.12).translate(wx, wy, d / 2 + 0.06), win);
        add(new THREE.BoxGeometry(1.3, 0.12, 0.22).translate(wx, wy - 0.68, d / 2 + 0.1), frame); // sill
      }
      add(new THREE.BoxGeometry(0.9, 2.2, 0.9).translate(w * 0.25 * (i % 2 ? 1 : -1), h + rh * 0.6 + 0.6, -d * 0.2), lam("nChim", () => ({ color: "#a3a7b0" })));
    };
    const blockTree = (bb: Batch, x: number, z: number, h: number, i: number) => {
      bb.add(new THREE.CylinderGeometry(0.18, 0.32, h * 0.5, 8).translate(x, h * 0.25, z), lam("nBark", () => ({ map: barkReal() })));
      const lc = lam("nLeavesR" + i % 3, () => ({ map: leavesReal(i % 3) }));
      if (i % 11) for (let k = 0; k < 4; k++) bb.add(new THREE.ConeGeometry(h * (0.3 - k * 0.06), h * 0.34, 10).translate(x, h * (0.32 + k * 0.17), z), lc);
      else bb.add(new THREE.IcosahedronGeometry(h * 0.33, 1).translate(x, h * 0.62, z), lc);
    };
    withSight(sightLines(), () => {
      b.add(quadUp(-400, 400, -400, 400, 100, 100, 0), grass);
      const walk = lam("nWalk", () => ({ color: "#cfcac0" }));
      for (const [x0, x1, z0, z1] of [[-1.6, 1.6, -15, 30], [-30, 30, 9, 12], [-30, 30, -13, -10.5], [6, 8.2, -12, 12], [-6, -2.8, 12, 15]]) b.add(quadUp(x0, x1, z0, z1, 1, 1, 0.02), walk);
      const hill = new THREE.SphereGeometry(1, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2);
      for (const [hx, hz, sx, sy, sz] of [[-120, -150, 90, 16, 60], [110, -160, 90, 13, 60], [-160, 40, 60, 10, 80], [150, 60, 60, 11, 70]] as const) b.add(hill, grass, new THREE.Matrix4().compose(V(hx, -1, hz), new THREE.Quaternion(), V(sx, sy, sz)));
      const ring: [number, number, number, number][] = [];
      for (let x = -13; x <= 13; x += 8.6) { ring.push([x, -26, 0, 8]); ring.push([x, 22, Math.PI, 8]); }
      for (let z = -18; z <= 14; z += 8.4) { ring.push([-22, z, Math.PI / 2, 8]); ring.push([22, z, -Math.PI / 2, 8]); }
      ring.forEach(([x, z, yaw, w], i) => {
        if (Math.abs(x) < 5 && z < 0) return; if (x > 6 && x < 20 && z > -12 && z < 0) return;
        if (x < -18 && z > 4 && z < 13) return; // the bakery stands here
        const hb = new Batch(); blockHouse(hb, w, 8, [8, 9, 10, 7][i % 4], i);
        const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; hb.build(g); R.add(g);
        this.houses.push({ g, x, z, yaw, seed: i });
      });
      for (let i = 0; i < 260; i++) { const a = i * 2.39996, d = 30 + (i % 17) * 5; blockTree(b, Math.cos(a) * d, Math.sin(a) * d, 13 + (i % 6) * 2.5, i); }
    });

    // ---------------- clock tower with an open deck ----------------
    const [tx, , tz] = TOWER;
    b.add(boxGeo(V(tx - 3, 0, tz - 3), V(tx + 3, TOWER_H, tz + 3), 3), stone);
    for (const y of [6, 12.2]) b.add(boxGeo(V(tx - 3.25, y, tz - 3.25), V(tx + 3.25, y + 0.45, tz + 3.25)), trim);
    const bellOpen = lam("nDark", () => ({ color: "#3d3442" }));
    for (const [dx, dz, ry] of [[0, 3.01, 0], [0, -3.01, Math.PI], [3.01, 0, Math.PI / 2], [-3.01, 0, -Math.PI / 2]] as const) {
      const g = new THREE.PlaneGeometry(2.6, 2.8); g.rotateY(ry); g.translate(tx + dx, 18.2, tz + dz); b.add(g, bellOpen);
    }
    b.add(boxGeo(V(tx - 3.6, TOWER_H, tz - 3.6), V(tx + 3.6, TOP_Y, tz + 3.6)), trim); // the deck
    b.add(boxGeo(V(tx - 3.62, TOWER_H - 0.18, tz - 3.62), V(tx + 3.62, TOWER_H, tz + 3.62)), lam("nTrim2", () => ({ color: "#c9a46a" })));
    // railing: posts and a top rail round the deck (a gap at the -x/+z corner where the stair arrives)
    const railMat = lam("nRail", () => ({ color: "#f4f1ea" }));
    for (let k = 0; k <= 12; k++) {
      const u = -3.45 + (6.9 * k) / 12;
      for (const [px, pz] of [[u, 3.45], [u, -3.45], [3.45, u], [-3.45, u]]) { if (px < -3.2 && pz > 1.5) continue; b.add(new THREE.BoxGeometry(0.1, 0.95, 0.1).translate(tx + px, TOP_Y + 0.47, tz + pz), railMat); }
    }
    b.add(boxGeo(V(tx - 3.5, TOP_Y + 0.92, tz + 3.4), V(tx + 3.5, TOP_Y + 1.04, tz + 3.5)), railMat);
    b.add(boxGeo(V(tx - 3.5, TOP_Y + 0.92, tz - 3.5), V(tx + 3.5, TOP_Y + 1.04, tz - 3.4)), railMat);
    b.add(boxGeo(V(tx + 3.4, TOP_Y + 0.92, tz - 3.5), V(tx + 3.5, TOP_Y + 1.04, tz + 3.5)), railMat);
    b.add(boxGeo(V(tx - 3.5, TOP_Y + 0.92, tz - 3.5), V(tx - 3.4, TOP_Y + 1.04, tz + 1.4)), railMat);
    // canopy on four corner pillars, pointed roof, vane
    for (const [px, pz] of [[-3.3, -3.3], [3.3, -3.3], [3.3, 3.3], [-3.3, 3.3]]) b.add(new THREE.CylinderGeometry(0.2, 0.24, 3.2, 12).translate(tx + px, TOP_Y + 1.6, tz + pz), white);
    b.add(boxGeo(V(tx - 3.7, TOP_Y + 3.2, tz - 3.7), V(tx + 3.7, TOP_Y + 3.55, tz + 3.7)), trim);
    const roof = new THREE.ConeGeometry(5.0, 3.6, 4); roof.rotateY(Math.PI / 4); b.add(roof, roofT, new THREE.Matrix4().makeTranslation(tx, TOP_Y + 3.55 + 1.8, tz));
    // scalloped red-and-white valance under the canopy edge
    for (let k = 0; k < 14; k++) for (const s of [0, 1, 2, 3]) {
      const u = -3.4 + (6.8 * (k + 0.5)) / 14, m = lam("nVal" + (k % 2), () => ({ color: k % 2 ? "#f4f1ea" : "#e2453c" }));
      const g = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI);
      const [px, pz, ry] = s === 0 ? [u, 3.72, 0] : s === 1 ? [u, -3.72, Math.PI] : s === 2 ? [3.72, u, Math.PI / 2] : [-3.72, u, -Math.PI / 2];
      b.add(g.rotateY(ry).translate(tx + px, TOP_Y + 3.2, tz + pz), m);
    }
    const face = new THREE.CircleGeometry(1.9, 40); face.translate(tx, 15, tz + 3.02);
    b.add(face, lam("nClock", () => ({ map: clockTex() })));
    b.add(new THREE.TorusGeometry(1.95, 0.12, 8, 40).translate(tx, 15, tz + 3.02), brass);
    // the button pedestal with its DO NOT PRESS plate
    const [bx2, by2, bz2] = BTN;
    b.add(boxGeo(V(bx2 - 0.36, by2, bz2 - 0.36), V(bx2 + 0.36, by2 + 0.6, bz2 + 0.36)), lam("nPed", () => ({ color: "#3b3f52" })));
    b.add(boxGeo(V(bx2 - 0.42, by2 + 0.56, bz2 - 0.42), V(bx2 + 0.42, by2 + 0.64, bz2 + 0.42)), brass);
    b.add(boxGeo(V(bx2 - 0.42, by2, bz2 - 0.42), V(bx2 + 0.42, by2 + 0.08, bz2 + 0.42)), brass);
    const plate = new THREE.PlaneGeometry(0.62, 0.34).translate(bx2, by2 + 0.33, bz2 + 0.365);
    b.add(plate, lam("nPlateDNP", () => ({ map: textTex("dnp", 512, 280, "#f3d35a", "#241726", ["DO NOT", "PRESS!"], 96) })));
    for (const s of [-1, 1]) { const pl = new THREE.PlaneGeometry(0.62, 0.34).rotateY(s * Math.PI / 2).translate(bx2 + s * 0.365, by2 + 0.33, bz2); b.add(pl, lam("nPlateDNP", () => ({}))); }
    // hazard stripes on the deck round the pedestal
    b.add(quadUp(bx2 - 0.9, bx2 + 0.9, bz2 - 0.9, bz2 + 0.9, 3, 3, by2 + 0.005), lam("nHaz", () => ({ map: stripes("haz", "#f3d35a", "#241726", 10) })));

    // ---------------- the spiral stair ----------------
    const stepM = lam("nStep", () => ({ color: "#d9cdb8" })), stringer = lam("nStringer", () => ({ color: "#8a6a4e" }));
    for (let face2 = 0; face2 < 4; face2++) for (let j = 0; j < 20; j++) {
      const u = face2 + (j + 0.5) / 20, s = stairAt(u), fw = V(Math.sin(s.yaw), 0, Math.cos(s.yaw));
      const g = new THREE.BoxGeometry(1.25, 0.22, 0.42).rotateY(s.yaw).translate(s.p[0], s.p[1] - 0.11, s.p[2]);
      b.add(g, stepM); void fw;
      if (j % 4 === 0) { // outer posts
        const o = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0]][face2];
        b.add(new THREE.BoxGeometry(0.08, 1.0, 0.08).translate(s.p[0] + o[0] * 0.6, s.p[1] + 0.5, s.p[2] + o[2] * 0.6), railMat);
      }
    }
    for (let face2 = 0; face2 < 4; face2++) { // sloped stringer under each flight + hand rail
      const a = stairAt(face2 + 0.001), c = stairAt(face2 + 0.999), o = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0]][face2];
      b.add(beamGeo(V(a.p[0], a.p[1] - 0.35, a.p[2]), V(c.p[0], c.p[1] - 0.35, c.p[2]), 0.3), stringer);
      b.add(beamGeo(V(a.p[0] + o[0] * 0.6, a.p[1] + 1.0, a.p[2] + o[2] * 0.6), V(c.p[0] + o[0] * 0.6, c.p[1] + 1.0, c.p[2] + o[2] * 0.6), 0.08, true), railMat);
    }
    void SR;

    // ---------------- the fair ----------------
    { // stage, skirt, steps, lectern with a mic, banner on poles, loudspeaker horn
      const [sx, , sz] = STAGE;
      b.add(boxGeo(V(sx - 2.5, 0, sz - 1.3), V(sx + 2.5, STAGE_Y, sz + 1.3)), lam("nStage", () => ({ color: "#a8724a" })));
      b.add(new THREE.PlaneGeometry(5.0, STAGE_Y - 0.04).translate(sx, STAGE_Y / 2, sz + 1.305), lam("nSkirt", () => ({ map: stripes("skirt", "#e2453c", "#f4f1ea", 12) })));
      for (let k = 0; k < 3; k++) b.add(boxGeo(V(sx + 2.5, 0, sz - 0.5), V(sx + 2.9 + k * 0.0, STAGE_Y * (3 - k) / 3, sz + 0.5)).translate(k * 0.35, 0, 0), wood);
      const [lx, ly, lz] = LECTERN;
      b.add(boxGeo(V(lx - 0.3, ly, lz - 0.2), V(lx + 0.3, ly + 0.95, lz + 0.2)), lam("nLect", () => ({ color: "#6a3f2a" })));
      b.add(boxGeo(V(lx - 0.36, ly + 0.95, lz - 0.26), V(lx + 0.36, ly + 1.0, lz + 0.26)), lam("nLect2", () => ({ color: "#8a5434" })));
      b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.01, 18).rotateX(Math.PI / 2).translate(lx, ly + 0.55, lz + 0.205), brass); // town seal
      b.add(beamGeo(V(lx, ly + 1.0, lz - 0.1), V(lx, ly + 1.35, lz - 0.32), 0.025, true), iron);
      b.add(new THREE.SphereGeometry(0.05, 12, 8).translate(lx, ly + 1.37, lz - 0.34), iron);
      for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.07, 0.07, 4.4, 8).translate(sx + s * 2.7, 2.2, sz - 1.1), iron);
      b.add(new THREE.PlaneGeometry(5.2, 1.0).translate(sx, 3.9, sz - 1.08), lam("nBanner", () => ({ map: textTex("fairBanner", 1024, 196, "#3f6fb5", "#f3d35a", ["TOWN FAIR"], 130), side: THREE.DoubleSide })));
      b.add(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8).translate(sx + 2.1, STAGE_Y + 1.3, sz - 0.6), iron);
      b.add(new THREE.ConeGeometry(0.32, 0.6, 16, 1, true).rotateX(Math.PI / 2 + 0.25).translate(sx + 2.1, STAGE_Y + 2.55, sz - 0.4), lam("nHorn", () => ({ color: "#d9d4c8", side: THREE.DoubleSide })));
    }
    { // pie contest table with five pies and a ribbon
      const [px, , pz] = PIE;
      b.add(boxGeo(V(px - 1.3, 0.74, pz - 0.5), V(px + 1.3, 0.82, pz + 0.5)), lam("nCloth", () => ({ color: "#f7f1e1" })));
      b.add(new THREE.PlaneGeometry(2.62, 0.34).translate(px, 0.65, pz + 0.505), lam("nCheck", () => ({ map: ctex("check", 256, 64, (g) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? "#e2453c" : "#fbf6ea"; g.fillRect(i * 16, j * 16, 16, 16); } }) })));
      for (const [lx, lz] of [[-1.2, -0.4], [-1.2, 0.4], [1.2, -0.4], [1.2, 0.4]]) b.add(boxGeo(V(px + lx - 0.04, 0, pz + lz - 0.04), V(px + lx + 0.04, 0.74, pz + lz + 0.04)), wood);
      const pies = ["#d98a3a", "#a8324a", "#7a4a8a", "#e8b06a", "#c25a3a"];
      pies.forEach((c, i) => {
        const x = px - 1.0 + i * 0.5;
        b.add(new THREE.CylinderGeometry(0.19, 0.16, 0.08, 20).translate(x, 0.86, pz), lam("nCrust", () => ({ color: "#e8b06a" })));
        b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 20).translate(x, 0.905, pz), lam("nPie" + i, () => ({ color: c })));
        b.add(new THREE.BoxGeometry(0.08, 0.005, 0.12).translate(x, 0.82, pz + 0.3), lam("nTag", () => ({ color: "#fbf6ea" })));
      });
    }
    const stall = (p: V3, yaw: number, a: string, sign: string, key: string) => { // booth with a striped awning and a sign
      const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(p[0], 0, p[2]);
      const A = (g: THREE.BufferGeometry, mm: THREE.Material) => b.add(g, mm, m);
      A(new THREE.BoxGeometry(2.4, 1.0, 0.9).translate(0, 0.5, 0.2), lam("nBooth", () => ({ color: "#f4f1ea" })));
      A(new THREE.BoxGeometry(2.5, 0.08, 1.0).translate(0, 1.02, 0.2), wood);
      for (const s of [-1, 1]) A(new THREE.BoxGeometry(0.1, 2.6, 0.1).translate(s * 1.15, 1.3, 0.6), wood);
      for (const s of [-1, 1]) A(new THREE.BoxGeometry(0.1, 2.6, 0.1).translate(s * 1.15, 1.3, -0.3), wood);
      const aw = new THREE.BoxGeometry(2.7, 0.06, 1.6).rotateX(0.3).translate(0, 2.65, 0.35); A(aw, lam("nAwn" + key, () => ({ map: stripes("awn" + key, a, "#fbf6ea", 10) })));
      A(new THREE.PlaneGeometry(1.6, 0.42).translate(0, 1.55, -0.29), lam("nSign" + key, () => ({ map: textTex("sign" + key, 512, 136, "#fbf6ea", a, [sign], 78) })));
      A(new THREE.PlaneGeometry(2.2, 0.5).translate(0, 0.5, 0.655), lam("nFront" + key, () => ({ map: stripes("front" + key, a, "#fbf6ea", 6) })));
    };
    stall(STL1, Math.PI / 2, "#f3b324", "LEMONADE", "1");
    stall(STL2, -Math.PI / 2, "#3f8fe0", "BALLOONS", "2");
    stall(STL3, 0, "#ff7ab8", "CANDY", "3");
    for (let i = 0; i < 7; i++) b.add(new THREE.CylinderGeometry(0.06, 0.05, 0.16, 10).translate(STL1[0] + 0.7, 1.12, STL1[2] - 0.8 + i * 0.26), lam("nCup", () => ({ color: "#f6e27a" })));
    for (let i = 0; i < 4; i++) b.add(new THREE.SphereGeometry(0.16, 12, 8).scale(1, 0.8, 1).translate(STL3[0] - 0.8 + i * 0.5, 1.4, STL3[2] + 0.5), lam("nFloss", () => ({ color: "#ffb3dc" })));
    // balloon bunches (3D) at the balloon stall and by the stage
    const bcol = ["#e2453c", "#f3d35a", "#3f8fe0", "#4cb050", "#c25ad0", "#ff8a3a"];
    const bunch = (x: number, z: number, n: number, h: number) => {
      for (let i = 0; i < n; i++) {
        const a = i * 2.4, r = 0.25 + (i % 3) * 0.12, y = h + (i % 4) * 0.28;
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12).scale(1, 1.18, 1), twoTone(new THREE.MeshLambertMaterial({ color: bcol[i % 6] })));
        ball.position.set(x + Math.cos(a) * r, y, z + Math.sin(a) * r); ball.castShadow = true; this.balloons.add(ball);
        const str = new THREE.Mesh(beamGeo(V(x, 1.0, z), V(x + Math.cos(a) * r, y - 0.28, z + Math.sin(a) * r), 0.012, true), iron); this.balloons.add(str);
      }
    };
    bunch(STL2[0] - 0.5, STL2[2] - 0.6, 9, 2.6); bunch(STL2[0] - 0.5, STL2[2] + 0.8, 7, 2.4); bunch(STAGE[0] - 2.7, STAGE[2] - 1.1, 6, 4.6); bunch(STAGE[0] + 2.7, STAGE[2] - 1.1, 6, 4.6);
    R.add(this.balloons);
    { // fountain: round basin, column, top bowl
      const [fx, , fz] = FOUNTAIN, stoneM = lam("nFount", () => ({ color: "#d9d2c4" }));
      b.add(new THREE.CylinderGeometry(1.7, 1.8, 0.55, 28, 1, true).translate(fx, 0.27, fz), lam("nFountS", () => ({ color: "#d9d2c4", side: THREE.DoubleSide })));
      b.add(new THREE.TorusGeometry(1.75, 0.1, 8, 32).rotateX(Math.PI / 2).translate(fx, 0.55, fz), stoneM);
      b.add(new THREE.CircleGeometry(1.68, 28).rotateX(-Math.PI / 2).translate(fx, 0.42, fz), lam("nPool", () => ({ color: "#6ec4ef" })));
      b.add(new THREE.CylinderGeometry(0.22, 0.3, 1.6, 14).translate(fx, 0.8, fz), stoneM);
      b.add(new THREE.CylinderGeometry(0.7, 0.3, 0.3, 20).translate(fx, 1.65, fz), stoneM);
    }
    { // cow paddock: fence rails, a water trough, a hay bale
      const [px, , pz] = PAD, h = 3.2;
      for (let k = 0; k <= 8; k++) { const u = -h + (2 * h * k) / 8; for (const [x, z] of [[u, -h], [u, h], [-h, u], [h, u]]) b.add(new THREE.BoxGeometry(0.14, 1.1, 0.14).translate(px + x, 0.55, pz + z), wood); }
      for (const y of [0.45, 0.9]) for (const [ax, az, bx3, bz3] of [[-h, -h, h, -h], [-h, h, h, h], [-h, -h, -h, h], [h, -h, h, h]]) b.add(beamGeo(V(px + ax, y, pz + az), V(px + bx3, y, pz + bz3), 0.09), wood);
      b.add(boxGeo(V(px + 1.2, 0, pz + 2.0), V(px + 2.6, 0.5, pz + 2.6)), lam("nTrough", () => ({ color: "#7a8a96" })));
      b.add(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 16).rotateZ(Math.PI / 2).translate(px - 2.2, 0.5, pz + 2.2), lam("nHay", () => ({ color: "#e8c25a" })));
    }
    { // the bakery: shop box, striped awning, sign, a giant loaf on the roof
      const [kx, , kz] = BAKERY, m = new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(kx, 0, kz);
      const A = (g: THREE.BufferGeometry, mm: THREE.Material) => b.add(g, mm, m);
      A(new THREE.BoxGeometry(6, 4.6, 4.4).translate(0, 2.3, 0), lam("nBakW", () => ({ map: sidingReal(), color: "#ffd9b0" })));
      A(new THREE.BoxGeometry(6.4, 0.4, 4.8).translate(0, 4.8, 0), lam("nBakR", () => ({ color: "#8a4a3a" })));
      A(new THREE.BoxGeometry(6.2, 0.08, 1.6).rotateX(0.35).translate(0, 3.1, 2.75), lam("nAwnB", () => ({ map: stripes("awnB", "#e2453c", "#fbf6ea", 12) })));
      A(new THREE.PlaneGeometry(3.6, 0.8).translate(0, 4.0, 2.22), lam("nBakS", () => ({ map: textTex("bakSign", 768, 170, "#fbf6ea", "#8a4a3a", ["BAKERY"], 110) })));
      A(new THREE.BoxGeometry(1.2, 2.2, 0.12).translate(0, 1.1, 2.24), door);
      for (const s of [-1, 1]) { A(new THREE.BoxGeometry(1.6, 1.3, 0.1).translate(s * 1.9, 1.6, 2.22), frame); A(new THREE.BoxGeometry(1.4, 1.1, 0.12).translate(s * 1.9, 1.6, 2.24), win); }
      A(new THREE.CapsuleGeometry(0.9, 2.4, 8, 16).rotateZ(Math.PI / 2).scale(1, 0.8, 1).translate(0, 5.65, 0), lam("nLoaf", () => ({ color: "#d9954a" })));
      for (let k = 0; k < 4; k++) A(new THREE.BoxGeometry(0.1, 0.06, 1.2).rotateY(0.4).translate(-1.1 + k * 0.75, 6.32, 0), lam("nLoafC", () => ({ color: "#f6d39a" })));
    }
    { // Mom's yard: picnic table, white picket fence, a mailbox
      const [mx, , mz] = MOMT;
      b.add(boxGeo(V(mx - 0.9, 0.72, mz - 0.5), V(mx + 0.9, 0.8, mz + 0.5)), lam("nPicnic", () => ({ color: "#c98a5a" })));
      b.add(new THREE.PlaneGeometry(1.82, 1.02).rotateX(-Math.PI / 2).translate(mx, 0.805, mz), lam("nCheck2", () => ({ map: ctex("check2", 256, 256, (g) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? "#3f8fe0" : "#fbf6ea"; g.fillRect(i * 32, j * 32, 32, 32); } }) })));
      for (const [lx, lz] of [[-0.8, -0.4], [-0.8, 0.4], [0.8, -0.4], [0.8, 0.4]]) b.add(boxGeo(V(mx + lx - 0.05, 0, mz + lz - 0.05), V(mx + lx + 0.05, 0.72, mz + lz + 0.05)), wood);
      const picket = lam("nPicket", () => ({ color: "#fbf8f2" }));
      for (let k = 0; k < 34; k++) { const x = mx - 8.5 + k * 0.5; if (Math.abs(x - mx) < 0.8) continue; b.add(new THREE.BoxGeometry(0.14, 0.9, 0.06).translate(x, 0.45, 13.3), picket); }
      b.add(boxGeo(V(mx - 8.5, 0.55, 13.27), V(mx + 8.4, 0.63, 13.33)), picket);
      b.add(new THREE.BoxGeometry(0.1, 1.1, 0.1).translate(mx + 1.4, 0.55, 13.0), wood);
      b.add(new THREE.BoxGeometry(0.3, 0.3, 0.5).translate(mx + 1.4, 1.2, 13.0), lam("nMailbox", () => ({ color: "#3f6fb5" })));
    }
    // benches with legs, lampposts
    for (const [x, z] of [[-4, 9], [10.5, 9.5], [4.2, 5.6]]) {
      b.add(boxGeo(V(x - 1, 0.42, z - 0.25), V(x + 1, 0.5, z + 0.25)), wood);
      b.add(boxGeo(V(x - 1, 0.5, z - 0.27), V(x + 1, 0.95, z - 0.2)), wood);
      for (const lx of [-0.85, 0.85]) b.add(boxGeo(V(x + lx - 0.05, 0, z - 0.2), V(x + lx + 0.05, 0.42, z + 0.2)), iron);
    }
    for (const [x, z] of [[-6.2, 11.8], [7.4, 12.6], [-8, -8], [5, -12.6]]) {
      b.add(new THREE.BoxGeometry(0.22, 3.6, 0.22).translate(x, 1.8, z), iron);
      b.add(new THREE.BoxGeometry(0.5, 0.5, 0.5).translate(x, 3.85, z), lam("nLamp", () => ({ color: "#f6e7a6" })));
      b.add(new THREE.BoxGeometry(0.7, 0.15, 0.7).translate(x, 4.17, z), iron);
    }
    { // town hall
      const [hx, , hz] = HALL, hw = 9.6, hd = 7, hh2 = 8, front = hz + hd / 2;
      const cream = lam("nHall", () => ({ map: brickReal(), color: "#f2e6cc" }));
      b.add(boxGeo(V(hx - hw / 2, 0, hz - hd / 2), V(hx + hw / 2, hh2, hz + hd / 2), 3), cream);
      b.add(boxGeo(V(hx - hw / 2 - 0.3, hh2, hz - hd / 2 - 0.3), V(hx + hw / 2 + 0.3, hh2 + 0.5, front + 2.6)), trim);
      for (let k = 0; k < 3; k++) b.add(boxGeo(V(hx - hw / 2 + 0.5 - k * 0.3, 0, front + 0.2), V(hx + hw / 2 - 0.5 + k * 0.3, 0.2 * (3 - k), front + 2.4 + k * 0.45)), trim);
      for (let k = 0; k < 6; k++) b.add(new THREE.CylinderGeometry(0.32, 0.36, hh2 - 0.6, 16).translate(hx - hw / 2 + 0.9 + k * ((hw - 1.8) / 5), 0.6 + (hh2 - 0.6) / 2, front + 1.9), lam("nCol", () => ({ color: "#fbf6ea" })));
      const ped = new THREE.BufferGeometry();
      ped.setAttribute("position", new THREE.Float32BufferAttribute([hx - hw / 2 - 0.3, hh2 + 0.5, front + 2.6, hx + hw / 2 + 0.3, hh2 + 0.5, front + 2.6, hx, hh2 + 2.6, front + 2.6], 3)); ped.computeVertexNormals();
      ped.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2)); b.add(ped, trim);
      const slab = new THREE.BoxGeometry(hw + 0.8, 0.3, Math.hypot(hd / 2 + 1.6, 2.1) * 2); b.add(slab, roofT, new THREE.Matrix4().makeTranslation(hx, hh2 + 0.6, hz + 1.2));
      b.add(new THREE.BoxGeometry(2.2, 3.6, 0.15).translate(hx, 1.8, front + 0.06), door);
      for (const sx of [-3.2, -1.9, 1.9, 3.2]) for (const y of [2.2, 5.6]) { b.add(new THREE.BoxGeometry(0.9, 1.6, 0.1).translate(hx + sx, y, front + 0.04), frame); b.add(new THREE.BoxGeometry(0.7, 1.4, 0.12).translate(hx + sx, y, front + 0.06), win); }
      const sign = new THREE.PlaneGeometry(5.2, 0.9).translate(hx, hh2 - 0.6, front + 2.62); b.add(sign, lam("nHallSign", () => ({ map: textTex("hallSign", 1024, 176, "#2b3d6a", "#f3d35a", ["TOWN HALL"], 120) })));
      b.add(new THREE.CylinderGeometry(0.06, 0.06, 4, 8).translate(hx, hh2 + 4.6, hz), iron);
      b.add(new THREE.BoxGeometry(1.6, 1.0, 0.04).translate(hx + 0.8, hh2 + 6.0, hz), lam("nFlag", () => ({ color: "#d23b3b" })));
    }
    b.build(R);
    this.dog = new Dog(R);
    for (let i = 0; i < 3; i++) this.cows.push(new Cow(R, i));
    this.hen = new Hen(R);
    { // THE BUTTON: gold collar, big red dome; on its underside a tiny blue UNDO button
      const M = (g: THREE.BufferGeometry, m: THREE.Material) => { const x = new THREE.Mesh(g, m); x.castShadow = true; x.receiveShadow = true; this.button.add(x); return x; };
      M(new THREE.CylinderGeometry(0.34, 0.36, 0.08, 32), brass);
      this.btnGlow = twoTone(new THREE.MeshLambertMaterial({ color: "#e8231e", emissive: new THREE.Color("#ff2a1a"), emissiveIntensity: 0.4 })) as THREE.MeshLambertMaterial;
      this.btnCap = M(new THREE.SphereGeometry(0.27, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.72, 1).translate(0, 0.04, 0), this.btnGlow);
      M(new THREE.SphereGeometry(0.06, 12, 8).scale(1.4, 0.35, 0.8).translate(-0.1, 0.205, 0.07), lam("nShine", () => ({ color: "#ff8a80" })));
      M(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 32).translate(0, -0.05, 0), lam("nBtnUnder", () => ({ color: "#3b3f52" })));
      M(new THREE.SphereGeometry(0.07, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI).translate(0, -0.06, 0), lam("nBlue", () => ({ color: "#3f8fe0", emissive: "#2a6ad0", emissiveIntensity: 0.5 })));
      const lab = new THREE.PlaneGeometry(0.3, 0.1).rotateX(Math.PI / 2).translate(0, -0.062, -0.17); M(lab, lam("nUndo", () => ({ map: textTex("undo", 256, 86, "#fbf6ea", "#2a6ad0", ["UNDO"], 64), side: THREE.DoubleSide })));
      this.button.position.set(BTN[0], BTN[1] + 0.68, BTN[2]); R.add(this.button);
    }
    { // Mom's chocolate cake (part 2)
      const M = (g: THREE.BufferGeometry, c: string) => { const x = new THREE.Mesh(g, twoTone(new THREE.MeshLambertMaterial({ color: c }))); x.castShadow = true; this.choc.add(x); };
      M(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 28), "#ffffff");
      M(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 28).translate(0, 0.13, 0), "#6a3a22");
      M(new THREE.CylinderGeometry(0.31, 0.31, 0.04, 28).translate(0, 0.25, 0), "#8a5232");
      M(new THREE.CylinderGeometry(0.2, 0.2, 0.15, 28).translate(0, 0.34, 0), "#6a3a22");
      M(new THREE.CylinderGeometry(0.21, 0.21, 0.04, 28).translate(0, 0.42, 0), "#8a5232");
      M(new THREE.SphereGeometry(0.06, 12, 8).translate(0, 0.49, 0), "#d22e2e");
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; M(new THREE.SphereGeometry(0.035, 8, 6).translate(Math.cos(a) * 0.24, 0.28, Math.sin(a) * 0.24), "#fbf6ea"); }
      this.choc.position.set(MOMT[0], 0.8, MOMT[2]); this.choc.visible = false; R.add(this.choc);
    }
    // clock hands (animated): hour + minute
    for (const [L, w] of [[1.0, 0.12], [1.55, 0.08]] as const) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(w, L, 0.03).translate(0, L / 2 - 0.12, 0), iron);
      h.position.set(tx, 15, tz + 3.06); this.hands.push(h); R.add(h);
    }
    this.bell = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.85, 1.3, 20, 1, true).translate(0, -0.75, 0), brass);
    (this.bell.material as THREE.MeshLambertMaterial).side = THREE.DoubleSide;
    this.bell.position.set(tx, 19.4, tz); R.add(this.bell);
    this.vane.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8).translate(0, 0.9, 0), iron));
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 8).rotateZ(-Math.PI / 2).translate(0.9, 1.3, 0), iron);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.03).translate(-0.8, 1.3, 0), iron);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.05).translate(0, 1.3, 0), iron);
    const rooster = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8).scale(1.3, 1, 0.4).translate(0, 1.65, 0), brass);
    this.vane.add(arrow, tail, bar, rooster); this.vane.position.set(VANE[0], VANE[1] - 1.3, VANE[2]); R.add(this.vane);
    this.vane.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
    const flagCols = ["#d23b3b", "#f3d35a", "#3f6fb5", "#f7f1e1", "#2f8a4f"];
    for (let k = 0; k < 4; k++) for (let i = 0; i < 18; i++) {
      const u = i / 17, x = -13 + 26 * u, z = -6 + k * 5, y = 7 - 1.8 * Math.sin(Math.PI * u);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.55, 3).rotateX(Math.PI).translate(0, -0.27, 0), lam("nFlag" + (i % 5), () => ({ color: flagCols[i % 5] })));
      fl.position.set(x, y, z); this.bunting.add(fl);
    }
    R.add(this.bunting);
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(SUN_SHOT[id]?.az ?? L.az), el = THREE.MathUtils.degToRad(SUN_SHOT[id]?.el ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.08; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(s.light === "golden" ? "#ffc8a0" : "#9cc4ff"); this.hemi.groundColor.set("#6a8a4a"); this.hemi.intensity = 2.1;
    this.sun.color.set(s.light === "golden" ? "#ffa860" : "#ffe6c0"); this.sun.intensity = s.light === "golden" ? 4.8 : 4.7; this.sun.shadow.radius = 4; this.sun.shadow.blurSamples = 12;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    if (dist > 40) Rr = Math.max(Rr, 80);
    this.sun.position.copy(focus).addScaledVector(sunDir, 260); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 560; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    const SKY = s.light === "golden" ? ["#ffc488", "#ffa66e", "#f08a72", "#b8709a", "#5a4e9a"] : ["#b4daf6", "#8cc4f0", "#62a8ea", "#3d88e0", "#2a6cd4"];
    SKY.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((dg) => THREE.MathUtils.degToRad(dg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(s.light === "golden" ? "#f6c79a" : "#b4d6f2", this.fog.color); this.fog.near = 70; this.fog.far = 520;
    scene.fog = this.fog; scene.background = null;
    this.sunDisc.visible = s.light === "golden";
    if (this.sunDisc.visible) { this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900); this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7))); }
    for (let i = 0; i < this.clouds.length; i++) { const m = this.clouds[i]; m.lookAt(cam.position.x, m.position.y, cam.position.z); (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4]; }

    // ---- clock, bell, vane, bunting, balloons, button, houses ----
    const btn = buttonAt(t);
    const mins = 0.1 + t * 0.003;
    this.hands[0].rotation.z = -mins * 0.0833 * Math.PI * 2; this.hands[1].rotation.z = -mins * Math.PI * 2;
    this.bell.rotation.z = 0.3 * btn.press * Math.sin(t * 9);
    this.vane.rotation.y = 0.4 * Math.sin(t * 0.4);
    this.bunting.visible = s.party;
    this.bunting.children.forEach((o, i) => { o.rotation.z = 0.25 * Math.sin(t * 3 + i); });
    this.balloons.children.forEach((o, i) => { o.rotation.z = 0.06 * Math.sin(t * 1.3 + i); });
    this.btnCap.scale.y = 1 - 0.55 * btn.press;
    this.btnGlow.emissiveIntensity = 0.3 + btn.glow * 1.1 + btn.press * 1.5;
    this.button.position.set(BTN[0], BTN[1] + 0.68 + btn.lift, BTN[2]);
    this.button.rotation.set(Math.PI * btn.flip, 0, 0);
    const dz = danceAt(t);
    for (const h of this.houses) {
      const ph = t * 5.2 + h.seed * 1.3;
      h.g.position.set(h.x, dz * 0.45 * Math.max(0, Math.sin(ph)), h.z);
      h.g.rotation.set(0, h.yaw + dz * 0.08 * Math.sin(ph * 0.5), dz * 0.12 * Math.sin(ph * 0.5 + 0.7));
      h.g.scale.set(1 + dz * 0.05 * Math.sin(ph + 1.5), 1 - dz * 0.06 * Math.sin(ph + 1.5), 1);
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0, ri = 0;
    for (const q of st.places) {
      const sc2 = q.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(q.x, q.y + 1.1 * sc2, q.z), 3.5 * Math.max(sc2, 0.3)))) continue;
      if (q.rig) {
        while (this.rigs.length <= ri) this.rigs.push(new Blocky(this.root));
        const r = this.rigs[ri++];
        r.set(q.rig, t);
        r.root.position.set(q.x, q.y, q.z);
        const yaw = q.yaw ?? Math.atan2(cam.position.x - q.x, cam.position.z - q.z) + 0.28 * Math.sin(ri * 1.7);
        r.root.rotation.set(0, yaw, q.roll ?? 0);
        r.root.scale.setScalar(sc2);
        continue;
      }
      const a = this.actor(ai++);
      const [w, h, k] = q.size ?? [300, 500, 0.5];
      a.r = this.pool.req(q.key, w, h, k, q.draw);
      a.mesh.visible = true; a.mesh.position.set(q.x, q.y, q.z);
      a.mesh.rotation.set(0, q.yaw ?? Math.atan2(cam.position.x - q.x, cam.position.z - q.z), q.roll ?? 0);
      a.mesh.scale.set(q.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    for (let i = ri; i < this.rigs.length; i++) this.rigs[i].hide();
    if (st.dog) this.dog.set({ ...st.dog, x: st.dog.p[0], y: st.dog.p[1], z: st.dog.p[2] }, t); else this.dog.hide();
    this.cows.forEach((cw, i) => { const p = st.cows[i]; if (p) cw.set(p, t); else cw.hide2(); });
    if (st.hen) this.hen.set(st.hen, t); else this.hen.hide();
    this.choc.visible = st.choc > 0.002; this.choc.scale.setScalar(Math.max(0.001, st.choc));
    let fi = 0;
    const fused: Fx[] = [];
    for (const q of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(q.x, q.y, q.z), Math.max(q.w, q.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(q.key, q.cw, q.ch, 1, q.draw);
      e2.use(!!q.soft); e2.mesh.visible = true; e2.mesh.position.set(q.x, q.y, q.z);
      if (q.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, q.rot ?? 0);
      else if (q.face) e2.mesh.rotation.set(0, q.yaw ?? 0, q.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(q.rot ?? 0); }
      e2.mesh.scale.set(q.w, q.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (let i = 0; i < ai; i++) this.actors[i].bind();
    for (const e2 of fused) e2.bind();
    void W2; void smooth; void clamp01;
    return focus;
  }
}
export { smooth };
export type { V3 };
