import type {
  McpToolDefinition,
  McpToolContext,
  McpToolResult,
  JsonSchema,
  DesignLayer,
  LayerTransform,
} from "@genart-dev/core";
import { onePointGridLayerType } from "./one-point-grid.js";
import { twoPointGridLayerType } from "./two-point-grid.js";
import { threePointGridLayerType } from "./three-point-grid.js";
import { isometricGridLayerType } from "./isometric-grid.js";
import { perspectiveFloorLayerType } from "./perspective-plane.js";

const PERSPECTIVE_GRID_TYPES = {
  "one-point": onePointGridLayerType,
  "two-point": twoPointGridLayerType,
  "three-point": threePointGridLayerType,
  isometric: isometricGridLayerType,
} as const;

function textResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }] };
}

function errorResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

function generateLayerId(): string {
  return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function fullCanvasTransform(ctx: McpToolContext): LayerTransform {
  return {
    x: 0,
    y: 0,
    width: ctx.canvasWidth,
    height: ctx.canvasHeight,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    anchorX: 0,
    anchorY: 0,
  };
}

// ---------------------------------------------------------------------------
// add_perspective_grid
// ---------------------------------------------------------------------------

export const addPerspectiveGridTool: McpToolDefinition = {
  name: "add_perspective_grid",
  description:
    "Add a perspective grid guide layer. Types: one-point, two-point, three-point, isometric.",
  inputSchema: {
    type: "object",
    properties: {
      perspective: {
        type: "string",
        enum: ["one-point", "two-point", "three-point", "isometric"],
        description: "Perspective grid type.",
      },
      guideColor: {
        type: "string",
        description: "Guide line color (default: 'rgba(0,200,255,0.5)').",
      },
      depthEasing: {
        type: "string",
        enum: ["linear", "quadratic", "cubic", "exponential"],
        description: "Depth easing curve (default: 'quadratic').",
      },
      angle: {
        type: "number",
        description: "Isometric angle in degrees (default: 30, isometric only).",
      },
      cellSize: {
        type: "number",
        description: "Cell size in pixels (default: 40, isometric only).",
      },
    },
    required: ["perspective"],
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const key = input.perspective as string;
    const gridDef = PERSPECTIVE_GRID_TYPES[key as keyof typeof PERSPECTIVE_GRID_TYPES];
    if (!gridDef) return errorResult(`Unknown perspective type '${key}'.`);

    const defaults = gridDef.createDefault();
    const properties = { ...defaults };

    if (input.guideColor !== undefined) properties.guideColor = input.guideColor as string;
    if (input.depthEasing !== undefined) properties.depthEasing = input.depthEasing as string;
    if (input.angle !== undefined) properties.angle = input.angle as number;
    if (input.cellSize !== undefined) properties.cellSize = input.cellSize as number;

    const id = generateLayerId();
    const layer: DesignLayer = {
      id,
      type: gridDef.typeId,
      name: gridDef.displayName,
      visible: true,
      locked: true,
      opacity: 1,
      blendMode: "normal",
      transform: fullCanvasTransform(context),
      properties,
    };

    context.layers.add(layer);
    context.emitChange("layer-added");
    return textResult(`Added ${gridDef.displayName} layer '${id}'.`);
  },
};

// ---------------------------------------------------------------------------
// add_perspective_floor
// ---------------------------------------------------------------------------

export const addPerspectiveFloorTool: McpToolDefinition = {
  name: "add_perspective_floor",
  description: "Add a perspective floor plane (shape layer, included in exports).",
  inputSchema: {
    type: "object",
    properties: {
      strokeColor: {
        type: "string",
        description: "Floor grid stroke color (default: '#FF00CC').",
      },
      strokeWidth: {
        type: "number",
        description: "Stroke width (default: 1.5).",
      },
      horizonPosition: {
        type: "number",
        description: "Horizon position as 0–100 percentage (default: 55).",
      },
      depthEasing: {
        type: "string",
        enum: ["linear", "quadratic", "cubic", "exponential"],
        description: "Depth easing curve (default: 'quadratic').",
      },
    },
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const defaults = perspectiveFloorLayerType.createDefault();
    const properties = { ...defaults };

    if (input.strokeColor !== undefined) properties.strokeColor = input.strokeColor as string;
    if (input.strokeWidth !== undefined) properties.strokeWidth = input.strokeWidth as number;
    if (input.horizonPosition !== undefined) properties.horizonPosition = input.horizonPosition as number;
    if (input.depthEasing !== undefined) properties.depthEasing = input.depthEasing as string;

    const id = generateLayerId();
    const layer: DesignLayer = {
      id,
      type: perspectiveFloorLayerType.typeId,
      name: perspectiveFloorLayerType.displayName,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: "normal",
      transform: fullCanvasTransform(context),
      properties,
    };

    context.layers.add(layer);
    context.emitChange("layer-added");
    return textResult(`Added Perspective Floor layer '${id}'.`);
  },
};

// ---------------------------------------------------------------------------
// set_vanishing_point
// ---------------------------------------------------------------------------

export const setVanishingPointTool: McpToolDefinition = {
  name: "set_vanishing_point",
  description:
    "Update a vanishing point on an existing perspective layer. Coordinates are normalized (0-1 is canvas bounds, values outside are allowed).",
  inputSchema: {
    type: "object",
    properties: {
      layerId: {
        type: "string",
        description: "Layer ID to update.",
      },
      x: {
        type: "number",
        description: "Normalized X coordinate.",
      },
      y: {
        type: "number",
        description: "Normalized Y coordinate.",
      },
      which: {
        type: "string",
        enum: ["vanishingPoint", "leftVP", "rightVP", "thirdVP", "origin"],
        description:
          "Which VP to update. Defaults to 'vanishingPoint' for one-point/floor, or must be specified for multi-VP types.",
      },
    },
    required: ["layerId", "x", "y"],
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const x = input.x as number;
    const y = input.y as number;
    const which = (input.which as string) ?? "vanishingPoint";

    const layer = context.layers.getAll().find((l) => l.id === layerId);
    if (!layer) return errorResult(`Layer '${layerId}' not found.`);
    if (!layer.type.startsWith("perspective:")) {
      return errorResult(`Layer '${layerId}' is not a perspective layer.`);
    }

    const validKeys = ["vanishingPoint", "leftVP", "rightVP", "thirdVP", "origin"];
    if (!validKeys.includes(which)) {
      return errorResult(`Invalid VP key '${which}'. Use: ${validKeys.join(", ")}`);
    }

    // Check that the property exists on this layer type
    if (layer.properties[which] === undefined) {
      return errorResult(`Layer type '${layer.type}' has no '${which}' property.`);
    }

    context.layers.updateProperties(layerId, { [which]: { x, y } });
    context.emitChange("layer-updated");
    return textResult(`Set ${which} to (${x}, ${y}) on layer '${layerId}'.`);
  },
};

// ---------------------------------------------------------------------------
// clear_perspective_guides
// ---------------------------------------------------------------------------

export const clearPerspectiveGuidesTool: McpToolDefinition = {
  name: "clear_perspective_guides",
  description: "Remove all perspective:* layers from the layer stack.",
  inputSchema: {
    type: "object",
    properties: {},
  } satisfies JsonSchema,

  async handler(
    _input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const layers = context.layers.getAll();
    const perspectiveIds = layers
      .filter((l) => l.type.startsWith("perspective:"))
      .map((l) => l.id);

    if (perspectiveIds.length === 0) {
      return textResult("No perspective layers to remove.");
    }

    for (const id of perspectiveIds) {
      context.layers.remove(id);
    }

    context.emitChange("layer-removed");
    return textResult(`Removed ${perspectiveIds.length} perspective layer(s).`);
  },
};

export const perspectiveMcpTools: McpToolDefinition[] = [
  addPerspectiveGridTool,
  addPerspectiveFloorTool,
  setVanishingPointTool,
  clearPerspectiveGuidesTool,
];
