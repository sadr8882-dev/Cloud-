// Painted textures for the gravity town: the clock face.
import { ctex } from "./paint";
export const clockTex = () => ctex("nClockFace", 512, 512, (g) => {
  g.fillStyle = "#f7f1e1"; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill();
  g.strokeStyle = "#241726"; g.lineWidth = 16; g.beginPath(); g.arc(256, 256, 238, 0, 7); g.stroke();
  g.lineCap = "round";
  for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; g.lineWidth = i % 3 ? 8 : 16; g.beginPath(); g.moveTo(256 + 180 * Math.sin(a), 256 - 180 * Math.cos(a)); g.lineTo(256 + 215 * Math.sin(a), 256 - 215 * Math.cos(a)); g.stroke(); }
  g.fillStyle = "#c9a23a"; g.beginPath(); g.arc(256, 256, 18, 0, 7); g.fill();
});

/** baseplate: flat colour with a faint 1-stud grid (each tile = 1 m at the repeat used in world.ts) */
export const plateTex = (key: string, base: string, line: string) => ctex("nPlate" + key, 256, 256, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  g.fillStyle = line; g.fillRect(0, 0, 256, 6); g.fillRect(0, 0, 6, 256);
  g.fillStyle = "rgba(255,255,255,0.10)"; g.fillRect(6, 6, 250, 4); g.fillRect(6, 6, 4, 250);
});

// ---------------- "realistic shader" textures (noise based) ----------------
const noise = (g: CanvasRenderingContext2D, r: () => number, w: number, h: number, n: number, cols: string[], size: [number, number]) => {
  for (let i = 0; i < n; i++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; const s = size[0] + r() * (size[1] - size[0]); g.fillRect(r() * w, r() * h, s, s * (0.6 + r())); }
};
export const grassReal = () => ctex("nGrassReal", 1024, 1024, (g, r) => {
  g.fillStyle = "#3f9a2a"; g.fillRect(0, 0, 1024, 1024);
  noise(g, r, 1024, 1024, 30000, ["#4caa30", "#358a22", "#5cbc3c", "#2c7a1c", "#6ac848", "#3c9628"], [2, 6]);
  noise(g, r, 1024, 1024, 260, ["#b8642a", "#d08a30", "#8a4a22", "#c8a040"], [5, 11]); // fallen leaves
  for (let i = 0; i < 60; i++) { g.fillStyle = r() < 0.5 ? "rgba(120,170,70,0.10)" : "rgba(30,60,20,0.10)"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 60 + r() * 120, 40 + r() * 90, r() * 3, 0, 7); g.fill(); }
});
export const pavingReal = () => ctex("nPaving", 1024, 1024, (g, r) => {
  g.fillStyle = "#8f8a82"; g.fillRect(0, 0, 1024, 1024);
  const S = 128;
  for (let y = 0; y < 1024; y += S) for (let x = 0; x < 1024; x += S) {
    const v = 150 + Math.floor(r() * 40); g.fillStyle = `rgb(${v},${v - 6},${v - 14})`; g.fillRect(x + 4, y + 4, S - 8, S - 8);
    noise(g, r, 0, 0, 0, [], [1, 1]);
    for (let k = 0; k < 220; k++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"; g.fillRect(x + 4 + r() * (S - 8), y + 4 + r() * (S - 8), 3, 3); }
  }
  g.fillStyle = "rgba(40,36,30,0.55)"; for (let i = 0; i <= 1024; i += S) { g.fillRect(i - 3, 0, 6, 1024); g.fillRect(0, i - 3, 1024, 6); }
});
/** wall: horizontal siding boards (white, tinted by the material colour) or brick */
export const sidingReal = () => ctex("nSiding", 512, 512, (g, r) => {
  g.fillStyle = "#f2f0ea"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) { g.fillStyle = "rgba(0,0,0,0.16)"; g.fillRect(0, y + 28, 512, 4); g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(0, y, 512, 3); }
  noise(g, r, 512, 512, 3000, ["rgba(0,0,0,0.04)", "rgba(255,255,255,0.05)"], [1, 3]);
});
export const brickReal = () => ctex("nBrickReal", 512, 512, (g, r) => {
  g.fillStyle = "#cfc6b8"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < 512; x += 64) {
    const v = 0.85 + r() * 0.3; g.fillStyle = `rgb(${Math.floor(178 * v)},${Math.floor(84 * v)},${Math.floor(62 * v)})`; g.fillRect(x + 3, y + 3, 58, 26);
  }
  noise(g, r, 512, 512, 4000, ["rgba(0,0,0,0.07)", "rgba(255,255,255,0.05)"], [1, 3]);
});
export const shingleReal = () => ctex("nShingle", 512, 512, (g, r) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 28) for (let x = (y / 28) % 2 ? -24 : 0; x < 512; x += 48) {
    const v = 200 + Math.floor(r() * 55); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x + 2, y + 2, 44, 24); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x + 2, y + 22, 44, 4);
  }
});
export const barkReal = () => ctex("nBark", 256, 512, (g, r) => {
  g.fillStyle = "#6b4a32"; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 70; i++) { g.strokeStyle = r() < 0.5 ? "rgba(30,18,10,0.45)" : "rgba(150,110,80,0.25)"; g.lineWidth = 2 + r() * 4; const x = r() * 256; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 10, 170, x - 10, 340, x + 4, 512); g.stroke(); }
});
export const leavesReal = (k: number) => ctex("nLeaves" + k, 512, 512, (g, r) => {
  g.fillStyle = ["#2f5a26", "#3a6b2c", "#2a4f2a"][k % 3]; g.fillRect(0, 0, 512, 512);
  noise(g, r, 512, 512, 9000, ["#3f7a30", "#26481f", "#4f8c3a", "#1f3d1a", "#5a9a44"], [3, 9]);
});
