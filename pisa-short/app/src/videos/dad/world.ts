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
import { Cow, Duck, Props } from "./critters";
import {
  FPS, SHOTS, camAt, ShotDef, V3, TOWER, TOWER_H, TOP_Y, VANE, HALL, STOOL, PAD, BAKERY, PART, smooth, clamp01, stairAt, SR,
  PORCH_Y, OAK, HOLLOW, POND, POND_R, TREEHOUSE, KIT, ROOM, STOVE, TABLE, COUCH, WINDOW,
} from "./story";
const STL1: V3 = [-9.6, 0, 3.4], STL2: V3 = [8.4, 0, 3.0], STL3: V3 = [-8.6, 0, -9.2], FOUNTAIN: V3 = [-4.0, 0, 5.0];
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
  private duck!: Duck; private props!: Props;
  private ropes: THREE.Mesh[] = []; private ropeMat?: THREE.Material;
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
        if (z > 20 && x > 0) return; // the oak, the pond and the tree house stand here
        const hb = new Batch(); blockHouse(hb, w, 8, [8, 9, 10, 7][i % 4], i);
        const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; hb.build(g); R.add(g);
        this.houses.push({ g, x, z, yaw, seed: i });
      });
      for (let i = 0; i < 260; i++) { const a = i * 2.39996, d = 30 + (i % 17) * 5, x = Math.cos(a) * d, z = Math.sin(a) * d; if (Math.hypot(x - KIT[0], z - KIT[2]) < 13 || Math.hypot(x - ROOM[0], z - ROOM[2]) < 11) continue; blockTree(b, x, z, 13 + (i % 6) * 2.5, i); }
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
    { // a little wooden stool on the deck (Dad's cap waits on it in part 2)
      const [sx, sy, sz] = STOOL;
      b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 18).translate(sx, sy + 0.5, sz), lam("nStool", () => ({ color: "#b07a4a" })));
      for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [0.18, 0.18], [-0.18, 0.18]]) b.add(new THREE.BoxGeometry(0.05, 0.5, 0.05).translate(sx + lx, sy + 0.25, sz + lz), lam("nStoolL", () => ({ color: "#8a5a34" })));
    }
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
    bunch(STL2[0] - 0.5, STL2[2] - 0.6, 9, 2.6); bunch(STL2[0] - 0.5, STL2[2] + 0.8, 7, 2.4);
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
    { // our house's porch: deck, two steps, posts, a little roof, a bench, a welcome mat; picket fence and a mailbox
      const mx = -4.4, fz = 18, wood2 = lam("nPorch", () => ({ color: "#c98a5a" })), white2 = lam("nPicket", () => ({ color: "#fbf8f2" }));
      b.add(boxGeo(V(mx - 2.4, 0, fz - 1.6), V(mx + 2.4, PORCH_Y, fz)), wood2);
      for (let k = 0; k < 2; k++) b.add(boxGeo(V(mx - 0.9, 0, fz - 1.6 - 0.32 * (2 - k)), V(mx + 0.9, PORCH_Y * (k + 1) / 3, fz - 1.6)), wood2);
      for (const sx of [-2.25, 2.25]) b.add(new THREE.BoxGeometry(0.16, 2.6, 0.16).translate(mx + sx, PORCH_Y + 1.3, fz - 1.48), white2);
      b.add(boxGeo(V(mx - 2.6, PORCH_Y + 2.6, fz - 1.8), V(mx + 2.6, PORCH_Y + 2.78, fz + 0.1)), lam("nPorchRoof", () => ({ color: "#6b3f35" })));
      for (let k = 0; k < 9; k++) { const x = mx - 2.3 + k * 0.32; if (Math.abs(x - mx) < 1.0) continue; b.add(new THREE.BoxGeometry(0.06, 0.6, 0.06).translate(x, PORCH_Y + 0.3, fz - 1.52), white2); }
      b.add(boxGeo(V(mx - 2.3, PORCH_Y + 0.58, fz - 1.56), V(mx - 1.0, PORCH_Y + 0.64, fz - 1.48)), white2); b.add(boxGeo(V(mx + 1.0, PORCH_Y + 0.58, fz - 1.56), V(mx + 2.3, PORCH_Y + 0.64, fz - 1.48)), white2);
      b.add(boxGeo(V(mx + 1.2, PORCH_Y + 0.4, fz - 0.6), V(mx + 2.2, PORCH_Y + 0.46, fz - 0.2)), wood); b.add(boxGeo(V(mx + 1.2, PORCH_Y + 0.46, fz - 0.24), V(mx + 2.2, PORCH_Y + 0.8, fz - 0.18)), wood);
      for (const lx of [1.25, 2.15]) b.add(boxGeo(V(mx + lx - 0.03, PORCH_Y, fz - 0.58), V(mx + lx + 0.03, PORCH_Y + 0.4, fz - 0.22)), iron);
      b.add(new THREE.PlaneGeometry(1.0, 0.6).rotateX(-Math.PI / 2).translate(mx, PORCH_Y + 0.005, fz - 0.45), lam("nMat", () => ({ map: textTex("welcome", 256, 150, "#c94a3a", "#fbe8c8", ["WELCOME"], 40) })));
      b.add(new THREE.CylinderGeometry(0.22, 0.18, 0.4, 14).translate(mx - 1.8, PORCH_Y + 0.2, fz - 0.4), lam("nPot", () => ({ color: "#c9622a" })));
      b.add(new THREE.IcosahedronGeometry(0.32, 1).translate(mx - 1.8, PORCH_Y + 0.62, fz - 0.4), lam("nBush", () => ({ color: "#4cb050" })));
      for (let k = 0; k < 34; k++) { const x = mx - 8.5 + k * 0.5; if (Math.abs(x - mx) < 0.8) continue; b.add(new THREE.BoxGeometry(0.14, 0.9, 0.06).translate(x, 0.45, 13.3), white2); }
      b.add(boxGeo(V(mx - 8.5, 0.55, 13.27), V(mx - 0.8, 0.63, 13.33)), white2); b.add(boxGeo(V(mx + 0.8, 0.55, 13.27), V(mx + 8.4, 0.63, 13.33)), white2);
      b.add(new THREE.BoxGeometry(0.1, 1.1, 0.1).translate(mx + 1.4, 0.55, 13.0), wood);
      b.add(new THREE.BoxGeometry(0.3, 0.3, 0.5).translate(mx + 1.4, 1.2, 13.0), lam("nMailbox", () => ({ color: "#3f6fb5" })));
      b.add(quadUp(mx - 0.7, mx + 0.7, 13.3, 16.4, 1, 1, 0.025), lam("nWalk", () => ({})));
    }
    { // the old oak: thick trunk, roots, crooked branches, a big leafy crown, a dark hollow facing the street
      const [ox, , oz] = OAK, bark = lam("nBark", () => ({ map: barkReal() })), leafM = lam("nOakLeaf", () => ({ map: leavesReal(1), color: "#8ad06a" }));
      b.add(new THREE.CylinderGeometry(0.75, 1.15, 5.2, 14).translate(ox, 2.6, oz), bark);
      for (let k = 0; k < 6; k++) { const a = k * 1.05; b.add(beamGeo(V(ox, 0.4, oz), V(ox + Math.cos(a) * 1.7, 0.05, oz + Math.sin(a) * 1.7), 0.35), bark); }
      for (const [dx, dy, dz] of [[2.2, 6.2, 0.6], [-2.0, 6.6, -0.4], [0.4, 7.4, -1.8], [-0.6, 6.0, 1.9]]) b.add(beamGeo(V(ox, 4.6, oz), V(ox + dx, dy, oz + dz), 0.42), bark);
      for (const [dx, dy, dz, r] of [[0, 8.4, 0, 3.4], [2.6, 7.2, 0.8, 2.4], [-2.5, 7.4, -0.5, 2.5], [0.6, 7.8, -2.4, 2.3], [-0.8, 7.0, 2.4, 2.3], [1.6, 9.4, 1.0, 2.0]]) b.add(new THREE.IcosahedronGeometry(r, 1).translate(ox + dx, dy, oz + dz), leafM);
      const [hx, hy, hz] = HOLLOW;
      b.add(new THREE.CircleGeometry(0.42, 20).scale(0.8, 1.15, 1).translate(hx, hy, hz + 0.002), lam("nHollow", () => ({ color: "#24160e" })));
      b.add(new THREE.TorusGeometry(0.42, 0.08, 8, 20).scale(0.8, 1.15, 1).translate(hx, hy, hz), bark);
    }
    { // the pond: water, a stone rim, reeds, lily pads
      const [px, , pz] = POND;
      b.add(new THREE.CircleGeometry(POND_R, 36).rotateX(-Math.PI / 2).translate(px, 0.04, pz), lam("nPond", () => ({ color: "#58b8e8" })));
      for (let k = 0; k < 26; k++) { const a = (k / 26) * Math.PI * 2; b.add(new THREE.DodecahedronGeometry(0.28 + (k % 3) * 0.06, 0).scale(1, 0.55, 1).translate(px + Math.cos(a) * (POND_R + 0.15), 0.1, pz + Math.sin(a) * (POND_R + 0.15)), lam("nRock", () => ({ color: "#b8b0a4" }))); }
      for (let k = 0; k < 7; k++) { const a = k * 0.9 + 0.3, r = POND_R * (0.35 + (k % 3) * 0.18); b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 14, 1, false, 0, Math.PI * 1.75).translate(px + Math.cos(a) * r, 0.06, pz + Math.sin(a) * r), lam("nPad", () => ({ color: "#4cb050" }))); }
      for (let k = 0; k < 12; k++) { const a = -0.7 + k * 0.12, r = POND_R + 0.35; b.add(new THREE.CylinderGeometry(0.025, 0.03, 1.1 + (k % 3) * 0.2, 5).translate(px + Math.cos(a) * r, 0.55, pz + Math.sin(a) * r), lam("nReed", () => ({ color: "#5a8a3a" }))); b.add(new THREE.CapsuleGeometry(0.05, 0.18, 4, 6).translate(px + Math.cos(a) * r, 1.2 + (k % 3) * 0.2, pz + Math.sin(a) * r), lam("nCattail", () => ({ color: "#6a4428" }))); }
    }
    { // the tree house: a big tree, a platform, a little cabin with a window, a rope ladder
      const [tx2, , tz2] = TREEHOUSE, bark = lam("nBark", () => ({ map: barkReal() }));
      b.add(new THREE.CylinderGeometry(0.6, 0.95, 9, 12).translate(tx2, 4.5, tz2), bark);
      for (const [dx, dy, dz, r] of [[0, 10, 0, 3.6], [2.4, 8.6, 1.0, 2.6], [-2.4, 9.0, -0.6, 2.7], [0.5, 11.2, -1.2, 2.4]]) b.add(new THREE.IcosahedronGeometry(r, 1).translate(tx2 + dx, dy, tz2 + dz), lam("nTHLeaf", () => ({ map: leavesReal(2), color: "#7ac85a" })));
      b.add(boxGeo(V(tx2 - 2.0, 4.0, tz2 - 1.8), V(tx2 + 2.0, 4.25, tz2 + 1.8)), lam("nPlank", () => ({ color: "#b07a4a" })));
      b.add(boxGeo(V(tx2 - 1.4, 4.25, tz2 - 1.2), V(tx2 + 1.4, 6.2, tz2 + 1.2)), lam("nCabin", () => ({ color: "#c98a5a" })));
      const r2 = new THREE.ConeGeometry(2.3, 1.4, 4); r2.rotateY(Math.PI / 4); b.add(r2, lam("nCabinRoof", () => ({ color: "#4cb050" })), new THREE.Matrix4().makeTranslation(tx2, 6.9, tz2));
      b.add(new THREE.BoxGeometry(0.8, 0.7, 0.06).translate(tx2 - 0.4, 5.3, tz2 + 1.22), lam("nWinDark", () => ({ color: "#3a2a1e" })));
      b.add(new THREE.BoxGeometry(0.9, 0.08, 0.1).translate(tx2 - 0.4, 4.92, tz2 + 1.26), frame);
      b.add(new THREE.BoxGeometry(0.7, 1.3, 0.06).translate(tx2 + 0.7, 4.9, tz2 + 1.22), door);
      for (const s of [-0.25, 0.25]) b.add(new THREE.CylinderGeometry(0.02, 0.02, 4.0, 5).translate(tx2 + 0.7 + s, 2.0, tz2 + 1.9), lam("nRope", () => ({ color: "#c9a46a" })));
      for (let k = 0; k < 9; k++) b.add(new THREE.BoxGeometry(0.56, 0.05, 0.08).translate(tx2 + 0.7, 0.3 + k * 0.42, tz2 + 1.9), wood);
      for (let k = 0; k < 9; k++) b.add(new THREE.BoxGeometry(0.06, 0.6, 0.06).translate(tx2 - 1.9 + k * 0.47, 4.55, tz2 + 1.75), wood);
    }
    { // KITCHEN + LIVING ROOM set (no front wall, open toward +z)
      const [kx, , kz] = KIT, wall = lam("nWallpaper", () => ({ map: ctex("wallpaper", 256, 256, (g) => { g.fillStyle = "#f6e3c4"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#efd3a8"; for (let i = 0; i < 256; i += 32) g.fillRect(i, 0, 12, 256); g.fillStyle = "#e88a6a"; for (let y = 16; y < 256; y += 64) for (let x = 6; x < 256; x += 32) { g.beginPath(); g.arc(x, y + (x % 64 ? 32 : 0), 3, 0, 7); g.fill(); } }) }));
      const floor = lam("nFloor", () => ({ map: ctex("floorP", 256, 256, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#c9955e" : "#b8844e"; g.fillRect(0, i * 32, 256, 32); g.fillStyle = "rgba(0,0,0,0.15)"; g.fillRect(((i * 97) % 200) + 20, i * 32, 3, 32); } }) }));
      b.add(boxGeo(V(kx - 4, 0, kz - 3), V(kx + 4, 0.08, kz + 3)), floor);
      b.add(boxGeo(V(kx - 4, 0, kz - 3.15), V(kx + 4, 3.4, kz - 3)), wall); b.add(boxGeo(V(kx - 4.15, 0, kz - 3.15), V(kx - 4, 3.4, kz + 3)), wall); b.add(boxGeo(V(kx + 4, 0, kz - 3.15), V(kx + 4.15, 3.4, kz + 3)), wall);
      b.add(boxGeo(V(kx - 4, 0.08, kz - 3.0), V(kx + 4, 0.22, kz - 2.95)), lam("nSkirting", () => ({ color: "#fbf6ea" })));
      const [wx, wy, wz] = WINDOW;
      b.add(new THREE.PlaneGeometry(1.7, 1.3).translate(wx, wy, wz + 0.002), lam("nWinSky" + PART, () => ({ map: ctex("winSky" + PART, 256, 200, (g) => {
        if (PART === 2) { const gr = g.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, "#141c48"); gr.addColorStop(1, "#4a3a7a"); g.fillStyle = gr; g.fillRect(0, 0, 256, 200); g.fillStyle = "#fff8d0"; for (let i = 0; i < 40; i++) g.fillRect((i * 97) % 256, (i * 53) % 150, 2, 2); g.beginPath(); g.arc(200, 44, 16, 0, 7); g.fill(); g.fillStyle = "#1a2050"; g.fillRect(0, 160, 256, 40); for (let i = 0; i < 6; i++) { g.fillStyle = "#0e1436"; g.fillRect(i * 46, 140 - (i % 3) * 14, 40, 60); g.fillStyle = "#f6d36a"; g.fillRect(i * 46 + 8, 150 - (i % 3) * 14, 8, 8); } }
        else { const gr = g.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, "#3d88e0"); gr.addColorStop(1, "#b4daf6"); g.fillStyle = gr; g.fillRect(0, 0, 256, 200); g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(80, 60, 40, 16, 0, 0, 7); g.ellipse(180, 90, 30, 12, 0, 0, 7); g.fill(); g.fillStyle = "#6ac04a"; g.fillRect(0, 160, 256, 40); }
      }) })));
      b.add(new THREE.BoxGeometry(1.86, 0.1, 0.12).translate(wx, wy + 0.7, wz + 0.04), frame); b.add(new THREE.BoxGeometry(1.86, 0.12, 0.26).translate(wx, wy - 0.7, wz + 0.1), frame);
      for (const s of [-0.9, 0, 0.9]) b.add(new THREE.BoxGeometry(0.08, 1.4, 0.1).translate(wx + s, wy, wz + 0.04), frame);
      for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.5, 1.6, 0.04).translate(wx + s * 1.15, wy + 0.05, wz + 0.06), lam("nCurtain", () => ({ map: stripes("curtain", "#e2453c", "#fbf6ea", 8) })));
      // kitchen counter + stove + sink + fridge + shelves
      const cab = lam("nCab", () => ({ color: "#7ac0b0" })), top2 = lam("nTop", () => ({ color: "#efe6d6" }));
      b.add(boxGeo(V(kx - 3.95, 0.08, kz - 2.95), V(kx - 1.2, 0.9, kz - 2.3)), cab); b.add(boxGeo(V(kx - 4.0, 0.9, kz - 3.0), V(kx - 1.15, 0.96, kz - 2.25)), top2);
      for (let k = 0; k < 4; k++) b.add(new THREE.BoxGeometry(0.04, 0.12, 0.03).translate(kx - 3.6 + k * 0.68, 0.75, kz - 2.28), lam("nHandle", () => ({ color: "#e9c24a" })));
      const [sx2, , sz2] = STOVE;
      b.add(boxGeo(V(sx2 - 0.45, 0.08, sz2 - 0.5), V(sx2 + 0.45, 0.94, sz2 + 0.2)), lam("nStove", () => ({ color: "#f4f1ea" })));
      b.add(new THREE.PlaneGeometry(0.6, 0.4).translate(sx2, 0.5, sz2 + 0.205), lam("nOven", () => ({ color: "#3b3f52" })));
      for (const [dx, dz] of [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.05], [0.2, 0.05]]) b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 16).translate(sx2 + dx, 0.95, sz2 + dz), lam("nBurner", () => ({ color: "#2e2a36" })));
      b.add(boxGeo(V(kx - 1.0, 0.08, kz - 2.95), V(kx - 0.1, 2.1, kz - 2.25)), lam("nFridge", () => ({ color: "#fbfbf8" }))); b.add(new THREE.BoxGeometry(0.05, 0.5, 0.04).translate(kx - 0.2, 1.3, kz - 2.23), lam("nHandle", () => ({})));
      for (let k = 0; k < 3; k++) b.add(new THREE.BoxGeometry(0.16, 0.16, 0.01).translate(kx - 0.75 + k * 0.22, 1.6 - (k % 2) * 0.25, kz - 2.24), lam("nMagnet" + k, () => ({ color: ["#e2453c", "#f3d35a", "#3f8fe0"][k] })));
      b.add(boxGeo(V(kx - 3.95, 1.75, kz - 3.0), V(kx - 2.0, 1.8, kz - 2.7)), wood);
      for (let k = 0; k < 5; k++) b.add(new THREE.CylinderGeometry(0.07, 0.06, 0.18, 10).translate(kx - 3.7 + k * 0.38, 1.9, kz - 2.85), lam("nJar" + (k % 3), () => ({ color: ["#e8b06a", "#c9512a", "#7ac0b0"][k % 3] })));
      // table + chairs
      const [tbx, , tbz] = TABLE;
      b.add(new THREE.CylinderGeometry(0.85, 0.85, 0.06, 28).translate(tbx, 0.78, tbz), lam("nKTable", () => ({ color: "#d9a46a" })));
      b.add(new THREE.CylinderGeometry(0.86, 0.86, 0.02, 28).translate(tbx, 0.815, tbz), lam("nCloth3", () => ({ map: ctex("check3", 256, 256, (g) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? "#e2453c" : "#fbf6ea"; g.fillRect(i * 32, j * 32, 32, 32); } }) })));
      b.add(new THREE.CylinderGeometry(0.08, 0.12, 0.76, 10).translate(tbx, 0.4, tbz), wood);
      for (const a of [0.5, 2.6, 4.2]) { const cx = tbx + Math.cos(a) * 1.15, cz = tbz + Math.sin(a) * 1.15; b.add(boxGeo(V(cx - 0.25, 0.45, cz - 0.25), V(cx + 0.25, 0.5, cz + 0.25)), wood); const bx3 = cx + Math.cos(a) * 0.22, bz3 = cz + Math.sin(a) * 0.22; b.add(new THREE.BoxGeometry(0.46, 0.5, 0.05).rotateY(-a + Math.PI / 2).translate(bx3, 0.75, bz3), wood); for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [0.2, 0.2], [-0.2, 0.2]]) b.add(new THREE.BoxGeometry(0.04, 0.45, 0.04).translate(cx + lx, 0.23, cz + lz), wood); }
      // couch + rug + lamp + pictures + clock
      const [cx2, , cz2] = COUCH, sofa = lam("nSofa", () => ({ color: "#5a7ac0" }));
      b.add(boxGeo(V(cx2 - 0.5, 0.08, cz2 - 1.1), V(cx2 + 0.4, 0.5, cz2 + 1.1)), sofa); b.add(boxGeo(V(cx2 + 0.2, 0.08, cz2 - 1.1), V(cx2 + 0.55, 1.1, cz2 + 1.1)), sofa);
      for (const s of [-1, 1]) b.add(boxGeo(V(cx2 - 0.5, 0.08, cz2 + s * 1.1 - (s > 0 ? 0.25 : 0)), V(cx2 + 0.55, 0.75, cz2 + s * 1.1 + (s > 0 ? 0 : 0.25))), sofa);
      for (const s of [-0.5, 0.5]) b.add(new THREE.BoxGeometry(0.75, 0.16, 0.9).translate(cx2 - 0.08, 0.58, cz2 + s), lam("nCushion", () => ({ color: "#6a8ad0" })));
      b.add(new THREE.BoxGeometry(0.2, 0.36, 0.36).rotateZ(0.3).translate(cx2 + 0.05, 0.8, cz2 - 0.6), lam("nPillow", () => ({ color: "#f3d35a" })));
      b.add(new THREE.CylinderGeometry(1.2, 1.2, 0.02, 28).scale(1, 1, 0.7).translate(cx2 - 1.4, 0.09, cz2 + 0.2), lam("nRug", () => ({ map: stripes("rug", "#c94a3a", "#f3d35a", 10) })));
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8).translate(kx + 3.6, 0.88, kz - 2.6), iron); b.add(new THREE.CylinderGeometry(0.18, 0.3, 0.35, 16, 1, true).translate(kx + 3.6, 1.8, kz - 2.6), lam("nShade", () => ({ color: "#fbe8b8", side: THREE.DoubleSide, emissive: "#ffd28a", emissiveIntensity: 0.5 })));
      b.add(new THREE.PlaneGeometry(0.8, 0.6).translate(kx + 2.2, 2.2, kz - 2.99), lam("nFamPic", () => ({ map: ctex("famPic", 256, 192, (g) => { g.fillStyle = "#8a5a34"; g.fillRect(0, 0, 256, 192); g.fillStyle = "#cfe8ff"; g.fillRect(16, 16, 224, 160); g.fillStyle = "#e07a9a"; g.fillRect(70, 90, 50, 86); g.fillStyle = "#ffb02e"; g.fillRect(140, 120, 40, 56); g.fillStyle = "#ffe2c2"; g.beginPath(); g.arc(95, 70, 22, 0, 7); g.arc(160, 102, 18, 0, 7); g.fill(); g.fillStyle = "#5a3b2a"; g.fillRect(73, 46, 44, 12); g.fillStyle = "#6a3c1e"; g.fillRect(142, 82, 36, 10); g.strokeStyle = "#7a7a7a"; g.setLineDash([6, 6]); g.lineWidth = 3; g.strokeRect(196, 60, 34, 112); g.fillStyle = "#7a7a7a"; g.font = "700 26px DejaVu Sans"; g.fillText("?", 205, 120); }) })));
      b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 24).rotateX(Math.PI / 2).translate(kx - 2.6, 2.6, kz - 2.97), lam("nWallClock", () => ({ map: clockTex() })));
      b.add(boxGeo(V(kx - 4, 3.35, kz - 3.15), V(kx + 4.15, 3.45, kz - 2.95)), lam("nCornice", () => ({ color: "#fbf6ea" })));
    }
    { // INSIDE THE TREE HOUSE set: plank floor and walls, a round window with the sunset, a poster, string lights
      const [rx, , rz] = ROOM, planks = lam("nPlanks2", () => ({ map: ctex("planks2", 256, 256, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#b07a4a" : "#a06a3e"; g.fillRect(i * 32, 0, 32, 256); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(i * 32, 0, 2, 256); g.beginPath(); g.arc(i * 32 + 16, (i * 71) % 256, 3, 0, 7); g.fill(); } }) }));
      b.add(boxGeo(V(rx - 2.2, 0, rz - 2), V(rx + 2.2, 0.08, rz + 2)), planks);
      b.add(boxGeo(V(rx - 2.2, 0, rz - 2.15), V(rx + 2.2, 2.6, rz - 2)), planks); b.add(boxGeo(V(rx - 2.35, 0, rz - 2.15), V(rx - 2.2, 2.6, rz + 2)), planks); b.add(boxGeo(V(rx + 2.2, 0, rz - 2.15), V(rx + 2.35, 2.6, rz + 2)), planks);
      b.add(new THREE.CircleGeometry(0.5, 28).translate(rx + 0.9, 1.65, rz - 1.995), lam("nRoundWin", () => ({ map: ctex("sunsetWin", 128, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "#5a4e9a"); gr.addColorStop(0.6, "#f08a72"); gr.addColorStop(1, "#ffc488"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.fillStyle = "#ffe6a0"; g.beginPath(); g.arc(64, 100, 18, 0, 7); g.fill(); }), emissive: "#ffb070", emissiveIntensity: 0.4 })));
      b.add(new THREE.TorusGeometry(0.52, 0.06, 8, 28).translate(rx + 0.9, 1.65, rz - 1.98), wood);
      b.add(new THREE.PlaneGeometry(0.7, 0.9).translate(rx - 1.0, 1.6, rz - 1.99), lam("nPosterDino", () => ({ map: ctex("dinoPoster", 128, 160, (g) => { g.fillStyle = "#3f8fe0"; g.fillRect(0, 0, 128, 160); g.fillStyle = "#5ac83a"; g.beginPath(); g.ellipse(64, 100, 40, 24, 0, 0, 7); g.fill(); g.fillRect(84, 50, 16, 50); g.beginPath(); g.arc(96, 50, 14, 0, 7); g.fill(); g.fillStyle = "#fff"; g.font = "900 20px Arial Black, DejaVu Sans"; g.textAlign = "center"; g.fillText("RAWR!", 64, 30); }) })));
      for (let k = 0; k < 10; k++) b.add(new THREE.SphereGeometry(0.05, 8, 6).translate(rx - 2.0 + k * 0.44, 2.35 - 0.12 * Math.sin((k / 9) * Math.PI), rz - 1.95), lam("nBulb" + (k % 3), () => ({ color: ["#ffd23a", "#ff7a6a", "#7ae0ff"][k % 3], emissive: ["#ffd23a", "#ff7a6a", "#7ae0ff"][k % 3], emissiveIntensity: 1.2 })));
      b.add(new THREE.BoxGeometry(1.2, 0.18, 0.7).translate(rx + 1.4, 0.17, rz + 0.6), lam("nCushionT", () => ({ color: "#c94a3a" })));
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
    this.duck = new Duck(R); this.props = new Props(R);
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
    const mins = 0.1 + t * 0.003;
    this.hands[0].rotation.z = -mins * 0.0833 * Math.PI * 2; this.hands[1].rotation.z = -mins * Math.PI * 2;
    this.bell.rotation.z = 0;
    this.vane.rotation.y = 0.4 * Math.sin(t * 0.4);
    this.bunting.visible = s.party;
    this.balloons.children.forEach((o, i) => { o.rotation.z = 0.06 * Math.sin(t * 1.3 + i); });
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
    if (st.duck) this.duck.set(st.duck, t); else this.duck.hide();
    this.props.begin(); for (const q of st.props) this.props.place(q); this.props.end();
    const ropeM = this.ropeMat ??= twoTone(new THREE.MeshLambertMaterial({ color: "#f4f1ea" }));
    st.ropes.forEach(([a, b2], i) => {
      let r = this.ropes[i];
      if (!r) { r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 5).translate(0, 0.5, 0), ropeM); this.root.add(r); this.ropes[i] = r; }
      const A = V(...a), B = V(...b2), d = B.clone().sub(A), L2 = d.length();
      r.visible = L2 > 0.01; r.position.copy(A); r.scale.set(1, L2, 1); r.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    });
    for (let i = st.ropes.length; i < this.ropes.length; i++) this.ropes[i].visible = false;
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
    void smooth; void clamp01;
    return focus;
  }
}
export { smooth };
export type { V3 };
