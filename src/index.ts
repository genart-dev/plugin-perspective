import type { DesignPlugin, PluginContext } from "@genart-dev/core";
import { onePointGridLayerType } from "./one-point-grid.js";
import { twoPointGridLayerType } from "./two-point-grid.js";
import { threePointGridLayerType } from "./three-point-grid.js";
import { isometricGridLayerType } from "./isometric-grid.js";
import { perspectiveFloorLayerType } from "./perspective-plane.js";
import { perspectiveMcpTools } from "./perspective-tools.js";

const perspectivePlugin: DesignPlugin = {
  id: "perspective",
  name: "Perspective Grids",
  version: "0.1.0",
  tier: "free",
  description:
    "Perspective guides: one-point, two-point, three-point, isometric grids, and floor plane.",

  layerTypes: [
    onePointGridLayerType,
    twoPointGridLayerType,
    threePointGridLayerType,
    isometricGridLayerType,
    perspectiveFloorLayerType,
  ],
  tools: [],
  exportHandlers: [],
  mcpTools: perspectiveMcpTools,

  async initialize(_context: PluginContext): Promise<void> {
    // No async setup needed
  },

  dispose(): void {
    // No resources to release
  },
};

export default perspectivePlugin;
export { onePointGridLayerType } from "./one-point-grid.js";
export { twoPointGridLayerType } from "./two-point-grid.js";
export { threePointGridLayerType } from "./three-point-grid.js";
export { isometricGridLayerType } from "./isometric-grid.js";
export { perspectiveFloorLayerType } from "./perspective-plane.js";
export { perspectiveMcpTools } from "./perspective-tools.js";
export {
  applyDepthEasing,
  depthEasedPositions,
  fanLinesFromVP,
  clipLineToRect,
  lineIntersection,
  depthStyle,
} from "./shared.js";
