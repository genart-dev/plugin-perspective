import { describe, it, expect, vi } from "vitest";
import {
  addPerspectiveGridTool,
  addPerspectiveFloorTool,
  setVanishingPointTool,
  clearPerspectiveGuidesTool,
} from "../src/perspective-tools.js";
import type {
  McpToolContext,
  DesignLayer,
  LayerStackAccessor,
} from "@genart-dev/core";

function createMockLayer(overrides: Partial<DesignLayer> = {}): DesignLayer {
  return {
    id: "persp-1",
    type: "perspective:one-point-grid",
    name: "One-Point Grid",
    visible: true,
    locked: true,
    opacity: 1,
    blendMode: "normal",
    transform: {
      x: 0, y: 0, width: 800, height: 600,
      rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0, anchorY: 0,
    },
    properties: { vanishingPoint: { x: 0.5, y: 0.4 } },
    ...overrides,
  };
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

describe("add_perspective_grid tool", () => {
  it("adds a one-point grid", async () => {
    const ctx = createMockContext();
    const result = await addPerspectiveGridTool.handler(
      { perspective: "one-point" },
      ctx,
    );
    expect(result.isError).toBeUndefined();
    const layer = (ctx.layers.add as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DesignLayer;
    expect(layer.type).toBe("perspective:one-point-grid");
    expect(layer.locked).toBe(true);
  });

  it("adds a two-point grid", async () => {
    const ctx = createMockContext();
    await addPerspectiveGridTool.handler({ perspective: "two-point" }, ctx);
    const layer = (ctx.layers.add as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DesignLayer;
    expect(layer.type).toBe("perspective:two-point-grid");
  });

  it("adds an isometric grid with custom angle", async () => {
    const ctx = createMockContext();
    await addPerspectiveGridTool.handler(
      { perspective: "isometric", angle: 45, cellSize: 60 },
      ctx,
    );
    const layer = (ctx.layers.add as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DesignLayer;
    expect(layer.type).toBe("perspective:isometric-grid");
    expect(layer.properties.angle).toBe(45);
    expect(layer.properties.cellSize).toBe(60);
  });

  it("rejects unknown type", async () => {
    const ctx = createMockContext();
    const result = await addPerspectiveGridTool.handler(
      { perspective: "fish-eye" },
      ctx,
    );
    expect(result.isError).toBe(true);
  });
});

describe("add_perspective_floor tool", () => {
  it("adds a floor with defaults", async () => {
    const ctx = createMockContext();
    const result = await addPerspectiveFloorTool.handler({}, ctx);
    expect(result.isError).toBeUndefined();
    const layer = (ctx.layers.add as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DesignLayer;
    expect(layer.type).toBe("perspective:floor");
    expect(layer.locked).toBe(false); // shape, not guide
  });

  it("accepts custom stroke color", async () => {
    const ctx = createMockContext();
    await addPerspectiveFloorTool.handler({ strokeColor: "#00FF00" }, ctx);
    const layer = (ctx.layers.add as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DesignLayer;
    expect(layer.properties.strokeColor).toBe("#00FF00");
  });
});

describe("set_vanishing_point tool", () => {
  it("updates VP on a perspective layer", async () => {
    const layer = createMockLayer();
    const ctx = createMockContext([layer]);
    const result = await setVanishingPointTool.handler(
      { layerId: "persp-1", x: 0.3, y: 0.2 },
      ctx,
    );
    expect(result.isError).toBeUndefined();
    expect(ctx.layers.updateProperties).toHaveBeenCalledWith("persp-1", {
      vanishingPoint: { x: 0.3, y: 0.2 },
    });
  });

  it("supports off-canvas coordinates", async () => {
    const layer = createMockLayer();
    const ctx = createMockContext([layer]);
    const result = await setVanishingPointTool.handler(
      { layerId: "persp-1", x: -0.5, y: 2.0 },
      ctx,
    );
    expect(result.isError).toBeUndefined();
  });

  it("rejects unknown layer", async () => {
    const ctx = createMockContext();
    const result = await setVanishingPointTool.handler(
      { layerId: "nope", x: 0.5, y: 0.5 },
      ctx,
    );
    expect(result.isError).toBe(true);
  });

  it("rejects non-perspective layer", async () => {
    const layer = createMockLayer({ type: "guides:grid" });
    const ctx = createMockContext([layer]);
    const result = await setVanishingPointTool.handler(
      { layerId: "persp-1", x: 0.5, y: 0.5 },
      ctx,
    );
    expect(result.isError).toBe(true);
  });

  it("rejects invalid VP key for layer type", async () => {
    const layer = createMockLayer(); // one-point has vanishingPoint, not leftVP
    const ctx = createMockContext([layer]);
    const result = await setVanishingPointTool.handler(
      { layerId: "persp-1", x: 0.5, y: 0.5, which: "leftVP" },
      ctx,
    );
    expect(result.isError).toBe(true);
  });
});

describe("clear_perspective_guides tool", () => {
  it("removes all perspective layers", async () => {
    const layers = [
      createMockLayer({ id: "p1", type: "perspective:one-point-grid" }),
      createMockLayer({ id: "p2", type: "perspective:floor" }),
    ];
    const ctx = createMockContext(layers);
    const result = await clearPerspectiveGuidesTool.handler({}, ctx);

    expect(result.isError).toBeUndefined();
    expect(ctx.layers.remove).toHaveBeenCalledTimes(2);
    expect(ctx.emitChange).toHaveBeenCalledWith("layer-removed");
  });

  it("does not remove non-perspective layers", async () => {
    const layers = [
      createMockLayer({ id: "g1", type: "guides:grid" }),
      createMockLayer({ id: "p1", type: "perspective:isometric-grid" }),
    ];
    const ctx = createMockContext(layers);
    await clearPerspectiveGuidesTool.handler({}, ctx);

    expect(ctx.layers.remove).toHaveBeenCalledTimes(1);
    expect(ctx.layers.remove).toHaveBeenCalledWith("p1");
  });

  it("reports when no perspective layers exist", async () => {
    const ctx = createMockContext();
    const result = await clearPerspectiveGuidesTool.handler({}, ctx);
    expect((result.content[0] as { text: string }).text).toContain(
      "No perspective layers",
    );
  });
});
