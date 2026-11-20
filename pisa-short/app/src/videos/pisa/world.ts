// The Pisa set as one three.js scene: sky, lawn, cathedral, baptistery, city wall, town, the tower (8 levels on a
// hierarchical lean/curve chain, scaffolding on the top level while it is being built), the cutaway soil block with
// the foundation section, era props (marble blocks, tub, cement mixer, fence, plumb rope, drill rig) and the cast.
// update(id, f, camera) poses everything for shot `id` at frame f (pure function of id + f).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, Ray, house, prop, withSight, quad, tri } from "./build";
import { rep, ctex, grassHD, cobbleHD, roofHD, cloudHD } from "./paint";
import { arcadeTex, coreTex, archBandTex, belfryTex, marbleTex, duomoTex, brickWallTex, soilTex, foundTex, woodTex } from "./towerpaint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, towerAt, towerMats, topOf, LEVEL_H, R_OUT, CUTZ, TUB, ShotDef, V3, W, smooth, clamp01 } from "./story";

export const loadKit = async (): Promise<Kit> => ({}); // no Kenney models: every prop is built in code

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 2: { az: 110 }, 4: { az: 130 }, 6: { az: 135 }, 7: { az: 130, el: 14 }, 9: { az: 125 }, 11: { az: 100, el: 42 }, 12: { az: 130 }, 13: { az: 120 }, 15: { az: 130 }, 16: { az: 130 } };

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
/** flat annulus (floor ring / cornice top) facing up at y, with a short outer rim */
const ringGeo = (r0: number, r1: number, h: number, seg = 48) => {
  const top = new THREE.RingGeometry(r0, r1, seg, 1); top.rotateX(-Math.PI / 2); top.translate(0, h, 0);
  const rim = new THREE.CylinderGeometry(r1, r1, h, seg, 1, true); rim.translate(0, h / 2, 0);
  const bot = new THREE.RingGeometry(r0, r1, seg, 1); bot.rotateX(Math.PI / 2);
  return [top, rim, bot];
};

