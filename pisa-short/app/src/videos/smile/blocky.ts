// Detailed blocky 3D characters (our own, toy-brick avatar style, second generation): box torso with a collar,
// buttons, a pocket, a tie or an apron; sleeves ending in skin-coloured hands with a thumb; legs with a belt and
// two-tone shoes (sole + toe cap); a rounded head with a sculpted nose and ears, a painted face (expression,
// blink, blush, freckles, lashes); eight hair styles; glasses; hats (cap, backwards cap, top hat, bonnet,
// firefighter helmet, clown wig, chef hat); a clown nose and huge shoes; a backpack; and a ROBOT variant
// (metal boxes, screen face, antenna). Posed per frame from the same options (mode, expr, blink, wave, prop ...).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { twoTone } from "./shade";

// metres for a 1.9 m adult (scaled by the place's scale)
const LEG = { w: 0.34, h: 0.7, d: 0.34 }, TOR = { w: 0.7, h: 0.7, d: 0.36 }, ARM = { w: 0.32, h: 0.56, d: 0.32 }, HEAD = 0.56;
const HAND = { w: 0.26, h: 0.18, d: 0.28 };
const HIP_Y = LEG.h, SH_Y = LEG.h + TOR.h - 0.06, NECK_Y = LEG.h + TOR.h;
const INK = "#241726";

