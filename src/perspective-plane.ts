import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  LayerBounds,
  RenderResources,
  ValidationError,
} from "@genart-dev/core";
import {
  type DepthEasing,
  depthEasedPositions,
  fanLinesFromVP,
  clipLineToRect,
  drawLineWithDepth,
  drawLine,
} from "./shared.js";

const FLOOR_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "vanishingPoint",
    label: "Vanishing Point",
    type: "point",
    default: { x: 0.5, y: 0.4 },
    group: "perspective",
  },
  {
    key: "horizonPosition",
    label: "Horizon Position",
    type: "number",
    default: 55,
    min: 0,
    max: 100,
    step: 0.5,
    group: "perspective",
  },
  {
    key: "horizontalLines",
    label: "Horizontal Lines",
    type: "number",
    default: 16,
    min: 1,
    max: 50,
    step: 1,
    group: "grid",
  },
  {
    key: "verticalLines",
    label: "Vertical Lines",
    type: "number",
    default: 18,
    min: 2,
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
    key: "strokeColor",
    label: "Stroke Color",
    type: "color",
    default: "#FF00CC",
    group: "stroke",
  },
  {
    key: "strokeWidth",
    label: "Stroke Width",
    type: "number",
    default: 1.5,
    min: 0.5,
    max: 10,
    step: 0.5,
    group: "stroke",
  },
  {
    key: "depthAlpha",
    label: "Depth Alpha",
    type: "boolean",
    default: true,
    group: "depth",
  },
  {
    key: "depthLineWidth",
    label: "Depth Line Width",
    type: "boolean",
    default: true,
    group: "depth",
  },
  {
    key: "baseAlpha",
    label: "Base Alpha",
    type: "number",
    default: 0.5,
    min: 0,
    max: 1,
    step: 0.05,
    group: "depth",
  },
];

export const perspectiveFloorLayerType: LayerTypeDefinition = {
  typeId: "perspective:floor",
  displayName: "Perspective Floor",
  icon: "plane",
  category: "shape", // Exported in final output (not a guide)
  properties: FLOOR_PROPERTIES,
  propertyEditorId: "perspective:floor-editor",

  createDefault(): LayerProperties {
    const props: LayerProperties = {};
    for (const schema of FLOOR_PROPERTIES) {
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

    const horizonPct = (properties.horizonPosition as number) ?? 55;
    const hLines = (properties.horizontalLines as number) ?? 16;
    const vLines = (properties.verticalLines as number) ?? 18;
    const easing = (properties.depthEasing as DepthEasing) ?? "quadratic";
    const spread = (properties.spreadFactor as number) ?? 0.9;
    const strokeColor = (properties.strokeColor as string) ?? "#FF00CC";
    const strokeWidth = (properties.strokeWidth as number) ?? 1.5;
    const useDepthAlpha = (properties.depthAlpha as boolean) ?? true;
    const useDepthWidth = (properties.depthLineWidth as boolean) ?? true;
    const baseAlpha = (properties.baseAlpha as number) ?? 0.5;

    const bx = bounds.x;
    const by = bounds.y;
    const bw = bounds.width;
    const bh = bounds.height;
    const horizonY = by + (horizonPct / 100) * bh;
    const bottomY = by + bh;

    // Only draw below horizon
    if (horizonY >= bottomY) return;

    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.setLineDash([]);

    // Clip region to below horizon
    const clipY = Math.max(horizonY, by);
    const clipH = bottomY - clipY;

    // Horizontal lines (depth-eased from horizon to bottom)
    const hPositions = depthEasedPositions(horizonY, bottomY, hLines, easing);
    for (let i = 0; i < hPositions.length; i++) {
      const y = hPositions[i]!;
      if (y < clipY) continue;
      const t = (i + 1) / hLines;
      if (useDepthAlpha || useDepthWidth) {
        const alpha = useDepthAlpha ? baseAlpha + t * (1 - baseAlpha) : 1;
        const width = useDepthWidth ? strokeWidth * (0.5 + t * 1.5) : strokeWidth;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
      }
      drawLine(ctx, bx, y, bx + bw, y);
    }

    // Vertical lines (fan from VP to bottom)
    const fanLines = fanLinesFromVP(vpX, vpY, bottomY, vLines, spread, bw, bx);
    for (let i = 0; i < fanLines.length; i++) {
      const [x1, y1, x2, y2] = fanLines[i]!;
      // Clip to below-horizon region
      const clipped = clipLineToRect(x1, y1, x2, y2, bx, clipY, bw, clipH);
      if (!clipped) continue;

      const t = Math.abs((i / (vLines - 1 || 1)) - 0.5) * 2;
      if (useDepthAlpha || useDepthWidth) {
        const alpha = useDepthAlpha ? baseAlpha + (1 - t * 0.5) * (1 - baseAlpha) : 1;
        const width = useDepthWidth ? strokeWidth * (0.5 + (1 - t * 0.3) * 1.5) : strokeWidth;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
      }
      drawLine(ctx, clipped[0], clipped[1], clipped[2], clipped[3]);
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
    if (typeof v !== "number" || v < 2 || v > 50) {
      errors.push({ property: "verticalLines", message: "Must be 2–50" });
    }
    const hp = properties.horizonPosition;
    if (typeof hp !== "number" || hp < 0 || hp > 100) {
      errors.push({ property: "horizonPosition", message: "Must be 0–100" });
    }
    return errors.length > 0 ? errors : null;
  },
};
