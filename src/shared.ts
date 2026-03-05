import type { LayerPropertySchema, RenderResources } from "@genart-dev/core";

// ---------------------------------------------------------------------------
// Common guide properties (mirror layout-guides pattern)
// ---------------------------------------------------------------------------

export const COMMON_GUIDE_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "guideColor",
    label: "Guide Color",
    type: "color",
    default: "rgba(0,200,255,0.5)",
    group: "style",
  },
  {
    key: "lineWidth",
    label: "Line Width",
    type: "number",
    default: 1,
    min: 0.5,
    max: 5,
    step: 0.5,
    group: "style",
  },
  {
    key: "dashPattern",
    label: "Dash Pattern",
    type: "string",
    default: "6,4",
    group: "style",
  },
];

// ---------------------------------------------------------------------------
// Depth easing
// ---------------------------------------------------------------------------

export type DepthEasing = "linear" | "quadratic" | "cubic" | "exponential";

/** Map a linear t ∈ [0,1] through the chosen easing curve. */
export function applyDepthEasing(t: number, easing: DepthEasing): number {
  switch (easing) {
    case "linear":
      return t;
    case "quadratic":
      return t * t;
    case "cubic":
      return t * t * t;
    case "exponential": {
      const k = 3;
      return (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
    }
  }
}

/**
 * Compute depth-eased Y positions between horizonY and edgeY.
 * Returns `count` Y values (not including horizonY itself).
 */
export function depthEasedPositions(
  horizonY: number,
  edgeY: number,
  count: number,
  easing: DepthEasing,
): number[] {
  const positions: number[] = [];
  const depth = edgeY - horizonY;
  for (let i = 1; i <= count; i++) {
    const t = i / count;
    positions.push(horizonY + applyDepthEasing(t, easing) * depth);
  }
  return positions;
}

// ---------------------------------------------------------------------------
// Fan lines from vanishing point
// ---------------------------------------------------------------------------

/**
 * Generate line segments fanning from a VP to an edge.
 * Returns array of [x1,y1, x2,y2] segments (VP to edge intersection).
 */
export function fanLinesFromVP(
  vpX: number,
  vpY: number,
  edgeY: number,
  count: number,
  spread: number,
  boundsW: number,
  boundsX: number,
): [number, number, number, number][] {
  const lines: [number, number, number, number][] = [];
  const centerX = boundsX + boundsW / 2;
  const totalSpread = boundsW * spread;

  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const edgeX = centerX - totalSpread / 2 + totalSpread * t;
    lines.push([vpX, vpY, edgeX, edgeY]);
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Cohen-Sutherland line clipping
// ---------------------------------------------------------------------------

const INSIDE = 0; // 0000
const LEFT = 1;   // 0001
const RIGHT = 2;  // 0010
const BOTTOM = 4; // 0100
const TOP = 8;    // 1000

function computeOutCode(
  x: number,
  y: number,
  xmin: number,
  ymin: number,
  xmax: number,
  ymax: number,
): number {
  let code = INSIDE;
  if (x < xmin) code |= LEFT;
  else if (x > xmax) code |= RIGHT;
  if (y < ymin) code |= TOP;
  else if (y > ymax) code |= BOTTOM;
  return code;
}

/**
 * Clip a line segment to a rectangle using Cohen-Sutherland.
 * Returns clipped [x1,y1,x2,y2] or null if entirely outside.
 */
export function clipLineToRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): [number, number, number, number] | null {
  const xmin = rx;
  const ymin = ry;
  const xmax = rx + rw;
  const ymax = ry + rh;

  let outcode1 = computeOutCode(x1, y1, xmin, ymin, xmax, ymax);
  let outcode2 = computeOutCode(x2, y2, xmin, ymin, xmax, ymax);

  while (true) {
    if ((outcode1 | outcode2) === 0) {
      // Both inside — trivial accept
      return [x1, y1, x2, y2];
    }
    if ((outcode1 & outcode2) !== 0) {
      // Both in same outside zone — trivial reject
      return null;
    }

    // Pick the outside point
    const outcodeOut = outcode1 !== 0 ? outcode1 : outcode2;
    let x: number, y: number;
    const dx = x2 - x1;
    const dy = y2 - y1;

    if (outcodeOut & TOP) {
      x = x1 + (dx * (ymin - y1)) / dy;
      y = ymin;
    } else if (outcodeOut & BOTTOM) {
      x = x1 + (dx * (ymax - y1)) / dy;
      y = ymax;
    } else if (outcodeOut & RIGHT) {
      y = y1 + (dy * (xmax - x1)) / dx;
      x = xmax;
    } else {
      // LEFT
      y = y1 + (dy * (xmin - x1)) / dx;
      x = xmin;
    }

    if (outcodeOut === outcode1) {
      x1 = x;
      y1 = y;
      outcode1 = computeOutCode(x1, y1, xmin, ymin, xmax, ymax);
    } else {
      x2 = x;
      y2 = y;
      outcode2 = computeOutCode(x2, y2, xmin, ymin, xmax, ymax);
    }
  }
}

// ---------------------------------------------------------------------------
// Line intersection
// ---------------------------------------------------------------------------

/** Find intersection of two line segments. Returns null if parallel. */
export function lineIntersection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
): { x: number; y: number } | null {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
}

// ---------------------------------------------------------------------------
// Depth styling
// ---------------------------------------------------------------------------

/** Compute alpha and width for a line at depth t ∈ [0,1] (0 = horizon, 1 = near). */
export function depthStyle(
  t: number,
  baseAlpha: number,
  baseWidth: number,
): { alpha: number; width: number } {
  return {
    alpha: baseAlpha + t * (1 - baseAlpha),
    width: baseWidth * (0.5 + t * 1.5),
  };
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

/** Set up guide rendering style on a canvas context. */
export function setupGuideStyle(
  ctx: CanvasRenderingContext2D,
  color: string,
  lineWidth: number,
  dashPattern: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  const dashes = dashPattern
    .split(",")
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0);
  ctx.setLineDash(dashes.length > 0 ? dashes : [6, 4]);
}

/** Draw a single line. */
export function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** Draw a line with depth-based alpha and width. */
export function drawLineWithDepth(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number,
  baseAlpha: number,
  baseWidth: number,
): void {
  const style = depthStyle(t, baseAlpha, baseWidth);
  ctx.globalAlpha = style.alpha;
  ctx.lineWidth = style.width;
  drawLine(ctx, x1, y1, x2, y2);
}

/** Draw a clipped line — clips to bounds before drawing. Returns true if line was drawn. */
export function drawClippedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): boolean {
  const clipped = clipLineToRect(x1, y1, x2, y2, rx, ry, rw, rh);
  if (!clipped) return false;
  drawLine(ctx, clipped[0], clipped[1], clipped[2], clipped[3]);
  return true;
}

/** Draw a clipped line with depth styling. */
export function drawClippedLineWithDepth(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  t: number,
  baseAlpha: number,
  baseWidth: number,
): boolean {
  const clipped = clipLineToRect(x1, y1, x2, y2, rx, ry, rw, rh);
  if (!clipped) return false;
  drawLineWithDepth(ctx, clipped[0], clipped[1], clipped[2], clipped[3], t, baseAlpha, baseWidth);
  return true;
}
