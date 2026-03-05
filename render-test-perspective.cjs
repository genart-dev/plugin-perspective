/**
 * Perspective Plugin — Visual Render Test
 *
 * Montage layout (4 columns × 3 rows):
 *   Row 0: One-point grid variations (linear, quadratic, cubic, exponential easing)
 *   Row 1: Two-point (wide), Two-point (narrow), Three-point bird's eye, Three-point worm's eye
 *   Row 2: Isometric 30°, Isometric 45°, Floor (default), Floor (exponential)
 *
 * Output: test-renders/perspective-guides.png
 */
const { createCanvas } = require("canvas");
const fs   = require("fs");
const path = require("path");

const {
  onePointGridLayerType,
  twoPointGridLayerType,
  threePointGridLayerType,
  isometricGridLayerType,
  perspectiveFloorLayerType,
} = require("./dist/index.cjs");

const CW = 380;
const CH = 280;
const PAD = 8;
const LABEL_H = 30;
const COLS = 4;
const ROWS = 3;
const W = COLS * CW + (COLS + 1) * PAD;
const H = ROWS * (CH + LABEL_H) + (ROWS + 1) * PAD;

const outDir = path.join(__dirname, "test-renders");
fs.mkdirSync(outDir, { recursive: true });

const resources = { getFont: () => null, getImage: () => null, theme: "dark", pixelRatio: 1 };

function cellBounds(col, row) {
  const x = PAD + col * (CW + PAD);
  const y = PAD + row * (CH + LABEL_H + PAD) + LABEL_H;
  return { x, y, width: CW, height: CH, rotation: 0, scaleX: 1, scaleY: 1 };
}

function drawLabel(ctx, col, row, title, subtitle) {
  const x = PAD + col * (CW + PAD);
  const y = PAD + row * (CH + LABEL_H + PAD);
  ctx.fillStyle = "#333333";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(title, x + 6, y + 15);
  ctx.fillStyle = "#888888";
  ctx.font = "10px sans-serif";
  ctx.fillText(subtitle, x + 6, y + 27);
}

function cellBackground(ctx, b) {
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(b.x, b.y, b.width, b.height);
  ctx.strokeStyle = "#333344";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.width - 1, b.height - 1);
}

// Main canvas
const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");

// Dark background
ctx.fillStyle = "#0d0d1a";
ctx.fillRect(0, 0, W, H);

// Title
ctx.fillStyle = "#ffffff";
ctx.font = "bold 11px sans-serif";

// ─── Row 0: One-point grid with different depth easing ───────────────────
const easings = ["linear", "quadratic", "cubic", "exponential"];
for (let i = 0; i < easings.length; i++) {
  const easing = easings[i];
  const b = cellBounds(i, 0);
  cellBackground(ctx, b);
  drawLabel(ctx, i, 0, `One-Point (${easing})`, "12h × 14v lines, depth styling on");

  const props = {
    ...onePointGridLayerType.createDefault(),
    depthEasing: easing,
  };
  onePointGridLayerType.render(props, ctx, b, resources);
}

// ─── Row 1: Two-point and Three-point variations ─────────────────────────

// Two-point wide
{
  const b = cellBounds(0, 1);
  cellBackground(ctx, b);
  drawLabel(ctx, 0, 1, "Two-Point (Wide VPs)", "leftVP: -0.5, rightVP: 1.5");

  const props = {
    ...twoPointGridLayerType.createDefault(),
    leftVP: { x: -0.5, y: 0.4 },
    rightVP: { x: 1.5, y: 0.4 },
  };
  twoPointGridLayerType.render(props, ctx, b, resources);
}

// Two-point narrow
{
  const b = cellBounds(1, 1);
  cellBackground(ctx, b);
  drawLabel(ctx, 1, 1, "Two-Point (Narrow VPs)", "leftVP: 0.0, rightVP: 1.0");

  const props = {
    ...twoPointGridLayerType.createDefault(),
    leftVP: { x: 0.0, y: 0.4 },
    rightVP: { x: 1.0, y: 0.4 },
  };
  twoPointGridLayerType.render(props, ctx, b, resources);
}

// Three-point bird's eye
{
  const b = cellBounds(2, 1);
  cellBackground(ctx, b);
  drawLabel(ctx, 2, 1, "Three-Point (Bird's Eye)", "thirdVP: (0.5, -0.5)");

  const props = {
    ...threePointGridLayerType.createDefault(),
    thirdVP: { x: 0.5, y: -0.5 },
  };
  threePointGridLayerType.render(props, ctx, b, resources);
}

// Three-point worm's eye
{
  const b = cellBounds(3, 1);
  cellBackground(ctx, b);
  drawLabel(ctx, 3, 1, "Three-Point (Worm's Eye)", "thirdVP: (0.5, 1.5)");

  const props = {
    ...threePointGridLayerType.createDefault(),
    thirdVP: { x: 0.5, y: 1.5 },
  };
  threePointGridLayerType.render(props, ctx, b, resources);
}

// ─── Row 2: Isometric and Floor ──────────────────────────────────────────

// Isometric 30°
{
  const b = cellBounds(0, 2);
  cellBackground(ctx, b);
  drawLabel(ctx, 0, 2, "Isometric 30°", "Standard isometric, cellSize: 40");

  const props = {
    ...isometricGridLayerType.createDefault(),
    angle: 30,
    cellSize: 40,
  };
  isometricGridLayerType.render(props, ctx, b, resources);
}

// Isometric 45°
{
  const b = cellBounds(1, 2);
  cellBackground(ctx, b);
  drawLabel(ctx, 1, 2, "Isometric 45°", "Steeper angle, cellSize: 50");

  const props = {
    ...isometricGridLayerType.createDefault(),
    angle: 45,
    cellSize: 50,
  };
  isometricGridLayerType.render(props, ctx, b, resources);
}

// Floor default
{
  const b = cellBounds(2, 2);
  cellBackground(ctx, b);
  drawLabel(ctx, 2, 2, "Perspective Floor (Default)", "quadratic easing, magenta");

  const props = perspectiveFloorLayerType.createDefault();
  perspectiveFloorLayerType.render(props, ctx, b, resources);
}

// Floor exponential
{
  const b = cellBounds(3, 2);
  cellBackground(ctx, b);
  drawLabel(ctx, 3, 2, "Perspective Floor (Exponential)", "exponential easing, cyan");

  const props = {
    ...perspectiveFloorLayerType.createDefault(),
    depthEasing: "exponential",
    strokeColor: "#00CCFF",
    horizonPosition: 40,
  };
  perspectiveFloorLayerType.render(props, ctx, b, resources);
}

// Write output
const outPath = path.join(outDir, "perspective-guides.png");
const buf = canvas.toBuffer("image/png");
fs.writeFileSync(outPath, buf);
console.log(`✓ Wrote ${outPath} (${W}×${H}, ${(buf.length / 1024).toFixed(1)} KB)`);
