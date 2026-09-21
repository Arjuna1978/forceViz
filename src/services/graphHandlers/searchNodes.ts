import type { GraphNode } from "../../types";

/**
 * Filters nodes based on a search query or a 'level:'/'l:' prefix group query.
 */
export function searchNodes(nodes: GraphNode[], searchQuery: string): GraphNode[] {
  const query = searchQuery.trim();
  if (!query) return [];

  const isLevelSearch =
    query.toLowerCase().includes("level:") || query.toLowerCase().includes("l:");

    //level search

  if (isLevelSearch) {
    const targetGroup = query.split(":")[1]?.trim().toLowerCase() || "";
    return nodes.filter((node) =>
      String(node.group || "").toLowerCase().includes(targetGroup)
    );
  }

  //text search
  const lowerQuery = query.toLowerCase();
  return nodes.filter(
    (node) =>
      String(node.name || "").toLowerCase().includes(lowerQuery) ||
      String(node.id || "").toLowerCase().includes(lowerQuery)
  );
}