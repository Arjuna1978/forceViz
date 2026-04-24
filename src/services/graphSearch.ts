import type { GraphNode } from "../types";

export const filterNodes = (nodes: GraphNode[], query: string): GraphNode[] => {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return [];
  
  return nodes.filter(
    (n) =>
      String(n.name || "").toLowerCase().includes(lowerQuery) ||
      String(n.id || "").toLowerCase().includes(lowerQuery)
  );
};

export const isNodeMatched = (node: GraphNode, query: string): boolean => {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return false;
  return (
    String(node.name || "").toLowerCase().includes(lowerQuery) ||
    String(node.id || "").toLowerCase().includes(lowerQuery)
  );
};