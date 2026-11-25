// Blocky 3D characters (our own, in the toy-brick avatar style): box torso, box arms and legs on shoulder/hip pivots,
// a rounded block head with a painted face (expression + blink), hair / cap / bonnet / beard pieces and a skirt.
// Posed per frame from the same options the 2D cards used (mode, expr, blink, wave, prop, tilt, walk phase).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { twoTone } from "./shade";

// metres for a 1.9 m adult (scaled by the place's scale)
const LEG = { w: 0.34, h: 0.7, d: 0.34 }, TOR = { w: 0.7, h: 0.7, d: 0.36 }, ARM = { w: 0.34, h: 0.7, d: 0.34 }, HEAD = 0.56;
const HIP_Y = LEG.h, SH_Y = LEG.h + TOR.h - 0.06, NECK_Y = LEG.h + TOR.h;

const mats = new Map<string, THREE.Material>();
const mat = (col: string) => {
  let m = mats.get(col);
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ color: col })); mats.set(col, m); }
  return m;
};
const cloth = new Map<string, THREE.Material>();
/** clothing: plaid shirt, striped tee, tank top over a white tee, plain tee, or denim, picked from the colour */
const clothMat = (col: string, kind: "shirt" | "pants") => {
  const h = parseInt(col.slice(1), 16), style = kind === "pants" ? (h % 3 === 0 ? "plain" : "denim") : ["plaid", "stripe", "tank", "plain", "plaid"][h % 5];
  const key = col + kind + style;
  let m = cloth.get(key);
  if (m) return m;
  const cv = document.createElement("canvas"); cv.width = cv.height = 256; const g = cv.getContext("2d")!;
  const c = new THREE.Color(col), dark = "#" + c.clone().multiplyScalar(0.62).getHexString(), light = "#" + c.clone().lerp(new THREE.Color("#ffffff"), 0.35).getHexString();
  g.fillStyle = col; g.fillRect(0, 0, 256, 256);
  if (style === "plaid") { g.globalAlpha = 0.45; g.fillStyle = dark; for (let i = 0; i < 256; i += 64) { g.fillRect(i, 0, 26, 256); g.fillRect(0, i, 256, 26); } g.globalAlpha = 0.35; g.fillStyle = light; for (let i = 32; i < 256; i += 64) { g.fillRect(i, 0, 6, 256); g.fillRect(0, i, 256, 6); } g.globalAlpha = 1; }
  else if (style === "stripe") { g.fillStyle = light; for (let i = 0; i < 256; i += 40) g.fillRect(0, i, 256, 16); }
  else if (style === "tank") { g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 256, 256); g.fillStyle = col; g.beginPath(); g.moveTo(40, 0); g.lineTo(80, 0); g.quadraticCurveTo(128, 70, 176, 0); g.lineTo(216, 0); g.lineTo(230, 256); g.lineTo(26, 256); g.closePath(); g.fill(); }
  else if (style === "denim") { g.fillStyle = "#3d5a8a"; g.fillRect(0, 0, 256, 256); for (let k = 0; k < 3000; k++) { g.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 5); } g.strokeStyle = "rgba(230,190,120,0.6)"; g.setLineDash([6, 5]); g.lineWidth = 3; g.strokeRect(10, 10, 236, 236); }
  for (let k = 0; k < 1500; k++) { g.fillStyle = k % 2 ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)"; g.fillRect((k * 37) % 256, (k * 91) % 256, 2, 2); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  m = twoTone(new THREE.MeshLambertMaterial({ map: tex })); cloth.set(key, m); return m;
};
const faces = new Map<string, THREE.Material>();
/** painted face for a skin, expression and eyelid (0 open .. 1 shut) */
const faceMat = (skin: string, expr: Expr, lid: number, moustache?: string, look = 0) => {
  const lk = Math.round(Math.max(-1, Math.min(1, look)) * 2) / 2; // pupils: -1 left .. 1 right, half steps
  const key = `${skin}|${expr}|${lid > 0.6 ? 1 : lid > 0.2 ? 0.5 : 0}|${moustache ?? ""}|${lk}`;
  let m = faces.get(key);
  if (m) return m;
  const cv = document.createElement("canvas"); cv.width = cv.height = 256;
  const g = cv.getContext("2d")!, INK = "#241726";
  g.fillStyle = skin; g.fillRect(0, 0, 256, 256);
  g.fillStyle = INK; g.strokeStyle = INK; g.lineCap = "round"; g.lineJoin = "round";
  const eye = (x: number) => {
    const shut = lid > 0.6, half = lid > 0.2 && !shut;
    if (expr === "shout") { g.lineWidth = 10; const d = x < 128 ? 1 : -1; g.beginPath(); g.moveTo(x - 16 * d, 86); g.lineTo(x + 14 * d, 102); g.lineTo(x - 16 * d, 116); g.stroke(); return; }
    if (expr === "cry") { g.lineWidth = 9; g.beginPath(); g.arc(x, 92, 16, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); g.fillStyle = "#7cc8ff"; g.globalAlpha = 0.9; g.fillRect(x - 9, 112, 18, 130); g.globalAlpha = 1; g.fillStyle = INK; return; }
    if (shut || expr === "laugh" || expr === "relief") { g.lineWidth = 9; g.beginPath(); g.arc(x, expr === "laugh" ? 112 : 104, 16, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); return; }
    if (expr === "shock") { g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(x, 100, 22, 26, 0, 0, 7); g.fill(); g.lineWidth = 6; g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(x, 102, 9, 0, 7); g.fill(); return; }
    if (expr === "grin" || expr === "relief_open") { g.lineWidth = 9; g.beginPath(); g.arc(x, 108, 15, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); return; }
    const wide = expr === "nervous";
    if (wide) { g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(x, 100, 17, 21, 0, 0, 7); g.fill(); g.lineWidth = 5; g.stroke(); g.fillStyle = INK; }
    const px = x + lk * (wide ? 7 : 5);
    g.beginPath(); g.ellipse(px, 100, wide ? 8 : 11, half ? 6 : wide ? 10 : 15, 0, 0, 7); g.fill();
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(px + 4, 94, 4, 0, 7); g.fill(); g.fillStyle = INK;
    if (half) { g.fillStyle = skin; g.fillRect(x - 20, 76, 40, 18); g.fillStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(x - 16, 94); g.lineTo(x + 16, 94); g.stroke(); }
  };
  eye(88); eye(168);
  // brows
  g.lineWidth = 8;
  const brow = (x: number, s: number) => {
    const tilt = expr === "stern" || expr === "shout" ? 12 * s : expr === "nervous" || expr === "cry" ? -12 * s : expr === "shock" ? -4 * s : 0;
    const y = expr === "shock" ? 58 : 70; g.beginPath(); g.moveTo(x - 18, y - tilt); g.lineTo(x + 18, y + tilt); g.stroke();
  };
  brow(88, 1); brow(168, -1);
  // mouth
  g.lineWidth = 9;
  const cx = 128, cy = 178;
  if (expr === "shout") {
    g.fillStyle = "#5a1e28"; g.beginPath(); g.ellipse(cx, cy + 8, 46, 36, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#ffffff"; g.fillRect(cx - 30, cy - 26, 60, 10); g.fillStyle = "#e86e78"; g.beginPath(); g.ellipse(cx, cy + 28, 22, 10, 0, 0, 7); g.fill();
  } else if (expr === "cry") {
    g.fillStyle = "#5a1e28"; g.beginPath(); g.moveTo(cx - 38, cy + 20); for (let i = 0; i <= 8; i++) g.lineTo(cx - 38 + i * 9.5, cy - 4 + (i % 2 ? -6 : 4)); g.lineTo(cx + 38, cy + 20); g.quadraticCurveTo(cx, cy + 34, cx - 38, cy + 20); g.closePath(); g.fill(); g.stroke();
  } else if (expr === "laugh" || expr === "relief_open") {
    g.fillStyle = "#5a1e28"; g.beginPath(); g.moveTo(cx - 44, cy - 14); g.quadraticCurveTo(cx, cy + 60, cx + 44, cy - 14); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#e86e78"; g.beginPath(); g.ellipse(cx, cy + 16, 18, 9, 0, 0, 7); g.fill();
  } else if (expr === "shock") {
    g.fillStyle = "#5a1e28"; g.beginPath(); g.ellipse(cx, cy + 4, 18, 24, 0, 0, 7); g.fill(); g.stroke();
  } else if (expr === "grin") {
    g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(cx - 40, cy - 8); g.quadraticCurveTo(cx, cy + 40, cx + 40, cy - 8); g.closePath(); g.fill(); g.stroke();
  } else if (expr === "nervous") {
    g.beginPath(); for (let i = 0; i <= 8; i++) g[i ? "lineTo" : "moveTo"](cx - 36 + i * 9, cy + (i % 2 ? -6 : 6)); g.stroke();
    g.fillStyle = "#9fd4ff"; g.beginPath(); g.ellipse(208, 70, 9, 14, 0, 0, 7); g.fill();
  } else if (expr === "stern" || expr === "pained") {
    g.beginPath(); g.moveTo(cx - 28, cy + 8); g.quadraticCurveTo(cx, cy - 10, cx + 28, cy + 8); g.stroke();
  } else if (expr === "neutral" || expr === "dazed") {
    g.beginPath(); g.moveTo(cx - 22, cy); g.lineTo(cx + 22, cy); g.stroke();
  } else { // smile, smile_closed, relief
    g.beginPath(); g.arc(cx, cy - 22, 32, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
  }
  if (moustache) { g.fillStyle = moustache; g.beginPath(); g.ellipse(cx - 22, cy - 22, 24, 10, 0.2, 0, 7); g.ellipse(cx + 22, cy - 22, 24, 10, -0.2, 0, 7); g.fill(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  m = twoTone(new THREE.MeshLambertMaterial({ map: tex }));
  faces.set(key, m);
  return m;
};

const box = (w: number, h: number, d: number, r = 0.05) => new RoundedBoxGeometry(w, h, d, 3, r);
const GEO = {
  leg: box(LEG.w, LEG.h, LEG.d, 0.06).translate(0, -LEG.h / 2, 0),
  arm: box(ARM.w, ARM.h, ARM.d, 0.07).translate(0, -ARM.h / 2 + 0.06, 0),
  torso: box(TOR.w, TOR.h, TOR.d, 0.06).translate(0, TOR.h / 2, 0),
  head: box(HEAD, HEAD, HEAD, 0.12).translate(0, HEAD / 2 + 0.04, 0),
  face: new THREE.PlaneGeometry(HEAD * 0.9, HEAD * 0.9).translate(0, HEAD / 2 + 0.04, HEAD / 2 + 0.003),
  hair: box(HEAD + 0.06, HEAD * 0.32, HEAD + 0.06, 0.08).translate(0, HEAD + 0.02, -0.01),
  spike: new THREE.ConeGeometry(0.11, 0.26, 5),
  hairBack: box(HEAD + 0.06, HEAD * 0.7, 0.12, 0.05).translate(0, HEAD * 0.62, -HEAD / 2 - 0.02),
  cap: box(HEAD + 0.05, HEAD * 0.26, HEAD + 0.05, 0.08).translate(0, HEAD + 0.06, 0),
  brim: box(HEAD * 0.9, 0.05, HEAD * 0.45, 0.02).translate(0, HEAD - 0.04, HEAD * 0.55),
  bonnet: box(HEAD + 0.14, HEAD + 0.12, HEAD * 0.75, 0.12).translate(0, HEAD / 2 + 0.08, -HEAD * 0.2),
  beard: box(HEAD * 0.8, HEAD * 0.55, 0.12, 0.05).translate(0, 0.05, HEAD / 2 + 0.03),
  skirt: new THREE.CylinderGeometry(TOR.w * 0.62, TOR.w * 0.95, 0.5, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.62).translate(0, -0.22, 0),
  topHat: new THREE.CylinderGeometry(0.21, 0.21, 0.44, 20).translate(0, HEAD + 0.27, 0),
  topBrim: new THREE.CylinderGeometry(0.36, 0.36, 0.04, 24).translate(0, HEAD + 0.06, 0),
  topBand: new THREE.CylinderGeometry(0.215, 0.215, 0.09, 20).translate(0, HEAD + 0.12, 0),
  sash: new THREE.BoxGeometry(0.16, TOR.h * 1.25, TOR.d + 0.03).rotateZ(0.72).translate(0, TOR.h / 2, 0),
  shoe: box(LEG.w + 0.02, 0.12, LEG.d + 0.1, 0.04).translate(0, -LEG.h + 0.06, 0.04),
};

export type RigOpts = { o: Outfit; front?: FrontOpts; side?: SideOpts };

export class Blocky {
  root = new THREE.Group();
  private body = new THREE.Group();
  private parts: Record<string, THREE.Mesh> = {};
  private legL = new THREE.Group(); private legR = new THREE.Group(); private armL = new THREE.Group(); private armR = new THREE.Group();
  private head = new THREE.Group();
  constructor(parent: THREE.Object3D) {
    const P = (name: string, geo: THREE.BufferGeometry, grp: THREE.Object3D) => { const m = new THREE.Mesh(geo, mat("#ffffff")); m.castShadow = true; m.receiveShadow = true; grp.add(m); this.parts[name] = m; return m; };
    this.legL.position.set(-LEG.w / 2 - 0.005, HIP_Y, 0); this.legR.position.set(LEG.w / 2 + 0.005, HIP_Y, 0);
    this.armL.position.set(-TOR.w / 2 - ARM.w / 2 - 0.01, SH_Y, 0); this.armR.position.set(TOR.w / 2 + ARM.w / 2 + 0.01, SH_Y, 0);
    this.head.position.set(0, NECK_Y, 0);
    P("legL", GEO.leg, this.legL); P("legR", GEO.leg, this.legR); P("shoeL", GEO.shoe, this.legL); P("shoeR", GEO.shoe, this.legR);
    P("armL", GEO.arm, this.armL); P("armR", GEO.arm, this.armR);
    const tor = new THREE.Group(); tor.position.y = HIP_Y; this.body.add(tor);
    P("torso", GEO.torso, tor); P("skirt", GEO.skirt, tor);
    P("head", GEO.head, this.head); P("face", GEO.face, this.head); P("hair", GEO.hair, this.head); P("hairBack", GEO.hairBack, this.head);
    for (let i = 0; i < 7; i++) { const sp = P("spike" + i, GEO.spike, this.head); const a = (i / 7) * Math.PI * 2; sp.position.set(Math.sin(a) * 0.16, HEAD + 0.2 + (i % 2) * 0.04, Math.cos(a) * 0.14 - 0.02); sp.rotation.set(Math.cos(a) * 0.6 - 0.2, 0, -Math.sin(a) * 0.6); }
    P("topHat", GEO.topHat, this.head); P("topBrim", GEO.topBrim, this.head); P("topBand", GEO.topBand, this.head); P("sash", GEO.sash, tor);
    P("cap", GEO.cap, this.head); P("brim", GEO.brim, this.head); P("bonnet", GEO.bonnet, this.head); P("beard", GEO.beard, this.head);
    this.body.add(this.legL, this.legR, this.armL, this.armR, this.head);
    this.root.add(this.body);
    this.root.visible = false;
    parent.add(this.root);
  }
  /** dress the rig for an outfit and pose it; t = film time (for small idle motion) */
  set(r: RigOpts, t: number) {
    const o = r.o, f = r.front ?? {}, s = r.side;
    const skin = o.skin ?? "#ffe2c2", p = this.parts;
    const shirt = o.dress ? mat(o.jacket) : clothMat(o.jacket, "shirt");
    p.torso.material = shirt; p.skirt.visible = !!o.dress; p.skirt.material = mat(o.dress ?? o.jacket);
    p.armL.material = p.armR.material = o.dress ? mat(skin) : clothMat(o.jacket, "shirt");
    p.legL.material = p.legR.material = o.dress ? mat(skin) : clothMat(o.pants, "pants"); p.shoeL.material = p.shoeR.material = mat(o.boots);
    p.head.material = mat(skin);
    const expr = (s?.expr ?? f.expr ?? "neutral") as Expr, blink = Number(s?.blink ?? f.blink ?? 0);
    p.face.material = faceMat(skin, expr, blink, o.moustache, Number(f.look ?? 0));
    const hat = o.hat ?? null;
    p.hair.visible = hat === "hair" || hat === "cap" || hat === "helmet"; p.hair.material = mat(o.hair ?? "#3a2a1e");
    p.hairBack.visible = hat === "hair" && !!o.dress; p.hairBack.material = mat(o.hair ?? "#3a2a1e");
    p.cap.visible = p.brim.visible = hat === "cap" || hat === "helmet"; p.cap.material = p.brim.material = mat(o.cap ?? "#3f6fb5");
    if (hat === "cap") p.hair.visible = false;
    const spiky = hat === "hair" && !o.dress;
    for (let i = 0; i < 7; i++) { p["spike" + i].visible = spiky; p["spike" + i].material = mat(o.hair ?? "#3a2a1e"); }
    const top = hat === "tophat"; p.topHat.visible = p.topBrim.visible = p.topBand.visible = top; p.topHat.material = p.topBrim.material = mat("#24222e"); p.topBand.material = mat("#c9a23a");
    if (top) p.hair.visible = true;
    p.sash.visible = !!o.belt; p.sash.material = mat(o.belt ?? "#d23b3b");
    p.bonnet.visible = hat === "bonnet"; p.bonnet.material = mat("#e9cf8f");
    p.beard.visible = !!o.beard; p.beard.material = mat(o.beard ?? "#ffffff");
    // ---- pose ----
    const mode = s ? (s.mode === "march" ? "walk" : "stand") : (f.mode ?? "stand");
    let aL = -0.05, aR = 0.05, aLx = 0, aRx = 0, lL = 0, lR = 0, lLz = 0, lRz = 0, bob = 0, tilt = 0, pitch = 0, drop = 0;
    if (mode === "walk" || mode === "march" || mode === "stroll" || mode === "run") {
      const ph = (s?.phase ?? f.phase ?? 0) * Math.PI * 2, A = mode === "run" ? 1.05 : mode === "walk" ? 0.75 : 0.5;
      lL = Math.sin(ph) * A; lR = -lL; aLx = -lL * (mode === "run" ? 1.2 : 0.9); aRx = lL * (mode === "run" ? 1.2 : 0.9); bob = Math.abs(Math.cos(ph)) * (mode === "run" ? 0.12 : 0.05);
      if (mode === "run") { pitch = 0.22; aL = -0.25; aR = 0.25; }
    } else if (mode === "fall") { // floating: arms up in a V, legs apart, slow kick
      aL = -2.6; aR = 2.6; lLz = -0.35; lRz = 0.35; lL = 0.25 * Math.sin(t * 2.3); lR = -lL; tilt = ((f.tilt ?? 0) * Math.PI) / 180;
    } else if (mode === "dive") { // flying forward flat, arms reaching ahead
      pitch = ((f.pitch ?? 85) * Math.PI) / 180; aLx = aRx = -3.0; aL = -0.12; aR = 0.12; lL = lR = 0.15; drop = 0;
    } else if (mode === "sit") { // sitting on a bench: legs straight forward
      lL = lR = -1.5; drop = 0; bob = 0.006 * Math.sin(t * 2.1);
    }
    if (mode === "stand" || mode === "sit") {
      if (f.wave !== undefined) { aR = 2.7 - 0.35 * f.wave; }
      if (f.prop === "hug") { aLx = aRx = -1.25; aL = 0.25; aR = -0.25; }
      if (f.prop === "holdup") { aL = -2.5 - 0.15 * Math.sin(t * 9); aR = 2.5 + 0.15 * Math.sin(t * 9 + 1); }
      if (f.prop === "notebook" || f.prop === "carry") { aLx = aRx = -1.1; aL = 0.35; aR = -0.35; }
      if (f.prop === "clap") { const c = Math.abs(Math.sin(t * 11)); aLx = aRx = -1.25; aL = 0.15 + 0.45 * c; aR = -aL; }
      if (f.prop === "point") { aRx = -1.5; aR = 0.1; }
      if (mode === "stand") bob = 0.008 * Math.sin(t * 2.1);
      if (expr === "laugh") bob += 0.02 * Math.abs(Math.sin(t * 9));
    }
    pitch += ((f.lean ?? 0) * Math.PI) / 180;
    this.armL.rotation.set(aLx, 0, aL); this.armR.rotation.set(aRx, 0, aR);
    this.legL.rotation.set(lL, 0, lLz); this.legR.rotation.set(lR, 0, lRz);
    this.body.position.y = bob - drop; this.body.rotation.set(pitch, 0, tilt);
    // lean pivots at the hips so the feet stay planted
    if (pitch && mode !== "dive") { this.body.position.z = 0; }
    const hp = f.headTilt !== undefined ? (f.headTilt * Math.PI) / 180 : 0;
    this.head.rotation.set((expr === "laugh" ? -0.12 : 0) + hp, (mode === "stand" ? 0.15 * Math.sin(t * 0.6) : 0) + (f.look ?? 0) * 0.25, 0);
    this.root.visible = true;
  }
  hide() { this.root.visible = false; }
}
