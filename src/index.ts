import type { DesignPlugin, PluginContext } from "@genart-dev/core";
import { onePointGridLayerType } from "./one-point-grid.js";
import { twoPointGridLayerType } from "./two-point-grid.js";
import { threePointGridLayerType } from "./three-point-grid.js";
import { isometricGridLayerType } from "./isometric-grid.js";
import { perspectiveFloorLayerType } from "./perspective-plane.js";
import { atmosphereLayerType } from "./atmosphere.js";
import { cameraLayerType } from "./camera.js";
import { perspectiveMcpTools } from "./perspective-tools.js";
import { cameraMcpTools } from "./camera-tools.js";

const perspectivePlugin: DesignPlugin = {
  id: "perspective",
  name: "Perspective & Camera",
  version: "0.3.0",
  tier: "free",
  description:
    "Scene camera, perspective guides (one-point, two-point, three-point, isometric), floor plane, and atmospheric perspective.",

  layerTypes: [
    cameraLayerType,
    onePointGridLayerType,
    twoPointGridLayerType,
    threePointGridLayerType,
    isometricGridLayerType,
    perspectiveFloorLayerType,
    atmosphereLayerType,
  ],
  tools: [],
  exportHandlers: [],
  mcpTools: [...perspectiveMcpTools, ...cameraMcpTools],

  async initialize(_context: PluginContext): Promise<void> {
    // No async setup needed
  },

  dispose(): void {
    // No resources to release
  },
};

export default perspectivePlugin;
export { cameraLayerType } from "./camera.js";
export { resolveCameraProps, CAMERA_PRESETS } from "./camera.js";
export type { CameraProps, CameraPresetName } from "./camera.js";
export { cameraMcpTools } from "./camera-tools.js";
export { onePointGridLayerType } from "./one-point-grid.js";
export { twoPointGridLayerType } from "./two-point-grid.js";
export { threePointGridLayerType } from "./three-point-grid.js";
export { isometricGridLayerType } from "./isometric-grid.js";
export { perspectiveFloorLayerType } from "./perspective-plane.js";
export { atmosphereLayerType } from "./atmosphere.js";
export { perspectiveMcpTools } from "./perspective-tools.js";
export {
  applyDepthEasing,
  depthEasedPositions,
  fanLinesFromVP,
  clipLineToRect,
  lineIntersection,
  depthStyle,
} from "./shared.js";
