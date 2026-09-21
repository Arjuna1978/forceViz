import type { GraphData, GraphNode } from "../../types";

const getId = (nodeOrId: string | number | GraphNode): string | number =>
  typeof nodeOrId === "object" && nodeOrId !== null ? nodeOrId.id : nodeOrId;

export function filterIsolatedGraph(
  graphData: GraphData,
  selectedNode: GraphNode,
): GraphData {

  const startId = selectedNode.id;
  const visibleNodeIds = new Set<string | number>([startId]);

  // list of downstream ( outgoing) and upstream (incoming) nodes
  const outgoing = new Map<string | number, (string | number)[]>();
  const incoming = new Map<string | number, (string | number)[]>();

  for (const link of graphData.links) {
    const sourceID = getId(link.source);
    const targetID = getId(link.target);
    
    if (!outgoing.has(sourceID)) outgoing.set(sourceID, []);
    if (!incoming.has(targetID)) incoming.set(targetID, []);
    outgoing.get(sourceID)!.push(targetID);
    incoming.get(targetID)!.push(sourceID);
  }

  // traversal function that takes 
  const traverse = (adjMap: Map<string | number, (string | number)[]>) => {
    const queue = [startId];
    let head = 0;

    while (head < queue.length) {
      const currId = queue[head++];
      const neighbors = adjMap.get(currId);
      if (!neighbors) continue;

      for (const neighborId of neighbors) {
        if (!visibleNodeIds.has(neighborId)) {
          visibleNodeIds.add(neighborId);
          queue.push(neighborId);
        }
      }
    }
  };

  traverse(outgoing); // Traverse Downstream
  traverse(incoming); // Traverse Upstream

  return {
    nodes: graphData.nodes.filter((n) => visibleNodeIds.has(n.id)),
    links: graphData.links.filter(
      (l) => visibleNodeIds.has(getId(l.source)) && visibleNodeIds.has(getId(l.target))
    ),
  };
}