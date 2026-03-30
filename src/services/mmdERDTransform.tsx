/**
 * fapi-transformer.ts
 * A standalone TypeScript utility to transform Mermaid erDiagrams into 
 * a hierarchical JSON format compatible with forceViz / d3-force.
 */

/**
 * Node interface matching forceViz service expectations
 */
export interface GraphNode {
  id: string;
  name: string;
  type: string;
  description: string;
  group?: number; // Added for visual grouping in force-directed graphs
}

/**
 * Link interface matching forceViz service expectations
 */
export interface GraphLink {
  source: string;
  target: string;
  linkType: string;
}

/**
 * The final graph object ready for parseGraphJSON
 */
export interface FapiGraph {
  nodes: GraphNode[];
  links: GraphLink[];
}

export class MermaidToFapiTransformer {
  private rootId: string = "";
  private entityNodes: Set<string> = new Set();

  /**
   * Main transformation method
   */
  public transform(mmd: string): FapiGraph {
    const nodeMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];
    
    const lines = mmd
      .split("\n")
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("%%") && l !== "erDiagram" && l !== "{");

    // 1. Identify Root (the hub with most connections)
    this.identifyRoot(lines);

    // 2. Register primary entities
    this.entityNodes.forEach(entityId => {
      const isRoot = entityId === this.rootId;
      nodeMap.set(entityId, {
        id: entityId,
        name: entityId.toUpperCase(),
        type: isRoot ? "Root Object" : "object",
        description: isRoot ? "Primary root entity." : `${entityId} extension block.`,
        group: isRoot ? 1 : 2
      });
    });

    let currentBlock: string | null = null;

    for (const line of lines) {
      if (line.includes("{")) {
        currentBlock = line.split("{")[0].trim().toLowerCase();
        continue;
      }
      if (line.includes("}")) {
        currentBlock = null;
        continue;
      }

      // Handle block attributes (Level 3)
      if (currentBlock && line.includes(" ")) {
        const parts = line.split(/\s+/).filter(p => p);
        if (parts.length >= 2) {
          const attrType = parts[0];
          const attrName = parts[1];
          const descMatch = line.match(/"([^"]+)"/);
          const description = descMatch ? descMatch[1] : `${attrName} of ${currentBlock}`;

          // Unique ID to prevent collisions (e.g., id, title, description)
          const nodeId = currentBlock === this.rootId ? attrName : `${currentBlock}_${attrName}`;
          
          nodeMap.set(nodeId, {
            id: nodeId,
            name: attrName,
            type: attrType,
            description: description,
            group: 3
          });

          links.push({
            source: currentBlock,
            target: nodeId,
            linkType: "parent-child"
          });
        }
        continue;
      }

      // Handle Cross-Entity relationships
      const relMatch = line.match(/(\w+)\s+[\|o\-{}<>]{4,}\s+(\w+)\s*:\s*"([^"]+)"/);
      if (relMatch) {
        const source = relMatch[1].toLowerCase();
        const target = relMatch[2].toLowerCase();
        const label = relMatch[3];

        if (!nodeMap.has(source)) this.createInferredNode(nodeMap, source);
        if (!nodeMap.has(target)) this.createInferredNode(nodeMap, target);

        if (target === this.rootId) {
          links.push({ source, target, linkType: "resolves-to-root" });
        } else {
          links.push({ source, target, linkType: label === "has" ? "parent-child" : label });
        }
      }
    }

    const finalGraph: FapiGraph = {
      nodes: Array.from(nodeMap.values()),
      links: links
    };

    // 3. Prevent floating nodes by bridging orphans to Root
    this.validateAndFixOrphans(finalGraph);

    return finalGraph;
  }

  private createInferredNode(nodeMap: Map<string, GraphNode>, id: string): void {
    nodeMap.set(id, {
      id,
      name: id.toUpperCase(),
      type: "object",
      description: `Inferred entity: ${id}`,
      group: 2
    });
  }

  private identifyRoot(lines: string[]): void {
    const connections: Record<string, number> = {};
    lines.forEach(line => {
      const blockMatch = line.match(/(\w+)\s*\{/);
      if (blockMatch) this.entityNodes.add(blockMatch[1].toLowerCase());

      const relMatch = line.match(/(\w+)\s+[\|o\-{}<>]{4,}\s+(\w+)/);
      if (relMatch) {
        const s = relMatch[1].toLowerCase();
        const t = relMatch[2].toLowerCase();
        this.entityNodes.add(s);
        this.entityNodes.add(t);
        connections[s] = (connections[s] || 0) + 1;
        connections[t] = (connections[t] || 0) + 1;
      }
    });
    this.rootId = Object.entries(connections).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  }

  private validateAndFixOrphans(graph: FapiGraph): void {
    const childrenSet = new Set(graph.links.map(l => l.target));
    graph.nodes.forEach(node => {
      if (node.id !== this.rootId && !childrenSet.has(node.id)) {
        graph.links.push({
          source: this.rootId,
          target: node.id,
          linkType: "parent-child"
        });
      }
    });
  }
}

export const transformMermaidToFapi = (mmd: string): FapiGraph => {
  const transformer = new MermaidToFapiTransformer();
  return transformer.transform(mmd);
};