type LevelObj = { g: THREE.Group; body: THREE.Group };

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private ground: THREE.Group = new THREE.Group();
  private soil = new THREE.Group(); private soilFace: THREE.Mesh; private soilWet: THREE.Material; private soilDry: THREE.Material;
  private levels: LevelObj[] = [];
  private towerRoot = new THREE.Group();
  private scaffold = new THREE.Group();
  private found: THREE.Mesh;
  private era: Record<string, THREE.Group> = {};
  private rope: THREE.Mesh; private bob: THREE.Mesh;
  private plumb: THREE.Mesh; private plumbBob: THREE.Mesh;
  private pipe: THREE.Mesh; private drill: THREE.Group;
  private grassTall = new THREE.Group();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit, shadowSize = 4096) {
    const R = this.root;
    // ---- sky + light ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(shadowSize, shadowSize);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- lawn, paths (the normal ground; hidden in the cutaway shots) ----
    const gb = new Batch();
    const grass = lam("grassHD", () => ({ map: grassHD() })), cob = lam("cobbleHD", () => ({ map: cobbleHD() }));
    (grass as THREE.MeshLambertMaterial).color.setRGB(0.84, 0.88, 0.74); // a softer lawn green
    gb.add(quadUp(-900, 900, -900, 900, 450, 450, 0), grass);
    gb.add(quadUp(-12, 12, 12, 200, 6, 47, 0.015), cob); // path from the south gate to the tower
    gb.add(quadUp(-140, 60, -3.2, 3.2, 50, 1.6, 0.015), cob); // path along the cathedral
    gb.build(this.ground);
    R.add(this.ground);

    // ---- static set: cathedral, baptistery, camposanto wall, city wall, town, trees ----
    const b = new Batch();
    withSight(sightLines(), () => {
      const marble = lam("marbleW", () => ({ map: rep(marbleTex("w"), 0.12, 0.12) }));
      const lead = lam("leadRoof", () => ({ map: roofHD("#8f97a8", true), side: THREE.DoubleSide }));
      // Duomo: nave along x, south wall faces the lens (+z)
      const nave = lam("duomoNave", () => ({ map: duomoTex("nave", 8) }));
      const naveEnd = lam("duomoEnd", () => ({ map: duomoTex("end", 2) }));
      const box = (x0: number, x1: number, y1: number, z0: number, z1: number, front: THREE.Material, end: THREE.Material, roofH: number) => {
        b.add(quad(V(x0, 0, z1), V(x1, 0, z1), V(x1, y1, z1), V(x0, y1, z1)), front);
        b.add(quad(V(x1, 0, z0), V(x0, 0, z0), V(x0, y1, z0), V(x1, y1, z0)), front);
        b.add(quad(V(x0, 0, z0), V(x0, 0, z1), V(x0, y1, z1), V(x0, y1, z0)), end);
        b.add(quad(V(x1, 0, z1), V(x1, 0, z0), V(x1, y1, z0), V(x1, y1, z1)), end);
        const zm = (z0 + z1) / 2, o = 0.6;
        b.add(quad(V(x0 - o, y1 - 0.2, z1 + o), V(x1 + o, y1 - 0.2, z1 + o), V(x1 + o, y1 + roofH, zm), V(x0 - o, y1 + roofH, zm), (x1 - x0) / 4, 2), lead);
        b.add(quad(V(x1 + o, y1 - 0.2, z0 - o), V(x0 - o, y1 - 0.2, z0 - o), V(x0 - o, y1 + roofH, zm), V(x1 + o, y1 + roofH, zm), (x1 - x0) / 4, 2), lead);
        b.add(tri(V(x0, y1, z0), V(x0, y1, z1), V(x0, y1 + roofH, zm)), marble);
        b.add(tri(V(x1, y1, z1), V(x1, y1, z0), V(x1, y1 + roofH, zm)), marble);
      };
      box(-92, -28, 22, -34, -18, nave, naveEnd, 6);       // nave
      box(-70, -52, 18, -46, -6, naveEnd, nave, 5);         // transept (crosses the nave)
      for (const [x0, x1, y1, z0, z1] of [[-92, -28, 13, -38, -34], [-92, -28, 13, -18, -14]] as const) box(x0, x1, y1, z0, z1, nave, naveEnd, 3); // aisles
      const drum = new THREE.CylinderGeometry(7, 7, 6, 32, 1, true); b.add(drum, marble, new THREE.Matrix4().makeTranslation(-61, 27, -26));
      const dome = new THREE.SphereGeometry(7.2, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 1.15, 1);
      b.add(dome, lead, new THREE.Matrix4().makeTranslation(-61, 30, -26));
      // Baptistery: drum + pointed dome
      const bap = lam("bapWall", () => ({ map: duomoTex("bap", 6) }));
      b.add(new THREE.CylinderGeometry(17, 17, 20, 40, 1, true), bap, new THREE.Matrix4().makeTranslation(-128, 10, -26));
      b.add(new THREE.CylinderGeometry(15, 17.2, 7, 40, 1, true), marble, new THREE.Matrix4().makeTranslation(-128, 23.5, -26));
      const bdome = new THREE.SphereGeometry(15.5, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2); bdome.scale(1, 0.85, 1);
      b.add(bdome, lead, new THREE.Matrix4().makeTranslation(-128, 27, -26));
      b.add(new THREE.ConeGeometry(6, 9, 24), lead, new THREE.Matrix4().makeTranslation(-128, 43, -26));
      // Camposanto: long low marble wall to the north
      b.add(boxGeo(V(-150, 0, -66), V(-10, 9, -54), 8), marble);
      // city wall (brick, crenellated) at the back and the east side
      const brick = lam("pisaBrick", () => ({ map: brickWallTex() }));
      const wallRun = (x0: number, z0: number, x1: number, z1: number) => {
        const L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L, nx = -uz, nz = ux;
        b.add(quad(V(x0, 0, z0), V(x1, 0, z1), V(x1, 11, z1), V(x0, 11, z0), L / 12, 1), brick);
        b.add(quad(V(x0 + nx * 2, 11, z0 + nz * 2), V(x1 + nx * 2, 11, z1 + nz * 2), V(x1, 11, z1), V(x0, 11, z0), L / 12, 0.2), brick);
        for (let s = 1; s < L; s += 3) {
          const cx = x0 + ux * s, cz = z0 + uz * s;
          b.add(boxGeo(V(cx - 0.7, 11, cz - 0.7), V(cx + 0.7, 12.6, cz + 0.7)), brick);
        }
        for (let s = 30; s < L; s += 60) { const cx = x0 + ux * s, cz = z0 + uz * s; b.add(boxGeo(V(cx - 4, 0, cz - 4), V(cx + 4, 16, cz + 4), 8), brick); }
      };
      wallRun(-230, -80, 120, -80);
      wallRun(120, -80, 120, 220);
      // town: rows of houses south and east of the lawn (terracotta roofs)
      const r = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
      for (const zf of [118, 132, 150, 170]) {
        let x = -150 + r() * 6;
        while (x < 110) { const w = [7, 9][Math.floor(r() * 2)], h = [7, 8.4, 9.8, 11.2][Math.floor(r() * 4)]; house(b, x + w / 2, zf + r() * 2, Math.PI, w, 8, h, Math.floor(r() * 8)); x += w + 0.3 + (r() < 0.2 ? 3 : 0); }
      }
      for (const xf of [92, 106]) {
        let z = -60 + r() * 5;
        while (z < 110) { const w = [7, 9][Math.floor(r() * 2)], h = [7, 8.4, 9.8][Math.floor(r() * 3)]; house(b, xf, z + w / 2, -Math.PI / 2, w, 8, h, Math.floor(r() * 8)); z += w + 0.3; }
      }
      // trees: umbrella pines and cypresses beyond the wall, a few round trees on the lawn edges
      for (let i = 0; i < 60; i++) {
        const x = -220 + r() * 400, z = -95 - r() * 120;
        prop(b, kit, r() < 0.5 ? "tree_cone" : "tree_oak", x, 0, z, 9 + r() * 7, r() * 6);
      }
      for (const [x, z, h] of [[60, 70, 8], [70, 40, 7.5], [-60, 60, 8], [-100, 50, 9], [62, -40, 8.5], [-20, 95, 8]] as const) prop(b, kit, "tree_oak", x, 0, z, h, x);
      for (let i = 0; i < 40; i++) {
        const a = r() * Math.PI * 2, d = 260 + r() * 160;
        prop(b, kit, r() < 0.5 ? "tree_cone" : "tree_default", Math.cos(a) * d, 0, Math.sin(a) * d, 12 + r() * 6, r() * 6);
      }
    });
    b.build(R);

    // ---- the tower ----
    const mats = {
      arcade: lam("pisaArcade", () => ({ map: arcadeTex() })),
      core: lam("pisaCore", () => ({ map: rep(coreTex(), 6, 1) })),
      band: lam("pisaBand", () => ({ map: rep(archBandTex(), 6, 1), alphaTest: 0.5, side: THREE.DoubleSide })),
      belfry: lam("pisaBelfry", () => ({ map: belfryTex() })),
      ring: lam("pisaRing", () => ({ map: rep(marbleTex("r"), 4, 0.25), side: THREE.DoubleSide })),
      col: twoTone(new THREE.MeshLambertMaterial({ color: "#f3eee3" })),
      wood: lam("pisaWood", () => ({ map: woodTex() })),
    };
    R.add(this.towerRoot);
    let parent: THREE.Object3D = this.towerRoot;
    for (let k = 0; k < LEVEL_H.length; k++) {
      const g = new THREE.Group(), body = new THREE.Group(), h = LEVEL_H[k];
      const lb = new Batch();
      if (k === 0) {
        lb.add(new THREE.CylinderGeometry(R_OUT, R_OUT, h - 0.6, 48, 1, true).translate(0, 0.3 + (h - 0.6) / 2, 0), mats.arcade);
        for (const g2 of ringGeo(0, R_OUT + 0.45, 0.8)) lb.add(g2, mats.ring); // plinth
      } else if (k < 7) {
        lb.add(new THREE.CylinderGeometry(6.0, 6.0, h, 40, 1, true).translate(0, h / 2, 0), mats.core);
        for (const g2 of ringGeo(5.9, R_OUT + 0.3, 0.45)) lb.add(g2, mats.ring);
        const colG = new THREE.CylinderGeometry(0.24, 0.26, h - 1.75, 10, 1);
        for (let i = 0; i < 24; i++) {
          const a = ((i + 0.5) / 24) * Math.PI * 2;
          lb.add(colG, mats.col, new THREE.Matrix4().makeTranslation(Math.sin(a) * 7.3, 0.45 + (h - 1.75) / 2, Math.cos(a) * 7.3));
        }
        lb.add(new THREE.CylinderGeometry(7.55, 7.55, 1.3, 48, 1, true).translate(0, h - 0.65, 0), mats.band);
      } else {
        for (const g2 of ringGeo(4.4, R_OUT + 0.3, 0.45)) lb.add(g2, mats.ring);
        lb.add(new THREE.CylinderGeometry(4.6, 4.6, h - 0.4, 36, 1, true).translate(0, 0.45 + (h - 0.4) / 2, 0), mats.belfry);
        for (const g2 of ringGeo(0, 5.0, 0.4)) lb.add(g2, mats.ring, new THREE.Matrix4().makeTranslation(0, h, 0));
        lb.add(new THREE.CylinderGeometry(5.0, 5.0, 0.8, 36, 1, true).translate(0, h + 0.8, 0), mats.ring);
      }
      if (k === 0) for (const g2 of ringGeo(0, R_OUT + 0.25, 0.4)) lb.add(g2, mats.ring, new THREE.Matrix4().makeTranslation(0, h - 0.4, 0));
      if (k === 6) for (const g2 of ringGeo(5.9, R_OUT + 0.3, 0.4)) lb.add(g2, mats.ring, new THREE.Matrix4().makeTranslation(0, h, 0));
      lb.build(body);
      g.add(body);
      parent.add(g);
      this.levels.push({ g, body });
      parent = g;
    }
    // scaffolding: 16 poles round the top level plus two plank rings; re-parented to the top level each frame
    {
      const sb = new Batch();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        sb.add(new THREE.CylinderGeometry(0.09, 0.09, 9, 6).translate(0, 2.5, 0), mats.wood, new THREE.Matrix4().makeTranslation(Math.sin(a) * 8.6, 0, Math.cos(a) * 8.6));
      }
      for (const y of [0.2, 3.4]) for (let i = 0; i < 16; i++) {
        const a0 = (i / 16) * Math.PI * 2, a1 = ((i + 1) / 16) * Math.PI * 2, am = (a0 + a1) / 2;
        const len = 2 * 8.25 * Math.sin(Math.PI / 16);
        const plank = new THREE.BoxGeometry(len + 0.1, 0.12, 1.1);
        sb.add(plank, mats.wood, new THREE.Matrix4().makeRotationY(am).setPosition(Math.sin(am) * 8.25 * Math.cos(Math.PI / 16), y, Math.cos(am) * 8.25 * Math.cos(Math.PI / 16)));
      }
      sb.build(this.scaffold);
    }
    // the foundation section seen in the cutaway (level-0 frame, so it leans with the tower)
    this.found = new THREE.Mesh(new THREE.BoxGeometry(19.6, 3, CUTZ + 9.8 + 0.03).translate(0, -1.5, (CUTZ + 0.03 - 9.8) / 2), lam("pisaFound", () => ({ map: rep(foundTex(), 2, 1) })));
    this.levels[0].g.add(this.found);

    // ---- cutaway soil block (z < CUTZ) ----
    // the cut face is a diagram surface: unlit, so the sun behind the set never puts it in shade
    this.soilWet = new THREE.MeshBasicMaterial({ map: soilTex(true), color: new THREE.Color(0.92, 0.92, 0.92) });
    this.soilDry = new THREE.MeshBasicMaterial({ map: soilTex(false), color: new THREE.Color(0.95, 0.95, 0.95) });
    const sbk = new Batch();
    sbk.add(quadUp(-60, 60, -400, CUTZ, 30, 103, 0), grass);
    sbk.build(this.soil);
    this.soilFace = new THREE.Mesh(quad(V(-60, -40, CUTZ), V(60, -40, CUTZ), V(60, 0, CUTZ), V(-60, 0, CUTZ)), this.soilWet);
    this.soilFace.receiveShadow = true;
    this.soil.add(this.soilFace);
    R.add(this.soil);

    // ---- era props ----
    const P = (name: string) => { const g = new THREE.Group(); this.era[name] = g; R.add(g); return g; };
    const marble = lam("marbleW", () => ({ map: rep(marbleTex("w"), 0.12, 0.12) }));
    { // 1173: marble blocks and a treadwheel crane frame near the stub
      const pb = new Batch(), g = P("blocks");
      for (const [x, z, w, h, d, yaw] of [[-4.5, 10.8, 1.6, 0.8, 1.0, 0.3], [-3.2, 11.4, 1.2, 0.7, 0.9, -0.2], [5.6, 11.9, 1.5, 0.8, 1.0, 0.5], [-4.0, 10.9, 1.1, 0.6, 0.8, 0.8], [7.4, 9.6, 1.4, 0.7, 1.0, 1.1]] as const) {
        const geo = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
        pb.add(geo, marble, new THREE.Matrix4().makeRotationY(yaw).setPosition(x, x === -4.0 ? 0.8 : 0, z));
      }
      pb.build(g);
    }
    { // tall grass during the hundred-year break (shot 7)
      const tg = lam("tallGrass", () => ({ color: "#5d9a3c", side: THREE.DoubleSide }));
      const gb2 = new Batch();
      for (let i = 0; i < 70; i++) {
        const a = i * 2.39996, d = 8.6 + (i % 9) * 0.55, x = Math.sin(a) * d, z = Math.cos(a) * d;
        if (z < 6) continue;
        const h = 0.5 + ((i * 37) % 10) * 0.06;
        gb2.add(new THREE.ConeGeometry(0.22, h, 4).translate(0, h / 2, 0), tg, new THREE.Matrix4().makeTranslation(x, 0, z));
      }
      gb2.build(this.grassTall);
      R.add(this.grassTall);
    }
    { // sponge tub (shot 9)
      const pb = new Batch(), g = P("tub");
      pb.add(new THREE.CylinderGeometry(0.4, 0.33, 0.42, 20, 1, true).translate(0, 0.21, 0), mats.wood, new THREE.Matrix4().makeTranslation(TUB[0], 0, TUB[2] + 0.5));
      const water = new THREE.CircleGeometry(0.38, 20); water.rotateX(-Math.PI / 2);
      pb.add(water, lam("tubWater", () => ({ color: "#5fb2d6" })), new THREE.Matrix4().makeTranslation(TUB[0], 0.36, TUB[2] + 0.5));
      pb.add(new THREE.BoxGeometry(1.6, 0.8, 0.8).translate(0, 0.4, 0), marble, new THREE.Matrix4().makeTranslation(TUB[0] - 2.2, 0, TUB[2] - 1.2));
      pb.build(g);
    }
    { // 1934: cement mixer cart + hose to the base, grey puddles
      const pb = new Batch(), g = P("cement");
      const iron = twoTone(new THREE.MeshLambertMaterial({ color: "#5b6270" })), drum = twoTone(new THREE.MeshLambertMaterial({ color: "#c0533a" }));
      pb.add(new THREE.BoxGeometry(2.2, 0.5, 1.4).translate(0, 0.9, 0), mats.wood, new THREE.Matrix4().makeTranslation(12.5, 0, 12));
      const d1 = new THREE.CylinderGeometry(0.75, 0.55, 1.3, 16); d1.rotateZ(0.6);
      pb.add(d1, drum, new THREE.Matrix4().makeTranslation(12.5, 1.9, 12));
      for (const [x, z] of [[11.6, 11.3], [13.4, 11.3], [11.6, 12.7], [13.4, 12.7]]) { const w = new THREE.CylinderGeometry(0.35, 0.35, 0.12, 14); w.rotateX(Math.PI / 2); pb.add(w, iron, new THREE.Matrix4().makeTranslation(x, 0.35, z)); }
      for (const [x, z, rr] of [[6.6, 9.2, 1.2], [8.2, 7.4, 0.9], [4.4, 9.9, 0.8]] as const) { const c = new THREE.CircleGeometry(rr, 18); c.rotateX(-Math.PI / 2); pb.add(c, lam("cementWet", () => ({ color: "#9a9a96" })), new THREE.Matrix4().makeTranslation(x, 0.02, z)); }
      pb.build(g);
      const curve = new THREE.CatmullRomCurve3([V(11.6, 1.6, 12), V(10, 0.25, 11.2), V(8.2, 0.2, 10), V(6.9, 0.35, 8.6)]);
      this.pipe = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.13, 8), twoTone(new THREE.MeshLambertMaterial({ color: "#3b3f52" })));
      g.add(this.pipe);
    }
    { // 1990: fence around the tower
      const pb = new Batch(), g = P("fence");
      const red = lam("fenceRed", () => ({ color: "#d23b3b" })), white = lam("fenceW", () => ({ color: "#f4f0e6" }));
      for (let i = 0; i < 40; i++) {
        const a0 = (i / 40) * Math.PI * 2, a1 = ((i + 1) / 40) * Math.PI * 2, r0 = 13.5;
        const p0 = V(Math.sin(a0) * r0, 0, Math.cos(a0) * r0), p1 = V(Math.sin(a1) * r0, 0, Math.cos(a1) * r0);
        pb.add(new THREE.BoxGeometry(0.12, 1.1, 0.12).translate(0, 0.55, 0), white, new THREE.Matrix4().makeTranslation(p0.x, 0, p0.z));
        const len = p0.distanceTo(p1), mid = p0.clone().add(p1).multiplyScalar(0.5);
        pb.add(new THREE.BoxGeometry(len, 0.14, 0.06), i % 2 ? red : white, new THREE.Matrix4().makeRotationY(Math.atan2(-(p1.z - p0.z), p1.x - p0.x)).setPosition(mid.x, 0.95, mid.z));
      }
      pb.build(g);
      // plumb rope from the top edge, posed per frame
      this.rope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6).translate(0, -0.5, 0), twoTone(new THREE.MeshLambertMaterial({ color: "#d9c79a" })));
      this.bob = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 12).rotateX(Math.PI), twoTone(new THREE.MeshLambertMaterial({ color: "#b08a3c" })));
      g.add(this.rope, this.bob);
    }
    { // the mason's plumb line (shot 4): string + bob hanging from his hand
      this.plumb = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 5).translate(0, -0.5, 0), twoTone(new THREE.MeshLambertMaterial({ color: "#3a2a1e" })));
      this.plumbBob = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 10).rotateX(Math.PI), twoTone(new THREE.MeshLambertMaterial({ color: "#b08a3c" })));
      R.add(this.plumb, this.plumbBob);
    }
    { // drill rig (shot 14): A-frame, inclined auger tube going under the high (-x) side, soil heap
      const g = P("drill"), pb = new Batch();
      const iron = twoTone(new THREE.MeshLambertMaterial({ color: "#f0a83a" })), dark = twoTone(new THREE.MeshLambertMaterial({ color: "#3b3f52" }));
      const beam = (a: THREE.Vector3, c: THREE.Vector3, th: number, m: THREE.Material) => {
        const geo = new THREE.BoxGeometry(th, a.distanceTo(c), th);
        pb.add(geo, m, new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), c.clone().sub(a).normalize()), V(1, 1, 1)));
      };
      for (const z of [CUTZ - 1.0, CUTZ - 3.0]) { beam(V(-17, 0, z), V(-14.5, 4.5, z), 0.22, iron); beam(V(-12, 0, z), V(-14.5, 4.5, z), 0.22, iron); }
      beam(V(-14.5, 4.5, CUTZ - 3.1), V(-14.5, 4.5, CUTZ - 0.9), 0.2, iron);
      const heap = new THREE.SphereGeometry(1.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); heap.scale(1.3, 0.6, 1);
      pb.add(heap, lam("heap", () => ({ color: "#8c7a68" })), new THREE.Matrix4().makeTranslation(-21, 0, CUTZ - 2.5));
      pb.build(g);
      this.drill = new THREE.Group();
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1, 12).translate(0, -0.5, 0), dark);
      this.drill.add(tube);
      g.add(this.drill);
    }
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
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
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    if (dist > 40) Rr = Math.max(Rr, 70);
    this.sun.position.copy(focus).addScaledVector(sunDir, 260); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 560; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun disc, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((dg) => THREE.MathUtils.degToRad(dg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear * 1.6; this.fog.far = L.fogFar * 1.5;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    // ---- ground vs cutaway ----
    const cut = !!s.cut;
    this.ground.visible = !cut; this.soil.visible = cut; this.found.visible = cut;
    this.soilFace.material = id === 10 && t > W.krepche - 0.3 ? this.soilDry : this.soilWet;
    // ---- tower ----
    const ts = towerAt(id, t), mats = towerMats(ts), top = topOf(ts);
    for (let k = 0; k < this.levels.length; k++) {
      const lv = this.levels[k];
      lv.g.matrixAutoUpdate = false;
      // each level's matrix relative to its parent = inverse(parent world) * world
      const local = k === 0 ? mats[0].clone() : mats[k - 1].clone().invert().multiply(mats[k]);
      lv.g.matrix.copy(local);
      lv.body.visible = k <= top.k;
      lv.body.scale.y = k === top.k ? top.y / LEVEL_H[k] : 1;
    }
    this.towerRoot.updateMatrixWorld(true);
    this.scaffold.visible = ts.scaffold;
    if (ts.scaffold) { this.levels[top.k].g.add(this.scaffold); this.scaffold.position.set(0, Math.max(0, top.y - 4.2), 0); }
    // ---- era props ----
    this.era.blocks.visible = id <= 8 && id !== 5;
    this.grassTall.visible = false;
    this.era.tub.visible = id === 9;
    this.era.cement.visible = id === 12;
    this.era.fence.visible = (id === 13 && f < 1754) || id === 14;
    this.era.drill.visible = id === 14;
    if (id === 13) {
      // rope from the outer edge of the belfry terrace, low side, straight down to the ground
      const p = V(R_OUT + 0.15, LEVEL_H[7] - 5.6, 0).applyMatrix4(mats[7]);
      this.rope.position.copy(p); this.rope.scale.set(1, p.y - 0.65, 1); this.rope.rotation.set(0, 0, 0);
      this.bob.position.set(p.x, 0.62, p.z);
    }
    if (id === 14) {
      // auger: from the rig down at 28 deg under the high side, a little further in with every word
      const a = V(-14.5, 0.3, CUTZ + 0.35), dir = V(Math.cos(-0.49), Math.sin(-0.49), 0).normalize();
      const len = 6 + 4.5 * smooth((t - (W.inzhenery - 0.3)) / 2.2);
      this.drill.position.copy(a);
      this.drill.quaternion.setFromUnitVectors(V(0, -1, 0), dir);
      this.drill.scale.set(1, len, 1);
    }
    this.plumb.visible = this.plumbBob.visible = false;
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, ts, { pos: cam.position, right, sun: sunDir });
    if (st.plumb) {
      const [hx, hy, hz] = st.plumb;
      this.plumb.visible = this.plumbBob.visible = true;
      this.plumb.position.set(hx, hy, hz); this.plumb.scale.set(1, 1.15, 1);
      this.plumbBob.position.set(hx, hy - 1.2, hz);
    }
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else if (p.face) { e2.mesh.rotation.set(0, 0, p.rot ?? 0); }
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (let i = 0; i < ai; i++) this.actors[i].bind();
    for (const e2 of fused) e2.bind();
    return focus;
  }
}
export { clamp01 };
export type { V3 };
