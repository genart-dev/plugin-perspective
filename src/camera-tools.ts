import type {
  McpToolDefinition,
  McpToolContext,
  McpToolResult,
  JsonSchema,
  DesignLayer,
  LayerTransform,
  LayerProperties,
} from "@genart-dev/core";
import {
  landscapeCamera,
  aerialCamera,
  streetCamera,
  wormEyeCamera,
  isometricCamera,
  orbitCamera,
  dollyCamera,
  panCamera,
} from "@genart-dev/projection";
import type { Camera } from "@genart-dev/projection";
import { cameraLayerType, CAMERA_PRESETS, resolveCameraProps } from "./camera.js";
import type { CameraPresetName } from "./camera.js";

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

/** Find the first perspective:camera layer in the stack. */
function findCameraLayer(context: McpToolContext): DesignLayer | undefined {
  return context.layers.getAll().find((l) => l.type === "perspective:camera");
}

/** Apply a Camera object's values to layer properties. */
function cameraToProps(cam: Camera): LayerProperties {
  return {
    positionX: cam.position.x,
    positionY: cam.position.y,
    positionZ: cam.position.z,
    targetX: cam.target.x,
    targetY: cam.target.y,
    targetZ: cam.target.z,
    fov: cam.fov,
    projectionType: cam.projection,
    near: cam.near,
    far: cam.far,
    orthoScale: cam.orthoScale ?? 100,
  };
}

/** Build a Camera from layer properties. */
function propsToCamera(props: LayerProperties | Readonly<Record<string, unknown>>): Camera {
  const resolved = resolveCameraProps(props);
  return {
    position: { x: resolved.positionX, y: resolved.positionY, z: resolved.positionZ },
    target: { x: resolved.targetX, y: resolved.targetY, z: resolved.targetZ },
    up: { x: 0, y: 1, z: 0 },
    fov: resolved.fov,
    near: resolved.near,
    far: resolved.far,
    projection: resolved.projectionType,
    orthoScale: resolved.orthoScale,
  };
}

// ---------------------------------------------------------------------------
// set_camera
// ---------------------------------------------------------------------------

export const setCameraTool: McpToolDefinition = {
  name: "set_camera",
  description:
    "Set the scene camera position, target, and field of view. Creates a perspective:camera layer if none exists. Position and target are in world units (1 unit = 1 meter). +X = right, +Y = up, +Z = into the scene.",
  inputSchema: {
    type: "object",
    properties: {
      positionX: { type: "number", description: "Camera X position (default: 0)." },
      positionY: { type: "number", description: "Camera Y position / eye height (default: 1.7)." },
      positionZ: { type: "number", description: "Camera Z position (default: 0)." },
      targetX: { type: "number", description: "Look-at target X (default: 0)." },
      targetY: { type: "number", description: "Look-at target Y (default: 0.5)." },
      targetZ: { type: "number", description: "Look-at target Z (default: 100)." },
      fov: { type: "number", description: "Vertical FOV in degrees, 5–120 (default: 60)." },
      projection: {
        type: "string",
        enum: ["perspective", "orthographic"],
        description: "Projection type (default: perspective).",
      },
    },
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    let layer = findCameraLayer(context);
    const isNew = !layer;

    if (!layer) {
      const id = generateLayerId();
      layer = {
        id,
        type: cameraLayerType.typeId,
        name: "Camera",
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: "normal",
        transform: fullCanvasTransform(context),
        properties: cameraLayerType.createDefault(),
      };
      context.layers.add(layer);
    }

    const props: LayerProperties = { ...layer.properties } as LayerProperties;
    if (input.positionX !== undefined) props.positionX = input.positionX as number;
    if (input.positionY !== undefined) props.positionY = input.positionY as number;
    if (input.positionZ !== undefined) props.positionZ = input.positionZ as number;
    if (input.targetX !== undefined) props.targetX = input.targetX as number;
    if (input.targetY !== undefined) props.targetY = input.targetY as number;
    if (input.targetZ !== undefined) props.targetZ = input.targetZ as number;
    if (input.fov !== undefined) props.fov = input.fov as number;
    if (input.projection !== undefined) props.projectionType = input.projection as string;
    props.preset = "custom";

    context.layers.updateProperties(layer.id, props);
    context.emitChange(isNew ? "layer-added" : "layer-updated");

    const r = resolveCameraProps(props);
    return textResult(
      `${isNew ? "Created" : "Updated"} camera: pos(${r.positionX}, ${r.positionY}, ${r.positionZ}) → target(${r.targetX}, ${r.targetY}, ${r.targetZ}), FOV ${r.fov}°, ${r.projectionType}.`,
    );
  },
};

