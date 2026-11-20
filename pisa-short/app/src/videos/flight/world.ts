// The Wright brothers set as one three.js scene, four places far apart in one world: the Kitty Hawk camp (dunes, sea,
// sheds, launching rail, the 1903 Flyer posed per frame, a jumbo jet parked for the comparison shots), the Dayton street
// with the bicycle shop and the wind tunnel, the Potomac houseboat, and a country road with a car.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, Ray, house, prop, withSight, quad } from "./build";
import { cloudHD, cobbleHD, grassHD } from "./paint";
import { sandTex, muslinTex, spruceTex, boardsTex, asphaltTex, waterTex, jetTex, shopSignless } from "./flightpaint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, planeAt, ShotDef, V3, W, RAIL, DAYTON, RIVER, ROAD, JET, TUNNEL, carX, smooth, clamp01 } from "./story";
import { ctex } from "./paint";

export const loadKit = async (): Promise<Kit> => ({});

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const SUN_SHOT: Record<number, { az?: number; el?: number }> = {
  2: { az: 130 }, 3: { az: 150, el: 40 }, 4: { az: 130 }, 6: { az: 130 }, 7: { az: 120 }, 8: { az: 125 }, 10: { az: 130 }, 11: { az: 120 },
  12: { az: 120, el: 12 }, 13: { az: 125 }, 15: { az: 130 }, 17: { az: 130 }, 20: { az: 125 },
};

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

