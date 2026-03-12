import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  LayerBounds,
  RenderResources,
  ValidationError,
} from "@genart-dev/core";
import { type DepthEasing, applyDepthEasing } from "./shared.js";

// ---------------------------------------------------------------------------
// Preset definitions
// ---------------------------------------------------------------------------

export interface AtmospherePreset {
  valueCompression: number;
  saturationReduction: number;
  colorTemp: number;
  atmosphereColor: string;
  edgeSoftness: number;
  intensity: number;
}

export const ATMOSPHERE_PRESETS: Record<string, AtmospherePreset> = {
  hazy: {
    valueCompression: 0.4,
    saturationReduction: 0.5,
    colorTemp: 0.0,
    atmosphereColor: "#c8d4e0",
    edgeSoftness: 0.3,
    intensity: 0.6,
  },
  clear: {
    valueCompression: 0.15,
    saturationReduction: 0.2,
    colorTemp: 0.05,
    atmosphereColor: "#e8eef5",
    edgeSoftness: 0.15,
    intensity: 0.3,
  },
  "golden-hour": {
    valueCompression: 0.35,
    saturationReduction: 0.25,
    colorTemp: 0.5,
    atmosphereColor: "#f5d4a0",
    edgeSoftness: 0.4,
    intensity: 0.55,
  },
  overcast: {
    valueCompression: 0.5,
    saturationReduction: 0.6,
    colorTemp: -0.2,
    atmosphereColor: "#b8bfc8",
    edgeSoftness: 0.5,
    intensity: 0.7,
  },
};

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

/** Parse "#rrggbb" to [r, g, b]. */
export function parseHexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [
    isNaN(r) ? 200 : r,
    isNaN(g) ? 212 : g,
    isNaN(b) ? 224 : b,
  ];
}

/** Shift a hex color toward warm (#ffcc80) or cool (#80b0ff) based on temp. */
export function applyColorTemp(baseHex: string, temp: number): string {
  const [r, g, b] = parseHexToRgb(baseHex);
  const t = Math.abs(temp);

  let tr: number, tg: number, tb: number;
  if (temp > 0) {
    // Warm: blend toward #ffcc80
    tr = 255;
    tg = 204;
    tb = 128;
  } else {
    // Cool: blend toward #80b0ff
    tr = 128;
    tg = 176;
    tb = 255;
  }

  const mix = Math.min(t, 1);
  const nr = Math.round(r + (tr - r) * mix);
  const ng = Math.round(g + (tg - g) * mix);
  const nb = Math.round(b + (tb - b) * mix);

  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Layer property schema
// ---------------------------------------------------------------------------

const ATMOSPHERE_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "horizonPosition",
    label: "Horizon Position",
    type: "number",
    default: 40,
    min: 0,
    max: 100,
    step: 1,
    group: "depth",
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
    group: "depth",
  },
  {
    key: "valueCompression",
    label: "Value Compression",
    type: "number",
    default: 0.3,
    min: 0,
    max: 1,
    step: 0.01,
    group: "atmosphere",
  },
  {
    key: "saturationReduction",
    label: "Saturation Reduction",
    type: "number",
    default: 0.4,
    min: 0,
    max: 1,
    step: 0.01,
    group: "atmosphere",
  },
  {
    key: "colorTemp",
    label: "Color Temperature",
    type: "number",
    default: 0.1,
    min: -1,
    max: 1,
    step: 0.01,
    group: "atmosphere",
  },
  {
    key: "atmosphereColor",
    label: "Atmosphere Color",
    type: "color",
    default: "#c8d4e0",
    group: "atmosphere",
  },
  {
    key: "edgeSoftness",
    label: "Edge Softness",
    type: "number",
    default: 0.3,
    min: 0,
    max: 1,
    step: 0.01,
    group: "atmosphere",
  },
  {
    key: "intensity",
    label: "Intensity",
    type: "number",
    default: 0.5,
    min: 0,
    max: 1,
    step: 0.01,
    group: "atmosphere",
  },
  {
    key: "preset",
    label: "Preset",
    type: "select",
    default: "hazy",
    options: [
      { value: "hazy", label: "Hazy" },
      { value: "clear", label: "Clear" },
      { value: "golden-hour", label: "Golden Hour" },
      { value: "overcast", label: "Overcast" },
    ],
    group: "preset",
  },
];

// ---------------------------------------------------------------------------
// Resolve properties with preset fallback
// ---------------------------------------------------------------------------

function resolveProperties(properties: LayerProperties): {
  horizonPosition: number;
  depthEasing: DepthEasing;
  valueCompression: number;
  saturationReduction: number;
  colorTemp: number;
  atmosphereColor: string;
  edgeSoftness: number;
  intensity: number;
} {
  const presetKey = (properties.preset as string) ?? "hazy";
  const preset = ATMOSPHERE_PRESETS[presetKey] ?? ATMOSPHERE_PRESETS.hazy!;

  return {
    horizonPosition: (properties.horizonPosition as number) ?? 40,
    depthEasing: (properties.depthEasing as DepthEasing) ?? "quadratic",
    valueCompression: (properties.valueCompression as number) ?? preset.valueCompression,
    saturationReduction: (properties.saturationReduction as number) ?? preset.saturationReduction,
    colorTemp: (properties.colorTemp as number) ?? preset.colorTemp,
    atmosphereColor: (properties.atmosphereColor as string) ?? preset.atmosphereColor,
    edgeSoftness: (properties.edgeSoftness as number) ?? preset.edgeSoftness,
    intensity: (properties.intensity as number) ?? preset.intensity,
  };
}