// ---------------------------------------------------------------------------
// set_camera_preset
// ---------------------------------------------------------------------------

export const setCameraPresetTool: McpToolDefinition = {
  name: "set_camera_preset",
  description:
    "Apply a named camera preset. Creates a camera layer if none exists. Presets: landscape (standing eye-height, 60° FOV), aerial (200m altitude, 45° down, 50° FOV), street (eye-height, natural 55° FOV), worm-eye (low position, 75° dramatic FOV), isometric (orthographic, 30° angle).",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: ["landscape", "aerial", "street", "worm-eye", "isometric"],
        description: "Camera preset name.",
      },
    },
    required: ["preset"],
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const presetName = input.preset as string;
    if (!CAMERA_PRESETS.includes(presetName as CameraPresetName)) {
      return errorResult(`Unknown preset '${presetName}'. Options: ${CAMERA_PRESETS.join(", ")}.`);
    }

    let cam: Camera;
    switch (presetName) {
      case "landscape":
        cam = landscapeCamera();
        break;
      case "aerial":
        cam = aerialCamera();
        break;
      case "street":
        cam = streetCamera();
        break;
      case "worm-eye":
        cam = wormEyeCamera();
        break;
      case "isometric":
        cam = isometricCamera();
        break;
      default:
        return errorResult(`Unknown preset '${presetName}'.`);
    }

    let layer = findCameraLayer(context);
    const isNew = !layer;

    if (!layer) {
      const id = generateLayerId();
      layer = {
        id,
        type: cameraLayerType.typeId,
        name: "Camera",
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: "normal",
        transform: fullCanvasTransform(context),
        properties: cameraLayerType.createDefault(),
      };
      context.layers.add(layer);
    }

    const props = { ...cameraToProps(cam), preset: presetName };
    context.layers.updateProperties(layer.id, props);
    context.emitChange(isNew ? "layer-added" : "layer-updated");
    return textResult(
      `Applied '${presetName}' camera preset: pos(${cam.position.x.toFixed(1)}, ${cam.position.y.toFixed(1)}, ${cam.position.z.toFixed(1)}), FOV ${cam.fov}°, ${cam.projection}.`,
    );
  },
};

// ---------------------------------------------------------------------------
// orbit_camera
// ---------------------------------------------------------------------------

