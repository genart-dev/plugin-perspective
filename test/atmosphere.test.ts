import { describe, it, expect, vi } from "vitest";
import {
  atmosphereLayerType,
  ATMOSPHERE_PRESETS,
  parseHexToRgb,
  applyColorTemp,
} from "../src/atmosphere.js";
import { addAtmosphereTool } from "../src/perspective-tools.js";
import perspectivePlugin from "../src/index.js";
import type {
  LayerBounds,
  RenderResources,
  McpToolContext,
  DesignLayer,
  LayerStackAccessor,
} from "@genart-dev/core";

const BOUNDS: LayerBounds = {
  x: 0,
  y: 0,
  width: 800,
  height: 600,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
};

const RESOURCES: RenderResources = {
  getFont: () => null,
  getImage: () => null,
  theme: "dark",
  pixelRatio: 1,
};

function createMockGradient() {
  return {
    addColorStop: vi.fn(),
  };
}

function createMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    setLineDash: vi.fn(),
    createLinearGradient: vi.fn(() => createMockGradient()),
    strokeStyle: "",
    fillStyle: "" as string | CanvasGradient,
    lineWidth: 0,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
  } as unknown as CanvasRenderingContext2D;
}

function createMockContext(layers: DesignLayer[] = []): McpToolContext {
  const layerMap = new Map(layers.map((l) => [l.id, l]));

  const accessor: LayerStackAccessor = {
    getAll: () => layers,
    get: (id: string) => layerMap.get(id) ?? null,
    add: vi.fn((layer: DesignLayer) => {
      layers.push(layer);
      layerMap.set(layer.id, layer);
    }),
    remove: vi.fn((id: string) => {
      const idx = layers.findIndex((l) => l.id === id);
      if (idx >= 0) { layers.splice(idx, 1); layerMap.delete(id); return true; }
      return false;
    }),
    updateProperties: vi.fn(),
    updateTransform: vi.fn(),
    updateBlend: vi.fn(),
    reorder: vi.fn(),
    duplicate: vi.fn(() => "dup-id"),
    count: layers.length,
  };

  return {
    layers: accessor,
    sketchState: {
      seed: 42, params: {}, colorPalette: [],
      canvasWidth: 800, canvasHeight: 600, rendererId: "canvas2d",
    },
    canvasWidth: 800,
    canvasHeight: 600,
    resolveAsset: vi.fn(async () => null),
    captureComposite: vi.fn(async () => Buffer.from("")),
    emitChange: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

describe("parseHexToRgb", () => {
  it("parses a valid hex color", () => {
    expect(parseHexToRgb("#ff8040")).toEqual([255, 128, 64]);
  });

  it("parses without hash", () => {
    expect(parseHexToRgb("c8d4e0")).toEqual([200, 212, 224]);
  });

  it("returns fallback for invalid input", () => {
    const [r, g, b] = parseHexToRgb("zzzzz");
    // NaN values get fallbacks
    expect(r).toBe(200);
    expect(g).toBe(212);
    expect(b).toBe(224);
  });
});

describe("applyColorTemp", () => {
  it("returns original-ish color at temp 0", () => {
    expect(applyColorTemp("#c8d4e0", 0)).toBe("#c8d4e0");
  });

  it("warms toward orange at temp +1", () => {
    const result = applyColorTemp("#808080", 1);
    // Should be #ffcc80 (fully warm)
    expect(result).toBe("#ffcc80");
  });

  it("cools toward blue at temp -1", () => {
    const result = applyColorTemp("#808080", -1);
    // Should be #80b0ff (fully cool)
    expect(result).toBe("#80b0ff");
  });

  it("partially shifts at fractional temps", () => {
    const warm = applyColorTemp("#808080", 0.5);
    const [r] = parseHexToRgb(warm);
    expect(r).toBeGreaterThan(128);
    expect(r).toBeLessThan(255);
  });
});

// ---------------------------------------------------------------------------
// Layer type definition
// ---------------------------------------------------------------------------

describe("atmosphereLayerType", () => {
  it("has correct typeId", () => {
    expect(atmosphereLayerType.typeId).toBe("perspective:atmosphere");
  });

  it("has effect category", () => {
    expect(atmosphereLayerType.category).toBe("adjustment");
  });

  it("createDefault returns valid properties", () => {
    const defaults = atmosphereLayerType.createDefault();
    expect(defaults.horizonPosition).toBe(40);
    expect(defaults.depthEasing).toBe("quadratic");
    expect(defaults.valueCompression).toBe(0.3);
    expect(defaults.saturationReduction).toBe(0.4);
    expect(defaults.colorTemp).toBe(0.1);
    expect(defaults.atmosphereColor).toBe("#c8d4e0");
    expect(defaults.edgeSoftness).toBe(0.3);
    expect(defaults.intensity).toBe(0.5);
    expect(defaults.preset).toBe("hazy");
  });

  it("renders without errors with defaults", () => {
    const ctx = createMockCtx();
    atmosphereLayerType.render(
      atmosphereLayerType.createDefault(),
      ctx,
      BOUNDS,
      RESOURCES,
    );
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
    expect(ctx.createLinearGradient).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("renders with hazy preset", () => {
    const ctx = createMockCtx();
    const props = { ...atmosphereLayerType.createDefault(), preset: "hazy" };
    atmosphereLayerType.render(props, ctx, BOUNDS, RESOURCES);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("renders with clear preset", () => {
    const ctx = createMockCtx();
    const props = { ...atmosphereLayerType.createDefault(), preset: "clear" };
    atmosphereLayerType.render(props, ctx, BOUNDS, RESOURCES);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("renders with golden-hour preset", () => {
    const ctx = createMockCtx();
    const props = { ...atmosphereLayerType.createDefault(), preset: "golden-hour" };
    atmosphereLayerType.render(props, ctx, BOUNDS, RESOURCES);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("renders with overcast preset", () => {
    const ctx = createMockCtx();
    const props = { ...atmosphereLayerType.createDefault(), preset: "overcast" };
    atmosphereLayerType.render(props, ctx, BOUNDS, RESOURCES);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("skips render with zero-size bounds", () => {
    const ctx = createMockCtx();
    const emptyBounds: LayerBounds = { ...BOUNDS, width: 0, height: 0 };
    atmosphereLayerType.render(
      atmosphereLayerType.createDefault(),
      ctx,
      emptyBounds,
      RESOURCES,
    );
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it("skips render with zero intensity", () => {
    const ctx = createMockCtx();
    const props = { ...atmosphereLayerType.createDefault(), intensity: 0 };
    atmosphereLayerType.render(props, ctx, BOUNDS, RESOURCES);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it("skips render when horizon is at bottom", () => {
    const ctx = createMockCtx();
    const props = { ...atmosphereLayerType.createDefault(), horizonPosition: 100 };
    atmosphereLayerType.render(props, ctx, BOUNDS, RESOURCES);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it("skips desaturation pass when saturationReduction is 0", () => {
    const ctx = createMockCtx();
    const props = { ...atmosphereLayerType.createDefault(), saturationReduction: 0 };
    atmosphereLayerType.render(props, ctx, BOUNDS, RESOURCES);
    // Should only create one gradient (haze), not two (haze + desat)
    expect(ctx.createLinearGradient).toHaveBeenCalledTimes(1);
  });

  it("creates two gradients when saturation reduction is active", () => {
    const ctx = createMockCtx();
    atmosphereLayerType.render(
      atmosphereLayerType.createDefault(),
      ctx,
      BOUNDS,
      RESOURCES,
    );
    // Haze gradient + desaturation gradient
    expect(ctx.createLinearGradient).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("atmosphereLayerType.validate", () => {
  it("returns null for valid defaults", () => {
    expect(atmosphereLayerType.validate(atmosphereLayerType.createDefault())).toBeNull();
  });

  it("rejects horizonPosition out of range", () => {
    const errors = atmosphereLayerType.validate({
      ...atmosphereLayerType.createDefault(),
      horizonPosition: 101,
    });
    expect(errors).not.toBeNull();
    expect(errors![0]!.property).toBe("horizonPosition");
  });

  it("rejects intensity out of range", () => {
    const errors = atmosphereLayerType.validate({
      ...atmosphereLayerType.createDefault(),
      intensity: 1.5,
    });
    expect(errors).not.toBeNull();
    expect(errors![0]!.property).toBe("intensity");
  });

  it("rejects colorTemp out of range", () => {
    const errors = atmosphereLayerType.validate({
      ...atmosphereLayerType.createDefault(),
      colorTemp: -2,
    });
    expect(errors).not.toBeNull();
    expect(errors![0]!.property).toBe("colorTemp");
  });

  it("rejects unknown preset", () => {
    const errors = atmosphereLayerType.validate({
      ...atmosphereLayerType.createDefault(),
      preset: "foggy",
    });
    expect(errors).not.toBeNull();
    expect(errors![0]!.property).toBe("preset");
  });

  it("reports multiple errors", () => {
    const errors = atmosphereLayerType.validate({
      ...atmosphereLayerType.createDefault(),
      horizonPosition: -5,
      intensity: 2,
      valueCompression: -1,
    });
    expect(errors).not.toBeNull();
    expect(errors!.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Plugin integration
// ---------------------------------------------------------------------------

describe("plugin integration", () => {
  it("plugin includes atmosphere layer type", () => {
    expect(perspectivePlugin.layerTypes).toHaveLength(7);
    const atm = perspectivePlugin.layerTypes.find(
      (lt) => lt.typeId === "perspective:atmosphere",
    );
    expect(atm).toBeDefined();
  });

  it("plugin includes 10 MCP tools", () => {
    expect(perspectivePlugin.mcpTools).toHaveLength(10);
  });

  it("plugin version is 0.3.0", () => {
    expect(perspectivePlugin.version).toBe("0.3.0");
  });

  it("atmosphere layer has effect category (not guide)", () => {
    const atm = perspectivePlugin.layerTypes.find(
      (lt) => lt.typeId === "perspective:atmosphere",
    );
    expect(atm?.category).toBe("adjustment");
  });
});

// ---------------------------------------------------------------------------
// MCP tool: add_atmosphere
// ---------------------------------------------------------------------------

describe("add_atmosphere tool", () => {
  it("creates atmosphere layer with defaults", async () => {
    const ctx = createMockContext();
    const result = await addAtmosphereTool.handler({}, ctx);
    expect(result.isError).toBeUndefined();
    const layer = (ctx.layers.add as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DesignLayer;
    expect(layer.type).toBe("perspective:atmosphere");
    expect(layer.locked).toBe(false);
    expect(layer.properties.preset).toBe("hazy");
  });

  it("applies preset values", async () => {
    const ctx = createMockContext();
    await addAtmosphereTool.handler({ preset: "golden-hour" }, ctx);
    const layer = (ctx.layers.add as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DesignLayer;
    expect(layer.properties.preset).toBe("golden-hour");
    expect(layer.properties.colorTemp).toBe(0.5);
    expect(layer.properties.atmosphereColor).toBe("#f5d4a0");
  });

  it("allows overriding preset values", async () => {
    const ctx = createMockContext();
    await addAtmosphereTool.handler({
      preset: "clear",
      intensity: 0.8,
      atmosphereColor: "#ffffff",
    }, ctx);
    const layer = (ctx.layers.add as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DesignLayer;
    expect(layer.properties.preset).toBe("clear");
    expect(layer.properties.intensity).toBe(0.8);
    expect(layer.properties.atmosphereColor).toBe("#ffffff");
  });

  it("accepts custom horizon position", async () => {
    const ctx = createMockContext();
    await addAtmosphereTool.handler({ horizonPosition: 60 }, ctx);
    const layer = (ctx.layers.add as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DesignLayer;
    expect(layer.properties.horizonPosition).toBe(60);
  });

  it("rejects unknown preset", async () => {
    const ctx = createMockContext();
    const result = await addAtmosphereTool.handler({ preset: "foggy" }, ctx);
    expect(result.isError).toBe(true);
  });

  it("emits layer-added change", async () => {
    const ctx = createMockContext();
    await addAtmosphereTool.handler({}, ctx);
    expect(ctx.emitChange).toHaveBeenCalledWith("layer-added");
  });
});

// ---------------------------------------------------------------------------
// Preset definitions
// ---------------------------------------------------------------------------

describe("ATMOSPHERE_PRESETS", () => {
  it("defines 4 presets", () => {
    expect(Object.keys(ATMOSPHERE_PRESETS)).toHaveLength(4);
  });

  it("all presets have required fields", () => {
    for (const [name, preset] of Object.entries(ATMOSPHERE_PRESETS)) {
      expect(preset.valueCompression).toBeGreaterThanOrEqual(0);
      expect(preset.saturationReduction).toBeGreaterThanOrEqual(0);
      expect(preset.intensity).toBeGreaterThan(0);
      expect(preset.atmosphereColor).toMatch(/^#[0-9a-f]{6}$/);
      expect(preset.edgeSoftness).toBeGreaterThanOrEqual(0);
    }
  });

  it("golden-hour has warm color temp", () => {
    expect(ATMOSPHERE_PRESETS["golden-hour"]!.colorTemp).toBeGreaterThan(0);
  });

  it("overcast has cool color temp", () => {
    expect(ATMOSPHERE_PRESETS["overcast"]!.colorTemp).toBeLessThan(0);
  });
});
