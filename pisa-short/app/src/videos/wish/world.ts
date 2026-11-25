// The gravity town as one three.js scene: square, houses, clock tower with an animated clock, swinging bell and
// weather vane, lampposts, the soup table, holiday bunting, rope meshes posed from the cast every frame.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, Ray, withSight, quad, blocked } from "./build";
import { cloudHD } from "./paint";
import { clockTex, grassReal, pavingReal, sidingReal, brickReal, shingleReal, barkReal, leavesReal } from "./noonpaint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { Blocky } from "./blocky";
import { Dog } from "./dog";
import { FPS, SHOTS, camAt, ShotDef, V3, TOWER, TOWER_H, VANE, TABLE, CAKE, HALL, POST, BENCH, ICE, PART, W1, W2, candle, smooth, clamp01 } from "./story";
import { ctex } from "./paint";

export const loadKit = async (): Promise<Kit> => ({});

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const SUN_SHOT: Record<number, { az?: number; el?: number }> = PART === 1 ? {} : { 20: { az: 120, el: 14 } };
const textTex = (key: string, w: number, h: number, bg: string, fg: string, lines: string[], size: number) => ctex(key, w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = Math.max(6, h * 0.04); g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = fg; g.font = `900 ${size}px "Arial Black", "DejaVu Sans", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.1));
});

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
  private ropes: THREE.Mesh[] = [];
  private bunting = new THREE.Group();
  private ropeMat?: THREE.MeshLambertMaterial;
  private rigs: Blocky[] = [];
  private dog!: Dog;
  private ice = new THREE.Group();
  private chains: THREE.Mesh[] = [];
  private chainMat?: THREE.Material;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit, shadowSize = 2048) {
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
    // toy-brick world: flat plastic colours, gridded baseplates, box houses, cube trees
    const grass = lam("nGrassReal", () => ({ map: grassReal() }));
    const cob = lam("nPaving", () => ({ map: pavingReal() }));
    const stone = lam("nStoneR", () => ({ map: brickReal(), color: "#e6d7c4" })), roofT = lam("nRoof", () => ({ color: "#e2453c", side: THREE.DoubleSide }));
    // realistic-ish suburban palette: painted siding in soft colours, brick, dark shingle roofs
    const BRICKS = ["#e9e4d6", "#9fc0d8", "#d6c39a", "#brick", "#bcd4a8", "#f2f0ea", "#brick", "#e0b48e"];
    const ROOFS = ["#4a4f5a", "#6b3f35", "#3b3f52", "#5a5048", "#7a4a3a"];
    const wallMat = (i: number) => BRICKS[i % 8] === "#brick" ? lam("nWallB", () => ({ map: brickReal() })) : lam("nWall" + i % 8, () => ({ map: sidingReal(), color: BRICKS[i % 8] }));
    const win = lam("nWin", () => ({ color: "#5ac8f0" })), frame = lam("nFrame", () => ({ color: "#f4f1ea" })), door = lam("nDoor", () => ({ color: "#7a4f33" }));
    /** box house: body, gable roof (two slabs), square windows on the front, a door, a chimney block */
    const blockHouse = (bb: Batch, x: number, z: number, yaw: number, w: number, d: number, h: number, i: number) => {
      const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0, z);
      const add = (g: THREE.BufferGeometry, mm: THREE.Material) => bb.add(g, mm, m);
      const bx = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0); const uv = bx.attributes.uv as THREE.BufferAttribute; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * w / 4, uv.getY(k) * h / 4);
      add(bx, wallMat(i));
      const rm = lam("nR" + i % 5, () => ({ map: shingleReal(), color: ROOFS[i % 5] })), rh = d * 0.45, sl = Math.hypot(d / 2 + 0.4, rh);
      for (const s of [-1, 1]) {
        const slab = new THREE.BoxGeometry(w + 0.6, 0.3, sl); slab.translate(0, 0, s * sl / 2);
        slab.applyMatrix4(new THREE.Matrix4().makeRotationX(s * Math.atan2(rh, d / 2 + 0.4))); slab.translate(0, h + rh, 0);
        add(slab, rm);
      }
      const gab = new THREE.BufferGeometry(); // gable triangles
      gab.setAttribute("position", new THREE.Float32BufferAttribute([-w / 2, h, d / 2, -w / 2, h, -d / 2, -w / 2, h + rh, 0, w / 2, h, -d / 2, w / 2, h, d / 2, w / 2, h + rh, 0], 3)); gab.computeVertexNormals();
      gab.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 2, 0, 1, 1, 0, 0, 2, 0, 1, 1], 2)); add(gab, wallMat(i));
      const floors = Math.max(1, Math.floor(h / 3)), n = Math.max(1, Math.floor(w / 2.4));
      for (let f = 0; f < floors; f++) for (let k = 0; k < n; k++) {
        const wx = -w / 2 + (k + 0.5) * (w / n), wy = 1.6 + f * 3;
        if (f === 0 && k === Math.floor(n / 2)) { add(new THREE.BoxGeometry(1.1, 2.1, 0.12).translate(wx, 1.05, d / 2 + 0.05), door); continue; }
        add(new THREE.BoxGeometry(1.2, 1.2, 0.1).translate(wx, wy, d / 2 + 0.04), frame);
        add(new THREE.BoxGeometry(0.95, 0.95, 0.12).translate(wx, wy, d / 2 + 0.06), win);
      }
      add(new THREE.BoxGeometry(0.9, 2.2, 0.9).translate(w * 0.25 * (i % 2 ? 1 : -1), h + rh * 0.6 + 0.6, -d * 0.2), lam("nChim", () => ({ color: "#a3a7b0" })));
    };
    /** pine (most) or round leafy tree, textured bark and needles */
    const blockTree = (bb: Batch, x: number, z: number, h: number, i: number) => {
      bb.add(new THREE.CylinderGeometry(0.18, 0.32, h * 0.5, 8).translate(x, h * 0.25, z), lam("nBark", () => ({ map: barkReal() })));
      const lc = lam("nLeavesR" + i % 3, () => ({ map: leavesReal(i % 3) }));
      if (i % 11) for (let k = 0; k < 4; k++) bb.add(new THREE.ConeGeometry(h * (0.3 - k * 0.06), h * 0.34, 10).translate(x, h * (0.32 + k * 0.17), z), lc);
      else bb.add(new THREE.IcosahedronGeometry(h * 0.33, 1).translate(x, h * 0.62, z), lc);
    };
    const wood = lam("nWood", () => ({ color: "#a8724a" })), iron = twoTone(new THREE.MeshLambertMaterial({ color: "#3b3f52" }));
    const brass = twoTone(new THREE.MeshLambertMaterial({ color: "#c9a23a" }));
    withSight(sightLines(), () => {
      b.add(quadUp(-400, 400, -400, 400, 100, 100, 0), grass);
      // concrete sidewalks across the lawn (no paved square any more)
      const walk = lam("nWalk", () => ({ color: "#cfcac0" }));
      for (const [x0, x1, z0, z1] of [[-1.6, 1.6, -15, 30], [-30, 30, 9, 12], [-30, 30, -13, -10.5], [6, 8.2, -12, 12]]) b.add(quadUp(x0, x1, z0, z1, 1, 1, 0.02), walk);
      void cob;
      const hill = new THREE.SphereGeometry(1, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2);
      for (const [hx, hz, sx, sy, sz] of [[-120, -150, 90, 16, 60], [110, -160, 90, 13, 60], [-160, 40, 60, 10, 80], [150, 60, 60, 11, 70]] as const) b.add(hill, grass, new THREE.Matrix4().compose(V(hx, -1, hz), new THREE.Quaternion(), V(sx, sy, sz)));
      // houses around the square (fronts facing it)
      const ring: [number, number, number, number][] = [];
      for (let x = -13; x <= 13; x += 8.6) { ring.push([x, -26, 0, 8]); ring.push([x, 22, Math.PI, 8]); }
      for (let z = -18; z <= 14; z += 8.4) { ring.push([-22, z, Math.PI / 2, 8]); ring.push([22, z, -Math.PI / 2, 8]); }
      ring.forEach(([x, z, yaw, w], i) => { if (Math.abs(x) < 5 && z < 0) return; if (x > 6 && x < 20 && z > -12 && z < 0) return; if (blocked(x - 5, x + 5, 0, 14, z - 5, z + 5)) return; blockHouse(b, x, z, yaw, w, 8, [8, 9, 10, 7][i % 4], i); });
      for (let i = 0; i < 260; i++) { const a = i * 2.39996, d = 30 + (i % 17) * 5; blockTree(b, Math.cos(a) * d, Math.sin(a) * d, 13 + (i % 6) * 2.5, i); }
    });
    // clock tower (never culled: it is the hero of half the shots)
    const [tx, , tz] = TOWER;
    b.add(boxGeo(V(tx - 3, 0, tz - 3), V(tx + 3, TOWER_H, tz + 3), 3), stone);
    for (const y of [6, 12.2, TOWER_H - 0.2]) b.add(boxGeo(V(tx - 3.25, y, tz - 3.25), V(tx + 3.25, y + 0.45, tz + 3.25)), lam("nTrim", () => ({ color: "#efe3c8" })));
    const bellOpen = lam("nDark", () => ({ color: "#3d3442" }));
    for (const [dx, dz, ry] of [[0, 3.01, 0], [0, -3.01, Math.PI], [3.01, 0, Math.PI / 2], [-3.01, 0, -Math.PI / 2]] as const) {
      const g = new THREE.PlaneGeometry(2.6, 2.8); g.rotateY(ry); g.translate(tx + dx, 18.2, tz + dz); b.add(g, bellOpen);
    }
    const roof = new THREE.ConeGeometry(4.6, 4.2, 4); roof.rotateY(Math.PI / 4); b.add(roof, roofT, new THREE.Matrix4().makeTranslation(tx, TOWER_H + 0.45 + 2.1, tz));
    b.add(boxGeo(V(tx - 3.6, TOWER_H + 0.2, tz - 3.6), V(tx + 3.6, TOWER_H + 0.55, tz + 3.6)), lam("nTrim", () => ({ color: "#efe3c8" }))); // roof ledge they land on
    const face = new THREE.CircleGeometry(1.9, 40); face.translate(tx, 15, tz + 3.02);
    b.add(face, lam("nClock", () => ({ map: clockTex() })));
    // lampposts
    for (const [x, z] of [[-6.2, 11.8], [7.4, 12.6], [-8, -8], [5, -12.6]]) {
      b.add(new THREE.BoxGeometry(0.22, 3.6, 0.22).translate(x, 1.8, z), iron);
      b.add(new THREE.BoxGeometry(0.5, 0.5, 0.5).translate(x, 3.85, z), lam("nLamp", () => ({ color: "#f6e7a6" })));
      b.add(new THREE.BoxGeometry(0.7, 0.15, 0.7).translate(x, 4.17, z), iron);
    }
    // birthday table with a tablecloth and a two-tier cake with ten candles
    const [qx, , qz] = TABLE;
    b.add(boxGeo(V(qx - 1.2, 0.74, qz - 0.5), V(qx + 1.2, 0.82, qz + 0.5)), lam("nCloth", () => ({ color: "#f7f1e1" })));
    b.add(boxGeo(V(qx - 1.22, 0.5, qz + 0.5), V(qx + 1.22, 0.82, qz + 0.52)), lam("nCloth2", () => ({ color: "#e2453c" })));
    for (const [lx, lz] of [[-1.1, -0.4], [-1.1, 0.4], [1.1, -0.4], [1.1, 0.4]]) b.add(boxGeo(V(qx + lx - 0.04, 0, qz + lz - 0.04), V(qx + lx + 0.04, 0.74, qz + lz + 0.04)), wood);
    b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.24, 28).translate(CAKE[0], CAKE[1] + 0.12, CAKE[2]), lam("nCake1", () => ({ color: "#ffb3cf" })));
    b.add(new THREE.CylinderGeometry(0.31, 0.31, 0.04, 28).translate(CAKE[0], CAKE[1] + 0.24, CAKE[2]), lam("nIcing", () => ({ color: "#fff6ee" })));
    b.add(new THREE.CylinderGeometry(0.21, 0.21, 0.17, 28).translate(CAKE[0], CAKE[1] + 0.33, CAKE[2]), lam("nCake2", () => ({ color: "#ffd1e4" })));
    b.add(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 28).translate(CAKE[0], CAKE[1] + 0.42, CAKE[2]), lam("nIcing", () => ({ color: "#fff6ee" })));
    for (let i = 0; i < 10; i++) { const c = candle(i); b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 6).translate(c[0], c[1] - 0.045, c[2]), lam("nCandle" + (i % 3), () => ({ color: ["#3f8fe0", "#f3d35a", "#4cb050"][i % 3] }))); }
    for (let i = 0; i < 4; i++) b.add(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16).translate(qx + 0.55 + (i % 2) * 0.3, 0.83, qz - 0.2 + Math.floor(i / 2) * 0.35), lam("nPlate", () => ({ color: "#ffffff" })));
    // benches (with legs)
    for (const [x, z] of [[BENCH[0], BENCH[2]], [10.5, 9.5]]) {
      b.add(boxGeo(V(x - 1, 0.42, z - 0.25), V(x + 1, 0.5, z + 0.25)), wood);
      b.add(boxGeo(V(x - 1, 0.5, z - 0.27), V(x + 1, 0.95, z - 0.2)), wood);
      for (const lx of [-0.85, 0.85]) b.add(boxGeo(V(x + lx - 0.05, 0, z - 0.2), V(x + lx + 0.05, 0.42, z + 0.2)), iron);
    }
    // town hall: cream stone block, six columns, steps, pediment, sign, flag
    {
      const [hx, , hz] = HALL, hw = 9.6, hd = 7, hh2 = 8, front = hz + hd / 2;
      const cream = lam("nHall", () => ({ map: brickReal(), color: "#f2e6cc" })), trim = lam("nTrim", () => ({ color: "#efe3c8" }));
      b.add(boxGeo(V(hx - hw / 2, 0, hz - hd / 2), V(hx + hw / 2, hh2, hz + hd / 2), 3), cream);
      b.add(boxGeo(V(hx - hw / 2 - 0.3, hh2, hz - hd / 2 - 0.3), V(hx + hw / 2 + 0.3, hh2 + 0.5, front + 2.6)), trim);
      for (let k = 0; k < 3; k++) b.add(boxGeo(V(hx - hw / 2 + 0.5 - k * 0.3, 0, front + 0.2), V(hx + hw / 2 - 0.5 + k * 0.3, 0.2 * (3 - k), front + 2.4 + k * 0.45)), trim);
      for (let k = 0; k < 6; k++) b.add(new THREE.CylinderGeometry(0.32, 0.36, hh2 - 0.6, 16).translate(hx - hw / 2 + 0.9 + k * ((hw - 1.8) / 5), 0.6 + (hh2 - 0.6) / 2, front + 1.9), lam("nCol", () => ({ color: "#fbf6ea" })));
      const ped = new THREE.BufferGeometry();
      ped.setAttribute("position", new THREE.Float32BufferAttribute([hx - hw / 2 - 0.3, hh2 + 0.5, front + 2.6, hx + hw / 2 + 0.3, hh2 + 0.5, front + 2.6, hx, hh2 + 2.6, front + 2.6], 3)); ped.computeVertexNormals();
      ped.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2)); b.add(ped, trim);
      const slab = new THREE.BoxGeometry(hw + 0.8, 0.3, Math.hypot(hd / 2 + 1.6, 2.1) * 2); b.add(slab.translate(0, 0, 0), roofT, new THREE.Matrix4().makeTranslation(hx, hh2 + 0.6, hz + 1.2));
      b.add(new THREE.BoxGeometry(2.2, 3.6, 0.15).translate(hx, 1.8, front + 0.06), door);
      for (const sx of [-3.2, -1.9, 1.9, 3.2]) for (const y of [2.2, 5.6]) { b.add(new THREE.BoxGeometry(0.9, 1.6, 0.1).translate(hx + sx, y, front + 0.04), frame); b.add(new THREE.BoxGeometry(0.7, 1.4, 0.12).translate(hx + sx, y, front + 0.06), win); }
      const sign = new THREE.PlaneGeometry(5.2, 0.9).translate(hx, hh2 - 0.6, front + 2.62); b.add(sign, lam("nHallSign", () => ({ map: textTex("hallSign", 1024, 176, "#2b3d6a", "#f3d35a", ["TOWN HALL"], 120) })));
      b.add(new THREE.CylinderGeometry(0.06, 0.06, 4, 8).translate(hx, hh2 + 4.6, hz), iron);
      b.add(new THREE.BoxGeometry(1.6, 1.0, 0.04).translate(hx + 0.8, hh2 + 6.0, hz), lam("nFlag", () => ({ color: "#d23b3b" })));
      // the chain post and a warning sign
      b.add(new THREE.CylinderGeometry(0.18, 0.22, 1.2, 12).translate(POST[0], 0.6, POST[2]), iron);
      b.add(new THREE.BoxGeometry(0.12, 2.0, 0.12).translate(7.0, 1.0, 5.6), wood);
      const warn = new THREE.PlaneGeometry(1.5, 0.9); warn.rotateY(0.5); warn.translate(7.0, 2.0, 5.66);
      b.add(warn, lam("nWarn", () => ({ map: textTex("warnSign", 512, 300, "#f3d35a", "#241726", ["DO NOT", "WAKE", "THE DOG"], 76) })));
    }
    b.build(R);
    this.dog = new Dog(R);
    { // the giant ice cream: waffle cone (tip down) with three scoops and a cherry
      const waffle = ctex("waffle", 256, 256, (g) => { g.fillStyle = "#e8b06a"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#b07a3a"; g.lineWidth = 10; for (let i = -256; i < 512; i += 42) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke(); g.beginPath(); g.moveTo(i + 256, 0); g.lineTo(i, 256); g.stroke(); } });
      waffle.wrapS = waffle.wrapT = THREE.RepeatWrapping; waffle.repeat.set(3, 2);
      const M = (g: THREE.BufferGeometry, m: THREE.Material) => { const x = new THREE.Mesh(g, m); x.castShadow = true; x.receiveShadow = true; this.ice.add(x); };
      M(new THREE.ConeGeometry(1.05, 2.7, 32, 1, true).rotateX(Math.PI).translate(0, 1.35, 0), twoTone(new THREE.MeshLambertMaterial({ map: waffle, side: THREE.DoubleSide })));
      M(new THREE.SphereGeometry(1.18, 32, 20).scale(1, 0.88, 1).translate(0, 2.95, 0), twoTone(new THREE.MeshLambertMaterial({ color: "#ffb3cf" })));
      M(new THREE.SphereGeometry(0.98, 32, 20).scale(1, 0.88, 1).translate(0.05, 4.2, 0), twoTone(new THREE.MeshLambertMaterial({ color: "#b8f0d0" })));
      M(new THREE.SphereGeometry(0.78, 32, 20).scale(1, 0.88, 1).translate(-0.04, 5.2, 0), twoTone(new THREE.MeshLambertMaterial({ color: "#fff1c8" })));
      M(new THREE.SphereGeometry(0.22, 16, 12).translate(0.05, 5.95, 0), twoTone(new THREE.MeshLambertMaterial({ color: "#d22e2e" })));
      for (let i = 0; i < 18; i++) { const a = i * 2.3, y = 2.7 + (i % 6) * 0.45; M(new THREE.BoxGeometry(0.06, 0.2, 0.06).rotateZ(i).translate(Math.cos(a) * 1.0, y, Math.sin(a) * 1.0), twoTone(new THREE.MeshLambertMaterial({ color: ["#e2453c", "#3f8fe0", "#f3d35a", "#4cb050"][i % 4] }))); }
      this.ice.position.set(ICE[0], 0, ICE[2]); this.ice.rotation.z = 0.12; this.ice.visible = false; R.add(this.ice);
    }
    // clock hands (animated): hour + minute
    for (const [L, w] of [[1.0, 0.12], [1.55, 0.08]] as const) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(w, L, 0.03).translate(0, L / 2 - 0.12, 0), iron);
      h.position.set(tx, 15, tz + 3.06); this.hands.push(h); R.add(h);
    }
    // the bell
    this.bell = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.85, 1.3, 20, 1, true).translate(0, -0.75, 0), brass);
    (this.bell.material as THREE.MeshLambertMaterial).side = THREE.DoubleSide;
    this.bell.position.set(tx, 19.4, tz); R.add(this.bell);
    // weather vane on the roof tip
    this.vane.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8).translate(0, 0.9, 0), iron));
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 8).rotateZ(-Math.PI / 2).translate(0.9, 1.3, 0), iron);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.03).translate(-0.8, 1.3, 0), iron);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.05).translate(0, 1.3, 0), iron);
    const rooster = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8).scale(1.3, 1, 0.4).translate(0, 1.65, 0), brass);
    this.vane.add(arrow, tail, bar, rooster); this.vane.position.set(VANE[0], VANE[1] - 1.3, VANE[2]); R.add(this.vane);
    this.vane.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
    // holiday bunting (shots 22-23): strings of flags across the square
    const flagCols = ["#d23b3b", "#f3d35a", "#3f6fb5", "#f7f1e1", "#2f8a4f"];
    for (let k = 0; k < 4; k++) for (let i = 0; i < 18; i++) {
      const u = i / 17, x = -13 + 26 * u, z = -10 + k * 6, y = 8 - 2.2 * Math.sin(Math.PI * u);
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
    cam.fov = c.fov; cam.near = 0.15; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
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
    // deep saturated sky (reference: rich blue overhead, pale blue at the horizon); golden: peach to violet
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

    // ---- clock, bell, vane, bunting ----
    const ringT = PART === 1 ? W1.rang : -30, ringing = PART === 1 ? (t > W1.rang - 0.1 || (t > W1.rings - 0.2 && t < 7.5)) : t < W2.flash;
    const mins = PART === 1 ? (t < W1.rang ? Math.min(0, (t - W1.rang) * 0.004 - 0.02) : 0) : 0.02 + Math.max(0, t - 14) * 0.003;
    this.hands[0].rotation.z = -mins * 0.0833 * Math.PI * 2; this.hands[1].rotation.z = -mins * Math.PI * 2;
    this.bell.rotation.z = ringing ? 0.55 * Math.sin((t - ringT) * 6.5) : 0;
    this.vane.rotation.y = 0.4 * Math.sin(t * 0.4);
    this.bunting.visible = s.party;
    this.bunting.children.forEach((o, i) => { o.rotation.z = 0.25 * Math.sin(t * 3 + i); });
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    let ri = 0;
    for (const q of st.places) {
      const sc2 = q.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(q.x, q.y + 1.1 * sc2, q.z), 3.5))) continue;
      if (q.rig) { // 3D blocky character, turned toward the lens with a slight three-quarter angle
        while (this.rigs.length <= ri) this.rigs.push(new Blocky(this.root));
        const r = this.rigs[ri++];
        r.set(q.rig, t);
        r.root.position.set(q.x, q.y, q.z);
        const yaw = q.yaw ?? Math.atan2(cam.position.x - q.x, cam.position.z - q.z) + 0.28 * Math.sin(ri * 1.7);
        r.root.rotation.set(0, yaw, 0);
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
    // ropes: thin cylinders between two points (sag drawn as a slight midpoint drop)
    const ropeM = this.ropeMat ??= twoTone(new THREE.MeshLambertMaterial({ color: "#c9a46a" }));
    st.ropes.forEach(([a, b2], i) => {
      let r = this.ropes[i];
      if (!r) { r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6).translate(0, 0.5, 0), ropeM); r.castShadow = true; this.root.add(r); this.ropes[i] = r; }
      const A = V(...a), B = V(...b2), d = B.clone().sub(A), L = d.length();
      r.visible = L > 0.01; r.position.copy(A); r.scale.set(1, L, 1); r.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    });
    for (let i = st.ropes.length; i < this.ropes.length; i++) this.ropes[i].visible = false;
    const chM = this.chainMat ??= twoTone(new THREE.MeshLambertMaterial({ color: "#5a5e6a" }));
    st.chains.forEach(([a, b2], i) => {
      let r = this.chains[i];
      if (!r) { r = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1, 8).translate(0, 0.5, 0), chM); r.castShadow = true; this.root.add(r); this.chains[i] = r; }
      const A = V(...a), B = V(...b2), dd = B.clone().sub(A), L2 = dd.length();
      r.visible = L2 > 0.01; r.position.copy(A); r.scale.set(1, L2, 1); r.quaternion.setFromUnitVectors(V(0, 1, 0), dd.normalize());
    });
    for (let i = st.chains.length; i < this.chains.length; i++) this.chains[i].visible = false;
    if (st.dog) this.dog.set({ ...st.dog, x: st.dog.p[0], y: st.dog.p[1], z: st.dog.p[2] }, t); else this.dog.hide();
    this.ice.visible = st.ice.s > 0.002; this.ice.position.y = st.ice.y; this.ice.scale.setScalar(Math.max(0.001, st.ice.s));
    let fi = 0;
    const fused: Fx[] = [];
    for (const q of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(q.x, q.y, q.z), Math.max(q.w, q.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(q.key, q.cw, q.ch, 1, q.draw);
      e2.use(!!q.soft); e2.mesh.visible = true; e2.mesh.position.set(q.x, q.y, q.z);
      if (q.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, q.rot ?? 0);
      else if (q.face) e2.mesh.rotation.set(0, 0, q.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(q.rot ?? 0); }
      e2.mesh.scale.set(q.w, q.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (let i = 0; i < ai; i++) this.actors[i].bind();
    for (const e2 of fused) e2.bind();
    return focus;
  }
}
const lin2 = (t: number, a: number, b: number, v0: number, v1: number) => v0 + (v1 - v0) * clamp01((t - a) / (b - a));
export { smooth };
export type { V3 };
