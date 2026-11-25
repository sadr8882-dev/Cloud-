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
