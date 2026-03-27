import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  LayerBounds,
  RenderResources,
  ValidationError,
} from "@genart-dev/core";

// ---------------------------------------------------------------------------
// Camera preset names (matching @genart-dev/projection presets)
// ---------------------------------------------------------------------------

export const CAMERA_PRESETS = [
  "landscape",
  "aerial",
  "street",
  "worm-eye",
  "isometric",
  "custom",
] as const;

export type CameraPresetName = (typeof CAMERA_PRESETS)[number];

// ---------------------------------------------------------------------------
// Layer property schema
// ---------------------------------------------------------------------------

const CAMERA_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "preset",
    label: "Preset",
    type: "select",
    default: "landscape",
    options: [
      { value: "landscape", label: "Landscape" },
      { value: "aerial", label: "Aerial" },
      { value: "street", label: "Street" },
      { value: "worm-eye", label: "Worm's Eye" },
      { value: "isometric", label: "Isometric" },
      { value: "custom", label: "Custom" },
    ],
    group: "camera",
  },
  {
    key: "positionX",
    label: "Position X",
    type: "number",
    default: 0,
    step: 0.5,
    group: "position",
  },
  {
    key: "positionY",
    label: "Position Y",
    type: "number",
    default: 1.7,
    min: 0,
    step: 0.1,
    group: "position",
  },
  {
    key: "positionZ",
    label: "Position Z",
    type: "number",
    default: 0,
    step: 0.5,
    group: "position",
  },
  {
    key: "targetX",
    label: "Target X",
    type: "number",
    default: 0,
    step: 0.5,
    group: "target",
  },
  {
    key: "targetY",
    label: "Target Y",
    type: "number",
    default: 0.5,
    step: 0.1,
    group: "target",
  },
  {
    key: "targetZ",
    label: "Target Z",
    type: "number",
    default: 100,
    min: 0.1,
    step: 1,
    group: "target",
  },
  {
    key: "fov",
    label: "Field of View",
    type: "number",
    default: 60,
    min: 5,
    max: 120,
    step: 1,
    group: "lens",
  },
  {
    key: "projectionType",
    label: "Projection",
    type: "select",
    default: "perspective",
    options: [
      { value: "perspective", label: "Perspective" },
      { value: "orthographic", label: "Orthographic" },
    ],
    group: "lens",
  },
  {
    key: "near",
    label: "Near Clip",
    type: "number",
    default: 0.1,
    min: 0.01,
    step: 0.1,
    group: "clipping",
  },
  {
    key: "far",
    label: "Far Clip",
    type: "number",
    default: 10000,
    min: 1,
    step: 100,
    group: "clipping",
  },
  {
    key: "orthoScale",
    label: "Ortho Scale",
    type: "number",
    default: 100,
    min: 1,
    step: 1,
    group: "lens",
  },
];

// ---------------------------------------------------------------------------
// Resolve properties
// ---------------------------------------------------------------------------

export interface CameraProps {
  preset: CameraPresetName;
  positionX: number;
  positionY: number;
  positionZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  fov: number;
  projectionType: "perspective" | "orthographic";
  near: number;
  far: number;
  orthoScale: number;
}

export function resolveCameraProps(properties: LayerProperties | Readonly<Record<string, unknown>>): CameraProps {
  return {
    preset: (properties.preset as CameraPresetName) ?? "landscape",
    positionX: (properties.positionX as number) ?? 0,
    positionY: (properties.positionY as number) ?? 1.7,
    positionZ: (properties.positionZ as number) ?? 0,
    targetX: (properties.targetX as number) ?? 0,
    targetY: (properties.targetY as number) ?? 0.5,
    targetZ: (properties.targetZ as number) ?? 100,
    fov: (properties.fov as number) ?? 60,
    projectionType:
      (properties.projectionType as "perspective" | "orthographic") ?? "perspective",
    near: (properties.near as number) ?? 0.1,
    far: (properties.far as number) ?? 10000,
    orthoScale: (properties.orthoScale as number) ?? 100,
  };
}

// ---------------------------------------------------------------------------
// Layer type definition — non-rendering "settings" layer
// ---------------------------------------------------------------------------

export const cameraLayerType: LayerTypeDefinition = {
  typeId: "perspective:camera",
  displayName: "Camera",
  icon: "camera",
  category: "guide",
  properties: CAMERA_PROPERTIES,
  propertyEditorId: "perspective:camera-editor",

  createDefault(): LayerProperties {
    const props: LayerProperties = {};
    for (const schema of CAMERA_PROPERTIES) {
      props[schema.key] = schema.default;
    }
    return props;
  },

  render(
    _properties: LayerProperties,
    _ctx: CanvasRenderingContext2D,
    _bounds: LayerBounds,
    _resources: RenderResources,
  ): void {
    // Camera layer is non-rendering — it configures the camera
    // that other layers read from RenderResources.camera.
    // The compositor reads camera properties and populates
    // RenderResources.camera before rendering other layers.
  },

  validate(properties: LayerProperties): ValidationError[] | null {
    const errors: ValidationError[] = [];

    const fov = properties.fov;
    if (typeof fov === "number" && (fov < 5 || fov > 120)) {
      errors.push({ property: "fov", message: "Must be 5–120 degrees" });
    }

    const near = properties.near;
    if (typeof near === "number" && near <= 0) {
      errors.push({ property: "near", message: "Must be > 0" });
    }

    const far = properties.far;
    if (typeof far === "number" && far <= 0) {
      errors.push({ property: "far", message: "Must be > 0" });
    }

    if (typeof near === "number" && typeof far === "number" && near >= far) {
      errors.push({ property: "far", message: "Must be greater than near clip" });
    }

    const preset = properties.preset;
    if (typeof preset === "string" && !CAMERA_PRESETS.includes(preset as CameraPresetName)) {
      errors.push({ property: "preset", message: "Unknown camera preset" });
    }

    return errors.length > 0 ? errors : null;
  },
};
