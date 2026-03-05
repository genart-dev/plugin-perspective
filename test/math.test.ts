import { describe, it, expect } from "vitest";
import {
  applyDepthEasing,
  depthEasedPositions,
  fanLinesFromVP,
  clipLineToRect,
  lineIntersection,
  depthStyle,
} from "../src/shared.js";

describe("applyDepthEasing", () => {
  it("linear: identity", () => {
    expect(applyDepthEasing(0, "linear")).toBe(0);
    expect(applyDepthEasing(0.5, "linear")).toBe(0.5);
    expect(applyDepthEasing(1, "linear")).toBe(1);
  });

  it("quadratic: t^2", () => {
    expect(applyDepthEasing(0, "quadratic")).toBe(0);
    expect(applyDepthEasing(0.5, "quadratic")).toBeCloseTo(0.25);
    expect(applyDepthEasing(1, "quadratic")).toBe(1);
  });

  it("cubic: t^3", () => {
    expect(applyDepthEasing(0, "cubic")).toBe(0);
    expect(applyDepthEasing(0.5, "cubic")).toBeCloseTo(0.125);
    expect(applyDepthEasing(1, "cubic")).toBe(1);
  });

  it("exponential: maps [0,1] to [0,1]", () => {
    expect(applyDepthEasing(0, "exponential")).toBeCloseTo(0, 5);
    expect(applyDepthEasing(1, "exponential")).toBeCloseTo(1, 5);
    // Should be below quadratic at t=0.5
    const mid = applyDepthEasing(0.5, "exponential");
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(0.5);
  });
});

describe("depthEasedPositions", () => {
  it("returns correct count", () => {
    const positions = depthEasedPositions(100, 500, 10, "linear");
    expect(positions).toHaveLength(10);
  });

  it("linear spacing is uniform", () => {
    const positions = depthEasedPositions(0, 100, 4, "linear");
    expect(positions[0]).toBeCloseTo(25);
    expect(positions[1]).toBeCloseTo(50);
    expect(positions[2]).toBeCloseTo(75);
    expect(positions[3]).toBeCloseTo(100);
  });

  it("quadratic spacing compresses near horizon", () => {
    const positions = depthEasedPositions(0, 400, 4, "quadratic");
    // First gap should be smaller than last gap
    const gap1 = positions[0]!;
    const gap4 = positions[3]! - positions[2]!;
    expect(gap1).toBeLessThan(gap4);
  });

  it("positions stay between horizon and edge", () => {
    const positions = depthEasedPositions(200, 600, 12, "exponential");
    for (const y of positions) {
      expect(y).toBeGreaterThanOrEqual(200);
      expect(y).toBeLessThanOrEqual(600);
    }
  });
});

describe("fanLinesFromVP", () => {
  it("returns correct count", () => {
    const lines = fanLinesFromVP(400, 200, 600, 10, 1.0, 800, 0);
    expect(lines).toHaveLength(10);
  });

  it("all lines start at VP", () => {
    const lines = fanLinesFromVP(400, 200, 600, 5, 0.9, 800, 0);
    for (const [x1, y1] of lines) {
      expect(x1).toBe(400);
      expect(y1).toBe(200);
    }
  });

  it("all lines end at edge Y", () => {
    const lines = fanLinesFromVP(400, 200, 600, 5, 0.9, 800, 0);
    for (const [, , , y2] of lines) {
      expect(y2).toBe(600);
    }
  });

  it("spread factor controls width", () => {
    const narrow = fanLinesFromVP(400, 200, 600, 5, 0.5, 800, 0);
    const wide = fanLinesFromVP(400, 200, 600, 5, 1.5, 800, 0);
    const narrowSpan = narrow[4]![2] - narrow[0]![2];
    const wideSpan = wide[4]![2] - wide[0]![2];
    expect(wideSpan).toBeGreaterThan(narrowSpan);
  });
});

describe("clipLineToRect", () => {
  const rect = { x: 0, y: 0, w: 100, h: 100 };

  it("fully inside — no change", () => {
    const result = clipLineToRect(10, 10, 90, 90, rect.x, rect.y, rect.w, rect.h);
    expect(result).toEqual([10, 10, 90, 90]);
  });

  it("fully outside — returns null", () => {
    const result = clipLineToRect(200, 200, 300, 300, rect.x, rect.y, rect.w, rect.h);
    expect(result).toBeNull();
  });

  it("clips line crossing left boundary", () => {
    const result = clipLineToRect(-50, 50, 50, 50, rect.x, rect.y, rect.w, rect.h);
    expect(result).not.toBeNull();
    expect(result![0]).toBeCloseTo(0); // clipped to left edge
    expect(result![2]).toBeCloseTo(50);
  });

  it("clips diagonal line", () => {
    const result = clipLineToRect(-50, -50, 150, 150, rect.x, rect.y, rect.w, rect.h);
    expect(result).not.toBeNull();
    expect(result![0]).toBeCloseTo(0);
    expect(result![1]).toBeCloseTo(0);
    expect(result![2]).toBeCloseTo(100);
    expect(result![3]).toBeCloseTo(100);
  });

  it("handles off-canvas VP coordinates", () => {
    // VP at (-200, -100), line to (50, 50)
    const result = clipLineToRect(-200, -100, 50, 50, 0, 0, 100, 100);
    expect(result).not.toBeNull();
    // Clipped start should be on the boundary
    expect(result![0]).toBeGreaterThanOrEqual(0);
    expect(result![1]).toBeGreaterThanOrEqual(0);
  });
});

describe("lineIntersection", () => {
  it("finds intersection of perpendicular lines", () => {
    const pt = lineIntersection(0, 50, 100, 50, 50, 0, 50, 100);
    expect(pt).not.toBeNull();
    expect(pt!.x).toBeCloseTo(50);
    expect(pt!.y).toBeCloseTo(50);
  });

  it("returns null for parallel lines", () => {
    const pt = lineIntersection(0, 0, 100, 0, 0, 10, 100, 10);
    expect(pt).toBeNull();
  });

  it("finds intersection of diagonal lines", () => {
    const pt = lineIntersection(0, 0, 100, 100, 0, 100, 100, 0);
    expect(pt).not.toBeNull();
    expect(pt!.x).toBeCloseTo(50);
    expect(pt!.y).toBeCloseTo(50);
  });
});

describe("depthStyle", () => {
  it("at t=0, returns base values", () => {
    const s = depthStyle(0, 0.3, 1);
    expect(s.alpha).toBeCloseTo(0.3);
    expect(s.width).toBeCloseTo(0.5);
  });

  it("at t=1, alpha is 1 and width is 2x base", () => {
    const s = depthStyle(1, 0.3, 1);
    expect(s.alpha).toBeCloseTo(1);
    expect(s.width).toBeCloseTo(2);
  });

  it("alpha increases with depth", () => {
    const s1 = depthStyle(0.25, 0.5, 1);
    const s2 = depthStyle(0.75, 0.5, 1);
    expect(s2.alpha).toBeGreaterThan(s1.alpha);
  });
});
