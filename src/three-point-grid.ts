import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  LayerBounds,
  RenderResources,
  ValidationError,
} from "@genart-dev/core";
import {
  COMMON_GUIDE_PROPERTIES,
  type DepthEasing,
  setupGuideStyle,
  drawLine,
  drawClippedLine,
  drawClippedLineWithDepth,
} from "./shared.js";

const THREE_POINT_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "leftVP",
    label: "Left VP",
    type: "point",
    default: { x: -0.3, y: 0.4 },
    group: "perspective",
  },
  {
    key: "rightVP",
    label: "Right VP",
    type: "point",
    default: { x: 1.3, y: 0.4 },
    group: "perspective",
  },
  {
    key: "thirdVP",
    label: "Third VP",
    type: "point",
    default: { x: 0.5, y: -0.5 },
    group: "perspective",
  },
  {
    key: "horizonLineVisible",
    label: "Show Horizon",
    type: "boolean",
    default: true,
    group: "perspective",
  },
  {
    key: "linesPerVP",
    label: "Lines per VP",
    type: "number",
    default: 8,
    min: 1,
    max: 30,
    step: 1,
    group: "grid",
  },
  {
    key: "depthEasing",
    label: "Depth Easing",
    type: "select",
    default: "quadratic",
    options: [
      { value: "linear", label: "Linear" },
      { value: "quadratic", label: "Quadratic" },
      { value: "cubic", label: "Cubic" },
      { value: "exponential", label: "Exponential" },
    ],
    group: "grid",
  },
  {
    key: "depthStyling",
    label: "Depth Styling",
    type: "boolean",
    default: true,
    group: "grid",
  },
  ...COMMON_GUIDE_PROPERTIES,
];

/** Fan lines from a VP across the canvas edges for full coverage. */
function fanFromVP(
  vpX: number,
  vpY: number,
  bounds: LayerBounds,
  count: number,
): [number, number, number, number][] {
  const lines: [number, number, number, number][] = [];
  const bx = bounds.x;
  const by = bounds.y;
  const bw = bounds.width;
  const bh = bounds.height;

  // Fan to all 4 edges
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    // Bottom edge
    lines.push([vpX, vpY, bx + bw * t, by + bh]);
    // Top edge
    lines.push([vpX, vpY, bx + bw * t, by]);
    // Left edge
    lines.push([vpX, vpY, bx, by + bh * t]);
    // Right edge
    lines.push([vpX, vpY, bx + bw, by + bh * t]);
  }

  return lines;
}

export const threePointGridLayerType: LayerTypeDefinition = {
  typeId: "perspective:three-point-grid",
  displayName: "Three-Point Perspective Grid",
  icon: "grid",
  category: "guide",
  properties: THREE_POINT_PROPERTIES,
  propertyEditorId: "perspective:three-point-grid-editor",

  createDefault(): LayerProperties {
    const props: LayerProperties = {};
    for (const schema of THREE_POINT_PROPERTIES) {
      props[schema.key] = schema.default;
    }
    return props;
  },

  render(
    properties: LayerProperties,
    ctx: CanvasRenderingContext2D,
    bounds: LayerBounds,
    _resources: RenderResources,
  ): void {
    const lvp = properties.leftVP as { x: number; y: number } | undefined;
    const rvp = properties.rightVP as { x: number; y: number } | undefined;
    const tvp = properties.thirdVP as { x: number; y: number } | undefined;

    const leftX = bounds.x + (lvp?.x ?? -0.3) * bounds.width;
    const leftY = bounds.y + (lvp?.y ?? 0.4) * bounds.height;
    const rightX = bounds.x + (rvp?.x ?? 1.3) * bounds.width;
    const rightY = bounds.y + (rvp?.y ?? 0.4) * bounds.height;
    const thirdX = bounds.x + (tvp?.x ?? 0.5) * bounds.width;
    const thirdY = bounds.y + (tvp?.y ?? -0.5) * bounds.height;

    const horizonVisible = (properties.horizonLineVisible as boolean) ?? true;
    const linesPerVP = (properties.linesPerVP as number) ?? 8;
    const useDepthStyling = (properties.depthStyling as boolean) ?? true;

    const color = (properties.guideColor as string) ?? "rgba(0,200,255,0.5)";
    const lineWidth = (properties.lineWidth as number) ?? 1;
    const dashPattern = (properties.dashPattern as string) ?? "6,4";

    ctx.save();
    setupGuideStyle(ctx, color, lineWidth, dashPattern);

    const bx = bounds.x;
    const by = bounds.y;
    const bw = bounds.width;
    const bh = bounds.height;
    const horizonY = (leftY + rightY) / 2;

    // Horizon line
    if (horizonVisible) {
      drawLine(ctx, bx, horizonY, bx + bw, horizonY);
    }

    // Lines from left VP
    const leftLines = fanFromVP(leftX, leftY, bounds, linesPerVP);
    for (let i = 0; i < leftLines.length; i++) {
      const [x1, y1, x2, y2] = leftLines[i]!;
      const t = (i % linesPerVP) / (linesPerVP - 1 || 1);
      if (useDepthStyling) {
        drawClippedLineWithDepth(ctx, x1, y1, x2, y2, bx, by, bw, bh, 0.5 + t * 0.5, 0.3, lineWidth);
      } else {
        drawClippedLine(ctx, x1, y1, x2, y2, bx, by, bw, bh);
      }
    }

    // Lines from right VP
    if (useDepthStyling) {
      ctx.globalAlpha = 1;
      ctx.lineWidth = lineWidth;
    }
    const rightLines = fanFromVP(rightX, rightY, bounds, linesPerVP);
    for (let i = 0; i < rightLines.length; i++) {
      const [x1, y1, x2, y2] = rightLines[i]!;
      const t = (i % linesPerVP) / (linesPerVP - 1 || 1);
      if (useDepthStyling) {
        drawClippedLineWithDepth(ctx, x1, y1, x2, y2, bx, by, bw, bh, 0.5 + t * 0.5, 0.3, lineWidth);
      } else {
        drawClippedLine(ctx, x1, y1, x2, y2, bx, by, bw, bh);
      }
    }

    // Lines from third VP (replaces parallel verticals)
    if (useDepthStyling) {
      ctx.globalAlpha = 1;
      ctx.lineWidth = lineWidth;
    }
    const thirdLines = fanFromVP(thirdX, thirdY, bounds, linesPerVP);
    for (let i = 0; i < thirdLines.length; i++) {
      const [x1, y1, x2, y2] = thirdLines[i]!;
      const t = (i % linesPerVP) / (linesPerVP - 1 || 1);
      if (useDepthStyling) {
        drawClippedLineWithDepth(ctx, x1, y1, x2, y2, bx, by, bw, bh, 0.5 + t * 0.5, 0.3, lineWidth);
      } else {
        drawClippedLine(ctx, x1, y1, x2, y2, bx, by, bw, bh);
      }
    }

    ctx.restore();
  },

  validate(properties: LayerProperties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const linesPerVP = properties.linesPerVP;
    if (typeof linesPerVP !== "number" || linesPerVP < 1 || linesPerVP > 30) {
      errors.push({ property: "linesPerVP", message: "Must be 1–30" });
    }
    return errors.length > 0 ? errors : null;
  },
};