/** the 1903 Flyer in its own frame: x forward, y up, z span; origin under the skids. Returns the parts that animate. */
const buildFlyer = () => {
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  const muslin = twoTone(new THREE.MeshLambertMaterial({ map: muslinTex(), side: THREE.DoubleSide }));
  const spruce = lam("fSpruce", () => ({ map: spruceTex() }));
  const metal = twoTone(new THREE.MeshLambertMaterial({ color: "#4b4f5a" }));
  const wire = twoTone(new THREE.MeshLambertMaterial({ color: "#2e2a36" }));
  const SPAN = 12.3, CH = 1.98, YL = 0.62, GAP = 1.83;
  const wingGeo = () => { // cambered surface along the chord (x), span along z
    const g = new THREE.PlaneGeometry(CH, SPAN, 8, 1); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), u = (x + CH / 2) / CH; p.setY(i, 0.09 * Math.sin(Math.PI * u) * (1 - 0.3 * u)); p.setZ(i, p.getZ(i) * (1 - 0.0 * u)); }
    g.computeVertexNormals();
    const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) * 12, uv.getX(i));
    return g;
  };
  const lower = new THREE.Mesh(wingGeo(), muslin); lower.position.set(0, YL, 0);
  const upper = new THREE.Group(); const um = new THREE.Mesh(wingGeo(), muslin); upper.add(um); upper.position.set(0, YL + GAP, 0);
  body.add(lower, upper);
  const b = new Batch();
  // uprights: 9 pairs (front + rear spar) with cross wires
  const zs = [-6.0, -4.5, -3.0, -1.5, 0, 1.5, 3.0, 4.5, 6.0];
  for (const z of zs) for (const x of [0.75, -0.75]) b.add(beamGeo(V(x, YL + 0.04, z), V(x, YL + GAP + 0.04, z), 0.05), spruce);
  for (let i = 0; i < zs.length - 1; i++) for (const x of [0.75, -0.75]) {
    b.add(beamGeo(V(x, YL + 0.05, zs[i]), V(x, YL + GAP, zs[i + 1]), 0.012, true), wire);
    b.add(beamGeo(V(x, YL + GAP, zs[i]), V(x, YL + 0.05, zs[i + 1]), 0.012, true), wire);
  }
  // spars (leading/trailing edges)
  for (const y of [YL + 0.02, YL + GAP + 0.02]) for (const x of [0.99, -0.99]) b.add(beamGeo(V(x, y, -SPAN / 2), V(x, y, SPAN / 2), 0.05), spruce);
  // front elevator (canard, two surfaces) on outriggers
  for (const y of [YL + 0.25, YL + 0.85]) {
    const e = new THREE.PlaneGeometry(0.9, 4.4); e.rotateX(-Math.PI / 2); e.translate(3.1, y, 0);
    b.add(e, muslin);
  }
  for (const z of [-0.6, 0.6]) {
    b.add(beamGeo(V(0.99, YL, z), V(3.6, YL + 0.25, z), 0.05), spruce);
    b.add(beamGeo(V(0.99, YL + GAP, z), V(3.6, YL + 0.85, z), 0.05), spruce);
    b.add(beamGeo(V(3.1, YL + 0.25, z), V(3.1, YL + 0.85, z), 0.04), spruce);
  }
  // twin rear rudders on outriggers
  for (const z of [-0.35, 0.35]) {
    const r = new THREE.PlaneGeometry(0.75, 1.8); r.translate(-3.05, YL + 0.95, z); b.add(r, muslin);
  }
  for (const y of [YL, YL + GAP]) for (const z of [-0.5, 0.5]) b.add(beamGeo(V(-0.99, y, z), V(-3.45, YL + (y > YL ? 1.85 : 0.05), z * 0.7), 0.045), spruce);
  // skids
  for (const z of [-0.6, 0.6]) {
    b.add(beamGeo(V(-1.4, 0.04, z), V(3.4, 0.04, z), 0.07), spruce);
    b.add(beamGeo(V(3.4, 0.04, z), V(3.7, 0.35, z), 0.07), spruce);
    for (const x of [-0.75, 0.75]) b.add(beamGeo(V(x, 0.04, z), V(x, YL, z), 0.05), spruce);
  }
  // engine (right of the pilot), radiator, chain guides
  b.add(new THREE.BoxGeometry(0.55, 0.42, 0.45).translate(0.1, YL + 0.3, 0.75), metal);
  b.add(new THREE.BoxGeometry(0.08, 0.6, 0.35).translate(0.55, YL + 0.75, 0.75), metal);
  for (const z of [-1.7, 1.7]) b.add(beamGeo(V(0.1, YL + 0.4, 0.75), V(-1.2, YL + 0.95, z), 0.02, true), wire);
  // hip cradle where the pilot lies (left of centre)
  b.add(new THREE.BoxGeometry(0.6, 0.06, 0.4).translate(-0.3, YL + 0.13, -0.45), spruce);
  b.build(body);
  body.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  // pusher propellers behind the wings (counter-rotating), 2.6 m diameter
  const props: THREE.Group[] = [];
  for (const z of [-1.7, 1.7]) {
    const p = new THREE.Group(); p.position.set(-1.2, YL + 0.95, z);
    for (const s of [-1, 1]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.25, 0.16).translate(0, 0.66 * s, 0), spruce);
      blade.rotation.x = 0.0; blade.rotation.y = 0.35 * s; blade.castShadow = true; p.add(blade);
    }
    p.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8).rotateZ(Math.PI / 2), metal));
    body.add(p); props.push(p);
  }
  // motion blur disc for spinning props (shown only when fast)
  const discs = props.map((p) => {
    const d = new THREE.Mesh(new THREE.CircleGeometry(1.3, 32), new THREE.MeshBasicMaterial({ color: "#b98a58", transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
    d.rotation.y = Math.PI / 2; d.position.copy(p.position); d.layers.set(NOINK); body.add(d); return d;
  });
  return { root, body, upper, props, discs };
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
  private flyer = buildFlyer();
  private jet = new THREE.Group();
  private car = new THREE.Group(); private wheels: THREE.Mesh[] = [];
  private fan = new THREE.Group();
  private aero = new THREE.Group();
  private flag: THREE.Mesh;
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
    const sand = lam("fSand", () => ({ map: sandTex() }));
    (sand.map as THREE.Texture).repeat.set(1, 1);
    const grass = lam("grassHD", () => ({ map: grassHD() }));
    (grass as THREE.MeshLambertMaterial).color.setRGB(0.84, 0.88, 0.74);
    const boards = lam("fBoards", () => ({ map: boardsTex() }));
    const spruce = lam("fSpruce", () => ({ map: spruceTex() }));
    const roofTar = lam("fRoofTar", () => ({ color: "#5a4f4a" }));
    withSight(sightLines(), () => {
      // ---- camp: sand everywhere around it, dunes, the sea far away ----
      b.add(quadUp(-330, 330, -330, 340, 33, 33, 0), sand);
      const sea = lam("fSea", () => ({ map: waterTex() }));
      b.add(quadUp(-900, 900, -900, -320, 40, 13, 0.02), sea);
      b.add(quadUp(-900, 900, 330, 900, 40, 13, 0.02), sea);
      const dune = new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      for (const [x, z, sx, sy, sz] of [[-70, -95, 60, 27, 50], [40, -150, 80, 14, 50], [-150, -40, 50, 12, 70], [120, -60, 50, 9, 40], [-40, 140, 70, 10, 50], [160, 90, 60, 12, 60], [-200, 120, 80, 16, 60]] as const)
        b.add(dune, sand, new THREE.Matrix4().compose(V(x, -1, z), new THREE.Quaternion(), V(sx, sy, sz)));
      // dune grass tufts
      const tuft = lam("fTuft", () => ({ color: "#9aa85a", side: THREE.DoubleSide }));
      for (let i = 0; i < 120; i++) {
        const a = i * 2.39996, d = 18 + (i % 23) * 6, x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (d < 70) continue;
        b.add(new THREE.ConeGeometry(0.18, 0.45 + (i % 5) * 0.08, 5).translate(0, 0.22, 0), tuft, new THREE.Matrix4().makeTranslation(x, 0, z));
      }
      // launching rail: 18 m of 2x4 on edge, laid on blocks
      b.add(boxGeo(V(RAIL.x0, 0, RAIL.z - 0.06), V(RAIL.x1, 0.4, RAIL.z + 0.06), 2), spruce);
      for (let x = RAIL.x0; x <= RAIL.x1; x += 2) b.add(boxGeo(V(x - 0.15, 0, RAIL.z - 0.3), V(x + 0.15, 0.12, RAIL.z + 0.3)), spruce);
      // two sheds (hangar + living shed) behind the rail
      const shed = (x0: number, z0: number, w: number, d: number, h: number) => {
        b.add(boxGeo(V(x0, 0, z0), V(x0 + w, h, z0 + d), 3), boards);
        b.add(quad(V(x0 - 0.3, h, z0 + d + 0.3), V(x0 + w + 0.3, h, z0 + d + 0.3), V(x0 + w + 0.3, h + 1.2, z0 + d / 2), V(x0 - 0.3, h + 1.2, z0 + d / 2), w / 3, 1), roofTar);
        b.add(quad(V(x0 + w + 0.3, h, z0 - 0.3), V(x0 - 0.3, h, z0 - 0.3), V(x0 - 0.3, h + 1.2, z0 + d / 2), V(x0 + w + 0.3, h + 1.2, z0 + d / 2), w / 3, 1), roofTar);
      };
      shed(-20, -20, 13, 5, 2.8);
      shed(-34, -19, 7, 5, 2.6);
      b.add(new THREE.CylinderGeometry(0.06, 0.06, 6, 6).translate(0, 3, 0), spruce, new THREE.Matrix4().makeTranslation(-21, 0, -14));
      // the lifesaving station far off
      shed(60, -70, 10, 7, 4); shed(64, -73, 3, 3, 9);
      // ---- Dayton street ----
      const [dx, , dz] = DAYTON;
      const asphalt = lam("fAsphalt", () => ({ map: asphaltTex() }));
      const cob = lam("cobbleHD", () => ({ map: cobbleHD() }));
      b.add(quadUp(dx - 80, dx + 80, dz - 3, dz + 14, 10, 2, 0.01), lam("fDirtRoad", () => ({ color: "#b9a07c" })));
      b.add(quadUp(dx - 80, dx + 80, dz - 4, dz - 1, 60, 1.5, 0.02), cob);
      b.add(quadUp(dx - 80, dx + 80, dz + 14, dz + 17, 60, 1.5, 0.02), cob);
      const shop = lam("fShop", () => ({ map: shopSignless() }));
      b.add(quad(V(dx - 5, 0, dz - 4.02), V(dx + 5, 0, dz - 4.02), V(dx + 5, 8, dz - 4.02), V(dx - 5, 8, dz - 4.02)), shop);
      b.add(boxGeo(V(dx - 5, 0, dz - 12), V(dx + 5, 8, dz - 4.05), 4), lam("fBrickPlain", () => ({ color: "#b9673f" })));
      let x = dx - 6;
      for (let i = 0; i < 6; i++) { const w = [8, 9, 7][i % 3]; house(b, x - w / 2, dz - 8, 0, w, 8, [8.4, 9.8, 7][i % 3], i + 2, 0); x -= w + 0.3; }
      x = dx + 6;
      for (let i = 0; i < 6; i++) { const w = [7, 9, 8][i % 3]; house(b, x + w / 2, dz - 8, 0, w, 8, [9.8, 7, 8.4][i % 3], i + 5, 0); x += w + 0.3; }
      for (let i = 0; i < 10; i++) house(b, dx - 70 + i * 15, dz + 25, Math.PI, 9, 8, 8.4, i, 0);
      // backyard with the wind-tunnel table (behind the shop)
      b.add(quadUp(dx - 14, dx + 14, dz - 40, dz - 12, 7, 7, 0.01), grass);
      const [tx, , tz] = TUNNEL;
      b.add(boxGeo(V(tx - 2.6, 0.82, tz - 0.6), V(tx + 1.2, 0.9, tz + 0.6)), spruce);
      for (const [lx, lz] of [[-2.5, -0.5], [-2.5, 0.5], [1.1, -0.5], [1.1, 0.5]]) b.add(boxGeo(V(tx + lx - 0.05, 0, tz + lz - 0.05), V(tx + lx + 0.05, 0.82, tz + lz + 0.05)), spruce);
      b.add(boxGeo(V(tx - 0.9, 0.9, tz - 0.25), V(tx + 0.9, 1.4, tz + 0.25), 1), boards); // the tunnel: 1.8 m box
      b.add(quad(V(tx - 0.3, 1.401, tz + 0.2), V(tx + 0.3, 1.401, tz + 0.2), V(tx + 0.3, 1.401, tz - 0.2), V(tx - 0.3, 1.401, tz - 0.2)), lam("fGlass", () => ({ color: "#9fd0ea" })));
      b.add(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 20).rotateZ(Math.PI / 2), lam("fFanRing", () => ({ color: "#4b4f5a" })), new THREE.Matrix4().makeTranslation(tx + 0.95, 1.15, tz));
      for (let i = 0; i < 5; i++) prop(b, kit, i % 2 ? "tree_oak" : "tree_default", dx - 12 + i * 6, 0, dz - 38, 7 + (i % 3), i);
      // ---- the Potomac: water, far bank trees ----
      const [rx, , rz] = RIVER;
      b.add(quadUp(rx - 300, rx + 300, rz - 200, rz + 200, 30, 20, 0.0), sea);
      for (let i = 0; i < 20; i++) prop(b, kit, i % 2 ? "tree_oak" : "tree_cone", rx - 100 + i * 10, 0, rz - 90, 10 + (i % 4) * 2, i);
      b.add(quadUp(rx - 300, rx + 300, rz - 200, rz - 85, 30, 6, 0.05), grass);
      // houseboat with the catapult on its roof
      b.add(boxGeo(V(rx - 4, 0, rz - 3), V(rx + 6, 1.2, rz + 3), 2), boards);
      b.add(boxGeo(V(rx - 3, 1.2, rz - 2.4), V(rx + 5, 4.6, rz + 2.4), 2), lam("fHouseboat", () => ({ color: "#e3d2b8" })));
      b.add(boxGeo(V(rx - 3.5, 4.6, rz - 2.8), V(rx + 5.5, 4.9, rz + 2.8)), roofTar);
      b.add(beamGeo(V(rx - 2.5, 4.9, rz), V(rx + 6.5, 6.1, rz), 0.25), spruce);
      // ---- country road (car shot) ----
      const [, , oz] = ROAD;
      b.add(quadUp(-200, 200, oz - 260, oz + 260, 100, 130, 0), grass);
      b.add(quadUp(-200, 200, oz - 3.5, oz + 3.5, 30, 1, 0.02), asphalt);
      for (let i = 0; i < 40; i++) prop(b, kit, i % 3 ? "tree_oak" : "tree_cone", -190 + i * 10 + (i % 3) * 2, 0, oz - 8 - (i % 4) * 2.5, 6 + (i % 3) * 2, i);
      for (let i = 0; i < 26; i++) prop(b, kit, "plant_bush", -190 + i * 15, 0, oz + 7 + (i % 2), 1.1, i);
    });
    b.build(R);

    // ---- the Flyer ----
    R.add(this.flyer.root);
    // ---- the jumbo jet (comparison shots only): fuselage along z, wing span along x ----
    {
      const jb = new Batch();
      const white = twoTone(new THREE.MeshLambertMaterial({ map: jetTex() }));
      const grey = twoTone(new THREE.MeshLambertMaterial({ color: "#d7dce3" }));
      const blue = twoTone(new THREE.MeshLambertMaterial({ color: "#2f5fa8" }));
      const dark = twoTone(new THREE.MeshLambertMaterial({ color: "#5b6270" }));
      jb.add(new THREE.CylinderGeometry(3.2, 3.2, 62, 24, 1, true).rotateX(Math.PI / 2).translate(0, 5.6, 0), white);
      jb.add(new THREE.SphereGeometry(3.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1, 2.2).rotateX(Math.PI / 2).translate(0, 5.6, 31), white);
      jb.add(new THREE.ConeGeometry(3.2, 10, 24).rotateX(-Math.PI / 2).translate(0, 6.4, -36), white);
      jb.add(new THREE.SphereGeometry(2.6, 20, 10).scale(1, 0.7, 4).translate(0, 8.4, 20), white); // upper deck hump
      const wing = (s: number) => { // swept wing, root at fuselage, tip at x = s * 32
        const g = new THREE.BufferGeometry(), y0 = 4.4, y1 = 6.4;
        const v = [0, y0, 6, s * 32, y1, -14, s * 32, y1, -18, 0, y0, -8];
        g.setAttribute("position", new THREE.Float32BufferAttribute([v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8], v[0], v[1], v[2], v[6], v[7], v[8], v[9], v[10], v[11]], 3));
        g.computeVertexNormals(); return g;
      };
      for (const s of [-1, 1]) {
        const g = wing(s); jb.add(g, grey); const g2 = g.clone(); g2.translate(0, -0.35, 0); jb.add(g2, grey);
        for (const k of [0.36, 0.66]) jb.add(new THREE.CylinderGeometry(1.25, 1.1, 4.5, 16).rotateX(Math.PI / 2).translate(s * 32 * k, 3.3 + 2 * k, 2 - 18 * k), dark);
        const st = new THREE.BufferGeometry(); st.setAttribute("position", new THREE.Float32BufferAttribute([0, 7, -29, s * 11, 7.6, -38, s * 11, 7.6, -40, 0, 7, -29, s * 11, 7.6, -40, 0, 7, -35], 3)); st.computeVertexNormals(); jb.add(st, grey);
      }
      const fin = new THREE.BufferGeometry(); fin.setAttribute("position", new THREE.Float32BufferAttribute([0, 8, -27, 0, 20, -38, 0, 20, -41, 0, 8, -27, 0, 20, -41, 0, 8, -37], 3)); fin.computeVertexNormals(); jb.add(fin, blue);
      for (const z of [24, -2]) for (const s of [-1, 1]) jb.add(new THREE.CylinderGeometry(0.5, 0.5, 0.6, 12).rotateZ(Math.PI / 2).translate(s * 1.6, 0.5, z), dark);
      jb.add(beamGeo(V(0, 0.5, 24), V(0, 3, 24), 0.3), dark); jb.add(beamGeo(V(-1.6, 0.5, -2), V(-1.6, 3, -2), 0.3), dark); jb.add(beamGeo(V(1.6, 0.5, -2), V(1.6, 3, -2), 0.3), dark);
      for (const m of [white, grey, blue, dark]) (m as THREE.MeshLambertMaterial).side = THREE.DoubleSide;
      jb.build(this.jet);
      this.jet.position.set(...JET);
      R.add(this.jet);
    }
    // ---- the car (shot 7) ----
    {
      const cb = new Batch();
      const red = twoTone(new THREE.MeshLambertMaterial({ color: "#d9483b" })), glass = twoTone(new THREE.MeshLambertMaterial({ color: "#7fb6e0" }));
      const chrome = twoTone(new THREE.MeshLambertMaterial({ color: "#c9ccd2" }));
      cb.add(new THREE.BoxGeometry(4.3, 0.75, 1.8).translate(0, 0.65, 0), red);
      cb.add(new THREE.BoxGeometry(2.3, 0.08, 1.7).translate(-0.25, 1.62, 0), red);
      for (const px of [0.88, -0.25, -1.36]) for (const pz of [0.8, -0.8]) cb.add(new THREE.BoxGeometry(0.1, 0.6, 0.1).translate(px, 1.32, pz), red);
      cb.add(new THREE.BoxGeometry(0.06, 0.55, 1.6).translate(0.92, 1.32, 0).applyMatrix4(new THREE.Matrix4().makeRotationZ(0.0)), glass);
      cb.add(new THREE.BoxGeometry(0.08, 0.2, 1.6).translate(2.17, 0.6, 0), chrome);
      cb.build(this.car);
      for (const [x, z] of [[1.35, 0.85], [-1.35, 0.85], [1.35, -0.85], [-1.35, -0.85]]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.25, 16).rotateX(Math.PI / 2), twoTone(new THREE.MeshLambertMaterial({ color: "#2e2a36" })));
        w.position.set(x, 0.36, z); this.car.add(w); this.wheels.push(w);
      }
      this.car.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
      R.add(this.car);
    }
    // ---- wind-tunnel fan ----
    {
      const fm = twoTone(new THREE.MeshLambertMaterial({ color: "#7a6a52" }));
      for (let i = 0; i < 4; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.1).translate(0, 0.16, 0), fm); bl.rotation.x = (i * Math.PI) / 2; this.fan.add(bl); }
      this.fan.position.set(TUNNEL[0] + 1.02, 1.15, TUNNEL[2]); R.add(this.fan);
    }
    // ---- Langley's Aerodrome (tandem wings) ----
    {
      const ab = new Batch(), sail = twoTone(new THREE.MeshLambertMaterial({ color: "#efe6d2", side: THREE.DoubleSide })), sp = lam("fSpruce", () => ({ map: spruceTex() }));
      for (const x of [1.8, -1.8]) { const w = new THREE.PlaneGeometry(1.6, 14); w.rotateX(-Math.PI / 2); w.rotateY(0); w.translate(x, 0.3, 0); ab.add(w, sail); }
      ab.add(beamGeo(V(-3.4, 0, 0), V(3.6, 0, 0), 0.2), sp);
      ab.add(new THREE.ConeGeometry(0.5, 1.2, 8).rotateZ(-Math.PI / 2).translate(4.0, 0, 0), sp);
      ab.build(this.aero);
      this.aero.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
      R.add(this.aero);
    }
    // ---- the camp flag (wind sock) ----
    this.flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.6, 12, 1), lam("fFlag", () => ({ color: "#d23b3b", side: THREE.DoubleSide })));
    this.flag.position.set(-21, 5.6, -14); this.flag.frustumCulled = false; R.add(this.flag);
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
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
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
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((dg) => THREE.MathUtils.degToRad(dg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear * 1.6; this.fog.far = L.fogFar * 1.5;
    scene.fog = this.fog; scene.background = null;
    this.sunDisc.visible = s.light === "golden";
    if (this.sunDisc.visible) { this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900); this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7))); }
    for (let i = 0; i < this.clouds.length; i++) { const m = this.clouds[i]; m.lookAt(cam.position.x, m.position.y, cam.position.z); (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4]; }

    // ---- the Flyer ----
    const p = planeAt(id, t), fl = this.flyer;
    fl.root.visible = p.visible && s.place === "camp";
    fl.root.position.set(p.x, p.y - 0.0, p.z);
    fl.root.rotation.set(p.roll, 0, p.pitch, "ZXY");
    fl.root.rotation.order = "XYZ"; fl.root.rotation.set(p.roll, 0, p.pitch);
    fl.props.forEach((pr, i) => { pr.rotation.x = (i ? -1 : 1) * p.spin; });
    const fast = p.spin > 0 && (id === 13 ? t > W.engine + 0.4 : id !== 16 && id !== 17 && id !== 18);
    fl.discs.forEach((d) => (d.visible = fast));
    fl.upper.rotation.set(0.12 * p.wreck, 0, -0.18 * p.wreck); fl.upper.position.y = 0.62 + 1.83 - 0.5 * p.wreck;
    this.jet.visible = !!s.jet;
    // ---- car ----
    this.car.visible = s.place === "road";
    if (this.car.visible) { const x = carX(t); this.car.position.set(x, 0.02 * Math.sin(t * 18), ROAD[2]); this.wheels.forEach((w) => (w.rotation.z = -t * 14 / 0.36)); }
    // ---- fan ----
    this.fan.visible = s.place === "dayton"; this.fan.rotation.x = t * 40;
    // ---- Aerodrome: on the catapult, launched on "falls", nose-dives into the river ----
    this.aero.visible = s.place === "river";
    if (this.aero.visible) {
      const [rx, , rz] = RIVER, u = clamp01((t - (W.falls - 0.35)) / 1.15);
      this.aero.position.set(rx + 4 + 7 * u, 6.4 + 1.2 * Math.sin(Math.min(1, u * 2.5) * Math.PI * 0.5) * (1 - u) - 6.3 * u * u, rz);
      this.aero.rotation.set(0.15 * u, 0, -1.2 * u * u);
    }
    // ---- camp flag waves (strong wind from +x: it streams toward -x) ----
    const fp = this.flag.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < fp.count; i++) { const u = (i % 13) / 12, y = i < 13 ? 0.3 : -0.3; fp.setXYZ(i, -0.7 + -u * 1.4 + 0.7, y + 0.05 * u * Math.sin(t * 9 - u * 4), 0.15 * u * Math.sin(t * 11 - u * 6)); }
    fp.needsUpdate = true;
    this.flag.position.set(-21 - 0.7, 5.6, -14);

    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, p, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    for (const q of st.places) {
      const sc2 = q.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(q.x, q.y + 1.1 * sc2, q.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = q.size ?? [300, 500, 0.5];
      a.r = this.pool.req(q.key, w, h, k, q.draw);
      a.mesh.visible = true; a.mesh.position.set(q.x, q.y, q.z);
      a.mesh.rotation.set(0, q.yaw ?? Math.atan2(cam.position.x - q.x, cam.position.z - q.z), q.roll ?? 0);
      a.mesh.scale.set(q.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
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
export { smooth };
export type { V3 };
