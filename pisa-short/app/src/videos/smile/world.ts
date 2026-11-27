// "Everyone Is Smiling": a fishing town on the rocks by the sea. Pastel wooden houses along one street, a plaza
// open to the harbour, a stone quay, a long wooden pier with lamps, boats and nets, stilt houses over the water,
// and the striped lighthouse on its rock across the bay (its beam sweeps at night). Two interior sets far off the
// map: the hero's bedroom (window wall facing -z, a night backdrop behind it) and the lamp room inside the
// lighthouse (gears and shelves of spare smiling faces). Lit by "day" or "night" per shot (moon, fog, warm windows).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit } from "./build";
import { cloudHD, ctex } from "./paint";
import { grassReal, sidingReal, brickReal, shingleReal, barkReal, leavesReal } from "./noonpaint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { Blocky } from "./blocky";
import {
  FPS, SHOTS, camAt, ShotDef, V3, SUN_SHOT, SEA_Y, QUAY, PIER, LH, LH_BASE, LH_H, LAMP_Y, LEO_HOUSE, LEO_WIN, ROOM, BED, RWIN, LHIN, smooth, clamp01,
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
      const m = new THREE.Matrix4().compose(V(x, SEA_Y + 0.15, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0.04 * Math.sin(k))), V(1, 1, 1));
      const hull = new THREE.CylinderGeometry(1.0, 0.7, 4.6, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).scale(1, 0.8, 1).translate(0, 0.55, 0);
      b.add(hull, lam("sHull" + k, () => ({ color: col, side: THREE.DoubleSide })), m);
      b.add(new THREE.BoxGeometry(1.9, 0.1, 4.4).translate(0, 0.52, 0), wood, m);
      b.add(uvBox(-0.6, 0.55, -0.4, 0.6, 1.6, 0.9, 1), white, m);
      b.add(new THREE.BoxGeometry(1.4, 0.1, 1.5).translate(0, 1.65, 0.25), red, m);
      b.add(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6).translate(0, 2.1, -1.3), woodD, m);
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
      const back = new THREE.Mesh(new THREE.PlaneGeometry(26, 13).translate(wx, 3.2, z0 - 7), new THREE.MeshBasicMaterial({ map: nightBackdrop(), fog: false })); back.layers.set(NOINK); R.add(back);
      b.add(uvBox(wx - 4, -0.2, z0 - 7, wx + 4, -0.05, z0, 1), cob);
      // bed: frame, mattress, pillow, blanket; nightstand, lamp, books, ship model, poster, rug, chair with the raincoat
      const [bx, , bz] = BED;
      b.add(uvBox(bx - 0.78, 0, bz - 1.15, bx + 0.78, 0.35, bz + 1.1, 1), lam("sBedF", () => ({ map: plankTex("d", "#6a4a32") })));
      b.add(uvBox(bx - 0.8, 0, bz - 1.25, bx + 0.8, 1.0, bz - 1.13, 1), lam("sBedF", () => ({ map: plankTex("d", "#6a4a32") })));
      b.add(uvBox(bx - 0.74, 0.35, bz - 1.1, bx + 0.74, 0.55, bz + 1.05, 1), lam("sMatt", () => ({ color: "#e8e4dc" })));
      b.add(new THREE.BoxGeometry(0.8, 0.08, 0.6).translate(bx, 0.59, bz - 0.72), lam("sPillow", () => ({ color: "#f4f1ea" })));
      b.add(uvBox(bx - 0.8, 0.55, bz - 0.36, bx + 0.8, 1.04, bz + 1.08, 1), lam("sBlanket", () => ({ map: plankTex("e", "#3f5f9a"), color: "#9fb4e0" })));
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
      for (let k = 0; k < 16; k++) { const a = Math.PI + (k / 16) * Math.PI * 1.15 - 0.2; if (Math.cos(a) * 0 + Math.sin(a) > 0.55) continue; b.add(new THREE.BoxGeometry(1.75, H3, 0.3).rotateY(-a + Math.PI / 2).translate(ix + Math.cos(a) * Rr, H3 / 2, iz + Math.sin(a) * Rr), lam("sLHWall", () => ({ map: brickReal(), color: "#9a8a7a" }))); }
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
          const z = iz - 1.7 + k * 0.7, fm = lam("sSpare" + ((r2 * 5 + k) % 4), () => ({ map: spareFace((r2 * 5 + k) % 4) }));
          b.add(new THREE.BoxGeometry(0.42, 0.42, 0.42).translate(ix - Rr + 0.56, y + 0.22, z), lam("sSkin" + ((r2 * 5 + k) % 4), () => ({ color: ["#f6c99f", "#efb98c", "#d9a074", "#a8704a"][(r2 * 5 + k) % 4] })));
          b.add(new THREE.PlaneGeometry(0.4, 0.4).rotateY(Math.PI / 2).translate(ix - Rr + 0.78, y + 0.22, z), fm);
          if (k % 2 === 0) b.add(new THREE.PlaneGeometry(0.36, 0.08).rotateY(Math.PI / 2).translate(ix - Rr + 0.86, y + 0.04, z), lam("sLbl" + k + r2, () => ({ map: labelTex("n" + k + r2, ["BAKER", "MOM", "MAILMAN", "TEACHER", "FISHER"][(k + r2) % 5]) })));
        }
      }
      b.add(uvBox(ix + 1.2, 0, iz - 1.2, ix + 3.2, 0.95, iz + 0.2, 1), wood); // bench
      b.add(new THREE.BoxGeometry(1.2, 0.02, 0.8).translate(ix + 2.2, 0.96, iz - 0.5), lam("sPlan", () => ({ map: labelTex("plan", "PLAN No.1"), color: "#d8e4f0" })));
      b.add(new THREE.CylinderGeometry(0.12, 0.16, 0.36, 10).translate(ix + 1.6, 1.13, iz - 0.9), this.lampMat);
      for (let k = 0; k < 10; k++) { const a = k * 0.62, y = 0.25 + k * 0.42; b.add(new THREE.BoxGeometry(1.1, 0.06, 0.4).rotateY(-a).translate(ix + 2.3 + Math.cos(a) * 0.6, y, iz + 2.0 + Math.sin(a) * 0.6), iron); }
      b.add(new THREE.CylinderGeometry(0.08, 0.08, 4.6, 8).translate(ix + 2.3, 2.3, iz + 2.0), iron);
      const ceil = new THREE.Mesh(new THREE.CylinderGeometry(Rr + 0.3, Rr + 0.3, 0.2, 24).translate(ix, H3 + 0.1, iz), lam("sCeilL", () => ({ map: plankTex("g", "#3a2c20") }))); ceil.castShadow = false; ceil.receiveShadow = false; R.add(ceil);
      const lanternHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color(1.3, 0.85, 0.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      lanternHalo.position.set(ix + 1.6, 1.15, iz - 0.9); lanternHalo.scale.setScalar(1.6); lanternHalo.layers.set(NOINK); R.add(lanternHalo);
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
    scene.fog = this.fog; scene.background = null;
    // moon high over the sea (north-west), its glint on the water
    const moonDir = V(-0.35, 0.42, -0.84).normalize();
    this.moon.visible = night; this.moon.position.copy(cam.position).addScaledVector(moonDir, 900); this.moon.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(2.4)));
    this.moonGlint.visible = night; this.moonGlint.position.set(cam.position.x + moonDir.x * 120, SEA_Y + 0.05, cam.position.z + moonDir.z * 120); this.moonGlint.scale.set(18, 1, 150); this.moonGlint.rotation.y = Math.atan2(moonDir.x, moonDir.z);
    for (let i = 0; i < this.clouds.length; i++) { const m = this.clouds[i]; m.visible = !night || i % 3 === 0; m.lookAt(cam.position.x, m.position.y, cam.position.z); (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4]; }
    // night: windows glow, lamps on, beam turns, fog cards; day: gulls
    this.winMat.color.set(night ? new THREE.Color(2.4, 1.45, 0.55) : new THREE.Color("#4a6f8e"));
    this.leoWin.color.set(night ? new THREE.Color(0.16, 0.2, 0.34) : new THREE.Color("#4a6f8e"));
    this.lampMat.color.set(night ? new THREE.Color(3.2, 2.2, 1.0) : new THREE.Color("#e9dca6"));
    this.glassLH.color.set(night ? new THREE.Color(3.4, 3.0, 1.9) : new THREE.Color("#cfe6f0"));
    this.seaMat.color.set(night ? "#3a5a8a" : "#3aa0c8");
    (this.seaMat.map as THREE.Texture).offset.set(t * 0.01, t * 0.004);
    this.glows.visible = night; this.fogCards.visible = night; this.beam.visible = night; this.moonPool.visible = night; this.gulls.visible = !night;
    this.beam.rotation.y = t * 0.9 + id;
    this.fogCards.children.forEach((m, i) => { m.lookAt(cam.position.x, m.position.y, cam.position.z); m.position.x += 0; (m as THREE.Mesh).position.y = 0.8 + (i % 3) * 0.5 + 0.1 * Math.sin(t * 0.4 + i); });
    this.gulls.children.forEach((g, i) => { g.position.x = -20 + ((t * 2.2 + i * 6) % 44); g.rotation.z = 0.35 * Math.sin(t * 9 + i); });
    this.gears.forEach((g, i) => { g.rotation.z = t * (i % 2 ? -0.5 : 0.35) * (1 + i * 0.2); });
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
