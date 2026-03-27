import { describe, it, expect, vi } from "vitest";
import perspectivePlugin from "../src/index.js";
import { onePointGridLayerType } from "../src/one-point-grid.js";
import { twoPointGridLayerType } from "../src/two-point-grid.js";
import { threePointGridLayerType } from "../src/three-point-grid.js";
import { isometricGridLayerType } from "../src/isometric-grid.js";
import { perspectiveFloorLayerType } from "../src/perspective-plane.js";
import type { LayerBounds, RenderResources } from "@genart-dev/core";

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

function createMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    setLineDash: vi.fn(),
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

describe("perspective plugin", () => {
  it("exports a valid DesignPlugin", () => {
    expect(perspectivePlugin.id).toBe("perspective");
    expect(perspectivePlugin.tier).toBe("free");
    expect(perspectivePlugin.layerTypes).toHaveLength(7);
    expect(perspectivePlugin.mcpTools).toHaveLength(10);
  });

  it("guide layers have guide category", () => {
    const guides = perspectivePlugin.layerTypes.filter(
      (lt) => lt.typeId !== "perspective:floor" && lt.typeId !== "perspective:atmosphere",
    );
    for (const lt of guides) {
      expect(lt.category).toBe("guide");
    }
  });

  it("floor layer has shape category", () => {
    const floor = perspectivePlugin.layerTypes.find(
      (lt) => lt.typeId === "perspective:floor",
    );
    expect(floor?.category).toBe("shape");
  });

  it("all layer types have unique typeIds", () => {
    const ids = perspectivePlugin.layerTypes.map((t) => t.typeId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("onePointGridLayerType", () => {
  it("renders without errors", () => {
    const ctx = createMockCtx();
    onePointGridLayerType.render(
      onePointGridLayerType.createDefault(),
      ctx,
      BOUNDS,
      RESOURCES,
    );
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it("default has point property for vanishingPoint", () => {
    const defaults = onePointGridLayerType.createDefault();
    const vp = defaults.vanishingPoint as { x: number; y: number };
    expect(vp.x).toBe(0.5);
    expect(vp.y).toBe(0.4);
  });

  it("validates horizontal lines range", () => {
    expect(
      onePointGridLayerType.validate({
        ...onePointGridLayerType.createDefault(),
        horizontalLines: 0,
      }),
    ).not.toBeNull();
    expect(
      onePointGridLayerType.validate(onePointGridLayerType.createDefault()),
    ).toBeNull();
  });

  it("renders with off-canvas VP", () => {
    const ctx = createMockCtx();
    const props = {
      ...onePointGridLayerType.createDefault(),
      vanishingPoint: { x: -0.5, y: -0.5 },
    };
    // Should not throw
    onePointGridLayerType.render(props, ctx, BOUNDS, RESOURCES);
    expect(ctx.stroke).toHaveBeenCalled();
  });
});

describe("twoPointGridLayerType", () => {
  it("renders without errors", () => {
    const ctx = createMockCtx();
    twoPointGridLayerType.render(
      twoPointGridLayerType.createDefault(),
      ctx,
      BOUNDS,
      RESOURCES,
    );
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("default VPs are off-canvas", () => {
    const defaults = twoPointGridLayerType.createDefault();
    const lvp = defaults.leftVP as { x: number; y: number };
    const rvp = defaults.rightVP as { x: number; y: number };
    expect(lvp.x).toBeLessThan(0);
    expect(rvp.x).toBeGreaterThan(1);
  });

  it("validates linesPerVP range", () => {
    expect(
      twoPointGridLayerType.validate({
        ...twoPointGridLayerType.createDefault(),
        linesPerVP: 0,
      }),
    ).not.toBeNull();
  });
});

describe("threePointGridLayerType", () => {
  it("renders without errors", () => {
    const ctx = createMockCtx();
    threePointGridLayerType.render(
      threePointGridLayerType.createDefault(),
      ctx,
      BOUNDS,
      RESOURCES,
    );
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("default third VP is above canvas (bird's eye)", () => {
    const defaults = threePointGridLayerType.createDefault();
    const tvp = defaults.thirdVP as { x: number; y: number };
    expect(tvp.y).toBeLessThan(0);
  });

  it("renders with worm's eye VP", () => {
    const ctx = createMockCtx();
    const props = {
      ...threePointGridLayerType.createDefault(),
      thirdVP: { x: 0.5, y: 1.5 },
    };
    threePointGridLayerType.render(props, ctx, BOUNDS, RESOURCES);
    expect(ctx.stroke).toHaveBeenCalled();
  });
});

describe("isometricGridLayerType", () => {
  it("renders without errors", () => {
    const ctx = createMockCtx();
    isometricGridLayerType.render(
      isometricGridLayerType.createDefault(),
      ctx,
      BOUNDS,
      RESOURCES,
    );
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("default angle is 30", () => {
    const defaults = isometricGridLayerType.createDefault();
    expect(defaults.angle).toBe(30);
  });

  it("validates angle range", () => {
    expect(
      isometricGridLayerType.validate({
        ...isometricGridLayerType.createDefault(),
        angle: 3,
      }),
    ).not.toBeNull();
    expect(
      isometricGridLayerType.validate(isometricGridLayerType.createDefault()),
    ).toBeNull();
  });

  it("renders with only verticals enabled", () => {
    const ctx = createMockCtx();
    const props = {
      ...isometricGridLayerType.createDefault(),
      showLeftDiagonals: false,
      showRightDiagonals: false,
    };
    isometricGridLayerType.render(props, ctx, BOUNDS, RESOURCES);
    expect(ctx.stroke).toHaveBeenCalled();
  });
});

describe("perspectiveFloorLayerType", () => {
  it("renders without errors", () => {
    const ctx = createMockCtx();
    perspectiveFloorLayerType.render(
      perspectiveFloorLayerType.createDefault(),
      ctx,
      BOUNDS,
      RESOURCES,
    );
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("has shape category", () => {
    expect(perspectiveFloorLayerType.category).toBe("shape");
  });

  it("default stroke color is magenta", () => {
    const defaults = perspectiveFloorLayerType.createDefault();
    expect(defaults.strokeColor).toBe("#FF00CC");
  });

  it("validates horizon position", () => {
    expect(
      perspectiveFloorLayerType.validate({
        ...perspectiveFloorLayerType.createDefault(),
        horizonPosition: -1,
      }),
    ).not.toBeNull();
    expect(
      perspectiveFloorLayerType.validate(perspectiveFloorLayerType.createDefault()),
    ).toBeNull();
  });
});
