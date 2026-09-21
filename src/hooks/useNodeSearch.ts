import { useState, useMemo } from "react";
import type { GraphNode } from "../types";
import { searchNodes } from "../services/graphHandlers/searchNodes"; // Uses utility from Option 1

export function useNodeSearch(nodes: GraphNode[]) {
  const [searchQuery, setSearchQuery] = useState("");

  const matchedNodes = useMemo(
    () => searchNodes(nodes, searchQuery),
    [searchQuery, nodes]
  );

  return {
    searchQuery,
    setSearchQuery,
    matchedNodes,
  };
}