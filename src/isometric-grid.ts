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
  setupGuideStyle,
  drawClippedLine,
} from "./shared.js";

const ISOMETRIC_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "angle",
    label: "Angle",
    type: "number",
    default: 30,
    min: 5,
    max: 60,
    step: 1,
    group: "grid",
  },
  {
    key: "cellSize",
    label: "Cell Size",
    type: "number",
    default: 40,
    min: 10,
    max: 200,
    step: 5,
    group: "grid",
  },
  {
    key: "showVerticals",
    label: "Show Verticals",
    type: "boolean",
    default: true,
    group: "grid",
  },
  {
    key: "showLeftDiagonals",
    label: "Show Left Diagonals",
    type: "boolean",
    default: true,
    group: "grid",
  },
  {
    key: "showRightDiagonals",
    label: "Show Right Diagonals",
    type: "boolean",
    default: true,
    group: "grid",
  },
  {
    key: "origin",
    label: "Origin",
    type: "point",
    default: { x: 0.5, y: 0.5 },
    group: "grid",
  },
  ...COMMON_GUIDE_PROPERTIES,
];

export const isometricGridLayerType: LayerTypeDefinition = {
  typeId: "perspective:isometric-grid",
  displayName: "Isometric Grid",
  icon: "grid",
  category: "guide",
  properties: ISOMETRIC_PROPERTIES,
  propertyEditorId: "perspective:isometric-grid-editor",

  createDefault(): LayerProperties {
    const props: LayerProperties = {};
    for (const schema of ISOMETRIC_PROPERTIES) {
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
    const angleDeg = (properties.angle as number) ?? 30;
    const cellSize = (properties.cellSize as number) ?? 40;
    const showVert = (properties.showVerticals as boolean) ?? true;
    const showLeft = (properties.showLeftDiagonals as boolean) ?? true;
    const showRight = (properties.showRightDiagonals as boolean) ?? true;
    const origin = properties.origin as { x: number; y: number } | undefined;

    const color = (properties.guideColor as string) ?? "rgba(0,200,255,0.5)";
    const lineWidth = (properties.lineWidth as number) ?? 1;
    const dashPattern = (properties.dashPattern as string) ?? "6,4";

    const bx = bounds.x;
    const by = bounds.y;
    const bw = bounds.width;
    const bh = bounds.height;

    const originX = bx + (origin?.x ?? 0.5) * bw;
    const originY = by + (origin?.y ?? 0.5) * bh;

    const angleRad = (angleDeg * Math.PI) / 180;
    const dx = Math.cos(angleRad) * cellSize;
    const dy = Math.sin(angleRad) * cellSize;

    // Number of lines needed for full coverage
    const maxDim = bw + bh;
    const lineCount = Math.ceil(maxDim / cellSize) * 2 + 2;

    ctx.save();
    setupGuideStyle(ctx, color, lineWidth, dashPattern);

    // Vertical lines
    if (showVert) {
      for (let i = -lineCount; i <= lineCount; i++) {
        const x = originX + i * dx;
        drawClippedLine(ctx, x, by - bh, x, by + bh * 2, bx, by, bw, bh);
      }
    }

    // Left diagonals (going up-left) — direction: (-cos(angle), -sin(angle))
    if (showLeft) {
      for (let i = -lineCount; i <= lineCount; i++) {
        // Offset perpendicular to the diagonal direction
        const perpX = dy; // sin(angle) * cellSize
        const perpY = -dx; // -cos(angle) * cellSize — but we use dx for horizontal spacing
        const offsetX = originX + i * perpX;
        const offsetY = originY + i * perpY;
        const ext = maxDim;
        drawClippedLine(
          ctx,
          offsetX - dx / cellSize * ext,
          offsetY + dy / cellSize * ext,
          offsetX + dx / cellSize * ext,
          offsetY - dy / cellSize * ext,
          bx, by, bw, bh,
        );
      }
    }

    // Right diagonals (going up-right) — direction: (cos(angle), -sin(angle))
    if (showRight) {
      for (let i = -lineCount; i <= lineCount; i++) {
        const perpX = -dy;
        const perpY = -dx;
        const offsetX = originX + i * perpX;
        const offsetY = originY + i * perpY;
        const ext = maxDim;
        drawClippedLine(
          ctx,
          offsetX - dx / cellSize * ext,
          offsetY - dy / cellSize * ext,
          offsetX + dx / cellSize * ext,
          offsetY + dy / cellSize * ext,
          bx, by, bw, bh,
        );
      }
    }

    ctx.restore();
  },

  validate(properties: LayerProperties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const angle = properties.angle;
    if (typeof angle !== "number" || angle < 5 || angle > 60) {
      errors.push({ property: "angle", message: "Must be 5–60" });
    }
    const cellSize = properties.cellSize;
    if (typeof cellSize !== "number" || cellSize < 10 || cellSize > 200) {
      errors.push({ property: "cellSize", message: "Must be 10–200" });
    }
    return errors.length > 0 ? errors : null;
  },
};
