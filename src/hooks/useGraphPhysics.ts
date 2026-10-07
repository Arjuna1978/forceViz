import { useEffect, type RefObject } from "react";
import type { ForceGraphMethods } from "react-force-graph-2d";
import type { GraphData, PhysicsConfig } from "../types";
import { graphPhysics } from "../services/graphPhysics";

export function useGraphPhysics(
  fgRef: RefObject<ForceGraphMethods | null | undefined>,
  visibleGraphData: GraphData,
  config?: PhysicsConfig,
  debounceMs: number = 100
) {
  useEffect(() => {
    const timer = setTimeout(() => {
      // Both runtime guard checks live here
      if (fgRef.current && visibleGraphData.nodes.length > 0) {
        graphPhysics(fgRef.current, config);
        
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [fgRef, visibleGraphData, config, debounceMs]);
}