const mats = new Map<string, THREE.Material>();
const mat = (col: string, emissive?: string) => {
  const k = col + (emissive ?? "");
  let m = mats.get(k);
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ color: col, ...(emissive ? { emissive: new THREE.Color(emissive), emissiveIntensity: 0.8 } : {}) })); mats.set(k, m); }
  return m;
};
const shade = (col: string, k: number) => "#" + new THREE.Color(col).multiplyScalar(k).getHexString();
const cloth = new Map<string, THREE.Material>();
/** clothing: plaid, stripes, polka dots, tank, plain or denim, picked from the colour (or forced) */
const clothMat = (col: string, kind: "shirt" | "pants", force?: string) => {
  const h = parseInt(col.slice(1), 16), style = force ?? (kind === "pants" ? (h % 3 === 0 ? "plain" : "denim") : ["plaid", "stripe", "tank", "plain", "plaid"][h % 5]);
  const key = col + kind + style;
  let m = cloth.get(key);
  if (m) return m;
  const cv = document.createElement("canvas"); cv.width = cv.height = 256; const g = cv.getContext("2d")!;
  const c = new THREE.Color(col), dark = "#" + c.clone().multiplyScalar(0.62).getHexString(), light = "#" + c.clone().lerp(new THREE.Color("#ffffff"), 0.35).getHexString();
  g.fillStyle = col; g.fillRect(0, 0, 256, 256);
  if (style === "plaid") { g.globalAlpha = 0.45; g.fillStyle = dark; for (let i = 0; i < 256; i += 64) { g.fillRect(i, 0, 26, 256); g.fillRect(0, i, 256, 26); } g.globalAlpha = 0.35; g.fillStyle = light; for (let i = 32; i < 256; i += 64) { g.fillRect(i, 0, 6, 256); g.fillRect(0, i, 256, 6); } g.globalAlpha = 1; }
  else if (style === "stripe") { g.fillStyle = light; for (let i = 0; i < 256; i += 40) g.fillRect(0, i, 256, 16); }
  else if (style === "dots") { g.fillStyle = "#ffffff"; for (let y = 0; y < 256; y += 48) for (let x = (y / 48) % 2 ? 24 : 0; x < 256; x += 48) { g.beginPath(); g.arc(x + 12, y + 12, 10, 0, 7); g.fill(); } }
  else if (style === "tank") { g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 256, 256); g.fillStyle = col; g.beginPath(); g.moveTo(40, 0); g.lineTo(80, 0); g.quadraticCurveTo(128, 70, 176, 0); g.lineTo(216, 0); g.lineTo(230, 256); g.lineTo(26, 256); g.closePath(); g.fill(); }
  else if (style === "denim") { g.fillStyle = "#3d5a8a"; g.fillRect(0, 0, 256, 256); for (let k = 0; k < 3000; k++) { g.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 5); } g.strokeStyle = "rgba(230,190,120,0.6)"; g.setLineDash([6, 5]); g.lineWidth = 3; g.strokeRect(10, 10, 236, 236); }
  else if (style === "fire") { g.fillStyle = "#e9e2b0"; g.fillRect(0, 150, 256, 26); g.fillRect(0, 210, 256, 18); g.fillStyle = "#c9c9c9"; g.fillRect(0, 156, 256, 12); }
  else if (style === "metal") { const gr = g.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, light); gr.addColorStop(0.5, col); gr.addColorStop(1, dark); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.strokeStyle = dark; g.lineWidth = 4; g.strokeRect(12, 12, 232, 232); g.fillStyle = dark; for (const [x, y] of [[24, 24], [232, 24], [24, 232], [232, 232]]) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); } }
  for (let k = 0; k < 1500; k++) { g.fillStyle = k % 2 ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)"; g.fillRect((k * 37) % 256, (k * 91) % 256, 2, 2); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  m = twoTone(new THREE.MeshLambertMaterial({ map: tex })); cloth.set(key, m); return m;
};
const faces = new Map<string, THREE.Material>();
/** painted face for a skin, expression and eyelid (0 open .. 1 shut), plus blush / freckles / lashes */
const faceMat = (o: Outfit, expr: Expr, lid: number, look = 0) => {
  const skin = o.skin ?? "#ffe2c2", moustache = o.moustache;
  const lk = Math.round(Math.max(-1, Math.min(1, look)) * 2) / 2;
  const key = `${skin}|${expr}|${lid > 0.6 ? 1 : lid > 0.2 ? 0.5 : 0}|${moustache ?? ""}|${lk}|${o.blush ? 1 : 0}${o.freckles ? 1 : 0}${o.lashes ? 1 : 0}|${o.robot ? "R" : ""}|${o.handsome ? "H" : ""}`;
  let m = faces.get(key);
  if (m) return m;
  const cv = document.createElement("canvas"); cv.width = cv.height = 256;
  const g = cv.getContext("2d")!;
  if (o.robot) { // screen face: dark glass, glowing eyes and a mouth line by expression
    g.fillStyle = "#1c2430"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#7ae0ff"; g.fillStyle = "#7ae0ff"; g.lineWidth = 12; g.lineCap = "round";
    const scared = expr === "shock" || expr === "shout" || expr === "nervous";
    for (const x of [80, 176]) {
      if (lid > 0.6 || expr === "laugh") { g.beginPath(); g.moveTo(x - 22, 104); g.lineTo(x + 22, 104); g.stroke(); continue; }
      if (scared) { g.beginPath(); g.arc(x, 100, 26, 0, 7); g.stroke(); g.beginPath(); g.arc(x, 100, 8, 0, 7); g.fill(); continue; }
      g.fillRect(x - 18 + lk * 8, 82, 36, 40);
    }
    g.beginPath();
    if (scared) { g.moveTo(84, 190); for (let i = 0; i <= 8; i++) g.lineTo(84 + i * 11, 190 + (i % 2 ? -12 : 12)); }
    else if (expr === "smile" || expr === "grin" || expr === "laugh") g.arc(128, 160, 44, 0.2 * Math.PI, 0.8 * Math.PI);
    else { g.moveTo(92, 186); g.lineTo(164, 186); }
    g.stroke();
    g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(14, 14, 228, 40);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    m = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.6, 1.6, 1.6) }); faces.set(key, m); return m;
  }
  g.fillStyle = skin; g.fillRect(0, 0, 256, 256);
  const done = () => { const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; const mm = twoTone(new THREE.MeshLambertMaterial({ map: tex })); faces.set(key, mm); return mm; };
  if (expr === "creepy") { // the town smile: the same for everyone, wide unblinking eyes, a grin far too wide
    g.fillStyle = "rgba(120,60,90,0.18)"; for (const x of [88, 168]) { g.beginPath(); g.ellipse(x, 124, 26, 10, 0, 0, 7); g.fill(); }
    g.fillStyle = "rgba(255,110,130,0.28)"; g.beginPath(); g.ellipse(40, 150, 22, 13, 0, 0, 7); g.ellipse(216, 150, 22, 13, 0, 0, 7); g.fill();
    for (const x of [88, 168]) {
      g.fillStyle = "#fbfbf6"; g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.ellipse(x, 98, 25, 27, 0, 0, 7); g.fill(); g.stroke();
      g.fillStyle = INK; g.beginPath(); g.arc(x + lk * 4, 98, 6.5, 0, 7); g.fill();
    }
    g.strokeStyle = INK; g.lineCap = "round"; g.lineWidth = 6; for (const [x, s2] of [[88, 1], [168, -1]] as const) { g.beginPath(); g.moveTo(x - 20, 56 + 4 * s2); g.quadraticCurveTo(x, 48, x + 20, 56 - 4 * s2); g.stroke(); }
    g.fillStyle = "#fbfbf6"; g.lineWidth = 7; g.beginPath(); g.moveTo(30, 146); g.quadraticCurveTo(128, 268, 226, 146); g.quadraticCurveTo(128, 178, 30, 146); g.closePath(); g.fill(); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.moveTo(40, 158); g.quadraticCurveTo(128, 196, 216, 158); g.stroke();
    for (let i = 1; i < 12; i++) { const x = 30 + i * 16.3, yt = 146 + 32 * (1 - ((x - 128) / 98) ** 2) * 0.95, yb = 146 + 90 * (1 - ((x - 128) / 98) ** 2) * 0.9; g.beginPath(); g.moveTo(x, yt); g.lineTo(x, Math.max(yt + 4, yb)); g.stroke(); }
    g.lineWidth = 5; for (const [x, d] of [[30, -1], [226, 1]] as const) { g.beginPath(); g.moveTo(x, 146); g.quadraticCurveTo(x + d * 10, 136, x + d * 6, 124); g.stroke(); }
    return done();
  }
  if (o.handsome) { // the hero: defined brows, almond eyes with brown irises, a small nose line, a calm half smile
    const shut = lid > 0.6, scared = expr === "scared" || expr === "shock" || expr === "nervous", sad2 = expr === "teary" || expr === "sad" || expr === "cry";
    g.strokeStyle = INK; g.fillStyle = INK; g.lineCap = "round"; g.lineJoin = "round";
    for (const x of [86, 170]) {
      const d = x < 128 ? -1 : 1;
      if (shut) { g.lineWidth = 7; g.beginPath(); g.moveTo(x - 22, 104); g.quadraticCurveTo(x, 116, x + 22, 104); g.stroke(); g.lineWidth = 4; for (let i = 0; i < 3; i++) { const lx = x + d * (8 + i * 6); g.beginPath(); g.moveTo(lx, 110 - i); g.lineTo(lx + d * 4, 120 - i); g.stroke(); } continue; }
      const ry = scared ? 19 : 13, rx = scared ? 22 : 23, cy = 104;
      g.fillStyle = "#fbfbf6"; g.beginPath(); g.moveTo(x - rx, cy); g.quadraticCurveTo(x, cy - ry * 2, x + rx, cy); g.quadraticCurveTo(x, cy + ry * 1.5, x - rx, cy); g.closePath(); g.fill();
      g.save(); g.clip();
      const ix = x + lk * 6, ir = scared ? 9 : 12;
      g.fillStyle = "#4a2c18"; g.beginPath(); g.arc(ix, cy - 1, ir, 0, 7); g.fill();
      g.fillStyle = "#2a160c"; g.beginPath(); g.arc(ix, cy - 1, ir * 0.72, 0, 7); g.fill();
      g.fillStyle = "#0e0808"; g.beginPath(); g.arc(ix, cy - 1, ir * 0.42, 0, 7); g.fill();
      g.fillStyle = "#ffffff"; g.beginPath(); g.arc(ix + 4, cy - 6, 4.5, 0, 7); g.fill(); g.beginPath(); g.arc(ix - 4, cy + 4, 2, 0, 7); g.fill();
      g.restore();
      g.lineWidth = 7; g.beginPath(); g.moveTo(x - rx - 2, cy + 1); g.quadraticCurveTo(x, cy - ry * 2 - 1, x + rx + 3, cy - 3); g.stroke(); // upper lash line
      g.lineWidth = 3; g.beginPath(); g.moveTo(x - rx * 0.7, cy + ry * 0.7); g.quadraticCurveTo(x, cy + ry * 1.05, x + rx * 0.8, cy + ry * 0.55); g.stroke();
      g.lineWidth = 4; g.beginPath(); g.moveTo(x + d * (rx + 2), cy - 3); g.lineTo(x + d * (rx + 9), cy - 8); g.stroke(); // outer lash flick
      if (sad2) { g.fillStyle = "#9fd8ff"; g.beginPath(); g.ellipse(x + d * 8, cy + 26, 5, 9, 0, 0, 7); g.fill(); g.fillStyle = INK; }
    }
    g.fillStyle = "#1a1216";
    for (const [x, d] of [[86, -1], [170, 1]] as const) { // thick brows: lowered toward the nose (calm), raised in fear
      const inner = scared || sad2 ? 64 : 76, outer = scared || sad2 ? 74 : 70;
      g.beginPath(); g.moveTo(x - d * 26, inner + 6); g.lineTo(x + d * 28, outer + 2); g.lineTo(x + d * 26, outer - 8); g.lineTo(x - d * 24, inner - 6); g.closePath(); g.fill();
    }
    g.strokeStyle = "rgba(90,50,40,0.55)"; g.lineWidth = 4; g.beginPath(); g.moveTo(132, 116); g.lineTo(138, 146); g.lineTo(126, 150); g.stroke();
    g.strokeStyle = INK; g.lineWidth = 6;
    if (scared) { g.fillStyle = "#5a1e28"; g.beginPath(); g.ellipse(128, 186, 12, 16, 0, 0, 7); g.fill(); g.stroke(); }
    else if (sad2) { g.beginPath(); g.moveTo(108, 190); g.quadraticCurveTo(128, 178, 150, 190); g.stroke(); }
    else if (expr === "smile" || expr === "grin" || expr === "laugh") { g.beginPath(); g.moveTo(102, 178); g.quadraticCurveTo(128, 202, 156, 176); g.stroke(); }
    else { g.beginPath(); g.moveTo(110, 186); g.quadraticCurveTo(132, 192, 152, 180); g.stroke(); }
        return done();
  }
  if (o.blush || expr === "laugh" || expr === "grin") { g.fillStyle = "rgba(255,120,130,0.35)"; g.beginPath(); g.ellipse(52, 150, 26, 14, 0, 0, 7); g.ellipse(204, 150, 26, 14, 0, 0, 7); g.fill(); }
  if (o.freckles) { g.fillStyle = "rgba(150,80,40,0.55)"; for (const [x, y] of [[52, 136], [66, 146], [44, 150], [190, 136], [204, 146], [212, 132]]) { g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); } }
  g.fillStyle = INK; g.strokeStyle = INK; g.lineCap = "round"; g.lineJoin = "round";
  const sadish = expr === "sad" || expr === "teary";
  const eye = (x: number) => {
    const shut = lid > 0.6, half = lid > 0.2 && !shut;
    if (expr === "shout") { g.lineWidth = 10; const d = x < 128 ? 1 : -1; g.beginPath(); g.moveTo(x - 16 * d, 86); g.lineTo(x + 14 * d, 102); g.lineTo(x - 16 * d, 116); g.stroke(); return; }
    if (expr === "cry") { g.lineWidth = 9; g.beginPath(); g.arc(x, 92, 16, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); g.fillStyle = "#7cc8ff"; g.globalAlpha = 0.9; g.fillRect(x - 9, 112, 18, 130); g.globalAlpha = 1; g.fillStyle = INK; return; }
    if (shut || expr === "laugh" || expr === "relief") { g.lineWidth = 9; g.beginPath(); g.arc(x, expr === "laugh" ? 112 : 104, 16, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); return; }
    if (expr === "shock") { g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(x, 100, 22, 26, 0, 0, 7); g.fill(); g.lineWidth = 6; g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(x, 102, 9, 0, 7); g.fill(); return; }
    if (expr === "grin" || expr === "relief_open") { g.lineWidth = 9; g.beginPath(); g.arc(x, 108, 15, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); return; }
    const wide = expr === "nervous" || sadish;
    if (wide) { g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(x, 102, 17, 20, 0, 0, 7); g.fill(); g.lineWidth = 5; g.stroke(); g.fillStyle = INK; }
    const px = x + lk * (wide ? 7 : 5), py = expr === "think" ? 92 : sadish ? 106 : 100;
    g.beginPath(); g.ellipse(px, py, wide ? 9 : 11, half ? 6 : wide ? 11 : 15, 0, 0, 7); g.fill();
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(px + 4, py - 6, 4.5, 0, 7); g.fill(); g.beginPath(); g.arc(px - 3, py + 5, 2, 0, 7); g.fill(); g.fillStyle = INK;
    if (half) { g.fillStyle = skin; g.fillRect(x - 20, 76, 40, 18); g.fillStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(x - 16, 94); g.lineTo(x + 16, 94); g.stroke(); }
    if (o.lashes) { g.lineWidth = 4; const d = x < 128 ? -1 : 1; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x + d * (10 + i * 5), 84 + i * 3); g.lineTo(x + d * (18 + i * 6), 76 + i * 3); g.stroke(); } }
    if (expr === "teary") { g.fillStyle = "#9fd8ff"; g.beginPath(); g.ellipse(x + (x < 128 ? -6 : 6), 128, 6, 9, 0, 0, 7); g.fill(); g.fillStyle = "rgba(160,215,255,0.6)"; g.fillRect(x - 16, 112, 32, 6); g.fillStyle = INK; }
  };
  eye(88); eye(168);
  g.lineWidth = 8;
  const brow = (x: number, s: number) => {
    const tilt = expr === "stern" || expr === "shout" ? 12 * s : expr === "nervous" || expr === "cry" || sadish ? -13 * s : expr === "shock" ? -4 * s : expr === "think" ? (s > 0 ? 8 : -8) : 0;
    const y = expr === "shock" ? 58 : 70; g.beginPath(); g.moveTo(x - 18, y - tilt); g.lineTo(x + 18, y + tilt); g.stroke();
  };
  brow(88, 1); brow(168, -1);
  g.lineWidth = 9;
  const cx = 128, cy = 182;
  if (expr === "shout") {
    g.fillStyle = "#5a1e28"; g.beginPath(); g.ellipse(cx, cy + 8, 46, 36, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#ffffff"; g.fillRect(cx - 30, cy - 26, 60, 10); g.fillStyle = "#e86e78"; g.beginPath(); g.ellipse(cx, cy + 28, 22, 10, 0, 0, 7); g.fill();
  } else if (expr === "cry") {
    g.fillStyle = "#5a1e28"; g.beginPath(); g.moveTo(cx - 38, cy + 20); for (let i = 0; i <= 8; i++) g.lineTo(cx - 38 + i * 9.5, cy - 4 + (i % 2 ? -6 : 4)); g.lineTo(cx + 38, cy + 20); g.quadraticCurveTo(cx, cy + 34, cx - 38, cy + 20); g.closePath(); g.fill(); g.stroke();
  } else if (expr === "laugh" || expr === "relief_open") {
    g.fillStyle = "#5a1e28"; g.beginPath(); g.moveTo(cx - 44, cy - 14); g.quadraticCurveTo(cx, cy + 60, cx + 44, cy - 14); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#e86e78"; g.beginPath(); g.ellipse(cx, cy + 16, 18, 9, 0, 0, 7); g.fill();
    g.fillStyle = "#ffffff"; g.fillRect(cx - 30, cy - 12, 60, 8);
  } else if (expr === "shock") {
    g.fillStyle = "#5a1e28"; g.beginPath(); g.ellipse(cx, cy + 4, 18, 24, 0, 0, 7); g.fill(); g.stroke();
  } else if (expr === "grin") {
    g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(cx - 40, cy - 8); g.quadraticCurveTo(cx, cy + 40, cx + 40, cy - 8); g.closePath(); g.fill(); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 34, cy + 2); g.lineTo(cx + 34, cy + 2); g.stroke();
  } else if (expr === "nervous") {
    g.beginPath(); for (let i = 0; i <= 8; i++) g[i ? "lineTo" : "moveTo"](cx - 36 + i * 9, cy + (i % 2 ? -6 : 6)); g.stroke();
    g.fillStyle = "#9fd4ff"; g.beginPath(); g.ellipse(208, 70, 9, 14, 0, 0, 7); g.fill();
  } else if (sadish || expr === "pained") {
    g.beginPath(); g.moveTo(cx - 24, cy + 12); g.quadraticCurveTo(cx, cy - 6, cx + 24, cy + 12); g.stroke();
  } else if (expr === "stern") {
    g.beginPath(); g.moveTo(cx - 28, cy + 8); g.quadraticCurveTo(cx, cy - 10, cx + 28, cy + 8); g.stroke();
  } else if (expr === "think") {
    g.beginPath(); g.moveTo(cx - 20, cy + 4); g.lineTo(cx + 22, cy - 4); g.stroke();
  } else if (expr === "neutral" || expr === "dazed") {
    g.beginPath(); g.moveTo(cx - 22, cy); g.lineTo(cx + 22, cy); g.stroke();
  } else {
    g.beginPath(); g.arc(cx, cy - 22, 32, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
  }
  if (moustache) { g.fillStyle = moustache; g.beginPath(); g.ellipse(cx - 22, cy - 24, 24, 10, 0.2, 0, 7); g.ellipse(cx + 22, cy - 24, 24, 10, -0.2, 0, 7); g.fill(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  m = twoTone(new THREE.MeshLambertMaterial({ map: tex }));
  faces.set(key, m);
  return m;
};

const box = (w: number, h: number, d: number, r = 0.05) => new RoundedBoxGeometry(w, h, d, 3, r);
const GEO = {
  leg: box(LEG.w, LEG.h - 0.1, LEG.d, 0.06).translate(0, -(LEG.h - 0.1) / 2, 0),
  arm: box(ARM.w, ARM.h, ARM.d, 0.07).translate(0, -ARM.h / 2 + 0.06, 0),
  cuff: box(ARM.w + 0.02, 0.06, ARM.d + 0.02, 0.02).translate(0, -ARM.h + 0.09, 0),
  hand: box(HAND.w, HAND.h, HAND.d, 0.07).translate(0, -ARM.h - HAND.h / 2 + 0.07, 0.01),
  thumb: box(0.07, 0.12, 0.08, 0.03).translate(0, -ARM.h - 0.02, 0.15),
  torso: box(TOR.w, TOR.h, TOR.d, 0.06).translate(0, TOR.h / 2, 0),
  collar: box(TOR.w * 0.62, 0.08, TOR.d + 0.04, 0.03).translate(0, TOR.h - 0.03, 0),
  btn: new THREE.CylinderGeometry(0.028, 0.028, 0.02, 10).rotateX(Math.PI / 2),
  pocket: box(0.16, 0.14, 0.02, 0.01).translate(-0.17, TOR.h * 0.68, TOR.d / 2 + 0.01),
  tie: new THREE.BoxGeometry(0.1, 0.42, 0.02).translate(0, TOR.h - 0.27, TOR.d / 2 + 0.015),
  tieKnot: box(0.12, 0.08, 0.04, 0.02).translate(0, TOR.h - 0.06, TOR.d / 2 + 0.02),
  waist: box(TOR.w + 0.02, 0.09, TOR.d + 0.03, 0.02).translate(0, 0.045, 0),
  buckle: box(0.12, 0.08, 0.02, 0.01).translate(0, 0.045, TOR.d / 2 + 0.02),
  apron: new THREE.BoxGeometry(TOR.w * 0.78, TOR.h * 0.95 + 0.38, 0.02).translate(0, TOR.h * 0.47 - 0.19, TOR.d / 2 + 0.015),
  backpack: box(TOR.w * 0.7, TOR.h * 0.75, 0.2, 0.06).translate(0, TOR.h * 0.5, -TOR.d / 2 - 0.1),
  head: box(HEAD, HEAD, HEAD, 0.14).translate(0, HEAD / 2 + 0.04, 0),
  face: new THREE.PlaneGeometry(HEAD * 0.9, HEAD * 0.9).translate(0, HEAD / 2 + 0.04, HEAD / 2 + 0.003),
  nose: box(0.1, 0.11, 0.09, 0.04).translate(0, HEAD * 0.43, HEAD / 2 + 0.035),
  bignose: new THREE.SphereGeometry(0.075, 16, 12).translate(0, HEAD * 0.42, HEAD / 2 + 0.06),
  earL: box(0.07, 0.15, 0.12, 0.03).translate(-HEAD / 2 - 0.02, HEAD * 0.5, 0),
  earR: box(0.07, 0.15, 0.12, 0.03).translate(HEAD / 2 + 0.02, HEAD * 0.5, 0),
  hair: box(HEAD + 0.06, HEAD * 0.32, HEAD + 0.06, 0.08).translate(0, HEAD + 0.02, -0.01),
  fringe: box(HEAD * 0.7, HEAD * 0.14, 0.1, 0.04).rotateZ(-0.18).translate(0.06, HEAD * 0.86, HEAD / 2 + 0.02),
  sideL: box(0.09, HEAD * 0.45, HEAD * 0.7, 0.03).translate(-HEAD / 2 - 0.03, HEAD * 0.72, -0.05),
  sideR: box(0.09, HEAD * 0.45, HEAD * 0.7, 0.03).translate(HEAD / 2 + 0.03, HEAD * 0.72, -0.05),
  curl: new THREE.SphereGeometry(0.12, 12, 10),
  swoop: box(HEAD * 1.1, 0.2, HEAD * 0.78, 0.07).rotateZ(-0.14).rotateX(0.22).translate(0.04, HEAD + 0.07, 0.1),
  strand: box(0.2, 0.06, 0.07, 0.025).rotateZ(-0.7).translate(0.13, HEAD * 0.93, HEAD / 2 + 0.03),
  lock: box(0.17, 0.06, 0.36, 0.028),
  coatF: box(0.2, TOR.h + 0.28, 0.04, 0.015).translate(0, (TOR.h - 0.28) / 2, 0),
  coatB: box(TOR.w + 0.08, TOR.h + 0.28, 0.04, 0.015).translate(0, (TOR.h - 0.28) / 2, -TOR.d / 2 - 0.03),
  coatS: box(0.04, TOR.h + 0.28, TOR.d + 0.08, 0.015).translate(0, (TOR.h - 0.28) / 2, 0),
  hoodB: box(0.5, 0.2, 0.18, 0.06).translate(0, TOR.h - 0.02, -TOR.d / 2 - 0.08),
  keyp: box(0.05, 0.1, 0.016, 0.01).translate(0, TOR.h - 0.3, TOR.d / 2 + 0.03),
  keys: new THREE.BoxGeometry(0.012, 0.24, 0.012).translate(0, TOR.h - 0.14, TOR.d / 2 + 0.025),
  spike: new THREE.ConeGeometry(0.11, 0.26, 5),
  hairBack: box(HEAD + 0.06, HEAD * 0.7, 0.12, 0.05).translate(0, HEAD * 0.62, -HEAD / 2 - 0.02),
  longBack: box(HEAD + 0.08, HEAD * 1.05, 0.14, 0.05).translate(0, HEAD * 0.42, -HEAD / 2 - 0.03),
  bun: new THREE.SphereGeometry(0.13, 14, 10).translate(0, HEAD + 0.18, -0.12),
  pigL: new THREE.SphereGeometry(0.11, 12, 10).translate(-HEAD / 2 - 0.1, HEAD * 0.6, -0.05),
  pigR: new THREE.SphereGeometry(0.11, 12, 10).translate(HEAD / 2 + 0.1, HEAD * 0.6, -0.05),
  cap: box(HEAD + 0.05, HEAD * 0.26, HEAD + 0.05, 0.08).translate(0, HEAD + 0.06, 0),
  brim: box(HEAD * 0.9, 0.05, HEAD * 0.45, 0.02).translate(0, HEAD - 0.04, HEAD * 0.55),
  brimBack: box(HEAD * 0.9, 0.05, HEAD * 0.45, 0.02).translate(0, HEAD - 0.04, -HEAD * 0.55),
  bonnet: box(HEAD + 0.14, HEAD + 0.12, HEAD * 0.75, 0.12).translate(0, HEAD / 2 + 0.08, -HEAD * 0.2),
  beard: box(HEAD * 0.8, HEAD * 0.55, 0.12, 0.05).translate(0, 0.05, HEAD / 2 + 0.03),
  skirt: new THREE.CylinderGeometry(TOR.w * 0.62, TOR.w * 0.95, 0.5, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.62).translate(0, -0.22, 0),
  topHat: new THREE.CylinderGeometry(0.21, 0.21, 0.44, 20).translate(0, HEAD + 0.27, 0),
  topBrim: new THREE.CylinderGeometry(0.36, 0.36, 0.04, 24).translate(0, HEAD + 0.06, 0),
  topBand: new THREE.CylinderGeometry(0.215, 0.215, 0.09, 20).translate(0, HEAD + 0.12, 0),
  helmet: new THREE.SphereGeometry(HEAD * 0.62, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.85, 1.08).translate(0, HEAD * 0.9, 0),
  helmetBrim: new THREE.CylinderGeometry(HEAD * 0.75, HEAD * 0.8, 0.04, 24).scale(1, 1, 1.25).translate(0, HEAD * 0.9, -0.06),
  badge: box(0.16, 0.18, 0.03, 0.02).translate(0, HEAD * 1.13, HEAD * 0.6),
  chef: new THREE.CylinderGeometry(0.26, 0.22, 0.42, 20).translate(0, HEAD + 0.25, 0),
  chefTop: new THREE.SphereGeometry(0.3, 16, 10).scale(1, 0.6, 1).translate(0, HEAD + 0.48, 0),
  sash: new THREE.BoxGeometry(0.16, TOR.h * 1.25, TOR.d + 0.03).rotateZ(0.72).translate(0, TOR.h / 2, 0),
  shoe: box(LEG.w + 0.02, 0.12, LEG.d + 0.1, 0.04).translate(0, -LEG.h + 0.08, 0.04),
  sole: box(LEG.w + 0.04, 0.04, LEG.d + 0.12, 0.015).translate(0, -LEG.h + 0.02, 0.04),
  toe: box(LEG.w - 0.04, 0.06, 0.06, 0.02).translate(0, -LEG.h + 0.08, LEG.d / 2 + 0.07),
  sock: box(LEG.w + 0.01, 0.08, LEG.d + 0.01, 0.02).translate(0, -LEG.h + 0.16, 0),
  lens: new THREE.TorusGeometry(0.085, 0.016, 8, 20),
  bridge: new THREE.BoxGeometry(0.08, 0.016, 0.016),
  bow: new THREE.ConeGeometry(0.09, 0.16, 4).rotateZ(Math.PI / 2),
  antenna: new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8).translate(0, HEAD + 0.19, 0),
  bulb: new THREE.SphereGeometry(0.06, 12, 8).translate(0, HEAD + 0.36, 0),
  bolt: new THREE.CylinderGeometry(0.05, 0.05, 0.12, 10).rotateZ(Math.PI / 2),
  watch: box(0.1, 0.06, 0.12, 0.02).translate(0, -ARM.h + 0.13, 0.0),
};

export type RigOpts = { o: Outfit; front?: FrontOpts; side?: SideOpts };
const WIG = ["#ff4a4a", "#ffb12e", "#ffe14a", "#4cd06a", "#3fa8ff", "#b36aff"];

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
    for (const [s, g] of [["L", this.legL], ["R", this.legR]] as const) { P("leg" + s, GEO.leg, g); P("sock" + s, GEO.sock, g); P("shoe" + s, GEO.shoe, g); P("sole" + s, GEO.sole, g); P("toe" + s, GEO.toe, g); }
    for (const [s, g] of [["L", this.armL], ["R", this.armR]] as const) { P("arm" + s, GEO.arm, g); P("cuff" + s, GEO.cuff, g); P("hand" + s, GEO.hand, g); const th = P("thumb" + s, GEO.thumb, g); th.position.x = s === "L" ? 0.1 : -0.1; }
    P("watch", GEO.watch, this.armL);
    const tor = new THREE.Group(); tor.position.y = HIP_Y; this.body.add(tor);
    P("torso", GEO.torso, tor); P("skirt", GEO.skirt, tor); P("collar", GEO.collar, tor); P("pocket", GEO.pocket, tor);
    for (let i = 0; i < 3; i++) { const b = P("btn" + i, GEO.btn, tor); b.position.set(0, TOR.h * (0.72 - i * 0.24), TOR.d / 2 + 0.012); }
    P("tie", GEO.tie, tor); P("tieKnot", GEO.tieKnot, tor); P("waist", GEO.waist, tor); P("buckle", GEO.buckle, tor); P("apron", GEO.apron, tor); P("backpack", GEO.backpack, tor);
    P("sash", GEO.sash, tor);
    for (const sx of [-1, 1]) { const c = P("coatF" + (sx > 0 ? "R" : "L"), GEO.coatF, tor); c.position.set(sx * (TOR.w / 2 - 0.08), 0, TOR.d / 2 + 0.03); const d = P("coatS" + (sx > 0 ? "R" : "L"), GEO.coatS, tor); d.position.x = sx * (TOR.w / 2 + 0.03); }
    P("coatB", GEO.coatB, tor); P("hoodB", GEO.hoodB, tor); P("keyp", GEO.keyp, tor); P("keys", GEO.keys, tor);
    for (const s of [-1, 1]) { const b = P("bow" + (s > 0 ? "R" : "L"), GEO.bow, tor); b.position.set(s * 0.09, TOR.h - 0.08, TOR.d / 2 + 0.05); b.rotation.z = s > 0 ? Math.PI : 0; }
    for (const s of [-1, 1]) { const b = P("bolt" + (s > 0 ? "R" : "L"), GEO.bolt, this.head); b.position.set(s * (HEAD / 2 + 0.04), HEAD * 0.5, 0); }
    P("head", GEO.head, this.head); P("face", GEO.face, this.head).receiveShadow = false; this.parts.head.receiveShadow = false; P("nose", GEO.nose, this.head); P("bignose", GEO.bignose, this.head);
    P("earL", GEO.earL, this.head); P("earR", GEO.earR, this.head);
    P("hair", GEO.hair, this.head); P("fringe", GEO.fringe, this.head); P("sideL", GEO.sideL, this.head); P("sideR", GEO.sideR, this.head);
    P("hairBack", GEO.hairBack, this.head); P("longBack", GEO.longBack, this.head); P("bun", GEO.bun, this.head); P("pigL", GEO.pigL, this.head); P("pigR", GEO.pigR, this.head);
    for (let i = 0; i < 7; i++) { const sp = P("spike" + i, GEO.spike, this.head); const a = (i / 7) * Math.PI * 2; sp.position.set(Math.sin(a) * 0.16, HEAD + 0.2 + (i % 2) * 0.04, Math.cos(a) * 0.14 - 0.02); sp.rotation.set(Math.cos(a) * 0.6 - 0.2, 0, -Math.sin(a) * 0.6); }
    P("swoop", GEO.swoop, this.head).castShadow = false; P("strand", GEO.strand, this.head).castShadow = false;
    for (const [i, x, y, z, rz, rx] of [[0, -0.14, 0.715, 0.04, -0.28, -0.12], [1, 0.03, 0.735, 0.02, -0.3, -0.18], [2, 0.18, 0.7, 0.06, -0.42, -0.12], [3, 0.08, 0.72, 0.2, -0.36, -0.42]] as const) { const l = P("lock" + i, GEO.lock, this.head); l.castShadow = false; l.position.set(x, y, z); l.rotation.set(rx, 0, rz); }
    for (let i = 0; i < 9; i++) { const c = P("curl" + i, GEO.curl, this.head); const a = (i / 9) * Math.PI * 2; c.position.set(Math.sin(a) * 0.24, HEAD * 0.95 + (i % 3) * 0.05, Math.cos(a) * 0.22 - 0.03); }
    for (let i = 0; i < 12; i++) { const c = P("wig" + i, GEO.curl, this.head); const a = (i / 12) * Math.PI * 2; c.position.set(Math.sin(a) * 0.36, HEAD * 0.72 + (i % 2) * 0.08, Math.cos(a) * 0.28 - 0.08); c.scale.setScalar(1.25); }
    P("topHat", GEO.topHat, this.head); P("topBrim", GEO.topBrim, this.head); P("topBand", GEO.topBand, this.head);
    P("cap", GEO.cap, this.head); P("brim", GEO.brim, this.head); P("brimBack", GEO.brimBack, this.head); P("bonnet", GEO.bonnet, this.head); P("beard", GEO.beard, this.head);
    P("helmet", GEO.helmet, this.head); P("helmetBrim", GEO.helmetBrim, this.head); P("badge", GEO.badge, this.head); P("chef", GEO.chef, this.head); P("chefTop", GEO.chefTop, this.head);
    for (const s of ["L", "R"]) { const l = P("lens" + s, GEO.lens, this.head); l.position.set(s === "L" ? -0.11 : 0.11, HEAD * 0.6, HEAD / 2 + 0.02); }
    { const b = P("bridge", GEO.bridge, this.head); b.position.set(0, HEAD * 0.62, HEAD / 2 + 0.02); }
    P("antenna", GEO.antenna, this.head); P("bulb", GEO.bulb, this.head);
    this.body.add(this.legL, this.legR, this.armL, this.armR, this.head);
    this.root.add(this.body);
    this.root.visible = false;
    parent.add(this.root);
  }
  /** dress the rig for an outfit and pose it; t = film time (for small idle motion) */
  set(r: RigOpts, t: number) {
    const o = r.o, f = r.front ?? {}, s = r.side;
    const robot = !!o.robot;
    const skin = robot ? "#b8c4d0" : o.skin ?? "#ffe2c2", p = this.parts;
    const vis = (names: string[], v: boolean) => names.forEach((n) => { p[n].visible = v; });
    const shirt = robot ? clothMat(o.jacket, "shirt", "metal") : o.dress ? mat(o.jacket) : clothMat(o.jacket, "shirt", o.stripes);
    p.torso.material = shirt; p.skirt.visible = !!o.dress; p.skirt.material = mat(o.dress ?? o.jacket);
    const coat = !!o.raincoat;
    for (const n of ["coatFL", "coatFR", "coatSL", "coatSR", "coatB"]) { p[n].visible = coat; p[n].material = mat(o.raincoat ?? "#ffd23a"); }
    p.hoodB.visible = !!o.hood; p.hoodB.material = mat(o.hood ?? o.jacket);
    p.keyp.visible = p.keys.visible = !!o.key; p.keyp.material = mat("#e9c24a", "#5a4410"); p.keys.material = mat("#2a2420");
    const sleeve0 = robot ? clothMat(o.jacket, "shirt", "metal") : o.dress ? mat(skin) : clothMat(o.jacket, "shirt", o.stripes);
    const sleeve = coat ? mat(o.raincoat!) : sleeve0;
    p.armL.material = p.armR.material = sleeve;
    p.cuffL.material = p.cuffR.material = coat ? mat(shade(o.raincoat!, 0.85)) : mat(robot ? shade(o.jacket, 0.6) : o.dress ? skin : shade(o.jacket, 0.78));
    p.handL.material = p.handR.material = p.thumbL.material = p.thumbR.material = mat(robot ? "#8a96a4" : skin);
    p.legL.material = p.legR.material = robot ? clothMat(o.pants, "pants", "metal") : o.dress ? mat(skin) : clothMat(o.pants, "pants");
    p.shoeL.material = p.shoeR.material = mat(o.boots); p.soleL.material = p.soleR.material = mat(o.sole ?? (robot ? "#3b3f52" : "#f4f1ea")); p.toeL.material = p.toeR.material = mat(shade(o.boots, 1.25));
    p.sockL.material = p.sockR.material = mat(o.dress ? "#ffffff" : o.stripes === "dots" ? "#ff4a4a" : "#f4f1ea");
    const big = !!o.bigShoes;
    for (const n of ["shoeL", "shoeR", "soleL", "soleR", "toeL", "toeR"]) { p[n].scale.set(big ? 1.3 : 1, big ? 1.3 : 1, big ? 2.1 : 1); p[n].position.z = big ? 0.12 : 0; }
    p.head.material = mat(skin);
    p.head.scale.set(robot ? 1.12 : 1, robot ? 1.0 : 1, robot ? 1.0 : 1);
    const expr = (s?.expr ?? f.expr ?? "neutral") as Expr, blink = Number(s?.blink ?? f.blink ?? 0);
    p.face.material = faceMat(o, expr, blink, Number(f.look ?? 0));
    vis(["nose", "earL", "earR"], !robot); p.nose.scale.setScalar(o.handsome ? 0.75 : 1); p.nose.material = p.earL.material = p.earR.material = mat(shade(skin, 0.94));
    p.bignose.visible = !!o.clownNose; p.bignose.material = mat("#ff2a2a"); if (o.clownNose) p.nose.visible = false;
    vis(["boltL", "boltR", "antenna", "bulb"], robot); p.boltL.material = p.boltR.material = mat("#6a7480"); p.antenna.material = mat("#6a7480"); p.bulb.material = mat("#ff4a4a", "#ff2a1a");
    // ---- clothes details ----
    const det = !robot && !o.dress;
    p.collar.visible = det || !!o.collar; p.collar.material = mat(o.collar ?? shade(o.jacket, 0.8));
    for (let i = 0; i < 3; i++) { p["btn" + i].visible = !!o.buttons || robot; p["btn" + i].material = mat(robot ? ["#ff4a4a", "#ffe14a", "#4cd06a"][i] : o.buttons ?? "#f4f1ea", robot ? ["#ff2a1a", "#ffd21a", "#2ad04a"][i] : undefined); }
    p.pocket.visible = !!o.pocket; p.pocket.material = mat(shade(o.jacket, 0.82));
    p.tie.visible = p.tieKnot.visible = !!o.tie; p.tie.material = p.tieKnot.material = mat(o.tie ?? "#d23b3b");
    p.waist.visible = p.buckle.visible = !!o.waist; p.waist.material = mat(o.waist ?? "#3a2a1e"); p.buckle.material = mat("#e9c24a");
    p.apron.visible = !!o.apron; p.apron.material = mat(o.apron ?? "#ffffff");
    p.backpack.visible = !!o.backpack; p.backpack.material = mat(o.backpack ?? "#3f6fb5");
    p.watch.visible = !!o.watch; p.watch.material = mat(o.watch ?? "#3b3f52");
    p.bowL.visible = p.bowR.visible = !!o.clownNose; p.bowL.material = p.bowR.material = mat("#ffe14a");
    // ---- hair & hats ----
    const hat = o.hat ?? null, hc = mat(o.hair ?? "#3a2a1e"), st = o.hairStyle ?? (o.dress ? "long" : "spiky");
    const hairOn = hat === "hair" || hat === "cap" || hat === "capback";
    vis(["hair", "fringe", "sideL", "sideR", "hairBack", "longBack", "bun", "pigL", "pigR"], false);
    for (let i = 0; i < 7; i++) p["spike" + i].visible = false;
    vis(["swoop", "strand", "lock0", "lock1", "lock2", "lock3"], false); for (const n of ["swoop", "strand", "lock0", "lock1", "lock2", "lock3"]) p[n].material = hc;
    for (let i = 0; i < 9; i++) p["curl" + i].visible = false;
    for (let i = 0; i < 12; i++) p["wig" + i].visible = false;
    for (const n of ["hair", "fringe", "sideL", "sideR", "hairBack", "longBack", "bun", "pigL", "pigR"]) p[n].material = hc;
    p.sideL.scale.set(1, 1, 1); p.sideR.scale.set(1, 1, 1);
    if (hat === "hair") {
      if (st === "spiky") { p.hair.visible = true; for (let i = 0; i < 7; i++) { p["spike" + i].visible = true; p["spike" + i].material = hc; } }
      else if (st === "side") { p.hair.visible = p.fringe.visible = true; }
      else if (st === "swept") { vis(["hair", "swoop", "strand", "lock0", "lock1", "lock2", "lock3", "hairBack"], true); p.sideL.visible = p.sideR.visible = true; p.sideL.scale.set(0.7, 0.8, 1); p.sideR.scale.set(0.7, 0.8, 1); }
      else if (st === "curly" || st === "mop") { p.hair.visible = true; for (let i = 0; i < 9; i++) { p["curl" + i].visible = true; p["curl" + i].material = hc; p["curl" + i].scale.setScalar(st === "mop" ? 1.25 : 1); } }
      else if (st === "bun") { p.hair.visible = p.bun.visible = p.hairBack.visible = true; }
      else if (st === "pigtails") { p.hair.visible = p.fringe.visible = p.pigL.visible = p.pigR.visible = true; }
      else if (st === "bald") { p.sideL.visible = p.sideR.visible = true; }
      else if (st === "long") { p.hair.visible = p.fringe.visible = p.longBack.visible = true; }
    }
    if (hat === "cap" || hat === "capback") { p.sideL.visible = p.sideR.visible = true; }
    void hairOn;
    p.cap.visible = hat === "cap" || hat === "capback" || hat === "helmet"; p.brim.visible = hat === "cap" || hat === "helmet"; p.brimBack.visible = hat === "capback";
    p.cap.material = p.brim.material = p.brimBack.material = mat(o.cap ?? "#3f6fb5");
    const top = hat === "tophat"; p.topHat.visible = p.topBrim.visible = p.topBand.visible = top; p.topHat.material = p.topBrim.material = mat("#24222e"); p.topBand.material = mat("#c9a23a");
    if (top) { p.sideL.visible = p.sideR.visible = true; }
    p.sash.visible = !!o.belt; p.sash.material = mat(o.belt ?? "#d23b3b");
    p.bonnet.visible = hat === "bonnet"; p.bonnet.material = mat("#e9cf8f");
    const fire = hat === "fire"; p.helmet.visible = p.helmetBrim.visible = p.badge.visible = fire; p.helmet.material = p.helmetBrim.material = mat("#d22e2e"); p.badge.material = mat("#e9c24a");
    const chef = hat === "chef"; p.chef.visible = p.chefTop.visible = chef; p.chef.material = p.chefTop.material = mat("#fbfbf8");
    if (chef || fire) { p.sideL.visible = p.sideR.visible = true; }
    if (hat === "clown") for (let i = 0; i < 12; i++) { p["wig" + i].visible = true; p["wig" + i].material = mat(WIG[i % 6]); }
    p.beard.visible = !!o.beard; p.beard.material = mat(o.beard ?? "#ffffff");
    const gl = !!o.glasses; vis(["lensL", "lensR", "bridge"], gl); p.lensL.material = p.lensR.material = p.bridge.material = mat(o.glasses ?? "#241726");
    // ---- pose ----
    const mode = s ? (s.mode === "march" ? "walk" : "stand") : (f.mode ?? "stand");
    let aL = -0.05, aR = 0.05, aLx = 0, aRx = 0, lL = 0, lR = 0, lLz = 0, lRz = 0, bob = 0, tilt = 0, pitch = 0, drop = 0;
    if (mode === "walk" || mode === "march" || mode === "stroll" || mode === "run") {
      const ph = (s?.phase ?? f.phase ?? 0) * Math.PI * 2, A = mode === "run" ? 1.05 : mode === "walk" ? 0.75 : 0.5;
      lL = Math.sin(ph) * A; lR = -lL; aLx = -lL * (mode === "run" ? 1.2 : 0.9); aRx = lL * (mode === "run" ? 1.2 : 0.9); bob = Math.abs(Math.cos(ph)) * (mode === "run" ? 0.12 : 0.05);
      if (mode === "run") { pitch = 0.22; aL = -0.25; aR = 0.25; }
    } else if (mode === "fall") {
      aL = -2.6; aR = 2.6; lLz = -0.35; lRz = 0.35; lL = 0.25 * Math.sin(t * 2.3); lR = -lL; tilt = ((f.tilt ?? 0) * Math.PI) / 180;
    } else if (mode === "dive") {
      pitch = ((f.pitch ?? 85) * Math.PI) / 180; aLx = aRx = -3.0; aL = -0.12; aR = 0.12; lL = lR = 0.15; drop = 0;
    } else if (mode === "sit") {
      lL = lR = -1.5; drop = 0; bob = 0.006 * Math.sin(t * 2.1);
    } else if (mode === "ride") { // on someone's shoulders: legs hanging forward and apart
      lL = lR = -0.9; lLz = -0.35; lRz = 0.35; bob = 0.02 * Math.abs(Math.sin(t * 5));
    } else if (mode === "lie") { // flat on the back in bed, arms along the body, slow breathing
      pitch = -Math.PI / 2; lL = lR = 0; aL = -0.06; aR = 0.06; bob = 0;
    } else if (mode === "sleep") { // lying back on a couch, arms loose
      pitch = -1.25; lL = lR = 1.15; aL = -0.5; aR = 0.5; aLx = aRx = 0.3; bob = 0.015 * Math.sin(t * 1.6);
    }
    if (mode === "stand" || mode === "sit" || mode === "ride" || mode === "walk" || mode === "run") {
      if (f.wave !== undefined) { aR = 2.7 - 0.35 * f.wave; aRx = 0; }
      if (f.prop === "hug") { aLx = aRx = -1.25; aL = 0.25; aR = -0.25; }
      if (f.prop === "holdup") { aL = -2.5 - 0.15 * Math.sin(t * 9); aR = 2.5 + 0.15 * Math.sin(t * 9 + 1); aLx = aRx = 0; }
      if (f.prop === "up") { aL = -2.6; aR = 2.6; aLx = aRx = 0; }
      if (f.prop === "notebook" || f.prop === "carry") { aLx = aRx = -1.1; aL = 0.35; aR = -0.35; }
      if (f.prop === "clap") { const c = Math.abs(Math.sin(t * 11)); aLx = aRx = -1.25; aL = 0.15 + 0.45 * c; aR = -aL; }
      if (f.prop === "point") { aRx = -1.5; aR = 0.1; }
      if (f.prop === "pull") { aLx = aRx = -0.7; aL = 0.15; aR = -0.15; }
      if (f.prop === "flip") { aRx = -1.2 - 0.5 * Math.max(0, Math.sin(t * 6)); aR = 0.1; aLx = -0.9; aL = 0.2; }
      if (f.prop === "wipe") { aRx = -2.0; aR = 0.2 + 0.15 * Math.sin(t * 8); }
      if (mode === "stand") bob = 0.008 * Math.sin(t * 2.1);
      if (expr === "laugh") bob += 0.02 * Math.abs(Math.sin(t * 9));
      if (robot && mode === "stand") bob += 0.006 * Math.sin(t * 13);
    }
    pitch += ((f.lean ?? 0) * Math.PI) / 180;
    this.armL.rotation.set(aLx, 0, aL); this.armR.rotation.set(aRx, 0, aR);
    this.legL.rotation.set(lL, 0, lLz); this.legR.rotation.set(lR, 0, lRz);
    const teen = !!o.teen, lk2 = teen ? 1.2 : 1;
    this.legL.scale.set(1, lk2, 1); this.legR.scale.set(1, lk2, 1); this.armL.scale.set(teen ? 0.92 : 1, teen ? 1.08 : 1, teen ? 0.92 : 1); this.armR.scale.copy(this.armL.scale);
    this.head.scale.setScalar(teen ? 0.93 : 1);
    this.body.position.y = bob - drop + (mode === "lie" ? 0 : LEG.h * (lk2 - 1)); this.body.rotation.set(pitch, 0, tilt);
    const hp = f.headTilt !== undefined ? (f.headTilt * Math.PI) / 180 : 0;
    this.head.rotation.set((expr === "laugh" ? -0.12 : 0) + (expr === "sad" || expr === "teary" ? 0.18 : 0) + hp, (mode === "stand" ? 0.15 * Math.sin(t * 0.6) : 0) + (f.look ?? 0) * 0.25, 0);
    this.root.visible = true;
  }
  hide() { this.root.visible = false; }
}
