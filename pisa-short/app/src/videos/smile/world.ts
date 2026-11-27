// "Everyone Is Smiling": a fishing town on the rocks by the sea. Pastel wooden houses along one street, a plaza
// open to the harbour, a stone quay, a long wooden pier with lamps, boats and nets, stilt houses over the water,
// and the striped lighthouse on its rock across the bay (its beam sweeps at night). Two interior sets far off the
// map: the hero's bedroom (window wall facing -z, a night backdrop behind it) and the lamp room inside the
// lighthouse (gears and shelves of spare smiling faces). Lit by "day" or "night" per shot (moon, fog, warm windows).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit } from "./build";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { cloudHD, ctex } from "./paint";
import { grassReal, sidingReal, brickReal, shingleReal, barkReal, leavesReal } from "./noonpaint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { Blocky } from "./blocky";
import {
  FPS, SHOTS, camAt, ShotDef, V3, SUN_SHOT, CLEAR_SHOTS, NO_FOGCARDS, SEA_Y, QUAY, PIER, LH, LH_BASE, LH_H, LAMP_Y, LEO_HOUSE, LEO_WIN, ROOM, BED, RWIN, LHIN, smooth, clamp01,
} from "./story";

export const loadKit = async (): Promise<Kit> => ({});

const discTex = () => ctex("moonDisc", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.42, "rgba(255,255,255,1)"); gr.addColorStop(0.47, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(150,160,190,0.35)"; for (const [x, y, r] of [[110, 100, 16], [150, 140, 12], [120, 150, 9], [146, 104, 7]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
});
const softTex = () => ctex("softDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const beamTex = () => ctex("beamGrad", 64, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
});
const waterTex = () => ctex("seaWaves", 512, 512, (g, r) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { const x = r() * 512, y = r() * 512, w = 20 + r() * 60; g.strokeStyle = `rgba(0,30,60,${0.08 + r() * 0.12})`; g.lineWidth = 2 + r() * 3; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 6, x + w, y); g.stroke(); }
  for (let i = 0; i < 160; i++) { const x = r() * 512, y = r() * 512, w = 10 + r() * 30; g.strokeStyle = `rgba(255,255,255,${0.3 + r() * 0.4})`; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 4, x + w, y); g.stroke(); }
});
const cobbleTex = () => ctex("cobbles", 512, 512, (g, r) => {
  g.fillStyle = "#6a6460"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) for (let x = (y / 32) % 2 ? 16 : 0; x < 512; x += 32) {
    const c = 130 + Math.floor(r() * 50); g.fillStyle = `rgb(${c},${c - 6},${c - 14})`; g.beginPath(); g.ellipse(x + 16, y + 16, 13 + r() * 2, 12 + r() * 2, r(), 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.ellipse(x + 12, y + 11, 6, 4, 0, 0, 7); g.fill();
  }
});
const plankTex = (k: string, base: string) => ctex("plank" + k, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 64) { g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x, 0, 4, 512); for (let k2 = 0; k2 < 30; k2++) { g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.08})`; g.fillRect(x + 6 + r() * 54, r() * 512, 1 + r() * 2, 20 + r() * 80); } }
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(30,20,10,0.5)"; g.beginPath(); g.arc(r() * 512, r() * 512, 2.5, 0, 7); g.fill(); }
});
const stripeTex = () => ctex("lhStripes", 256, 512, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#c8302c" : "#f6f2ea"; g.fillRect(0, i * 64, 256, 64); } });
const rockTex = () => ctex("rock", 512, 512, (g, r) => {
  g.fillStyle = "#8a8a88"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { const c = 90 + Math.floor(r() * 80); g.fillStyle = `rgba(${c},${c},${c + 6},0.5)`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 22, 3 + r() * 12, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 60; i++) { g.strokeStyle = "rgba(40,40,46,0.5)"; g.lineWidth = 2; g.beginPath(); const x = r() * 512, y = r() * 512; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 80, y + r() * 60); g.stroke(); }
});
const netTex = () => ctex("fishnet", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256); g.strokeStyle = "rgba(60,50,40,0.95)"; g.lineWidth = 3;
  for (let i = -256; i < 512; i += 24) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke(); g.beginPath(); g.moveTo(i + 256, 0); g.lineTo(i, 256); g.stroke(); }
});
const nightBackdrop = () => ctex("nightBack", 1024, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#081030"); gr.addColorStop(0.6, "#1c2c5a"); gr.addColorStop(1, "#2a3a62");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`; g.fillRect(r() * 1024, r() * 260, 2, 2); }
  for (let i = 0; i < 9; i++) { const x = i * 120 + r() * 40, h = 120 + r() * 80; g.fillStyle = "#121a34"; g.fillRect(x, 512 - h, 100, h); g.beginPath(); g.moveTo(x - 8, 512 - h); g.lineTo(x + 50, 512 - h - 50); g.lineTo(x + 108, 512 - h); g.fill();
    g.fillStyle = "#ffb85a"; for (let k = 0; k < 3; k++) if (r() < 0.6) g.fillRect(x + 14 + k * 28, 512 - h + 30 + (k % 2) * 40, 16, 20); }
});
/** creepy spare face for the lighthouse shelves */
const spareFace = (k: number) => ctex("spare" + k, 256, 256, (g) => {
  const SK = ["#f6c99f", "#efb98c", "#d9a074", "#a8704a"];
  g.fillStyle = SK[k % 4]; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#241726"; g.lineWidth = 6;
  for (const x of [88, 168]) { g.fillStyle = "#fbfbf6"; g.beginPath(); g.ellipse(x, 98, 24, 26, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#241726"; g.beginPath(); g.arc(x, 98, 6, 0, 7); g.fill(); }
  g.fillStyle = "#fbfbf6"; g.lineWidth = 7; g.beginPath(); g.moveTo(30, 146); g.quadraticCurveTo(128, 268, 226, 146); g.quadraticCurveTo(128, 178, 30, 146); g.closePath(); g.fill(); g.stroke();
  g.lineWidth = 3; for (let i = 1; i < 12; i++) { const x = 30 + i * 16.3, yt = 146 + 30 * (1 - ((x - 128) / 98) ** 2), yb = 146 + 82 * (1 - ((x - 128) / 98) ** 2); g.beginPath(); g.moveTo(x, yt); g.lineTo(x, Math.max(yt + 4, yb)); g.stroke(); }
});
const labelTex = (key: string, s: string) => ctex("lbl" + key, 256, 64, (g) => { g.fillStyle = "#e8dcc0"; g.fillRect(0, 0, 256, 64); g.strokeStyle = "#5a4430"; g.lineWidth = 4; g.strokeRect(3, 3, 250, 58); g.fillStyle = "#3a2a1e"; g.font = "700 30px 'DejaVu Sans', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(s, 128, 34); });

const HOUSE_COLS = ["#5fb3b3", "#e98a6e", "#f2c94c", "#f2efe6", "#6f9bd1", "#e7a4b4", "#9fd3b0", "#d9b38c"];
const ROOF_COLS = ["#3d4656", "#7a3b32", "#2f4a5a", "#5a4a42"];
const SHUT_COLS = ["#2f6f8a", "#3a6a4a", "#8a3a3a", "#f4f1ea"];

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private moon: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden" | "night", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private rigs: Blocky[] = [];
  private winMat = new THREE.MeshBasicMaterial({ color: "#5a7f9a" });
  private leoWin = new THREE.MeshBasicMaterial({ color: "#5a7f9a" });
  private lampMat = new THREE.MeshBasicMaterial({ color: "#f6e7a6" });
  private glassLH = new THREE.MeshBasicMaterial({ color: "#cfe6f0" });
  private seaMat: THREE.MeshLambertMaterial;
  private glows = new THREE.Group(); private fogCards = new THREE.Group(); private gulls = new THREE.Group();
  private beam = new THREE.Group();
  private moonGlint: THREE.Mesh;
  private gears: THREE.Object3D[] = [];
  private boats: THREE.Group[] = []; private foams: THREE.Mesh[] = []; private laundry: THREE.Mesh[] = []; private catTail!: THREE.Mesh;
  private bunting = new THREE.Group(); private lights = new THREE.Group(); private smoke = new THREE.Group();
  private bulbMat = new THREE.MeshBasicMaterial({ color: "#f6e7a6" });
  private torch = new THREE.Group();
  private lhDoor!: THREE.Mesh; private lhDoorRy = 0;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit, shadowSize = 2048) {
    void kit;
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() }, stars: { value: 0 } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; uniform float stars; varying vec3 vP;
        float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        void main(){ vec3 n = normalize(vP); float el = asin(clamp(n.y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el));
          vec3 q = floor(n * 420.0); float s = step(0.9975, h(q)) * smoothstep(0.05, 0.3, el) * stars; c += vec3(s * 1.6);
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(3.2, 3.3, 3.6), fog: false, depthWrite: false }));
    this.moon.frustumCulled = false; this.moon.layers.set(NOINK); R.add(this.moon);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(shadowSize, shadowSize);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)), night: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.night.cloud)) };
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30; m.position.set(Math.cos(a) * d, 90 + (i % 4) * 40, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }

    const b = new Batch();
    const grass = lam("sGrass", () => ({ map: grassReal() }));
    const cob = lam("sCob", () => ({ map: cobbleTex() }));
    const stone = lam("sStone", () => ({ map: brickReal(), color: "#b8b2a8" }));
    const rock = lam("sRock", () => ({ map: rockTex() }));
    const wood = lam("sWood", () => ({ map: plankTex("a", "#8a6a4a") })), woodD = lam("sWoodD", () => ({ map: plankTex("b", "#5a4632") }));
    const iron = twoTone(new THREE.MeshLambertMaterial({ color: "#2e3240" })), rope = lam("sRope", () => ({ color: "#c9b48a" }));
    const white = lam("sWhite", () => ({ color: "#f4f1ea" })), red = lam("sRed", () => ({ color: "#c8302c" }));
    const frame = lam("sFrame", () => ({ color: "#f4f1ea" }));
    const uvBox = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile = 2) => boxGeo(V(x0, y0, z0), V(x1, y1, z1), tile);

    // ---------------- ground, street, quay, sea ----------------
    const quad = (x0: number, x1: number, z0: number, z1: number, u: number, v: number, y = 0) => {
      const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
      const uv = g.attributes.uv as THREE.BufferAttribute; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * u, uv.getY(k) * v); return g;
    };
    b.add(quad(-400, 400, QUAY, 400, 90, 90, 0), grass);
    b.add(quad(-40, 40, QUAY, 16, 40, 12.5, 0.02), cob);
    b.add(uvBox(-60, SEA_Y - 3, QUAY - 0.8, 60, 0.1, QUAY + 0.2, 1.5), stone);
    for (let x = -58; x <= 58; x += 2.4) b.add(new THREE.CylinderGeometry(0.12, 0.14, 0.5, 8).translate(x, 0.3, QUAY + 0.4), iron); // bollards
    for (let x = -57; x < 57; x += 2.4) b.add(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6).rotateZ(Math.PI / 2).translate(x + 1.2, 0.45, QUAY + 0.4), iron);
    this.seaMat = twoTone(new THREE.MeshLambertMaterial({ map: waterTex(), color: "#2a8ab8" }));
    const sea = new THREE.Mesh(quad(-700, 700, -700, QUAY - 0.5, 160, 160, SEA_Y), this.seaMat); sea.receiveShadow = true; R.add(sea);
    this.moonGlint = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: softTex(), color: new THREE.Color(0.9, 1.0, 1.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.moonGlint.layers.set(NOINK); R.add(this.moonGlint);

    // ---------------- rocks and hills round the bay ----------------
    const boulder = (x: number, y: number, z: number, s: number, i: number) => b.add(new THREE.IcosahedronGeometry(1, 1).scale(s * (1 + (i % 3) * 0.2), s * 0.7, s), rock, new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, i * 1.7, 0.2 * Math.sin(i))), V(1, 1, 1)));
    for (let i = 0; i < 26; i++) boulder(-44 - (i % 5) * 7, SEA_Y + 0.5, QUAY - 2 - Math.floor(i / 5) * 8, 3 + (i % 4), i);
    for (let i = 0; i < 26; i++) boulder(44 + (i % 5) * 7, SEA_Y + 0.5, QUAY - 2 - Math.floor(i / 5) * 8, 3 + (i % 4), i + 7);
    for (let i = 0; i < 8; i++) boulder(-60 + i * 17, SEA_Y + 0.3, QUAY - 0.5, 1.2 + (i % 3) * 0.4, i + 40);
    const hill = new THREE.SphereGeometry(1, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    for (const [hx, hz, sx, sy, sz] of [[-90, 90, 70, 34, 50], [0, 120, 90, 46, 50], [100, 80, 60, 30, 50], [-150, 10, 50, 26, 70], [150, 0, 50, 22, 70]] as const) b.add(hill, grass, new THREE.Matrix4().compose(V(hx, -1, hz), new THREE.Quaternion(), V(sx, sy, sz)));
    for (const [cx, cz, s] of [[-70, -20, 26], [-95, -60, 34], [80, -30, 28], [110, -70, 36], [-40, -110, 22], [30, -140, 30]] as const) boulder(cx, SEA_Y, cz, s, cx + cz);
    for (let i = 0; i < 160; i++) { const a = i * 2.39996, d = 48 + (i % 13) * 6, x = Math.cos(a) * d, z = 20 + Math.abs(Math.sin(a)) * d; if (z < 18) continue; const h = 9 + (i % 5) * 2;
      b.add(new THREE.CylinderGeometry(0.16, 0.28, h * 0.5, 8).translate(x, h * 0.25, z), lam("sBark", () => ({ map: barkReal() })));
      for (let k = 0; k < 3; k++) b.add(new THREE.ConeGeometry(h * (0.28 - k * 0.07), h * 0.36, 9).translate(x, h * (0.36 + k * 0.18), z), lam("sLeaves" + (i % 3), () => ({ map: leavesReal(i % 3), color: "#6a8a6a" }))); }

    // ---------------- houses ----------------
    const house = (x: number, z: number, face: 1 | -1, w: number, d: number, h: number, i: number, stilt = 0, leo = false) => {
      const col = HOUSE_COLS[i % HOUSE_COLS.length], wall = lam("sWall" + (i % HOUSE_COLS.length), () => ({ map: sidingReal(), color: col }));
      const y0 = stilt, fz = z + face * d / 2;
      if (stilt) for (const sx of [-w / 2 + 0.3, 0, w / 2 - 0.3]) for (const sz of [-d / 2 + 0.3, d / 2 - 0.3]) b.add(new THREE.CylinderGeometry(0.16, 0.18, stilt - SEA_Y + 0.5, 8).translate(x + sx, (stilt + SEA_Y - 0.5) / 2, z + sz), woodD);
      if (stilt) b.add(uvBox(x - w / 2 - 0.6, y0 - 0.2, z - d / 2 - 0.6, x + w / 2 + 0.6, y0, z + d / 2 + 0.6, 2), wood);
      b.add(uvBox(x - w / 2, y0, z - d / 2, x + w / 2, y0 + h, z + d / 2, 3), wall);
      b.add(uvBox(x - w / 2 - 0.08, y0, z - d / 2 - 0.08, x + w / 2 + 0.08, y0 + 0.5, z + d / 2 + 0.08, 2), stone);
      const rh = w * 0.42, rm = lam("sRoof" + (i % 4), () => ({ map: shingleReal(), color: ROOF_COLS[i % 4] })), sl = Math.hypot(w / 2 + 0.45, rh);
      for (const s of [-1, 1]) { // gable across x (ridge along z), so the gable end faces the street
        const slab = new THREE.BoxGeometry(0.28, sl, d + 0.7); slab.translate(0, sl / 2, 0);
        slab.applyMatrix4(new THREE.Matrix4().makeRotationZ(-s * (Math.PI / 2 - Math.atan2(rh, w / 2 + 0.45)))); slab.translate(x - s * (w / 2 + 0.45), y0 + h - 0.05, z);
        b.add(slab, rm);
      }
      for (const zz of [z - d / 2, z + d / 2]) { const gab = new THREE.BufferGeometry(); gab.setAttribute("position", new THREE.Float32BufferAttribute([x - w / 2, y0 + h, zz, x + w / 2, y0 + h, zz, x, y0 + h + rh, zz], 3)); gab.computeVertexNormals(); gab.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 2, 0, 1, 1], 2)); const g2 = gab.clone(); g2.index = null; b.add(gab, wall); const p = g2.attributes.position.array as Float32Array; const rev = new THREE.BufferGeometry(); rev.setAttribute("position", new THREE.Float32BufferAttribute([p[0], p[1], p[2], p[6], p[7], p[8], p[3], p[4], p[5]], 3)); rev.computeVertexNormals(); rev.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 1, 2, 0], 2)); b.add(rev, wall); }
      b.add(new THREE.BoxGeometry(0.22, 0.22, d + 0.9).translate(x, y0 + h + rh + 0.12, z), frame); // ridge board
      const shut = lam("sShut" + (i % 4), () => ({ color: SHUT_COLS[i % 4] }));
      const floors = Math.max(1, Math.round(h / 2.8)), n = Math.max(1, Math.round(w / 2.4));
      for (let f = 0; f < floors; f++) for (let k = 0; k < n; k++) {
        const wx = x - w / 2 + (k + 0.5) * (w / n), wy = y0 + 1.5 + f * 2.8, dz = face * 0.06;
        if (f === 0 && k === Math.floor(n / 2)) {
          b.add(new THREE.BoxGeometry(1.1, 2.1, 0.12).translate(wx, y0 + 1.05, fz + dz), lam("sDoor" + (i % 3), () => ({ color: ["#7a4f33", "#2f4a6a", "#8a3a3a"][i % 3] })));
          b.add(new THREE.BoxGeometry(1.5, 0.12, 0.7).translate(wx, y0 + 2.35, fz + face * 0.35), frame);
          b.add(new THREE.BoxGeometry(0.22, 0.3, 0.22).translate(wx + 0.85, y0 + 2.0, fz + face * 0.15), this.lampMat); // porch lantern
          continue;
        }
        const isLeo = leo && f === 1 && Math.abs(wx - LEO_WIN[0]) < 1.2;
        b.add(new THREE.BoxGeometry(1.2, 1.3, 0.1).translate(wx, wy, fz + dz * 0.6), frame);
        const gl = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.05, 0.1).translate(wx, wy, fz + dz), isLeo ? this.leoWin : this.winMat); R.add(gl);
        b.add(new THREE.BoxGeometry(0.06, 1.05, 0.14).translate(wx, wy, fz + dz * 1.4), frame); b.add(new THREE.BoxGeometry(0.95, 0.06, 0.14).translate(wx, wy, fz + dz * 1.4), frame);
        for (const sx of [-1, 1]) b.add(new THREE.BoxGeometry(0.42, 1.3, 0.08).translate(wx + sx * 0.84, wy, fz + dz), shut);
        b.add(new THREE.BoxGeometry(1.3, 0.12, 0.3).translate(wx, wy - 0.72, fz + face * 0.15), frame);
        if ((i + k + f) % 3 === 0) { b.add(new THREE.BoxGeometry(1.1, 0.25, 0.3).translate(wx, wy - 0.55, fz + face * 0.3), lam("sBox", () => ({ color: "#7a4f33" }))); for (let q = 0; q < 4; q++) b.add(new THREE.IcosahedronGeometry(0.13, 0).translate(wx - 0.4 + q * 0.27, wy - 0.36, fz + face * 0.3), lam("sFlw" + (q % 3), () => ({ color: ["#e2453c", "#f2c94c", "#e7a4b4"][q % 3] }))); }
      }
      b.add(new THREE.BoxGeometry(0.8, 1.6, 0.8).translate(x + w * 0.22, y0 + h + rh * 0.6, z - face * d * 0.2), lam("sChim", () => ({ map: brickReal(), color: "#a87060" })));
    };
    let hi = 0;
    for (const x of [-27, -19, -11, 11, 19, 27]) house(x, -4.6, 1, 6.6, 7, x % 2 ? 5.6 : 8.4, hi++);
    for (const x of [-24, -16, -8, 0, 8, 16, 24]) house(x, 10.6, -1, 6.8, 7, x === 0 ? 8.4 : [5.6, 8.4, 7.0][hi % 3], hi++, 0, x === 0);
    for (const [x, z] of [[14, -14], [21, -16], [28, -13]] as const) house(x, z, 1, 5.4, 5, 5.6, hi++, 1.2);
    // plaza: well, benches, crates, barrels, nets on racks, lamp posts
    b.add(new THREE.CylinderGeometry(1.0, 1.1, 0.9, 16).translate(-2, 0.45, -3.5), stone);
    b.add(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 16).translate(-2, 0.88, -3.5), lam("sWellW", () => ({ color: "#14304a" })));
    for (const sx of [-1, 1]) b.add(new THREE.BoxGeometry(0.12, 2.0, 0.12).translate(-2 + sx * 0.95, 1.4, -3.5), woodD);
    b.add(new THREE.BoxGeometry(2.3, 0.14, 1.4).rotateX(0).translate(-2, 2.45, -3.5), lam("sRoofW", () => ({ map: shingleReal(), color: "#7a3b32" })));
    for (const [x, z, k] of [[5, -6, 0], [5.8, -6.4, 1], [5.3, -7.1, 2], [-6, -7, 3], [-5.2, -7.4, 4]] as const) { if (k < 3) b.add(uvBox(x - 0.4, 0, z - 0.4, x + 0.4, 0.75, z + 0.4, 1), wood); else b.add(new THREE.CylinderGeometry(0.36, 0.36, 0.95, 14).translate(x, 0.47, z), woodD); }
    for (const [x, z] of [[8.5, -7.5], [-8.5, -7.5]] as const) {
      for (const sx of [-1.6, 1.6]) b.add(new THREE.BoxGeometry(0.12, 2.2, 0.12).translate(x + sx, 1.1, z), woodD);
      b.add(new THREE.BoxGeometry(3.4, 0.08, 0.08).translate(x, 2.15, z), woodD);
      const net = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.9).translate(x, 1.15, z), new THREE.MeshLambertMaterial({ map: netTex(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide })); R.add(net);
    }
    const lampPost = (x: number, z: number) => {
      b.add(new THREE.CylinderGeometry(0.08, 0.11, 3.6, 8).translate(x, 1.8, z), iron);
      b.add(new THREE.BoxGeometry(0.42, 0.5, 0.42).translate(x, 3.85, z), this.lampMat);
      b.add(new THREE.ConeGeometry(0.4, 0.3, 4).rotateY(Math.PI / 4).translate(x, 4.25, z), iron);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(5, 5).rotateX(-Math.PI / 2).translate(x, 0.05, z), new THREE.MeshBasicMaterial({ map: softTex(), color: new THREE.Color(0.9, 0.55, 0.22), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      gl.layers.set(NOINK); this.glows.add(gl);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color(1.4, 0.9, 0.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.position.set(x, 3.85, z); halo.scale.setScalar(2.2); halo.layers.set(NOINK); this.glows.add(halo);
    };
    for (const x of [-20, -6.5, 6.5, 20]) lampPost(x, 0.0);
    for (const x of [-14, 14]) lampPost(x, 6.4);
    lampPost(-4.5, -8.2);

    // ---------------- the pier, boats ----------------
    const [pa, pb] = PIER, px = pa[0], pw = 1.6;
    b.add(uvBox(px - pw, pa[1] - 0.18, pb[2], px + pw, pa[1], pa[2], 2), wood);
    for (let z = pa[2] - 1; z > pb[2]; z -= 2.5) for (const sx of [-1, 1]) { b.add(new THREE.CylinderGeometry(0.15, 0.17, pa[1] - SEA_Y + 1.6, 8).translate(px + sx * (pw - 0.1), (pa[1] + SEA_Y - 1.6) / 2 + 0.5, z), woodD); b.add(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6).rotateX(Math.PI / 2).translate(px + sx * (pw - 0.1), pa[1] + 0.85, z - 1.25), rope); }
    for (let z = pa[2] - 6; z > pb[2]; z -= 9) lampPost(px + pw - 0.2, z);
    const boat = (x: number, z: number, yaw: number, col: string, k: number) => {
      const bb = new Batch(), m = new THREE.Matrix4(), b = bb; // built into its own group so it can bob on the swell
      const grp = new THREE.Group(); grp.position.set(x, SEA_Y + 0.15, z); grp.rotation.y = yaw; R.add(grp); this.boats.push(grp);
      const hull = new THREE.CylinderGeometry(1.0, 0.7, 4.6, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).scale(1, 0.8, 1).translate(0, 0.55, 0);
      b.add(hull, lam("sHull" + k, () => ({ color: col, side: THREE.DoubleSide })), m);
      b.add(new THREE.BoxGeometry(1.9, 0.1, 4.4).translate(0, 0.52, 0), wood, m);
      b.add(uvBox(-0.6, 0.55, -0.4, 0.6, 1.6, 0.9, 1), white, m);
      b.add(new THREE.BoxGeometry(1.4, 0.1, 1.5).translate(0, 1.65, 0.25), red, m);
      b.add(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6).translate(0, 2.1, -1.3), woodD, m);
      b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 10).rotateZ(Math.PI / 2).translate(0.98, 0.75, 0.6), lam("sFender", () => ({ color: "#f4f1ea" })), m); // fender
      b.add(new THREE.PlaneGeometry(0.9, 0.5).translate(0, 3.3, -1.3), lam("sFlagB" + k, () => ({ color: ["#e2453c", "#f2c94c", "#3f6fb5", "#2f8a4f", "#f4f1ea"][k], side: THREE.DoubleSide })), m);
      b.add(new THREE.BoxGeometry(0.5, 0.45, 0.06).translate(0, 1.1, 0.91), this.winMat as unknown as THREE.Material, m);
      bb.build(grp);
      const foam = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.6, 32).rotateX(-Math.PI / 2).scale(0.75, 1, 1.35), new THREE.MeshBasicMaterial({ map: softTex(), color: new THREE.Color(0.9, 0.95, 1), transparent: true, opacity: 0.35, depthWrite: false }));
      foam.position.set(x, SEA_Y + 0.04, z); foam.rotation.y = yaw; foam.layers.set(NOINK); R.add(foam); this.foams.push(foam);
    };
    boat(px - 4, -14, 0.1, "#e2453c", 0); boat(px + 4.4, -19, -0.15, "#3f6fb5", 1); boat(px - 4.2, -24, 0.2, "#f2c94c", 2); boat(px + 4.2, -29, 0.05, "#2f8a4f", 3); boat(-14, -15, 1.2, "#f4f1ea", 4);
    for (const [x, z, c] of [[-8, -22, "#e2453c"], [10, -26, "#f2c94c"], [-3, -38, "#e2453c"]] as const) { b.add(new THREE.SphereGeometry(0.4, 12, 8).translate(x, SEA_Y + 0.2, z), lam("sBuoy" + c, () => ({ color: c }))); }

    // ---------------- the lighthouse on its rock ----------------
    const [lx, , lz] = LH;
    b.add(new THREE.IcosahedronGeometry(1, 2).scale(11, LH_BASE + 1.5, 10), rock, new THREE.Matrix4().makeTranslation(lx, SEA_Y - 1.2, lz));
    for (let i = 0; i < 7; i++) boulder(lx + Math.cos(i) * 10, SEA_Y, lz + Math.sin(i) * 9, 2.5 + (i % 3), i + 70);
    b.add(new THREE.CylinderGeometry(3.2, 3.4, 1.2, 24).translate(lx, LH_BASE + 0.1, lz), stone);
    b.add(new THREE.CylinderGeometry(1.75, 2.3, LH_H, 28, 1, true).translate(lx, LH_BASE + LH_H / 2, lz), lam("sLHStripes", () => ({ map: stripeTex(), side: THREE.DoubleSide })));
    b.add(uvBox(lx - 2.6, LH_BASE, lz + 1.6, lx - 1.0, LH_BASE + 2.6, lz + 3.4, 2), white); // keeper's hut
    b.add(new THREE.BoxGeometry(0.8, 1.6, 0.08).translate(lx - 1.8, LH_BASE + 0.8, lz + 3.42), lam("sDoor0", () => ({ color: "#7a4f33" })));
    for (let k = 0; k < 3; k++) b.add(new THREE.BoxGeometry(0.5, 0.7, 0.08).translate(lx + Math.sin(k * 2.1) * 2.05, LH_BASE + 5 + k * 4, lz + Math.cos(k * 2.1) * 2.05), this.winMat);
    const gy = LH_BASE + LH_H;
    b.add(new THREE.CylinderGeometry(2.6, 2.6, 0.3, 28).translate(lx, gy, lz), iron);
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; b.add(new THREE.BoxGeometry(0.06, 1.0, 0.06).translate(lx + Math.cos(a) * 2.5, gy + 0.65, lz + Math.sin(a) * 2.5), iron); }
    b.add(new THREE.TorusGeometry(2.5, 0.05, 6, 32).rotateX(Math.PI / 2).translate(lx, gy + 1.15, lz), iron);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.4, 16).translate(lx, gy + 1.45, lz), this.glassLH); R.add(glass);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; b.add(new THREE.BoxGeometry(0.1, 2.4, 0.1).translate(lx + Math.cos(a) * 1.52, gy + 1.45, lz + Math.sin(a) * 1.52), iron); }
    b.add(new THREE.ConeGeometry(1.9, 1.6, 16).translate(lx, gy + 3.45, lz), red);
    b.add(new THREE.SphereGeometry(0.25, 10, 8).translate(lx, gy + 4.35, lz), iron);
    // beam: two long soft cones turning round the lamp (night only)
    for (const s of [1, -1]) {
      const g = new THREE.ConeGeometry(7, 70, 24, 1, true).translate(0, -35, 0).rotateZ(s * Math.PI / 2);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: beamTex(), color: new THREE.Color(1.0, 0.92, 0.65), transparent: true, opacity: 0.11, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
      m.layers.set(NOINK); this.beam.add(m);
    }
    this.beam.position.set(lx, LAMP_Y, lz); R.add(this.beam);
    const lhHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color(2.0, 1.7, 1.0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    lhHalo.position.set(lx, LAMP_Y, lz); lhHalo.scale.setScalar(9); lhHalo.layers.set(NOINK); this.glows.add(lhHalo);

    // ---------------- night fog cards along the street and the harbour ----------------
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: softTex(), color: new THREE.Color(0.32, 0.4, 0.58), transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
      m.position.set(-30 + (i * 7.3) % 60, 0.8 + (i % 3) * 0.5, -16 + (i * 5.1) % 28); m.scale.set(12 + (i % 4) * 3, 2.6, 1); m.layers.set(NOINK); this.fogCards.add(m);
    }
    R.add(this.glows, this.fogCards);
    for (let i = 0; i < 7; i++) { const gm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.16), lam("sGull", () => ({ color: "#fbfbf8" }))); gm.position.set(-14 + i * 5, 12 + (i % 3) * 2.5, -18 - (i % 4) * 4); this.gulls.add(gm); }
    R.add(this.gulls);

    // ---------------- set: Leo's bedroom (window in the -z wall) ----------------
    {
      const [rx, , rz] = ROOM, W2 = 3.0, D2 = 2.8, H2 = 2.9;
      const floor = lam("sFloorR", () => ({ map: plankTex("c", "#7a5a3e") })), wallR = lam("sWallR", () => ({ map: sidingReal(), color: "#5a7090" }));
      b.add(uvBox(rx - W2, -0.1, rz - D2, rx + W2, 0.03, rz + D2 + 4, 2), floor);
      b.add(uvBox(rx - W2 - 0.2, 0, rz - D2 - 0.2, rx - W2, H2, rz + D2 + 4, 2), wallR);
      b.add(uvBox(rx + W2, 0, rz - D2 - 0.2, rx + W2 + 0.2, H2, rz + D2 + 4, 2), wallR);
      const [wx, wy] = [RWIN[0], RWIN[1]], ww = 1.5, wh = 1.3, z0 = rz - D2 - 0.2, z1 = rz - D2;
      b.add(uvBox(rx - W2, 0, z0, wx - ww / 2, H2, z1, 2), wallR); b.add(uvBox(wx + ww / 2, 0, z0, rx + W2, H2, z1, 2), wallR);
      b.add(uvBox(wx - ww / 2, 0, z0, wx + ww / 2, wy - wh / 2, z1, 2), wallR); b.add(uvBox(wx - ww / 2, wy + wh / 2, z0, wx + ww / 2, H2, z1, 2), wallR);
      for (const [x0, y0, x1, y1] of [[wx - ww / 2 - 0.08, wy - wh / 2 - 0.08, wx + ww / 2 + 0.08, wy - wh / 2], [wx - ww / 2 - 0.08, wy + wh / 2, wx + ww / 2 + 0.08, wy + wh / 2 + 0.08], [wx - ww / 2 - 0.08, wy - wh / 2, wx - ww / 2, wy + wh / 2], [wx + ww / 2, wy - wh / 2, wx + ww / 2 + 0.08, wy + wh / 2], [wx - 0.03, wy - wh / 2, wx + 0.03, wy + wh / 2], [wx - ww / 2, wy - 0.03, wx + ww / 2, wy + 0.03]] as const)
        b.add(uvBox(x0, y0, z0 - 0.04, x1, y1, z1 + 0.04, 1), frame);
      b.add(uvBox(wx - ww / 2 - 0.15, wy - wh / 2 - 0.14, z1, wx + ww / 2 + 0.15, wy - wh / 2 - 0.06, z1 + 0.22, 1), frame); // sill
      for (const sx of [-1, 1]) b.add(new THREE.BoxGeometry(0.5, 1.9, 0.06).translate(wx + sx * (ww / 2 + 0.3), wy - 0.1, z1 + 0.12), lam("sCurtain", () => ({ color: "#3a4a7a" })));
      const ceilR = new THREE.Mesh(boxGeo(V(rx - W2 - 0.2, H2, rz - D2 - 0.2), V(rx + W2 + 0.2, H2 + 0.15, rz + D2 + 4), 2, true), wallR); ceilR.castShadow = false; ceilR.receiveShadow = false; R.add(ceilR);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(26, 13).translate(wx, 3.2, z0 - 7), new THREE.MeshBasicMaterial({ map: nightBackdrop(), fog: false })); back.layers.set(NOINK); R.add(back);
      b.add(uvBox(wx - 4, -0.2, z0 - 7, wx + 4, -0.05, z0, 1), cob);
      // bed: frame, mattress, pillow, blanket; nightstand, lamp, books, ship model, poster, rug, chair with the raincoat
      const [bx, , bz] = BED;
      b.add(uvBox(bx - 0.78, 0, bz - 1.15, bx + 0.78, 0.35, bz + 1.1, 1), lam("sBedF", () => ({ map: plankTex("d", "#6a4a32") })));
      b.add(uvBox(bx - 0.8, 0, bz - 1.25, bx + 0.8, 1.0, bz - 1.13, 1), lam("sBedF", () => ({ map: plankTex("d", "#6a4a32") })));
      b.add(uvBox(bx - 0.74, 0.35, bz - 1.1, bx + 0.74, 0.55, bz + 1.05, 1), lam("sMatt", () => ({ color: "#e8e4dc" })));
      { const pil = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.12, 0.62, 3, 0.05).translate(bx, 0.6, bz - 0.74), new THREE.MeshLambertMaterial({ color: "#f4f1ea" })); pil.receiveShadow = true; R.add(pil); }
      { // a soft quilted duvet (rounded, patchwork squares with stitching) with the white sheet folded over the top
        const quilt = ctex("quilt", 512, 512, (g) => { const C = ["#3f6fb5", "#5a8ad0", "#2f5a9a", "#e9cf8f", "#4a7ac0", "#c8463a"]; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = C[(x * 3 + y * 5) % 6]; g.fillRect(x * 128, y * 128, 128, 128); g.fillStyle = "rgba(255,255,255,0.08)"; g.beginPath(); g.arc(x * 128 + 64, y * 128 + 64, 40, 0, 7); g.fill(); } g.strokeStyle = "rgba(255,255,255,0.6)"; g.setLineDash([8, 6]); g.lineWidth = 3; for (let i = 0; i <= 512; i += 128) { g.beginPath(); g.moveTo(i + 6, 0); g.lineTo(i + 6, 512); g.stroke(); g.beginPath(); g.moveTo(0, i + 6); g.lineTo(512, i + 6); g.stroke(); } });
        const duvet = new THREE.Mesh(new RoundedBoxGeometry(1.62, 0.5, 1.46, 4, 0.16).translate(bx, 0.79, bz + 0.37), new THREE.MeshLambertMaterial({ map: quilt })); duvet.castShadow = true; duvet.receiveShadow = true; R.add(duvet);
        const sheet = new THREE.Mesh(new RoundedBoxGeometry(1.64, 0.1, 0.3, 3, 0.05).rotateX(0.18).translate(bx, 1.0, bz - 0.26), new THREE.MeshLambertMaterial({ color: "#f4f1ea" })); sheet.receiveShadow = true; R.add(sheet);
      }
      b.add(uvBox(bx + 0.9, 0, bz - 1.1, bx + 1.4, 0.6, bz - 0.6, 1), wood);
      b.add(new THREE.CylinderGeometry(0.1, 0.14, 0.32, 10).translate(bx + 1.15, 0.76, bz - 0.85), lam("sLampR", () => ({ color: "#e9cf8f" })));
      for (let k = 0; k < 4; k++) b.add(new THREE.BoxGeometry(0.06, 0.26, 0.2).translate(rx - W2 + 0.3 + k * 0.08, 1.95, rz - 0.6), lam("sBook" + k, () => ({ color: ["#c8302c", "#2f6f8a", "#f2c94c", "#3a6a4a"][k] })));
      b.add(uvBox(rx - W2, 1.8, rz - 1.0, rx - W2 + 0.35, 1.84, rz + 0.4, 1), wood);
      b.add(new THREE.BoxGeometry(0.16, 0.18, 0.5).translate(rx - W2 + 0.18, 1.94, rz + 0.05), lam("sShip", () => ({ color: "#7a4f33" })));
      b.add(new THREE.PlaneGeometry(0.4, 0.5).rotateY(Math.PI / 2).translate(rx - W2 + 0.01, 2.0, rz + 1.2), lam("sMapP", () => ({ map: labelTex("map", "SEA MAP") })));
      b.add(new THREE.CylinderGeometry(0.9, 0.9, 0.02, 24).translate(rx - 0.6, 0.01, rz + 0.8), lam("sRug", () => ({ color: "#8a3a3a" })));
      this.moonPool = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.0).rotateX(-Math.PI / 2).translate(bx - 0.1, 0.77, bz - 0.4), new THREE.MeshBasicMaterial({ map: softTex(), color: new THREE.Color(0.12, 0.16, 0.26), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      this.moonPool.layers.set(NOINK); R.add(this.moonPool);
    }

    // ---------------- set: inside the lighthouse (gears, shelves of faces, the keeper's bench) ----------------
    {
      const [ix, , iz] = LHIN, Rr = 4.2, H3 = 4.6;
      b.add(new THREE.CylinderGeometry(Rr + 0.3, Rr + 0.3, 0.1, 24).translate(ix, 0.0, iz), lam("sFloorL", () => ({ map: plankTex("f", "#5a4632") })));
      { const DOOR_A = Math.PI / 4, N = 22; // a full ring of brick wall with a doorway toward +x+z
        for (let k = 0; k < N; k++) { const a = (k / N) * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a - DOOR_A), Math.cos(a - DOOR_A))) < 0.15) continue; b.add(new THREE.BoxGeometry(1.32, H3, 0.3).rotateY(-a + Math.PI / 2).translate(ix + Math.cos(a) * Rr, H3 / 2, iz + Math.sin(a) * Rr), lam("sLHWall", () => ({ map: brickReal(), color: "#9a8a7a" }))); }
        const dx = Math.cos(DOOR_A) * Rr, dz = Math.sin(DOOR_A) * Rr, ry = -DOOR_A + Math.PI / 2;
        for (const s2 of [-1, 1]) b.add(new THREE.BoxGeometry(0.14, 2.3, 0.4).translate(s2 * 0.58, 1.15, 0).rotateY(ry).translate(ix + dx, 0, iz + dz), woodD);
        b.add(new THREE.BoxGeometry(1.3, 0.16, 0.4).translate(0, 2.35, 0).rotateY(ry).translate(ix + dx, 0, iz + dz), woodD);
        b.add(new THREE.BoxGeometry(1.32, H3 - 2.43, 0.3).translate(0, 2.43 + (H3 - 2.43) / 2, 0).rotateY(ry).translate(ix + dx, 0, iz + dz), lam("sLHWall", () => ({ map: brickReal(), color: "#9a8a7a" })));
        const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.2, 0.08).translate(0.5, 1.1, 0), lam("sDoorL", () => ({ map: plankTex("h", "#6a4a32") })));
        door.position.set(ix + dx - Math.cos(ry) * 0.5, 0, iz + dz + Math.sin(ry) * 0.5); door.rotation.y = ry - 1.9; R.add(door); this.lhDoor = door; this.lhDoorRy = ry; // swung open by default; shot 11 opens it
        const night = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.3).translate(0, 1.15, 0), new THREE.MeshBasicMaterial({ color: "#1a2448", fog: false })); night.position.set(ix + dx * 1.6, 0, iz + dz * 1.6); night.scale.set(3, 1.6, 1); night.rotation.y = ry + Math.PI; R.add(night); }
      const gearMat = twoTone(new THREE.MeshLambertMaterial({ color: "#a87a3a" })), gearD = twoTone(new THREE.MeshLambertMaterial({ color: "#6a5030" }));
      const gear = (x: number, y: number, z: number, r: number, teeth: number, m: THREE.Material) => {
        const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.16, 32).rotateX(Math.PI / 2), m));
        for (let k = 0; k < teeth; k++) { const a = (k / teeth) * Math.PI * 2, t2 = new THREE.Mesh(new THREE.BoxGeometry(r * 0.22, r * 0.2, 0.16), m); t2.position.set(Math.cos(a) * (r + r * 0.08), Math.sin(a) * (r + r * 0.08), 0); t2.rotation.z = a; g.add(t2); }
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.18, r * 0.18, 0.3, 12).rotateX(Math.PI / 2), iron));
        for (let k = 0; k < 4; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(r * 1.6, r * 0.1, 0.18), m); sp.rotation.z = (k / 4) * Math.PI; g.add(sp); }
        g.position.set(x, y, z); g.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh) { mm.castShadow = true; mm.receiveShadow = true; } }); R.add(g); this.gears.push(g);
      };
      gear(ix - 1.4, 2.6, iz - 3.15, 1.0, 18, gearMat); gear(ix + 0.25, 3.3, iz - 3.3, 0.65, 12, gearD); gear(ix + 1.25, 2.1, iz - 3.15, 0.8, 15, gearMat); gear(ix - 0.35, 1.3, iz - 3.3, 0.45, 9, gearD); gear(ix + 0.85, 3.85, iz - 2.95, 0.4, 8, gearMat);
      // shelves of spare faces on the left wall
      for (let r2 = 0; r2 < 3; r2++) {
        const y = 1.0 + r2 * 1.05;
        b.add(uvBox(ix - Rr + 0.3, y - 0.05, iz - 2.0, ix - Rr + 0.85, y, iz + 1.6, 1), wood);
        for (let k = 0; k < 5; k++) {
          if (r2 === 1 && k === 4) { b.add(new THREE.PlaneGeometry(0.36, 0.08).rotateY(Math.PI / 2).translate(ix - Rr + 0.86, 1.0 + 1.05 + 0.04, iz - 1.7 + 4 * 0.7), lam("sLblLEO", () => ({ map: labelTex("LEO", "LEO") }))); continue; } // an empty place waiting, labelled LEO
          const z = iz - 1.7 + k * 0.7, fm = lam("sSpare" + ((r2 * 5 + k) % 4), () => ({ map: spareFace((r2 * 5 + k) % 4) }));
          b.add(new THREE.BoxGeometry(0.42, 0.42, 0.42).translate(ix - Rr + 0.56, y + 0.22, z), lam("sSkin" + ((r2 * 5 + k) % 4), () => ({ color: ["#f6c99f", "#efb98c", "#d9a074", "#a8704a"][(r2 * 5 + k) % 4] })));
          b.add(new THREE.PlaneGeometry(0.4, 0.4).rotateY(Math.PI / 2).translate(ix - Rr + 0.78, y + 0.22, z), fm);
          if (k % 2 === 0) b.add(new THREE.PlaneGeometry(0.36, 0.08).rotateY(Math.PI / 2).translate(ix - Rr + 0.86, y + 0.04, z), lam("sLbl" + k + r2, () => ({ map: labelTex("n" + k + r2, ["BAKER", "MOM", "MAILMAN", "TEACHER", "FISHER"][(k + r2) % 5]) })));
        }
      }
      b.add(uvBox(ix + 1.2, 0, iz - 1.2, ix + 3.2, 0.95, iz + 0.2, 1), wood); // bench
      b.add(new THREE.BoxGeometry(1.2, 0.02, 0.8).translate(ix + 2.2, 0.96, iz - 0.5), lam("sPlan", () => ({ map: labelTex("plan", "PLAN No.1"), color: "#d8e4f0" })));
      b.add(new THREE.CylinderGeometry(0.12, 0.16, 0.36, 10).translate(ix + 1.6, 1.13, iz - 0.9), this.lampMat);
      for (let k = 0; k < 10; k++) { const a = k * 0.62, y = 0.25 + k * 0.42; b.add(new THREE.BoxGeometry(1.1, 0.06, 0.4).rotateY(-a).translate(ix + 0.5 + Math.cos(a) * 0.6, y, iz + 2.75 + Math.sin(a) * 0.6), iron); } // spiral stair, clear of the path from the door
      b.add(new THREE.CylinderGeometry(0.08, 0.08, 4.6, 8).translate(ix + 0.5, 2.3, iz + 2.75), iron);
      const ceil = new THREE.Mesh(new THREE.CylinderGeometry(Rr + 0.3, Rr + 0.3, 0.2, 24).translate(ix, H3 + 0.1, iz), lam("sCeilL", () => ({ map: plankTex("g", "#3a2c20") }))); ceil.castShadow = false; ceil.receiveShadow = false; R.add(ceil);
      const lanternHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color(1.3, 0.85, 0.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      lanternHalo.position.set(ix + 1.6, 1.15, iz - 0.9); lanternHalo.scale.setScalar(1.6); lanternHalo.layers.set(NOINK); R.add(lanternHalo);
    }

    // ================= DETAIL PASS: signs, awnings, laundry, harbour clutter, flowers, room and lamp-room props =================
    {
      const signTex = (k: string, s: string, bg: string, fg: string) => ctex("sign" + k, 384, 128, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 384, 128); g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(8, 8, 368, 112); g.fillStyle = fg; g.font = "900 64px 'DejaVu Sans', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(s, 192, 68); });
      const awnTex = (k: string, a: string, c: string) => ctex("awn" + k, 256, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? a : c; g.fillRect(i * 32, 0, 32, 64); } g.fillStyle = "rgba(0,0,0,0.15)"; g.fillRect(0, 52, 256, 12); });
      // hanging shop signs + striped awnings on the north row (fronts at z -1.1)
      ([[-27, "BAKERY", "#f4e3c0", "#8a3a2a", "#e2453c"], [-19, "FISH", "#2f6f8a", "#f4f1ea", "#2f6f8a"], [-11, "POST", "#e2453c", "#fbf6ea", "#f2c94c"], [11, "CAFE", "#3a6a4a", "#f4e3c0", "#3a6a4a"], [19, "ROPE", "#5a4632", "#f2c94c", "#d9b38c"], [27, "BOATS", "#24365e", "#f4f1ea", "#6f9bd1"]] as const).forEach(([x, s, bg, fg, aw], i) => {
        b.add(new THREE.BoxGeometry(0.06, 0.06, 0.9).translate(x + 1.25, 3.1, -0.65), iron);
        b.add(new THREE.BoxGeometry(1.1, 0.42, 0.05).translate(x + 1.25, 2.78, -0.25), lam("sSign" + i, () => ({ map: signTex(s, s, bg, fg) })));
        const awn = new THREE.BoxGeometry(1.9, 0.06, 1.0).rotateX(0.32).translate(x, 2.6, -0.62); b.add(awn, lam("sAwn" + i, () => ({ map: awnTex("" + i, aw, "#f4f1ea") })));
        for (const sx of [-0.9, 0.9]) b.add(new THREE.BoxGeometry(0.04, 0.04, 1.0).rotateX(0.32).translate(x + sx, 2.58, -0.62), iron);
      });
      // house numbers, door pots and a wreath, mailboxes
      for (const [x, z, f] of [[-27, -1.1, 1], [-19, -1.1, 1], [-11, -1.1, 1], [11, -1.1, 1], [19, -1.1, 1], [27, -1.1, 1], [-24, 7.1, -1], [-16, 7.1, -1], [-8, 7.1, -1], [8, 7.1, -1], [16, 7.1, -1], [24, 7.1, -1]] as const) {
        b.add(new THREE.CylinderGeometry(0.2, 0.15, 0.36, 10).translate(x - 0.85, 0.18, z + f * 0.35), lam("sPot", () => ({ color: "#b8684a" })));
        b.add(new THREE.IcosahedronGeometry(0.26, 0).translate(x - 0.85, 0.5, z + f * 0.35), lam("sBush", () => ({ map: leavesReal(1), color: "#7aa86a" })));
        b.add(new THREE.BoxGeometry(0.3, 0.2, 0.03).translate(x + 0.75, 2.05, z + f * 0.07), lam("sNum" + x, () => ({ map: labelTex("num" + x, "" + Math.abs(x)) })));
      }
      for (const [x, z] of [[-17.5, 5.6], [6.4, 5.6], [-9.5, -0.2]] as const) { b.add(new THREE.BoxGeometry(0.08, 1.0, 0.08).translate(x, 0.5, z), iron); b.add(uvBox(x - 0.22, 1.0, z - 0.15, x + 0.22, 1.3, z + 0.15, 1), lam("sMailbox", () => ({ color: "#2f5f9a" }))); }
      // laundry lines across the street with shirts, socks, a towel
      for (const x of [-15, 15]) {
        const a = V(x, 5.4, -1.1), c = V(x + 1.0, 5.6, 7.1), len = a.distanceTo(c);
        b.add(new THREE.CylinderGeometry(0.015, 0.015, len, 5).applyMatrix4(new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), c.clone().sub(a).normalize()), V(1, 1, 1))), rope);
        for (let k = 0; k < 7; k++) { const u = (k + 0.7) / 8, p = a.clone().lerp(c, u), sag = 0.35 * Math.sin(Math.PI * u), col = ["#e2453c", "#f4f1ea", "#6f9bd1", "#f2c94c", "#9fd3b0", "#e7a4b4", "#f4f1ea"][k];
          const hgt = k % 3 === 1 ? 0.35 : 0.6, cl = new THREE.Mesh(new THREE.BoxGeometry(0.04, hgt, k % 3 === 1 ? 0.18 : 0.5).translate(0, -hgt / 2, 0), lam("sCloth" + k, () => ({ color: col, side: THREE.DoubleSide })));
          cl.position.set(p.x, p.y - sag, p.z); cl.castShadow = true; R.add(cl); this.laundry.push(cl); }
      }
      // harbour clutter: lobster traps, rope coils, fish crates with fish, an anchor, benches, flower barrels, oars
      const trap = lam("sTrap", () => ({ map: netTex(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: "#d8c8a0" }));
      for (const [x, z, h] of [[7.2, -8.0, 0], [7.2, -8.0, 0.55], [8.0, -8.1, 0], [-7.2, -8.1, 0], [-7.2, -8.1, 0.55]] as const) { b.add(uvBox(x - 0.35, h, z - 0.3, x + 0.35, h + 0.5, z + 0.3, 1), trap); b.add(uvBox(x - 0.36, h, z - 0.31, x + 0.36, h + 0.05, z + 0.31, 1), woodD); }
      for (const [x, z] of [[3.6, -8.3], [-3.4, -8.4], [1.0, -12.5], [3.0, -20], [1.2, -27]] as const) for (let k = 0; k < 3; k++) b.add(new THREE.TorusGeometry(0.28 - k * 0.03, 0.05, 6, 18).rotateX(Math.PI / 2).translate(x, (x > 0.9 && z < -10 ? 0.4 : 0.06) + k * 0.08, z), rope);
      const fishM = lam("sFish", () => ({ color: "#c8d4dc" }));
      for (const [x, z] of [[4.4, -7.0], [-5.6, -6.0]] as const) { b.add(uvBox(x - 0.4, 0, z - 0.3, x + 0.4, 0.35, z + 0.3, 1), wood); for (let k = 0; k < 6; k++) b.add(new THREE.SphereGeometry(0.1, 8, 6).scale(1.8, 0.6, 0.7).rotateY(k).translate(x - 0.25 + (k % 3) * 0.25, 0.38, z - 0.1 + Math.floor(k / 3) * 0.2), fishM); }
      { const ax = 1.6, az = -6.4, ir = lam("sAnchor", () => ({ color: "#3a3a46" }));
        b.add(new THREE.BoxGeometry(0.18, 1.7, 0.18).translate(ax, 0.95, az), ir); b.add(new THREE.BoxGeometry(1.1, 0.14, 0.18).translate(ax, 1.55, az), ir);
        b.add(new THREE.TorusGeometry(0.62, 0.09, 6, 16, Math.PI).rotateZ(Math.PI).translate(ax, 0.62, az), ir); b.add(new THREE.TorusGeometry(0.16, 0.05, 6, 12).translate(ax, 1.92, az), ir);
        b.add(new THREE.CylinderGeometry(0.7, 0.8, 0.12, 16).translate(ax, 0.06, az), stone); }
      for (const [x, z, yaw] of [[-10, 0.6, 0], [10, 0.6, 0], [-4.5, -6.4, 0.4]] as const) { const m = new THREE.Matrix4().compose(V(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), V(1, 1, 1));
        b.add(new THREE.BoxGeometry(1.6, 0.08, 0.45).translate(0, 0.46, 0), wood, m); b.add(new THREE.BoxGeometry(1.6, 0.4, 0.06).translate(0, 0.75, -0.2), wood, m); for (const sx of [-0.7, 0.7]) b.add(new THREE.BoxGeometry(0.08, 0.46, 0.42).translate(sx, 0.23, 0), iron, m); }
      for (const [x, z] of [[-1.0, 1.0], [3.8, 1.0], [-12.5, 6.2], [12.5, 6.2], [-24, 0.8], [24, 0.8]] as const) { b.add(new THREE.CylinderGeometry(0.35, 0.3, 0.6, 12).translate(x, 0.3, z), woodD); for (let k = 0; k < 6; k++) b.add(new THREE.IcosahedronGeometry(0.14, 0).translate(x + 0.18 * Math.cos(k), 0.7 + (k % 2) * 0.1, z + 0.18 * Math.sin(k)), lam("sFlw" + (k % 3), () => ({ color: ["#e2453c", "#f2c94c", "#e7a4b4"][k % 3] }))); b.add(new THREE.IcosahedronGeometry(0.28, 0).translate(x, 0.62, z), lam("sBush", () => ({ map: leavesReal(1), color: "#7aa86a" }))); }
      for (let k = 0; k < 2; k++) b.add(new THREE.BoxGeometry(0.08, 0.06, 2.4).rotateX(0.5).translate(-7.6 + k * 0.3, 0.9, -7.6), wood);
      // pier: crates, a ladder down to the water, lantern hooks, a sitting gull on posts
      for (const [z, s] of [[-15, 1], [-22, -1], [-29, 1]] as const) { b.add(uvBox(2 + s * 0.8 - 0.35, 0.35, z - 0.35, 2 + s * 0.8 + 0.35, 1.0, z + 0.35, 1), wood); }
      for (let k = 0; k < 6; k++) b.add(new THREE.BoxGeometry(0.5, 0.05, 0.05).translate(2 - 1.62, 0.2 - k * 0.3, -18), iron);
      for (const sx of [-0.24, 0.24]) b.add(new THREE.BoxGeometry(0.05, 1.9, 0.05).translate(2 - 1.62 + sx, -0.55, -18), iron);
      const gullM = lam("sGullW", () => ({ color: "#fbfbf8" })), gullG = lam("sGullG", () => ({ color: "#8a8e98" }));
      for (const [x, z] of [[2 - 1.5, -11.5], [2 + 1.5, -24], [-20, QUAY + 0.4], [12.4, QUAY + 0.4]] as const) { const y = x === -20 || x === 12.4 ? 0.55 : 1.3; b.add(new THREE.SphereGeometry(0.13, 8, 6).scale(1.4, 1, 1).translate(x, y, z), gullM); b.add(new THREE.SphereGeometry(0.08, 8, 6).translate(x + 0.15, y + 0.12, z), gullM); b.add(new THREE.BoxGeometry(0.22, 0.04, 0.2).translate(x - 0.04, y + 0.06, z), gullG); b.add(new THREE.ConeGeometry(0.03, 0.1, 5).rotateZ(-Math.PI / 2).translate(x + 0.26, y + 0.11, z), lam("sBeak", () => ({ color: "#f2a02c" }))); }
      // a cat on the crates
      { const cx = 5.3, cz = -7.1, cy = 0.75, ck = lam("sCat", () => ({ color: "#3a3440" }));
        b.add(uvBox(cx - 0.22, cy, cz - 0.12, cx + 0.22, cy + 0.22, cz + 0.12, 1), ck); b.add(uvBox(cx + 0.14, cy + 0.12, cz - 0.11, cx + 0.36, cy + 0.34, cz + 0.11, 1), ck);
        for (const sz of [-0.07, 0.07]) b.add(new THREE.ConeGeometry(0.04, 0.08, 4).translate(cx + 0.26, cy + 0.38, cz + sz), ck);
        this.catTail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.42, 5).translate(0, 0.21, 0), ck); this.catTail.position.set(cx - 0.2, cy + 0.12, cz); R.add(this.catTail);
        for (const sz of [-0.05, 0.05]) b.add(new THREE.BoxGeometry(0.02, 0.04, 0.04).translate(cx + 0.365, cy + 0.26, cz + sz), lam("sCatEye", () => ({ color: "#e8d84a" }))); }
      // bunting (day) and string lights (night) across the street
      for (const [x0, x1, z, y] of [[-30, 30, -0.3, 4.9]] as const) for (let i = 0; i < 40; i++) {
        const u = i / 39, x = x0 + (x1 - x0) * u, yy = y - 0.9 * Math.sin(Math.PI * ((u * 3) % 1));
        const fl = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 3).rotateX(Math.PI).translate(0, -0.2, 0), lam("sBunt" + (i % 5), () => ({ color: ["#e2453c", "#f2c94c", "#3f6fb5", "#f4f1ea", "#2f8a4f"][i % 5] })));
        fl.position.set(x, yy, z); this.bunting.add(fl);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), this.bulbMat); bulb.position.set(x + 0.4, yy - 0.05, z); this.lights.add(bulb);
        if (i % 3 === 0) { const hs = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color(1.2, 0.85, 0.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); hs.position.copy(bulb.position); hs.scale.setScalar(0.9); hs.layers.set(NOINK); this.lights.add(hs); }
      }
      R.add(this.bunting, this.lights);
      for (const [x, y, z] of [[-27 + 1.45, 9.6, -6], [-11 + 1.45, 9.6, -6], [19 + 1.45, 9.6, -6], [-16 - 1.5, 9.6, 12], [8 - 1.5, 9.6, 12], [24 - 1.5, 9.6, 12]] as const)
        for (let k = 0; k < 5; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color(0.85, 0.85, 0.9), transparent: true, opacity: 0.5, depthWrite: false })); sp.layers.set(NOINK); sp.userData = { x, y, z, k }; this.smoke.add(sp); }
      R.add(this.smoke);
      const tc = new THREE.Mesh(new THREE.ConeGeometry(1.4, 7, 24, 1, true).translate(0, -3.5, 0), new THREE.MeshBasicMaterial({ map: beamTex(), color: new THREE.Color(1.0, 0.95, 0.75), transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
      tc.layers.set(NOINK); this.torch.add(tc);
      const tg = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color(2.0, 1.8, 1.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); tg.scale.setScalar(0.28); tg.layers.set(NOINK); this.torch.add(tg);
      R.add(this.torch);
      for (let x = -56; x <= 56; x += 4) { const f = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: softTex(), color: new THREE.Color(0.9, 0.95, 1), transparent: true, opacity: 0.4, depthWrite: false })); f.position.set(x, SEA_Y + 0.03, QUAY - 1.1); f.layers.set(NOINK); this.foams.push(f); R.add(f); }
      // ---- bedroom extras: desk + chair with the denim jacket, bookshelf, alarm clock, slippers, a photo, a guitar, a toy boat
      const [rx, , rz] = ROOM, [bx, , bz] = BED;
      b.add(uvBox(rx - 2.9, 0.75, rz + 1.3, rx - 1.6, 0.8, rz + 2.4, 1), wood); for (const [dx, dz] of [[-2.85, 1.35], [-1.65, 1.35], [-2.85, 2.35], [-1.65, 2.35]]) b.add(new THREE.BoxGeometry(0.06, 0.75, 0.06).translate(rx + dx, 0.375, rz + dz), woodD);
      b.add(uvBox(rx - 1.5, 0.45, rz + 1.6, rx - 1.05, 0.5, rz + 2.05, 1), woodD); b.add(uvBox(rx - 1.1, 0.5, rz + 1.6, rx - 1.05, 1.05, rz + 2.05, 1), woodD);
      b.add(uvBox(rx - 1.13, 0.55, rz + 1.62, rx - 1.0, 1.05, rz + 2.03, 1), lam("sJacketChair", () => ({ color: "#3f7fd6" })));
      b.add(new THREE.CylinderGeometry(0.06, 0.1, 0.05, 10).translate(rx - 2.6, 0.83, rz + 1.5), iron); b.add(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6).rotateZ(0.3).translate(rx - 2.55, 1.02, rz + 1.5), iron); b.add(new THREE.ConeGeometry(0.12, 0.14, 12, 1, true).rotateZ(2.4).translate(rx - 2.43, 1.2, rz + 1.5), lam("sDeskLamp", () => ({ color: "#e2453c", side: THREE.DoubleSide })));
      for (let k = 0; k < 6; k++) b.add(new THREE.BoxGeometry(0.22, 0.03, 0.3).translate(rx - 2.2, 0.82 + k * 0.03, rz + 2.0), lam("sPaper" + (k % 2), () => ({ color: k % 2 ? "#f4f1ea" : "#e8dcc0" })));
      b.add(uvBox(rx + 2.4, 0, rz + 0.4, rx + 2.95, 1.9, rz + 1.6, 1), woodD);
      for (let s2 = 0; s2 < 4; s2++) { b.add(uvBox(rx + 2.42, 0.1 + s2 * 0.45, rz + 0.42, rx + 2.93, 0.13 + s2 * 0.45, rz + 1.58, 1), wood); for (let k = 0; k < 7; k++) b.add(new THREE.BoxGeometry(0.3, 0.26 + (k % 3) * 0.04, 0.07).translate(rx + 2.7, 0.27 + s2 * 0.45 + (k % 3) * 0.02, rz + 0.55 + k * 0.14), lam("sBk" + ((k + s2) % 5), () => ({ color: ["#c8302c", "#2f6f8a", "#f2c94c", "#3a6a4a", "#8a4ab0"][(k + s2) % 5] }))); }
      b.add(uvBox(bx + 1.0, 0.6, bz - 0.98, bx + 1.2, 0.74, bz - 0.9, 1), lam("sClock", () => ({ color: "#e2453c" })));
      for (const sx of [-0.12, 0.12]) b.add(uvBox(bx + 0.95 + sx - 0.07, 0, bz + 1.25, bx + 0.95 + sx + 0.07, 0.06, bz + 1.5, 1), lam("sSlipper", () => ({ color: "#8a3a3a" })));
      b.add(new THREE.PlaneGeometry(0.34, 0.26).rotateY(-Math.PI / 2).translate(rx + 2.99, 1.6, rz - 1.2), lam("sPhoto", () => ({ map: labelTex("photo", "MOM & ME") })));
      { const gx = rx + 2.6, gz = rz - 1.9, gm = lam("sGuitar", () => ({ color: "#b8742a" })); b.add(new THREE.SphereGeometry(0.22, 12, 8).scale(1, 1.15, 0.35).translate(gx, 0.3, gz), gm); b.add(new THREE.SphereGeometry(0.17, 12, 8).scale(1, 1, 0.35).translate(gx, 0.62, gz), gm); b.add(new THREE.BoxGeometry(0.07, 0.65, 0.05).translate(gx, 1.05, gz), woodD); }
      // ---- lamp room extras: tool rack, hanging chains, oil cans, a barrel, pipes, a hanging lantern
      const [ix, , iz] = LHIN;
      b.add(uvBox(ix + 2.4, 1.2, iz - 2.9, ix + 3.4, 2.4, iz - 2.84, 1), woodD);
      for (let k = 0; k < 5; k++) b.add(new THREE.BoxGeometry(0.06, 0.5 + (k % 2) * 0.2, 0.04).rotateZ(0.1 * (k - 2)).translate(ix + 2.55 + k * 0.2, 1.75, iz - 2.8), iron);
      for (let k = 0; k < 3; k++) for (let j = 0; j < 12; j++) b.add(new THREE.TorusGeometry(0.05, 0.015, 4, 8).rotateY(j % 2 ? Math.PI / 2 : 0).translate(ix - 0.6 + k * 0.9, 4.5 - j * 0.09, iz - 1.6), iron);
      for (let k = 0; k < 3; k++) b.add(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 10).translate(ix + 3.0 + (k % 2) * 0.25, 0.15, iz + 0.6 + k * 0.25), lam("sOil", () => ({ color: "#c8a23a" })));
      b.add(new THREE.CylinderGeometry(0.4, 0.4, 0.9, 14).translate(ix - 2.6, 0.45, iz + 2.2), woodD);
      b.add(new THREE.CylinderGeometry(0.08, 0.08, 4.6, 8).translate(ix + 3.6, 2.3, iz - 1.2), lam("sPipe", () => ({ color: "#8a5a34" }))); b.add(new THREE.CylinderGeometry(0.08, 0.08, 2.0, 8).rotateZ(Math.PI / 2).translate(ix + 2.6, 3.8, iz - 1.2), lam("sPipe", () => ({ color: "#8a5a34" })));
      b.add(new THREE.CylinderGeometry(0.01, 0.01, 0.8, 4).translate(ix + 0.2, 4.2, iz + 0.5), iron); b.add(uvBox(ix + 0.08, 3.5, iz + 0.38, ix + 0.32, 3.8, iz + 0.62, 1), this.lampMat);
      const lh2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color(1.2, 0.8, 0.35), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); lh2.position.set(ix + 0.2, 3.65, iz + 0.5); lh2.scale.setScalar(1.6); lh2.layers.set(NOINK); R.add(lh2);
    }
    b.build(R);
  }
  private moonPool!: THREE.Mesh;

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
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], night = s.light === "night";
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.08; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(night ? "#5a70b0" : "#9cc4ff"); this.hemi.groundColor.set(night ? "#1a2030" : "#6a8a4a"); this.hemi.intensity = night ? 1.1 : 2.1;
    this.sun.color.set(night ? "#9ab4ff" : "#ffe6c0"); this.sun.intensity = night ? 1.9 : 4.7; this.sun.shadow.radius = 4; this.sun.shadow.blurSamples = 12;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (dist > 30) Rr = Math.max(Rr, 70);
    this.sun.position.copy(focus).addScaledVector(sunDir, 260); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 560; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    const SKY = night ? ["#2c3c6a", "#1e2c58", "#142048", "#0c163a", "#060c26"] : ["#c8e4f6", "#9ccff2", "#6ab4ec", "#4294e2", "#2a74d6"];
    SKY.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((dg) => THREE.MathUtils.degToRad(dg));
    su.e.value.set(e[1], e[2], e[3], e[4]); su.stars.value = night ? 1 : 0;
    this.sky.position.copy(cam.position);
    untone(night ? "#26345a" : "#bcdaf2", this.fog.color); this.fog.near = night ? 12 : 80; this.fog.far = night ? 140 : 560;
    const clear = CLEAR_SHOTS.includes(id);
    scene.fog = clear ? null : this.fog; scene.background = null; this.sun.castShadow = !clear;
    // moon high over the sea (north-west), its glint on the water
    const moonDir = V(-0.35, 0.42, -0.84).normalize();
    this.moon.visible = night; this.moon.position.copy(cam.position).addScaledVector(moonDir, 900); this.moon.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(2.4)));
    this.moonGlint.visible = night; this.moonGlint.position.set(cam.position.x + moonDir.x * 120, SEA_Y + 0.05, cam.position.z + moonDir.z * 120); this.moonGlint.scale.set(18, 1, 150); this.moonGlint.rotation.y = Math.atan2(moonDir.x, moonDir.z);
    for (let i = 0; i < this.clouds.length; i++) { const m = this.clouds[i]; m.visible = !night || i % 3 === 0; m.lookAt(cam.position.x, m.position.y, cam.position.z); (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4]; }
    // night: windows glow, lamps on, beam turns, fog cards; day: gulls
    this.winMat.color.set(night ? new THREE.Color(2.4, 1.45, 0.55) : new THREE.Color("#4a6f8e"));
    this.leoWin.color.set(night ? new THREE.Color(0.16, 0.2, 0.34) : new THREE.Color("#4a6f8e"));
    this.lampMat.color.set(night ? new THREE.Color(3.2 * (1 + 0.06 * Math.sin(t * 13)), 2.2 * (1 + 0.06 * Math.sin(t * 13)), 1.0) : new THREE.Color("#e9dca6"));
    this.glassLH.color.set(night ? new THREE.Color(3.4, 3.0, 1.9) : new THREE.Color("#cfe6f0"));
    this.seaMat.color.set(night ? "#3a5a8a" : "#3aa0c8");
    (this.seaMat.map as THREE.Texture).offset.set(t * 0.01, t * 0.004);
    this.glows.visible = night; this.fogCards.visible = night && !NO_FOGCARDS.includes(id); this.beam.visible = night; this.moonPool.visible = night; this.gulls.visible = !night;
    this.beam.rotation.y = t * 0.9 + id;
    this.fogCards.children.forEach((m, i) => { m.lookAt(cam.position.x, m.position.y, cam.position.z); m.position.x += 0; (m as THREE.Mesh).position.y = 0.8 + (i % 3) * 0.5 + 0.1 * Math.sin(t * 0.4 + i); });
    this.gulls.children.forEach((g, i) => { g.position.x = -20 + ((t * 2.2 + i * 6) % 44); g.rotation.z = 0.35 * Math.sin(t * 9 + i); });
    this.gears.forEach((g, i) => { g.rotation.z = t * (i % 2 ? -0.5 : 0.35) * (1 + i * 0.2); });
    // swell: boats bob and roll, foam breathes; laundry and bunting sway in the sea wind; chimney smoke rises (day); bulbs and lamps flicker (night)
    this.boats.forEach((g, i) => { g.position.y = SEA_Y + 0.15 + 0.12 * Math.sin(t * 1.3 + i * 1.7); g.rotation.z = 0.05 * Math.sin(t * 1.1 + i); g.rotation.x = 0.03 * Math.sin(t * 0.9 + i * 2); });
    this.foams.forEach((f, i) => { (f.material as THREE.MeshBasicMaterial).opacity = (night ? 0.18 : 0.35) * (0.7 + 0.3 * Math.sin(t * 1.6 + i * 0.7)); });
    this.laundry.forEach((cl, i) => { cl.rotation.x = 0.28 * Math.sin(t * 2.3 + i * 0.9) + 0.15; cl.rotation.z = 0.08 * Math.sin(t * 1.7 + i); });
    this.bunting.visible = !night; this.lights.visible = night;
    this.bunting.children.forEach((fl, i) => { fl.rotation.x = 0.35 * Math.sin(t * 3.1 + i * 0.6); });
    this.smoke.visible = !night;
    this.smoke.children.forEach((sp) => { const { x, y, z, k } = sp.userData as { x: number; y: number; z: number; k: number }; const ph = ((t * 0.35 + k / 5) % 1); sp.position.set(x + ph * 1.6, y + ph * 3.2, z); sp.scale.setScalar(0.7 + ph * 2.2); (sp as THREE.Sprite).material.opacity = 0.45 * (1 - ph); });
    if (this.catTail) this.catTail.rotation.z = 0.9 + 0.5 * Math.sin(t * 2.4);
    const flick = night ? 1 + 0.08 * Math.sin(t * 17) * Math.sin(t * 7.3) : 1;
    this.bulbMat.color.set(night ? new THREE.Color(3.0 * flick, 2.1 * flick, 0.9) : new THREE.Color("#f6e7a6"));
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    if (this.lhDoor) this.lhDoor.rotation.y = this.lhDoorRy - 1.9 * (st.door ?? 1);
    this.torch.visible = !!st.torch;
    if (st.torch) { const [px2, py2, pz2] = st.torch.p, d = V(...st.torch.dir).normalize(); this.torch.position.set(px2, py2, pz2); this.torch.quaternion.setFromUnitVectors(V(0, -1, 0), d); }
    let ai = 0, ri = 0;
    for (const q of st.places) {
      const sc2 = q.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(q.x, q.y + 1.1 * sc2, q.z), 3.5 * Math.max(sc2, 0.3)))) continue;
      if (q.rig) {
        while (this.rigs.length <= ri) this.rigs.push(new Blocky(this.root));
        const r = this.rigs[ri++];
        r.set(q.rig, t);
        r.root.position.set(q.x, q.y, q.z);
        const yaw = q.yaw ?? Math.atan2(cam.position.x - q.x, cam.position.z - q.z);
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
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    for (let i = ri; i < this.rigs.length; i++) this.rigs[i].hide();
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
    void smooth; void clamp01; void LEO_HOUSE;
    return focus;
  }
}
export { smooth };
export type { V3 };
