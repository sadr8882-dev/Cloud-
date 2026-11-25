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
