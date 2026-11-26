// Effect cards for "One Wish" (canvas drawings, unlit): Zzz, sparkles, balloons, stamps, bonk stars, burning letters,
// a frying pan, speech / thought bubbles, a personal sun, sweat, smell lines, candle flames, smoke, wind, confetti,
// the notebook pages, WOOF / BURP bursts, a 3 m measure, fire, hearts, a medal, crumbs.
import type { Pen } from "./toon";
const INK = "#241726";
const text = (p: Pen, s: string, x: number, y: number, size: number, fill: string, ol = 10, rot = 0) => {
  const g = p.g; g.save(); g.translate(x, y); g.rotate(rot);
  g.font = `900 ${size}px "Arial Black", "DejaVu Sans", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineJoin = "round"; g.lineWidth = ol; g.strokeStyle = INK; g.strokeText(s, 0, 0); g.fillStyle = fill; g.fillText(s, 0, 0); g.restore();
};
const star = (p: Pen, cx: number, cy: number, r: number, fill: string, ol = 6, n = 5, rot = 0) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) { const a = rot + (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  p.poly(pts, fill, ol);
};
const cloud = (p: Pen, cx: number, cy: number, w: number, h: number, fill: string, ol = 8) => {
  const n = 9;
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, x = cx + Math.cos(a) * w * 0.38, y = cy + Math.sin(a) * h * 0.3;
    p.ell(x, y, w * 0.22, h * 0.26, fill, pass ? 0 : ol);
  }
  p.ell(cx, cy, w * 0.36, h * 0.3, fill, 0);
};

export const zzz = (p: Pen) => { text(p, "Z", 70, 210, 90, "#ffffff", 12, -0.2); text(p, "Z", 140, 130, 70, "#ffffff", 10, -0.1); text(p, "z", 200, 60, 56, "#ffffff", 9, 0.1); };
export const sparkle = (p: Pen) => { star(p, 128, 128, 110, "#fff3a0", 8, 4); star(p, 128, 128, 50, "#ffffff", 0, 4); };
export const balloons = (p: Pen) => {
  const cols = ["#e2453c", "#f3d35a", "#3f8fe0", "#4cb050", "#c25ad0"];
  [[60, 80], [130, 50], [200, 90], [100, 140], [170, 150]].forEach(([x, y], i) => { p.stroke([[x, y + 40], [128, 400]], 3, "#7a6a60"); p.ell(x, y, 42, 50, cols[i], 6); p.ell(x - 14, y - 18, 9, 13, "rgba(255,255,255,0.7)", 0); });
};
export const stamp = (p: Pen) => {
  const g = p.g; g.save(); g.translate(256, 110); g.rotate(-0.12);
  g.strokeStyle = "#d22e2e"; g.lineWidth = 14; g.strokeRect(-230, -70, 460, 140);
  g.font = `900 66px "Arial Black", "DejaVu Sans", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#d22e2e"; g.fillText("NO TAKE-BACKS", 0, 4); g.restore();
};
export const bonk = (p: Pen, k: number) => { star(p, 150, 150, 120 + 20 * k, "#fff07a", 10, 8, k); text(p, "BONK!", 150, 150, 70, "#e2453c", 12, -0.15); };
export const dizzy = (p: Pen, k: number) => { for (let i = 0; i < 3; i++) { const a = k * 6 + (i / 3) * Math.PI * 2; star(p, 128 + Math.cos(a) * 90, 60 + Math.sin(a) * 26, 26, "#ffe14a", 5); } };
export const speed = (p: Pen) => { for (let i = 0; i < 9; i++) { const y = 20 + i * 26, x0 = (i * 53) % 90; p.stroke([[x0, y], [x0 + 300 + (i % 3) * 60, y]], i % 2 ? 6 : 10, "rgba(255,255,255,0.9)"); } };
export const flames = (p: Pen, k: number, s = 1) => {
  for (let i = 0; i < 5; i++) {
    const x = 60 + i * 34, h = (110 + 50 * Math.sin(k * 9 + i * 1.7)) * s;
    p.poly([[x - 26, 240], [x - 10, 240 - h * 0.6], [x + 2, 240 - h], [x + 14, 240 - h * 0.55], [x + 26, 240]], "#ff7a1e", 0);
    p.poly([[x - 14, 240], [x - 4, 240 - h * 0.4], [x + 2, 240 - h * 0.65], [x + 10, 240 - h * 0.35], [x + 14, 240]], "#ffd23a", 0);
  }
};
export const burningLetter = (p: Pen, k: number) => {
  p.poly([[30, 150], [226, 150], [226, 250], [30, 250]], "#f7f1e1", 8); p.stroke([[30, 150], [128, 210], [226, 150]], 6);
  const g = p.g; g.save(); g.translate(0, -60); flames(p, k, 0.8); g.restore();
};
export const pan = (p: Pen) => { p.stroke([[150, 128], [250, 128]], 22, INK); p.stroke([[150, 128], [248, 128]], 14, "#7a4f33"); p.ell(90, 128, 82, 40, "#3b3f52", 8); p.ell(90, 122, 62, 26, "#2a2d38", 0); };
export const silence = (p: Pen) => {
  p.ell(128, 100, 112, 78, "#ffffff", 8); p.poly([[70, 160], [56, 222], [110, 170]], "#ffffff", 0); p.stroke([[66, 166], [56, 222], [104, 174]], 8);
  for (const x of [88, 128, 168]) p.dot(x, 100, 11);
};
export const miniSun = (p: Pen, k: number) => {
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + k; p.stroke([[128 + Math.cos(a) * 70, 128 + Math.sin(a) * 70], [128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112]], 14, "#ffb22e"); }
  p.ell(128, 128, 62, 62, "#ffd23a", 8); p.dot(108, 118, 7); p.dot(148, 118, 7); p.arc(128, 136, 22, 16, 20, 160, 7);
};
export const drop = (p: Pen) => { p.poly([[64, 10], [100, 80], [64, 118], [28, 80]], "#8fd0ff", 6); p.ell(64, 84, 34, 32, "#8fd0ff", 0); p.ell(52, 70, 8, 12, "#ffffff", 0); };
export const smell = (p: Pen, k: number) => {
  for (let j = 0; j < 3; j++) { const pts: [number, number][] = []; for (let i = 0; i <= 24; i++) { const x = i * 21; pts.push([x, 60 + j * 60 + 18 * Math.sin(i * 0.8 + k * 6 + j)]); } p.stroke(pts, 12, ["#ffd1e8", "#fff1a8", "#c8f5d0"][j]); }
};
export const flame = (p: Pen, k: number) => {
  const w = 1 + 0.12 * Math.sin(k * 23);
  p.ell(64, 92, 30 * w, 52, "#ff9a2e", 0); p.ell(64, 104, 18 * w, 32, "#ffe36a", 0); p.ell(64, 112, 8, 14, "#ffffff", 0);
};
export const smoke = (p: Pen, k: number) => { for (let i = 0; i < 4; i++) p.ell(64 + 18 * Math.sin(k * 3 + i), 220 - i * 50 - k * 30, 22 + i * 6, 20 + i * 5, `rgba(200,200,210,${0.75 - i * 0.15})`, 0); };
export const wind = (p: Pen, k: number) => { for (let i = 0; i < 4; i++) { const y = 40 + i * 40, o = (k * 200 + i * 37) % 120; p.stroke([[o, y], [o + 120, y - 6], [o + 170, y + 10]], 8, "rgba(255,255,255,0.95)"); } };
export const thought = (p: Pen) => {
  cloud(p, 200, 130, 330, 220, "#ffffff", 8); p.ell(70, 270, 22, 18, "#ffffff", 7); p.ell(40, 300, 13, 11, "#ffffff", 6);
  p.poly([[170, 150], [230, 150], [200, 230]], "#e8b06a", 6); for (let i = 0; i < 3; i++) p.stroke([[175 + i * 8, 165 + i * 18], [225 - i * 8, 165 + i * 18]], 4, "#b07a3a");
  p.ell(200, 128, 44, 36, "#ffb3cf", 6); p.ell(200, 92, 32, 28, "#b8f0d0", 6); p.dot(200, 62, 9, "#d22e2e");
};
export const confetti = (p: Pen, i: number) => { const cols = ["#e2453c", "#f3d35a", "#3f8fe0", "#4cb050", "#ff8ad0", "#ffffff"]; p.poly([[8, 4], [56, 10], [52, 26], [4, 20]], cols[i % 6], 0); };
export const ten = (p: Pen) => {
  const g = p.g; g.save(); g.font = `900 220px "Arial Black", "DejaVu Sans", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 16; g.strokeStyle = INK; g.strokeText("10", 160, 130); const gr = g.createLinearGradient(0, 30, 0, 230); gr.addColorStop(0, "#ffe680"); gr.addColorStop(1, "#e8a21e"); g.fillStyle = gr; g.fillText("10", 160, 130);
  g.fillStyle = "rgba(255,255,255,0.6)"; g.fillRect(60, 60, 30, 12); g.restore(); p.stroke([[160, 240], [150, 320]], 3, "#7a6a60");
};
export const notebook = (p: Pen, page: number) => {
  p.poly([[10, 10], [502, 10], [502, 350], [10, 350]], "#3f6fb5", 8); p.poly([[24, 22], [252, 26], [252, 340], [24, 336]], "#fbf6e8", 4); p.poly([[260, 26], [488, 22], [488, 336], [260, 340]], "#fbf6e8", 4);
  for (let y = 70; y < 330; y += 26) { p.stroke([[34, y], [244, y]], 2, "#a8c4e8"); p.stroke([[268, y], [478, y]], 2, "#a8c4e8"); }
  const g = p.g; g.fillStyle = "#2a3a8a"; g.font = `700 26px "DejaVu Sans", sans-serif`; g.textAlign = "left";
  const L = [["MY WISH", "PLAN #" + (page * 17 + 3), "- a dragon?", "- no, too big", "- 1000 wishes", "  (not allowed)"],
    ["- a rocket", "- a pool of", "  ice cream", "- fly!!!", "- be the boss", "  of the dog"], ["FINAL LIST", "1. rocket", "2. dragon", "3. ???", "DON'T LET", "PIP NEAR!!"]][page % 3];
  L.forEach((s, i) => g.fillText(s, 38, 60 + i * 44));
  star(p, 380, 120, 60, "#f3d35a", 5); p.ell(370, 260, 56, 40, "#ff9ab8", 5); p.stroke([[330, 300], [420, 220]], 5, "#e2453c");
};
export const woof = (p: Pen, k: number) => {
  for (let i = 0; i < 3; i++) p.arc(256, 256, 120 + i * 60 + k * 80, 100 + i * 50 + k * 60, 0, 360, 10 - i * 2, "rgba(255,255,255,0.9)");
  star(p, 256, 256, 170, "#fff07a", 12, 12, 0.2); text(p, "WOOF!", 256, 256, 110, "#e2453c", 16, -0.1);
};
export const burp = (p: Pen) => { cloud(p, 200, 120, 380, 220, "#d8f5c0", 8); text(p, "BURP!", 200, 124, 80, "#7ab84a", 12, 0.08); };
export const measure = (p: Pen) => {
  p.stroke([[20, 70], [492, 70]], 10, "#ffffff"); p.poly([[10, 70], [50, 40], [50, 100]], "#ffffff", 6); p.poly([[502, 70], [462, 40], [462, 100]], "#ffffff", 6);
  text(p, "3 m", 256, 150, 72, "#f3d35a", 12);
};
export const hearts = (p: Pen, k: number) => {
  for (let i = 0; i < 4; i++) {
    const x = 50 + i * 55, y = 230 - ((k * 140 + i * 60) % 220), s = 0.6 + 0.4 * ((i * 7) % 3) / 2;
    p.ell(x - 12 * s, y, 15 * s, 15 * s, "#ff5a8a", 0); p.ell(x + 12 * s, y, 15 * s, 15 * s, "#ff5a8a", 0); p.poly([[x - 26 * s, y + 4 * s], [x + 26 * s, y + 4 * s], [x, y + 34 * s]], "#ff5a8a", 0);
  }
};
export const medal = (p: Pen) => {
  p.poly([[40, 0], [90, 0], [128, 110], [100, 120]], "#3f6fb5", 4); p.poly([[216, 0], [166, 0], [128, 110], [156, 120]], "#d23b3b", 4);
  p.ell(128, 170, 72, 72, "#f3c63a", 8); p.ell(128, 170, 52, 52, "#e8a21e", 0); star(p, 128, 170, 40, "#fff3a0", 5);
};
export const crumbs = (p: Pen, i: number) => { const c = ["#ffb3cf", "#b8f0d0", "#e8b06a"][i % 3]; p.ell(32, 32, 26, 20, c, 4); };
export const pop = (p: Pen, k: number) => { cloud(p, 256, 256, 460 * (0.6 + 0.4 * k), 400 * (0.6 + 0.4 * k), `rgba(255,255,255,${1 - 0.6 * k})`, 0); for (let i = 0; i < 10; i++) { const a = i * 0.63; star(p, 256 + Math.cos(a) * 200 * (0.5 + k), 256 + Math.sin(a) * 180 * (0.5 + k), 26, "#fff3a0", 0, 4); } };
export const bang = (p: Pen) => { star(p, 128, 128, 120, "#ffffff", 8, 10); text(p, "!", 128, 135, 140, "#e2453c", 12); };
export const tears = (p: Pen, k: number) => { for (let i = 0; i < 6; i++) { const y = ((k * 300 + i * 45) % 260); p.ell(30 + (i % 2) * 196, 20 + y, 10, 14, "#7cc8ff", 3); } };
export const dust = (p: Pen, k: number) => { for (let i = 0; i < 7; i++) { const x = 40 + i * 72, s = 1 + k; p.ell(x, 200 - 30 * Math.sin(i * 1.3) * s, 48 * s, 40 * s, `rgba(235,225,200,${0.85 - 0.6 * k})`, 0); } };

// ---------------- "The Wrong Button" ----------------
export const question = (p: Pen) => text(p, "?", 64, 70, 120, "#f3d35a", 12, 0.1);
export const mineSign = (p: Pen) => {
  p.stroke([[128, 150], [128, 250]], 16, "#8a5a34");
  p.poly([[14, 20], [242, 28], [236, 160], [20, 150]], "#d9b27a", 8);
  text(p, "MINE!", 128, 92, 70, "#e2453c", 10, -0.05);
};
export const siren = (p: Pen, k: number) => {
  const on = Math.floor(k * 6) % 2 === 0;
  if (on) for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.stroke([[128 + Math.cos(a) * 70, 110 + Math.sin(a) * 70], [128 + Math.cos(a) * 118, 110 + Math.sin(a) * 118]], 12, "#ff5a4a"); }
  p.poly([[78, 200], [178, 200], [168, 120], [88, 120]], on ? "#ff3a2a" : "#a8241c", 8);
  p.ell(128, 120, 40, 34, on ? "#ff7a6a" : "#c0342a", 8); p.poly([[60, 200], [196, 200], [196, 226], [60, 226]], "#3b3f52", 6);
};
export const towerAlone = (p: Pen) => {
  const g = p.g;
  // thought cloud with a picture: the tower on a bare hill, a volcano and a dinosaur
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; p.ell(256 + Math.cos(a) * 170, 190 + Math.sin(a) * 120, 90, 80, "#ffffff", pass ? 0 : 8); }
  p.ell(256, 190, 180, 130, "#ffffff", 0);
  g.save(); g.beginPath(); g.ellipse(256, 195, 175, 118, 0, 0, 7); g.clip();
  g.fillStyle = "#ffd9a0"; g.fillRect(60, 60, 400, 260); p.ell(256, 330, 230, 90, "#9ad06a", 6);
  p.poly([[110, 260], [150, 170], [190, 260]], "#9a6a4a", 6); p.ell(150, 165, 22, 14, "#ff7a2a", 0);
  p.poly([[236, 250], [276, 250], [276, 120], [236, 120]], "#c97a5a", 6); p.poly([[226, 122], [286, 122], [256, 84]], "#e2453c", 6); p.ell(256, 150, 13, 13, "#ffffff", 4); p.dot(256, 110, 9, "#e2332e");
  p.ell(360, 240, 46, 26, "#4cb050", 6); p.poly([[392, 236], [420, 190], [430, 196], [404, 244]], "#4cb050", 6); p.ell(426, 186, 14, 10, "#4cb050", 5); p.dot(430, 183, 3);
  g.restore();
  p.ell(110, 352, 26, 20, "#ffffff", 7); p.ell(80, 392, 15, 12, "#ffffff", 6);
};
export const notes = (p: Pen, k: number) => {
  for (let i = 0; i < 4; i++) {
    const x = 40 + i * 60 + 12 * Math.sin(k * 6 + i), y = 210 - ((k * 160 + i * 55) % 190);
    p.ell(x, y, 16, 12, "#241726", 0); p.stroke([[x + 14, y], [x + 14, y - 56]], 6, "#241726"); if (i % 2) p.stroke([[x + 14, y - 56], [x + 36, y - 44]], 8, "#241726");
  }
};
export const say = (p: Pen, s: string, size: number, opt: { w?: number; h?: number; fill?: string; ink?: string; tail?: -1 | 1; jag?: boolean } = {}) => {
  const w = opt.w ?? 480, h = opt.h ?? 240, cx = w / 2, cy = h * 0.42, tl = opt.tail ?? -1;
  if (opt.jag) {
    const pts: [number, number][] = []; for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2, r = i % 2 ? 0.86 : 1; pts.push([cx + Math.cos(a) * (w * 0.47) * r, cy + Math.sin(a) * (h * 0.38) * r]); } p.poly(pts, opt.fill ?? "#fff7a0", 8);
  } else p.ell(cx, cy, w * 0.46, h * 0.36, opt.fill ?? "#ffffff", 8);
  p.poly([[cx + tl * w * 0.12, cy + h * 0.28], [cx + tl * w * 0.3, h * 0.98], [cx + tl * w * 0.02, cy + h * 0.32]], opt.fill ?? "#ffffff", 0);
  p.stroke([[cx + tl * w * 0.13, cy + h * 0.32], [cx + tl * w * 0.3, h * 0.98], [cx + tl * w * 0.02, cy + h * 0.34]], 8);
  const lines = s.split("\n");
  lines.forEach((l, i) => text(p, l, cx, cy + (i - (lines.length - 1) / 2) * size * 1.08, size, opt.ink ?? "#241726", Math.max(2, size * 0.08)));
};
export const monocle = (p: Pen) => { p.ell(64, 64, 50, 50, "rgba(220,240,255,0.35)", 10); p.stroke([[100, 100], [118, 128]], 6, "#e9c24a"); p.ell(64, 64, 50, 50, "rgba(0,0,0,0)", 6); };
export const word = (p: Pen, s: string, fill: string, burst = "#fff07a", size = 92) => { star(p, 256, 128, 200, burst, 10, 12, 0.15); text(p, s, 256, 132, size, fill, 14, -0.08); };
export const ring = (p: Pen) => { p.ell(256, 256, 236, 236, "rgba(0,0,0,0)", 0); p.arc(256, 256, 236, 236, 0, 360, 22, "rgba(255,240,140,0.95)"); p.arc(256, 256, 206, 206, 0, 360, 10, "rgba(255,255,255,0.8)"); };
export const poofOutline = (p: Pen, k: number) => {
  const g = p.g; g.save(); g.setLineDash([18, 14]); p.stroke([[100, 470], [100, 240], [70, 240], [70, 120], [186, 120], [186, 240], [156, 240], [156, 470]], 8, "rgba(255,255,255,0.9)"); g.restore();
  for (let i = 0; i < 6; i++) { const a = i * 1.05, r = 60 + 80 * k; p.ell(128 + Math.cos(a) * r, 300 + Math.sin(a) * r * 0.6, 34 * (1 - k * 0.5), 28 * (1 - k * 0.5), `rgba(235,225,200,${0.9 - 0.7 * k})`, 0); }
};
export const noodle = (p: Pen, i: number) => {
  const pts: [number, number][] = []; for (let k = 0; k <= 16; k++) pts.push([16 + 18 * Math.sin(k * 0.9 + i), k * 14 + 6]);
  p.stroke(pts, 13, "#c98a1e"); p.stroke(pts, 8, "#f6d36a"); if (i % 3 === 0) p.ell(26, 120, 18, 18, "#8a3a22", 5);
};
export const pile = (p: Pen, i: number) => {
  p.ell(128, 128, 116, 86, "#f6d36a", 8);
  for (let k = 0; k < 14; k++) { const a = k * 1.7 + i, r = 30 + (k % 4) * 18; p.arc(128 + Math.cos(a) * r * 0.6, 128 + Math.sin(a) * r * 0.45, 26, 14, k * 40, k * 40 + 200, 6, "#c98a1e"); }
  p.ell(110, 118, 22, 20, "#8a3a22", 5); p.ell(150, 140, 18, 16, "#8a3a22", 5); p.ell(132, 104, 16, 14, "#d23b3b", 4);
};
export const counter = (p: Pen, n: number) => { p.ell(128, 128, 104, 104, "#ffffff", 10); text(p, "x" + n, 128, 134, 96, "#e2453c", 12); };
export const firework = (p: Pen, k: number, hue: number) => {
  const cols = [["#ff5a8a", "#fff3a0"], ["#5ad0ff", "#ffffff"], ["#ffd23a", "#ff7a2a"], ["#8cff7a", "#ffffff"]][hue % 4];
  const r = 30 + 200 * Math.min(1, k * 1.6), fade = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
  p.g.globalAlpha = Math.max(0, fade);
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; p.stroke([[256 + Math.cos(a) * r * 0.55, 256 + Math.sin(a) * r * 0.55], [256 + Math.cos(a) * r, 256 + Math.sin(a) * r]], 12, cols[i % 2]); star(p, 256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 14, cols[(i + 1) % 2], 0, 4); }
  p.g.globalAlpha = 1;
};
export const jets = (p: Pen, k: number) => {
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.32, pts: [number, number][] = [];
    for (let s = 0; s <= 14; s++) { const u = s / 14; pts.push([256 + Math.cos(a) * 260 * u, 480 + Math.sin(a) * 420 * u + 380 * u * u]); }
    p.stroke(pts, 20, "#ffe14a"); p.stroke(pts, 8, "#fff7c0");
    for (let d = 0; d < 3; d++) { const u = ((k * 2 + d * 0.33 + i * 0.1) % 1); p.ell(256 + Math.cos(a) * 260 * u, 480 + Math.sin(a) * 420 * u + 380 * u * u, 12, 14, "#fff07a", 4); }
  }
  p.ell(150, 100, 26, 26, "#ffe14a", 5); p.stroke([[150, 74], [150, 126]], 4, "#f6b324"); p.stroke([[124, 100], [176, 100]], 4, "#f6b324");
};
export const bulb = (p: Pen) => {
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2; p.stroke([[128 + Math.cos(a) * 80, 104 + Math.sin(a) * 80], [128 + Math.cos(a) * 112, 104 + Math.sin(a) * 112]], 10, "#fff07a"); }
  p.ell(128, 100, 58, 60, "#fff07a", 8); p.poly([[100, 150], [156, 150], [150, 190], [106, 190]], "#a8b0bc", 6); p.stroke([[106, 166], [150, 166]], 5); p.stroke([[112, 150], [120, 110], [136, 110], [144, 150]], 5, "#f6b324");
};
export const eggLetter = (p: Pen) => {
  p.ell(128, 140, 84, 104, "#fbf3e2", 8);
  p.poly([[70, 110], [186, 110], [186, 180], [70, 180]], "#f7f1e1", 6); p.stroke([[70, 110], [128, 150], [186, 110]], 6); p.dot(166, 128, 9, "#d23b3b");
  p.stroke([[60, 96], [86, 80], [104, 100], [128, 82], [150, 100], [172, 82], [196, 96]], 6);
};
export const envelope = (p: Pen) => { p.poly([[10, 20], [118, 20], [118, 92], [10, 92]], "#f7f1e1", 6); p.stroke([[10, 20], [64, 62], [118, 20]], 5); p.dot(100, 36, 7, "#d23b3b"); };
export const crack = (p: Pen) => { for (let i = 0; i < 7; i++) { const a = i * 0.9, pts: [number, number][] = [[128, 128]]; for (let k = 1; k <= 4; k++) pts.push([128 + Math.cos(a + k * 0.2) * k * 28, 128 + Math.sin(a - k * 0.15) * k * 28]); p.stroke(pts, 5, "rgba(255,255,255,0.95)"); } };
export const bird = (p: Pen, k: number) => { const f = Math.sin(k * 30) * 30; p.stroke([[20, 64 + f], [64, 70], [108, 64 + f]], 9); p.ell(64, 72, 10, 8, "#241726", 0); };
export const thinkBite = (p: Pen, share: boolean) => {
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; p.ell(200 + Math.cos(a) * 120, 130 + Math.sin(a) * 80, 70, 60, "#ffffff", pass ? 0 : 8); }
  p.ell(200, 130, 140, 92, "#ffffff", 0); p.ell(70, 270, 20, 16, "#ffffff", 7); p.ell(44, 300, 12, 10, "#ffffff", 6);
  if (share) { for (const x of [150, 250]) { p.poly([[x - 40, 170], [x + 40, 170], [x + 40, 120], [x - 40, 96]], "#6a3a22", 6); p.poly([[x - 40, 96], [x + 40, 120], [x + 40, 108], [x - 40, 84]], "#f7e6d0", 4); } text(p, "+", 200, 140, 60, "#4cb050", 8); }
  else { p.ell(200, 140, 90, 50, "#6a3a22", 6); p.ell(200, 112, 90, 26, "#8a5232", 6); p.dot(200, 92, 14, "#d22e2e"); p.ell(265, 125, 34, 34, "#ffffff", 0); p.ell(250, 110, 26, 22, "#ffffff", 0); text(p, "CHOMP", 200, 210, 34, "#e2453c", 6, -0.05); }
};

// ---------------- "Wanted: One Dad" ----------------
const hand = (p: Pen, lines: string[], x: number, y0: number, size: number, col = "#2a3a8a", lh = 1.25, align: CanvasTextAlign = "left") => {
  const g = p.g; g.fillStyle = col; g.font = `700 ${size}px "Comic Sans MS", "DejaVu Sans", sans-serif`; g.textAlign = align; g.textBaseline = "middle";
  lines.forEach((l, i) => g.fillText(l, x, y0 + i * size * lh));
};
/** the WANTED poster; n = how many of the three wishes are written yet */
export const poster = (p: Pen, n = 3) => {
  p.poly([[12, 10], [500, 18], [494, 690], [18, 682]], "#fbf3d8", 8);
  text(p, "WANTED:", 256, 86, 74, "#e2453c", 10, -0.03); text(p, "ONE DAD", 256, 170, 82, "#3f6fb5", 10, 0.02);
  // a stick dad with a question mark face
  p.ell(256, 270, 38, 38, "#ffe2c2", 6); text(p, "?", 256, 274, 48, "#241726", 0);
  p.stroke([[256, 308], [256, 380]], 8); p.stroke([[214, 330], [298, 330]], 8); p.stroke([[256, 380], [224, 430]], 8); p.stroke([[256, 380], [288, 430]], 8);
  const items: [string, (x: number, y: number) => void][] = [
    ["makes pancakes", (x, y) => { p.ell(x, y, 26, 10, "#d9954a", 4); p.ell(x, y - 8, 24, 9, "#e8b06a", 4); }],
    ["does NOT snore", (x, y) => { text(p, "Zz", x, y, 34, "#7a6aa8", 4); p.stroke([[x - 26, y + 22], [x + 26, y - 22]], 6, "#e2453c"); }],
    ["loves dinosaurs", (x, y) => { p.ell(x, y, 24, 14, "#5ac83a", 4); p.ell(x + 22, y - 14, 11, 10, "#5ac83a", 4); p.poly([[x - 22, y], [x - 44, y - 6], [x - 22, y + 8]], "#5ac83a", 4); }],
  ];
  items.slice(0, n).forEach(([s, ic], i) => { const y = 488 + i * 64; p.poly([[54, y - 18], [90, y - 18], [90, y + 18], [54, y + 18]], "#ffffff", 4); p.stroke([[60, y], [70, y + 10], [86, y - 12]], 6, "#4cb050"); hand(p, [s], 104, y, 34); ic(440, y); });
};
export const candidate = (p: Pen, n: number) => {
  p.poly([[8, 30], [504, 10], [496, 150], [16, 166]], "#3f6fb5", 8);
  text(p, "CANDIDATE", 256, 70, 58, "#ffffff", 10, -0.04); text(p, "#" + n, 256, 128, 52, "#f3d35a", 10, -0.04);
};
export const foam = (p: Pen, k: number) => {
  for (let i = 0; i < 9; i++) { const a = i * 0.7 + k, r = 60 + (i % 3) * 40; p.ell(256 + Math.cos(a) * r * 1.4, 280 + Math.sin(a) * r * 0.7, 80 - (i % 3) * 12, 66 - (i % 3) * 10, "#ffffff", 6); }
  for (let i = 0; i < 9; i++) { const a = i * 0.7 + k, r = 60 + (i % 3) * 40; p.ell(256 + Math.cos(a) * r * 1.4, 280 + Math.sin(a) * r * 0.7, 76 - (i % 3) * 12, 62 - (i % 3) * 10, "#ffffff", 0); }
  for (let i = 0; i < 8; i++) p.ell(120 + i * 40, 200 + 40 * Math.sin(i * 2 + k), 10, 10, "rgba(200,235,255,0.9)", 3);
};
export const spray = (p: Pen, k: number) => { for (let i = 0; i < 7; i++) { const y = 128 + (i - 3) * 14, o = (k * 300 + i * 40) % 80; p.stroke([[o, y], [o + 160, y + (i - 3) * 6], [o + 300, y + (i - 3) * 16]], 14 - Math.abs(i - 3) * 2, "rgba(220,245,255,0.95)"); } };
export const note = (p: Pen) => {
  p.poly([[10, 14], [500, 6], [504, 330], [6, 338]], "#fdf8ea", 8);
  for (let y = 70; y < 330; y += 40) p.stroke([[30, y + 18], [480, y + 18]], 2, "#d8cdb0");
  hand(p, ["Are you looking for", "your father?", "", "Go to the", "old oak tree."], 40, 68, 40, "#4a2c6a", 1.0);
};
export const map = (p: Pen) => {
  p.poly([[10, 20], [500, 8], [506, 494], [4, 504]], "#f1dcae", 8);
  for (let i = 0; i < 6; i++) p.stroke([[30 + i * 10, 40 + i * 70], [480 - i * 6, 52 + i * 70]], 2, "rgba(140,100,50,0.2)");
  hand(p, ["Find 3 things,", "and you will know me."], 256, 56, 32, "#6a3a1a", 1.15, "center");
  const items: [string, number, number, (x: number, y: number) => void][] = [
    ["1. cap", 100, 210, (x, y) => { p.ell(x, y, 34, 22, "#c92a2a", 5, 180, 360); p.poly([[x, y], [x + 50, y], [x + 46, y + 8], [x, y + 6]], "#a81f1f", 4); }],
    ["2. rod", 256, 210, (x, y) => { p.stroke([[x - 30, y + 26], [x + 34, y - 30]], 7, "#8a5a34"); p.stroke([[x + 34, y - 30], [x + 40, y + 20]], 2, "#5a5a5a"); }],
    ["3. book", 412, 210, (x, y) => { p.poly([[x - 30, y - 22], [x + 30, y - 22], [x + 30, y + 22], [x - 30, y + 22]], "#2f6fa8", 5); }],
  ];
  items.forEach(([s, x, y, ic]) => { ic(x, y); hand(p, [s], x, y + 56, 28, "#6a3a1a", 1, "center"); });
  const g = p.g; g.save(); g.setLineDash([14, 12]); p.stroke([[100, 330], [190, 390], [300, 350], [400, 420]], 6, "#a8322a"); g.restore();
  p.stroke([[392, 404], [428, 440]], 10, "#a8322a"); p.stroke([[428, 404], [392, 440]], 10, "#a8322a");
  p.poly([[420, 330], [470, 330], [470, 370], [420, 370]], "#a8724a", 4); p.poly([[412, 332], [445, 304], [478, 332]], "#8a4a3a", 4); p.stroke([[445, 372], [445, 470]], 8, "#6a4428");
};
export const recipe = (p: Pen) => {
  p.poly([[8, 8], [504, 8], [504, 360], [8, 360]], "#fbf3e2", 6); p.stroke([[256, 10], [256, 358]], 4, "#d8cdb0");
  hand(p, ["Pancakes", "for my son"], 132, 80, 40, "#6a2a1a", 1.2, "center");
  for (let i = 0; i < 3; i++) { p.ell(132, 260 - i * 22, 70, 18, i % 2 ? "#d9954a" : "#e8b06a", 5); } p.ell(132, 214, 40, 10, "#8a4a1a", 0); p.ell(150, 206, 14, 8, "#fff4b0", 3);
  hand(p, ["2 eggs", "1 cup milk", "1 cup flour", "a spoon of", "  sugar", "LOTS of love"], 280, 60, 30, "#4a3a2a", 1.3);
  p.ell(470, 300, 22, 20, "#ff5a8a", 0); p.ell(440, 300, 22, 20, "#ff5a8a", 0); p.poly([[420, 306], [490, 306], [455, 344]], "#ff5a8a", 0);
  for (let i = 0; i < 30; i++) p.ell((i * 97) % 500, (i * 61) % 350, 6, 5, "rgba(255,255,255,0.7)", 0);
};
/** the old photo: a man holding a baby (both with the same big ears) */
export const photo = (p: Pen) => {
  p.poly([[6, 6], [378, 6], [378, 474], [6, 474]], "#fbf6ea", 6); p.poly([[30, 30], [354, 30], [354, 390], [30, 390]], "#e6c9a0", 0);
  const g = p.g; g.save(); g.beginPath(); g.rect(30, 30, 324, 360); g.clip();
  g.fillStyle = "#cfe0d0"; g.fillRect(30, 30, 324, 200); g.fillStyle = "#a8c890"; g.fillRect(30, 230, 324, 160);
  p.poly([[110, 390], [110, 250], [274, 250], [274, 390]], "#c9512a", 6); // shirt
  p.poly([[150, 250], [192, 290], [234, 250]], "#f4f1ea", 4);
  p.ell(192, 175, 62, 64, "#efc49a", 6); p.ell(128, 178, 14, 24, "#efc49a", 6); p.ell(256, 178, 14, 24, "#efc49a", 6); // big ears
  p.poly([[130, 140], [150, 108], [234, 108], [254, 140], [250, 120], [192, 96], [134, 120]], "#4a2c1a", 5);
  p.dot(170, 172, 7); p.dot(214, 172, 7); p.arc(192, 196, 22, 14, 20, 160, 6); p.poly([[142, 200], [242, 200], [236, 226], [148, 226]], "#4a2c1a", 0);
  p.ell(196, 300, 50, 38, "#bfe0ff", 6); p.ell(196, 268, 30, 30, "#ffe2c2", 6); p.ell(166, 268, 9, 14, "#ffe2c2", 5); p.ell(226, 268, 9, 14, "#ffe2c2", 5);
  p.dot(186, 266, 4); p.dot(206, 266, 4); p.arc(196, 276, 8, 6, 20, 160, 4);
  p.poly([[110, 300], [160, 290], [160, 320], [110, 330]], "#efc49a", 5); p.poly([[282, 300], [232, 290], [232, 320], [282, 330]], "#efc49a", 5);
  g.restore();
  hand(p, ["me & my boy"], 192, 432, 34, "#6a4a3a", 1, "center");
};
/** Dad's letter; n = lines written so far */
export const dadLetter = (p: Pen, n: number) => {
  p.poly([[10, 10], [500, 4], [506, 690], [4, 696]], "#fdf8ea", 8);
  for (let y = 80; y < 680; y += 52) p.stroke([[30, y + 24], [480, y + 24]], 2, "#e0d6bc");
  const L = ["If you are reading this,", "you are big now.", "I can't be there with you.", "", "But I left you my cap,", "my fishing rod,", "and our pancakes.", "", "Every time you make them,", "I'm right there with you.", "", "Love, Dad"];
  hand(p, L.slice(0, n), 44, 92, 34, "#2a3a6a", 1.53);
  if (n >= 12) { p.ell(380, 640, 18, 16, "#e2453c", 0); p.ell(406, 640, 18, 16, "#e2453c", 0); p.poly([[364, 646], [422, 646], [393, 676]], "#e2453c", 0); }
};
export const starWink = (p: Pen, k: number) => {
  const s = 0.6 + 0.4 * Math.max(0, Math.sin(k * Math.PI));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.stroke([[128 + Math.cos(a) * 30, 128 + Math.sin(a) * 30], [128 + Math.cos(a) * (60 + 60 * s * (i % 2 ? 0.6 : 1)), 128 + Math.sin(a) * (60 + 60 * s * (i % 2 ? 0.6 : 1))]], 8, "rgba(255,246,190,0.9)"); }
  star(p, 128, 128, 52 * s + 10, "#fff6b0", 0, 4); p.ell(128, 128, 16, 16, "#ffffff", 0);
};
export const sharkKite = (p: Pen) => {
  p.poly([[256, 20], [470, 220], [256, 420], [42, 220]], "#6aa8d8", 8);
  p.poly([[60, 220], [452, 220], [256, 420]], "#f4f1ea", 0); p.stroke([[42, 220], [470, 220]], 6);
  p.poly([[200, 150], [256, 60], [270, 160]], "#4a88b8", 6); // fin
  p.dot(160, 190, 14); p.dot(352, 190, 14); p.dot(164, 186, 5, "#ffffff"); p.dot(356, 186, 5, "#ffffff");
  for (let i = 0; i < 7; i++) p.poly([[150 + i * 30, 240], [165 + i * 30, 268], [180 + i * 30, 240]], "#ffffff", 3);
  p.stroke([[256, 420], [236, 470], [276, 500], [246, 540]], 5);
  for (const [x, y] of [[236, 470], [276, 500]]) p.poly([[x - 16, y - 8], [x + 16, y + 8], [x - 8, y + 12]], "#e2453c", 3);
};
export const glow = (p: Pen, k: number) => {
  const g = p.g, gr = g.createRadialGradient(128, 128, 10, 128, 128, 126); gr.addColorStop(0, "rgba(255,250,200,1)"); gr.addColorStop(0.4, "rgba(255,220,120,0.65)"); gr.addColorStop(1, "rgba(255,200,80,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 6; i++) { const a = i * 1.05 + k * 3; star(p, 128 + Math.cos(a) * 80, 128 + Math.sin(a) * 80, 10, "#ffffff", 0, 4); }
};
export const tear = (p: Pen) => { p.poly([[32, 4], [52, 40], [32, 60], [12, 40]], "#9fd8ff", 4); p.ell(32, 42, 18, 17, "#9fd8ff", 0); p.ell(26, 36, 4, 6, "#ffffff", 0); };
