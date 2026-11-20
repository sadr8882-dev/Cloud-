// Painted textures for the Wright brothers short: dune sand, muslin wing fabric with ribs, spruce wood, asphalt road,
// river water, a weathered board wall for the camp sheds.
import { ctex } from "./paint";

const INK = "rgba(36,24,34,0.9)";

export const sandTex = () => ctex("fSand", 1024, 1024, (g, r) => {
  g.fillStyle = "#ead7ad"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 900; k++) {
    const x = r() * 1024, y = r() * 1024, rr = 6 + r() * 30;
    g.fillStyle = r() < 0.5 ? "rgba(255,248,225,0.18)" : "rgba(170,140,95,0.14)";
    g.beginPath(); g.ellipse(x, y, rr * 2.2, rr * 0.5, 0.15, 0, 7); g.fill();
  }
  // wind ripples
  g.strokeStyle = "rgba(160,128,86,0.22)"; g.lineWidth = 3;
  for (let y = 10; y < 1024; y += 26 + r() * 10) {
    g.beginPath();
    for (let x = 0; x <= 1024; x += 16) g[x ? "lineTo" : "moveTo"](x, y + Math.sin(x * 0.02 + y) * 6);
    g.stroke();
  }
  for (let k = 0; k < 3000; k++) { g.fillStyle = r() < 0.5 ? "rgba(120,95,60,0.25)" : "rgba(255,255,255,0.3)"; g.fillRect(r() * 1024, r() * 1024, 2, 2); }
});

/** muslin: unbleached cotton with a rib every 32 px (u along the chord), stitched seams */
export const muslinTex = () => ctex("fMuslin", 1024, 256, (g, r) => {
  g.fillStyle = "#f1e6cc"; g.fillRect(0, 0, 1024, 256);
  for (let k = 0; k < 500; k++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.12)" : "rgba(150,125,90,0.08)"; g.fillRect(r() * 1024, r() * 256, 30 + r() * 60, 2); }
  for (let x = 16; x < 1024; x += 32) {
    g.fillStyle = "rgba(150,118,80,0.45)"; g.fillRect(x - 3, 0, 6, 256);
    g.fillStyle = "rgba(255,250,235,0.5)"; g.fillRect(x - 6, 0, 2, 256);
  }
  g.strokeStyle = "rgba(120,95,70,0.35)"; g.setLineDash([6, 6]); g.lineWidth = 2;
  for (const y of [18, 238]) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  g.setLineDash([]);
});

export const spruceTex = () => ctex("fSpruce", 256, 256, (g, r) => {
  g.fillStyle = "#c8945c"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(110,60,25,0.35)"; g.lineWidth = 2;
  for (let i = 0; i < 16; i++) { const x = r() * 256; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, 80, x - 6, 170, x + 3, 256); g.stroke(); }
});

export const boardsTex = () => ctex("fBoards", 512, 512, (g, r) => {
  g.fillStyle = "#a88a68"; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 42) {
    g.fillStyle = ["#a88a68", "#9c7e5e", "#b39675", "#8f7457"][Math.floor(r() * 4)];
    g.fillRect(x + 2, 0, 38, 512);
    g.fillStyle = "rgba(40,28,24,0.55)"; g.fillRect(x, 0, 3, 512);
    for (let k = 0; k < 4; k++) { g.fillStyle = "rgba(60,40,30,0.25)"; g.beginPath(); g.ellipse(x + 10 + r() * 20, r() * 512, 3, 6, 0, 0, 7); g.fill(); }
  }
  for (const y of [60, 450]) { g.fillStyle = "#3a2a24"; for (let x = 20; x < 512; x += 42) g.fillRect(x, y, 4, 4); }
});

export const asphaltTex = () => ctex("fAsphalt", 1024, 512, (g, r) => {
  g.fillStyle = "#5b5f68"; g.fillRect(0, 0, 1024, 512);
  for (let k = 0; k < 4000; k++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)"; g.fillRect(r() * 1024, r() * 512, 3, 3); }
  g.fillStyle = "#f2e6b8"; for (let x = 0; x < 1024; x += 256) g.fillRect(x + 30, 246, 150, 20);
  g.fillStyle = "#e9e9e9"; g.fillRect(0, 18, 1024, 10); g.fillRect(0, 484, 1024, 10);
});

export const waterTex = () => ctex("fWater", 1024, 1024, (g, r) => {
  g.fillStyle = "#3f86b6"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 260; k++) {
    const x = r() * 1024, y = r() * 1024, w = 30 + r() * 90;
    g.strokeStyle = r() < 0.6 ? "rgba(190,230,250,0.55)" : "rgba(20,60,110,0.35)"; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 8, x + w, y); g.stroke();
  }
});

export const jetTex = () => ctex("fJet", 1024, 256, (g) => {
  g.fillStyle = "#f4f6f8"; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "#2f5fa8"; g.fillRect(0, 150, 1024, 22);
  g.fillStyle = "#e2453c"; g.fillRect(0, 176, 1024, 8);
  g.fillStyle = "#26324a"; for (let x = 40; x < 980; x += 22) { g.beginPath(); g.ellipse(x, 110, 6, 9, 0, 0, 7); g.fill(); }
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(200, 95, 28, 70); g.strokeRect(760, 95, 28, 70);
});

export const shopSignless = () => ctex("fShop", 1024, 1024, (g, r) => {
  // shop front: big display window with bicycles drawn inside, awning stripes, door (no lettering: no text in the film)
  g.fillStyle = "#b9673f"; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 24) for (let x = (y / 24) % 2 ? -32 : 0; x < 1024; x += 64) { g.fillStyle = ["#b9673f", "#c4724a", "#ad5f3a"][Math.floor(r() * 3)]; g.fillRect(x + 2, y + 2, 60, 20); }
  g.fillStyle = "#2c3e50"; g.fillRect(90, 430, 560, 420); g.fillStyle = "#3d5a73"; g.fillRect(100, 440, 540, 400);
  g.strokeStyle = "#e9dcc0"; g.lineWidth = 16; g.strokeRect(90, 430, 560, 420);
  // bicycles in the window
  for (const cx of [230, 470]) {
    g.strokeStyle = "#1c1c22"; g.lineWidth = 8;
    for (const dx of [-70, 70]) { g.beginPath(); g.arc(cx + dx, 760, 55, 0, 7); g.stroke(); }
    g.beginPath(); g.moveTo(cx - 70, 760); g.lineTo(cx - 10, 680); g.lineTo(cx + 50, 680); g.lineTo(cx + 70, 760); g.moveTo(cx - 10, 680); g.lineTo(cx, 760); g.lineTo(cx + 50, 680); g.stroke();
  }
  g.fillStyle = "#5a3b2a"; g.fillRect(730, 470, 200, 380); g.strokeStyle = "#e9dcc0"; g.lineWidth = 14; g.strokeRect(730, 470, 200, 380);
  g.fillStyle = "#e8c45a"; g.beginPath(); g.arc(900, 670, 10, 0, 7); g.fill();
  for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? "#f4f0e6" : "#2f6a43"; g.fillRect(60 + i * 100, 330, 100, 80); }
  g.fillStyle = "#cbbca2"; g.fillRect(0, 850, 1024, 174);
  for (const x of [120, 420, 720]) { g.fillStyle = "#2c3e50"; g.fillRect(x, 80, 160, 190); g.strokeStyle = "#e9dcc0"; g.lineWidth = 10; g.strokeRect(x, 80, 160, 190); }
});
