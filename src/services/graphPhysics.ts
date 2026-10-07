import { ForceGraphMethods } from "react-force-graph-2d";
import { PhysicsConfig } from "../types";

export function graphPhysics(
  fgInstance: ForceGraphMethods,
  config: PhysicsConfig = { linkDistance: 1, chargeStrength: -5000 }
): void {
  fgInstance.d3Force("link")?.distance(config.linkDistance);
  fgInstance.d3Force("charge")?.strength(config.chargeStrength);
  fgInstance.d3ReheatSimulation();
}