import { useState, useMemo } from "react";
import type { GraphData, GraphNode } from "../types";
import { filterIsolatedGraph } from "../services/graphHandlers/isolatedGraph";

export function useGraphIsolation(graphData: GraphData) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isolateMode, setIsolateMode] = useState(false);

  const visibleGraphData = useMemo(() => {
    // Guard clause lives directly inside the hook's memoized computation
    if (!isolateMode || !selectedNode) return graphData;

    return filterIsolatedGraph(graphData, selectedNode);
  }, [graphData, selectedNode, isolateMode]);

  return {
    selectedNode,
    setSelectedNode,
    isolateMode,
    setIsolateMode,
    visibleGraphData,
  };
}