// ---------------------------------------------------------------------------
// Layer type definition
// ---------------------------------------------------------------------------

export const atmosphereLayerType: LayerTypeDefinition = {
  typeId: "perspective:atmosphere",
  displayName: "Atmospheric Perspective",
  icon: "cloud",
  category: "adjustment",
  properties: ATMOSPHERE_PROPERTIES,
  propertyEditorId: "perspective:atmosphere-editor",

  createDefault(): LayerProperties {
    const props: LayerProperties = {};
    for (const schema of ATMOSPHERE_PROPERTIES) {
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
    const w = bounds.width;
    const h = bounds.height;

    // Skip if bounds are too small
    if (w <= 0 || h <= 0) return;

    const resolved = resolveProperties(properties);
    const {
      horizonPosition,
      depthEasing,
      valueCompression,
      saturationReduction,
      colorTemp,
      atmosphereColor,
      edgeSoftness,
      intensity,
    } = resolved;

    // Skip if effect would be invisible
    if (intensity <= 0 || (valueCompression <= 0 && saturationReduction <= 0)) return;

    const horizonPx = bounds.y + (horizonPosition / 100) * h;
    const bottomY = bounds.y + h;

    // Nothing to render if horizon is at or below bottom
    if (horizonPx >= bottomY) return;

    // Compute effective atmosphere color with temperature shift
    const atmColor = applyColorTemp(atmosphereColor, colorTemp);
    const [r, g, b] = parseHexToRgb(atmColor);

    ctx.save();

    // Soft offset: start gradient slightly above horizon for smooth edge
    const softOffset = edgeSoftness * h * 0.1;
    const gradStart = horizonPx - softOffset;
    const gradEnd = bottomY;

    // Atmosphere haze gradient with depth-eased stops
    const stops = 16;
    const grad = ctx.createLinearGradient(0, gradStart, 0, gradEnd);
    for (let i = 0; i <= stops; i++) {
      const t = i / stops;
      const depthT = applyDepthEasing(Math.max(0, t), depthEasing);
      const alpha = depthT * intensity * valueCompression;
      grad.addColorStop(t, `rgba(${r},${g},${b},${alpha})`);
    }

    ctx.fillStyle = grad;
    ctx.fillRect(bounds.x, gradStart, w, gradEnd - gradStart);

    // Desaturation pass — overlay gray gradient
    if (saturationReduction > 0) {
      const grayGrad = ctx.createLinearGradient(0, gradStart, 0, gradEnd);
      for (let i = 0; i <= stops; i++) {
        const t = i / stops;
        const depthT = applyDepthEasing(Math.max(0, t), depthEasing);
        const alpha = depthT * intensity * saturationReduction * 0.3;
        grayGrad.addColorStop(t, `rgba(128,128,128,${alpha})`);
      }
      ctx.globalCompositeOperation = "saturation";
      ctx.fillStyle = grayGrad;
      ctx.fillRect(bounds.x, gradStart, w, gradEnd - gradStart);
    }

    ctx.restore();
  },

  validate(properties: LayerProperties): ValidationError[] | null {
    const errors: ValidationError[] = [];

    const hp = properties.horizonPosition;
    if (typeof hp === "number" && (hp < 0 || hp > 100)) {
      errors.push({ property: "horizonPosition", message: "Must be 0–100" });
    }

    const vc = properties.valueCompression;
    if (typeof vc === "number" && (vc < 0 || vc > 1)) {
      errors.push({ property: "valueCompression", message: "Must be 0–1" });
    }

    const sr = properties.saturationReduction;
    if (typeof sr === "number" && (sr < 0 || sr > 1)) {
      errors.push({ property: "saturationReduction", message: "Must be 0–1" });
    }

    const ct = properties.colorTemp;
    if (typeof ct === "number" && (ct < -1 || ct > 1)) {
      errors.push({ property: "colorTemp", message: "Must be -1 to 1" });
    }

    const es = properties.edgeSoftness;
    if (typeof es === "number" && (es < 0 || es > 1)) {
      errors.push({ property: "edgeSoftness", message: "Must be 0–1" });
    }

    const int = properties.intensity;
    if (typeof int === "number" && (int < 0 || int > 1)) {
      errors.push({ property: "intensity", message: "Must be 0–1" });
    }

    const preset = properties.preset;
    if (typeof preset === "string" && !ATMOSPHERE_PRESETS[preset]) {
      errors.push({ property: "preset", message: "Unknown preset" });
    }

    return errors.length > 0 ? errors : null;
  },
};
