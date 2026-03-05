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
  depthEasedPositions,
  fanLinesFromVP,
  drawClippedLine,
  drawClippedLineWithDepth,
  drawLine,
} from "./shared.js";

const ONE_POINT_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "vanishingPoint",
    label: "Vanishing Point",
    type: "point",
    default: { x: 0.5, y: 0.4 },
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
    key: "horizontalLines",
    label: "Horizontal Lines",
    type: "number",
    default: 12,
    min: 1,
    max: 50,
    step: 1,
    group: "grid",
  },
  {
    key: "verticalLines",
    label: "Vertical Lines",
    type: "number",
    default: 14,
    min: 1,
    max: 50,
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
    key: "spreadFactor",
    label: "Spread Factor",
    type: "number",
    default: 0.9,
    min: 0.1,
    max: 2.0,
    step: 0.05,
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

export const onePointGridLayerType: LayerTypeDefinition = {
  typeId: "perspective:one-point-grid",
  displayName: "One-Point Perspective Grid",
  icon: "grid",
  category: "guide",
  properties: ONE_POINT_PROPERTIES,
  propertyEditorId: "perspective:one-point-grid-editor",

  createDefault(): LayerProperties {
    const props: LayerProperties = {};
    for (const schema of ONE_POINT_PROPERTIES) {
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
    const vp = properties.vanishingPoint as { x: number; y: number } | undefined;
    const vpNormX = vp?.x ?? 0.5;
    const vpNormY = vp?.y ?? 0.4;
    const vpX = bounds.x + vpNormX * bounds.width;
    const vpY = bounds.y + vpNormY * bounds.height;

    const horizonVisible = (properties.horizonLineVisible as boolean) ?? true;
    const hLines = (properties.horizontalLines as number) ?? 12;
    const vLines = (properties.verticalLines as number) ?? 14;
    const easing = (properties.depthEasing as DepthEasing) ?? "quadratic";
    const spread = (properties.spreadFactor as number) ?? 0.9;
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
    const bottomY = by + bh;

    // Horizon line
    if (horizonVisible) {
      drawLine(ctx, bx, vpY, bx + bw, vpY);
    }

    // Horizontal lines (depth-eased from horizon to bottom)
    const hPositions = depthEasedPositions(vpY, bottomY, hLines, easing);
    for (let i = 0; i < hPositions.length; i++) {
      const y = hPositions[i]!;
      const t = (i + 1) / hLines;
      if (useDepthStyling) {
        drawClippedLineWithDepth(ctx, bx, y, bx + bw, y, bx, by, bw, bh, t, 0.3, lineWidth);
      } else {
        drawClippedLine(ctx, bx, y, bx + bw, y, bx, by, bw, bh);
      }
    }

    // Reset style after depth styling
    if (useDepthStyling) {
      ctx.globalAlpha = 1;
      ctx.lineWidth = lineWidth;
    }

    // Vertical lines (fan from VP to bottom edge)
    const fanLines = fanLinesFromVP(vpX, vpY, bottomY, vLines, spread, bw, bx);
    for (let i = 0; i < fanLines.length; i++) {
      const [x1, y1, x2, y2] = fanLines[i]!;
      const t = Math.abs((i / (vLines - 1 || 1)) - 0.5) * 2; // 0 at center, 1 at edges
      if (useDepthStyling) {
        drawClippedLineWithDepth(ctx, x1, y1, x2, y2, bx, by, bw, bh, 1 - t * 0.5, 0.3, lineWidth);
      } else {
        drawClippedLine(ctx, x1, y1, x2, y2, bx, by, bw, bh);
      }
    }

    ctx.restore();
  },

  validate(properties: LayerProperties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const h = properties.horizontalLines;
    if (typeof h !== "number" || h < 1 || h > 50) {
      errors.push({ property: "horizontalLines", message: "Must be 1–50" });
    }
    const v = properties.verticalLines;
    if (typeof v !== "number" || v < 1 || v > 50) {
      errors.push({ property: "verticalLines", message: "Must be 1–50" });
    }
    return errors.length > 0 ? errors : null;
  },
};
