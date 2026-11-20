// Painted textures for the Pisa set: white marble with grey bands, the tower's arcades and arches, the striped
// cathedral walls, terracotta walls, layered clay for the cutaway. All Canvas2D (paint.ts ctex cache).
import * as THREE from "three";
import { ctex, rng } from "./paint";

type G = CanvasRenderingContext2D;
const INK = "rgba(36,24,34,0.9)";
const MARBLE = ["#f3e6cc", "#eedfc2", "#f6ead3", "#e9d9bb"];

/** marble ashlar: soft blocks, faint veins, thin grey courses every `band` px */
const marbleBase = (g: G, r: () => number, w: number, h: number, course = 64, band = 0) => {
  g.fillStyle = MARBLE[0]; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += course) {
    let x = -r() * 120;
    while (x < w) {
      const bw = 90 + r() * 110;
      g.fillStyle = MARBLE[Math.floor(r() * 4)];
      g.fillRect(x, y, bw, course);
      g.fillStyle = "rgba(150,140,125,0.10)"; g.fillRect(x, y + course - 3, bw, 3);
      g.fillRect(x + bw - 2, y, 2, course);
      x += bw;
    }
    if (band && (y / course) % band === band - 1) { g.fillStyle = "rgba(120,124,136,0.30)"; g.fillRect(0, y + course * 0.35, w, course * 0.3); }
  }
  g.strokeStyle = "rgba(150,145,140,0.12)"; g.lineWidth = 1.5;
  for (let i = 0; i < 40; i++) {
    g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 60; y += r() * 30; g.lineTo(x, y); }
    g.stroke();
  }
};
const archPath = (g: G, cx: number, top: number, bot: number, hw: number) => {
  g.beginPath(); g.moveTo(cx - hw, bot); g.lineTo(cx - hw, top + hw); g.arc(cx, top + hw, hw, Math.PI, 0); g.lineTo(cx + hw, bot); g.closePath();
};

/** ground floor: 15 tall blind arches with pilasters (wraps around the drum once) */
export const arcadeTex = () => ctex("pisaArcade", 2048, 1024, (g, r) => {
  marbleBase(g, r, 2048, 1024, 64, 4);
  const n = 15, bw = 2048 / n;
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.5) * bw;
    archPath(g, cx, 170, 1024, bw * 0.36);
    g.fillStyle = "rgba(196,186,170,0.55)"; g.fill();
    g.strokeStyle = INK; g.lineWidth = 6; g.stroke();
    // lozenge inlay in the lunette
    g.fillStyle = "#9aa2b4"; g.beginPath(); g.moveTo(cx, 220); g.lineTo(cx + 22, 262); g.lineTo(cx, 304); g.lineTo(cx - 22, 262); g.closePath(); g.fill();
    g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    // door in one bay
    if (i === 7) { archPath(g, cx, 640, 1024, bw * 0.18); g.fillStyle = "#3a2c30"; g.fill(); g.strokeStyle = INK; g.lineWidth = 5; g.stroke(); }
    // pilaster between bays
    g.fillStyle = "rgba(255,255,255,0.55)"; g.fillRect(i * bw - 9, 120, 18, 904);
    g.fillStyle = "rgba(120,110,100,0.25)"; g.fillRect(i * bw + 6, 120, 4, 904);
  }
});

/** gallery core wall behind the colonnade: one dark arched opening per bay (4 bays per tile) */
export const coreTex = () => ctex("pisaCore", 1024, 512, (g, r) => {
  marbleBase(g, r, 1024, 512, 48, 3);
  for (let i = 0; i < 4; i++) {
    const cx = (i + 0.5) * 256;
    archPath(g, cx, 120, 512, 46);
    g.fillStyle = "#4a3b44"; g.fill(); g.strokeStyle = INK; g.lineWidth = 5; g.stroke();
    archPath(g, cx, 140, 512, 30); g.fillStyle = "#2c2229"; g.fill();
  }
});