export const orbitCameraTool: McpToolDefinition = {
  name: "orbit_camera",
  description:
    "Orbit the camera around a center point by a horizontal and/or vertical angle. Requires an existing camera layer.",
  inputSchema: {
    type: "object",
    properties: {
      horizontalDeg: {
        type: "number",
        description: "Horizontal orbit angle in degrees (positive = rotate right). Default: 0.",
      },
      verticalDeg: {
        type: "number",
        description: "Vertical orbit angle in degrees (positive = rotate up). Default: 0.",
      },
      centerX: { type: "number", description: "Orbit center X (default: camera target X)." },
      centerY: { type: "number", description: "Orbit center Y (default: camera target Y)." },
      centerZ: { type: "number", description: "Orbit center Z (default: camera target Z)." },
    },
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const layer = findCameraLayer(context);
    if (!layer) return errorResult("No camera layer found. Use set_camera or set_camera_preset first.");

    const cam = propsToCamera(layer.properties);
    const hDeg = (input.horizontalDeg as number) ?? 0;
    const vDeg = (input.verticalDeg as number) ?? 0;
    const hRad = (hDeg * Math.PI) / 180;
    const vRad = (vDeg * Math.PI) / 180;

    const center =
      input.centerX !== undefined || input.centerY !== undefined || input.centerZ !== undefined
        ? {
            x: (input.centerX as number) ?? cam.target.x,
            y: (input.centerY as number) ?? cam.target.y,
            z: (input.centerZ as number) ?? cam.target.z,
          }
        : undefined;

    const orbited = orbitCamera(cam, hRad, vRad, center);
    const props = { ...cameraToProps(orbited), preset: "custom" };
    context.layers.updateProperties(layer.id, props);
    context.emitChange("layer-updated");
    return textResult(
      `Orbited camera ${hDeg}° horizontal, ${vDeg}° vertical. New position: (${orbited.position.x.toFixed(1)}, ${orbited.position.y.toFixed(1)}, ${orbited.position.z.toFixed(1)}).`,
    );
  },
};

// ---------------------------------------------------------------------------
// dolly_camera
// ---------------------------------------------------------------------------

export const dollyCameraTool: McpToolDefinition = {
  name: "dolly_camera",
  description:
    "Move the camera forward or backward along its look direction. Positive = toward target, negative = away. Requires an existing camera layer.",
  inputSchema: {
    type: "object",
    properties: {
      distance: {
        type: "number",
        description: "World units to move (positive = forward, negative = backward).",
      },
    },
    required: ["distance"],
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const layer = findCameraLayer(context);
    if (!layer) return errorResult("No camera layer found. Use set_camera or set_camera_preset first.");

    const cam = propsToCamera(layer.properties);
    const dist = input.distance as number;
    const dollied = dollyCamera(cam, dist);

    const props = { ...cameraToProps(dollied), preset: "custom" };
    context.layers.updateProperties(layer.id, props);
    context.emitChange("layer-updated");
    return textResult(
      `Dollied camera ${dist > 0 ? "forward" : "backward"} ${Math.abs(dist).toFixed(1)} units. New position: (${dollied.position.x.toFixed(1)}, ${dollied.position.y.toFixed(1)}, ${dollied.position.z.toFixed(1)}).`,
    );
  },
};

// ---------------------------------------------------------------------------
// pan_camera
// ---------------------------------------------------------------------------

export const panCameraTool: McpToolDefinition = {
  name: "pan_camera",
  description:
    "Shift the camera left/right and up/down without changing the look direction. Requires an existing camera layer.",
  inputSchema: {
    type: "object",
    properties: {
      right: {
        type: "number",
        description: "World units to move right (negative = left). Default: 0.",
      },
      up: {
        type: "number",
        description: "World units to move up (negative = down). Default: 0.",
      },
    },
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const layer = findCameraLayer(context);
    if (!layer) return errorResult("No camera layer found. Use set_camera or set_camera_preset first.");

    const cam = propsToCamera(layer.properties);
    const dx = (input.right as number) ?? 0;
    const dy = (input.up as number) ?? 0;
    const panned = panCamera(cam, dx, dy);

    const props = { ...cameraToProps(panned), preset: "custom" };
    context.layers.updateProperties(layer.id, props);
    context.emitChange("layer-updated");
    return textResult(
      `Panned camera right=${dx.toFixed(1)}, up=${dy.toFixed(1)}. New position: (${panned.position.x.toFixed(1)}, ${panned.position.y.toFixed(1)}, ${panned.position.z.toFixed(1)}).`,
    );
  },
};

export const cameraMcpTools: McpToolDefinition[] = [
  setCameraTool,
  setCameraPresetTool,
  orbitCameraTool,
  dollyCameraTool,
  panCameraTool,
];
