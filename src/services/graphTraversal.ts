import type { GraphData, GraphNode, GraphLink } from "../types";

const getNodeId = (nodeOrId: string | number | GraphNode): string | number => 
  (typeof nodeOrId === "object" && nodeOrId !== null) ? nodeOrId.id : nodeOrId;

export const getIsolatedGraph = (
  graphData: GraphData, 
  selectedNode: GraphNode | null
): GraphData => {
  if (!selectedNode) return graphData;

  const visibleNodeIds = new Set<string | number>();
  const startId = selectedNode.id;
  visibleNodeIds.add(startId);

  // Upstream and Downstream traversal
  let queue = [startId];
  
  // Downstream
  while (queue.length > 0) {
    const currId = queue.shift();
    graphData.links.forEach((link) => {
      if (getNodeId(link.source) === currId) {
        const targetId = getNodeId(link.target);
        if (!visibleNodeIds.has(targetId)) {
          visibleNodeIds.add(targetId);
          queue.push(targetId);
        }
      }
    });
  }

  // Upstream
  queue = [startId];
  while (queue.length > 0) {
    const currId = queue.shift();
    graphData.links.forEach((link) => {
      if (getNodeId(link.target) === currId) {
        const sourceId = getNodeId(link.source);
        if (!visibleNodeIds.has(sourceId)) {
          visibleNodeIds.add(sourceId);
          queue.push(sourceId);
        }
      }
    });
  }

  return {
    nodes: graphData.nodes.filter((n) => visibleNodeIds.has(n.id)),
    links: graphData.links.filter(
      (l) => visibleNodeIds.has(getNodeId(l.source)) && visibleNodeIds.has(getNodeId(l.target))
    ),
  };
};