/** arch band above the columns: marble with round-arched holes (alpha) between columns (4 bays per tile) */
export const archBandTex = () => ctex("pisaArchBand", 1024, 256, (g, r) => {
  marbleBase(g, r, 1024, 256, 32, 0);
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 4; i++) {
    const cx = (i + 0.5) * 256;
    archPath(g, cx, 120, 300, 108); g.fill();
  }
  g.globalCompositeOperation = "source-over";
  g.strokeStyle = INK; g.lineWidth = 6;
  for (let i = 0; i < 4; i++) { const cx = (i + 0.5) * 256; g.beginPath(); g.arc(cx, 228, 108, Math.PI, 0); g.stroke(); }
  g.fillStyle = "rgba(120,124,136,0.35)"; g.fillRect(0, 18, 1024, 14);
});

/** belfry wall: six big arched openings */
export const belfryTex = () => ctex("pisaBelfry", 1024, 512, (g, r) => {
  marbleBase(g, r, 1024, 512, 48, 0);
  for (let i = 0; i < 6; i++) {
    const cx = (i + 0.5) * (1024 / 6);
    archPath(g, cx, 90, 470, 52);
    g.fillStyle = "#3b2f38"; g.fill(); g.strokeStyle = INK; g.lineWidth = 6; g.stroke();
    // a bell in every other opening
    if (i % 2 === 0) { g.fillStyle = "#b08a3c"; g.beginPath(); g.moveTo(cx - 26, 300); g.quadraticCurveTo(cx - 24, 200, cx, 196); g.quadraticCurveTo(cx + 24, 200, cx + 26, 300); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 4; g.stroke(); }
  }
});

export const marbleTex = (key = "marble") => {
  const t = ctex("pisaMarble" + key, 1024, 1024, (g, r) => marbleBase(g, r, 1024, 1024, 64, 0));
  return t;
};

/** cathedral walls: white marble with grey stripes, blind arcade along the bottom, windows above (one bay = 8 m) */
export const duomoTex = (key: string, bays: number) => ctex("pisaDuomo" + key, 512 * bays, 1024, (g, r) => {
  marbleBase(g, r, 512 * bays, 1024, 48, 2);
  for (let i = 0; i < bays; i++) {
    const x0 = i * 512;
    for (const [top, bot, hw, fill] of [[520, 1024, 150, "rgba(205,196,182,0.6)"], [160, 420, 36, "#3d3442"]] as const) {
      archPath(g, x0 + 256, top, bot, hw); g.fillStyle = fill; g.fill(); g.strokeStyle = INK; g.lineWidth = 6; g.stroke();
    }
    g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(x0 - 10, 440, 20, 584);
  }
});

/** a medieval brick wall with a stone plinth */
export const brickWallTex = () => ctex("pisaBrick", 1024, 512, (g, r) => {
  g.fillStyle = "#b9673f"; g.fillRect(0, 0, 1024, 512);
  for (let y = 0; y < 512; y += 24) for (let x = (y / 24) % 2 ? -32 : 0; x < 1024; x += 64) {
    g.fillStyle = ["#b9673f", "#c4724a", "#ad5f3a", "#c77d55"][Math.floor(r() * 4)];
    g.fillRect(x + 2, y + 2, 60, 20);
  }
  g.fillStyle = "rgba(60,30,30,0.18)"; for (let y = 0; y < 512; y += 24) g.fillRect(0, y, 1024, 2);
  g.fillStyle = "#cbbca2"; g.fillRect(0, 440, 1024, 72);
});

/** cutaway soil face: grass + topsoil, then sticky grey-brown clay layers with wavy boundaries, sand lenses, pebbles.
 *  Mapped 1:1 on a face 120 m wide x 40 m deep (u: x -60..60, v: y -40..0). */
export const soilTex = (wet: boolean) => ctex("pisaSoil" + (wet ? "W" : "D"), 2048, 1024, (g, r) => {
  const layers = wet
    ? ["#5f8a3e", "#7a5a3a", "#8c7a68", "#7d6d5f", "#94846e", "#6f6458", "#8a7b69", "#5f564d"]
    : ["#5f8a3e", "#7a5a3a", "#a08d76", "#93806b", "#a8977d", "#867663", "#9a8a73", "#6f6458"];
  const ys = [0, 18, 52, 190, 330, 470, 640, 820, 1024];
  for (let i = 0; i < layers.length; i++) {
    g.fillStyle = layers[i];
    g.beginPath(); g.moveTo(0, ys[i]);
    for (let x = 0; x <= 2048; x += 64) g.lineTo(x, ys[i] + (i > 1 ? Math.sin(x * 0.006 + i) * 14 + (r() - 0.5) * 6 : 0));
    g.lineTo(2048, 1024); g.lineTo(0, 1024); g.closePath(); g.fill();
    if (i > 1) {
      g.strokeStyle = "rgba(40,28,30,0.35)"; g.lineWidth = 3;
      g.beginPath(); for (let x = 0; x <= 2048; x += 64) g[x ? "lineTo" : "moveTo"](x, ys[i] + Math.sin(x * 0.006 + i) * 14); g.stroke();
    }
  }
  // clay smears and pebbles
  for (let k = 0; k < 420; k++) {
    const x = r() * 2048, y = 60 + r() * 960, rr = 3 + r() * 9;
    g.fillStyle = r() < 0.5 ? "rgba(255,240,220,0.10)" : "rgba(40,30,30,0.12)";
    g.beginPath(); g.ellipse(x, y, rr * 3, rr, 0, 0, 7); g.fill();
  }
  for (let k = 0; k < 160; k++) {
    const x = r() * 2048, y = 70 + r() * 940, rr = 4 + r() * 7;
    g.fillStyle = ["#c9bba3", "#b3a58e", "#8f8576"][k % 3]; g.strokeStyle = INK; g.lineWidth = 2;
    g.beginPath(); g.ellipse(x, y, rr, rr * 0.75, r() * 3, 0, 7); g.fill(); g.stroke();
  }
  if (wet) { // glossy wet streaks
    g.strokeStyle = "rgba(170,210,240,0.35)"; g.lineWidth = 4;
    for (let k = 0; k < 90; k++) { const x = r() * 2048, y = 60 + r() * 900; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30 + r() * 40, y + (r() - 0.5) * 6); g.stroke(); }
  }
  // grass fringe hanging over the edge
  g.fillStyle = "#4f7d33";
  for (let x = 0; x < 2048; x += 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 5, 10 + r() * 14); g.lineTo(x + 10, 0); g.closePath(); g.fill(); }
  g.fillStyle = "rgba(20,15,20,0.85)"; g.fillRect(0, 0, 2048, 4);
});

/** foundation section: big stone blocks */
export const foundTex = () => ctex("pisaFound", 1024, 256, (g, r) => {
  g.fillStyle = "#cfc4ae"; g.fillRect(0, 0, 1024, 256);
  for (let y = 0; y < 256; y += 64) for (let x = (y / 64) % 2 ? -60 : 0; x < 1024; x += 120) {
    g.fillStyle = ["#d8cdb7", "#c9bea7", "#ded4bf", "#c4b9a1"][Math.floor(r() * 4)];
    g.fillRect(x + 3, y + 3, 114, 58);
    g.strokeStyle = "rgba(40,30,30,0.5)"; g.lineWidth = 3; g.strokeRect(x + 3, y + 3, 114, 58);
  }
});

export const woodTex = () => ctex("pisaWood", 256, 256, (g, r) => {
  g.fillStyle = "#b07a4c"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(80,45,25,0.35)"; g.lineWidth = 2;
  for (let i = 0; i < 18; i++) { const x = r() * 256; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, 80, x - 8, 170, x + 4, 256); g.stroke(); }
});

export const setRepeat = (t: THREE.Texture, x: number, y: number) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); t.needsUpdate = true; return t; };
