// src/services/handleDL.ts
import * as N3 from 'n3';
import type { GraphData } from "../types";

/**
 * Helper to extract a string ID safely from a potentially hydrated link endpoint
 */
function getEndpointId(endpoint: string | number | unknown): string {
  if (typeof endpoint === 'object' && endpoint !== null && 'id' in endpoint) {
    // Cast to an indexable object record instead of using 'any'
    const hydratedNode = endpoint as Record<string, unknown>;
    return String(hydratedNode.id);
  }
  return String(endpoint);
}

export function handleDL(visibleGraphData: GraphData, filename: string): void {
  if (!visibleGraphData || visibleGraphData.nodes.length === 0) {
    console.warn("No graph data available to export.");
    return;
  }

  // Create an N3 writer specifying the Turtle format and standard SKOS/RDFS prefixes
  const writer = new N3.Writer({
    format: 'Turtle',
    prefixes: {
      skos: 'http://www.w3.org/2004/02/skos/core#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      owl: 'http://www.w3.org/2002/07/owl#',
      dct: 'http://purl.org/dc/terms/'
    }
  });

  const visibleNodeIds = new Set(visibleGraphData.nodes.map(n => n.id));

  // 1. Serialize all visible nodes and their semantic metadata properties
  visibleGraphData.nodes.forEach((node) => {
    const subject = String(node.id);
    
    // Output semantic labels
    if (node.name) {
      writer.addQuad(
        N3.DataFactory.quad(
          N3.DataFactory.namedNode(subject),
          N3.DataFactory.namedNode('http://www.w3.org/2004/02/skos/core#prefLabel'),
          N3.DataFactory.literal(String(node.name)) // Ensured string primitive
        )
      );
    }

    // Capture standard dynamic descriptions/definitions stored on your node object
    const descriptivePredicates: Record<string, string> = {
      definition: 'http://www.w3.org/2004/02/skos/core#definition',
      comment: 'http://www.w3.org/2000/01/rdf-schema#label',
      description: 'http://purl.org/dc/terms/description',
      scopeNote: 'http://www.w3.org/2004/02/skos/core#scopeNote',
      historyNote: 'http://www.w3.org/2004/02/skos/core#historyNote'
    };

    const nodeRecord = node as Record<string, unknown>;

    Object.entries(descriptivePredicates).forEach(([key, predicateUri]) => {
      // Check if the key exists and holds a truthy value
      if (key in nodeRecord && nodeRecord[key]) {
        const metadataValue = String(nodeRecord[key]);

        writer.addQuad(
          N3.DataFactory.quad(
            N3.DataFactory.namedNode(subject),
            N3.DataFactory.namedNode(predicateUri),
            N3.DataFactory.literal(metadataValue)
          )
        );
      }
    });
  }); // <-- FIXED: This closing block was missing, which broke the loop scope!

  // 2. Serialize structural hierarchical links
  visibleGraphData.links.forEach((link) => {
    const sourceId = getEndpointId(link.source);
    const targetId = getEndpointId(link.target);

    // Only serialize links where both endpoints are actively present in our isolated/constrained subset
    if (visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId)) {
      writer.addQuad(
        N3.DataFactory.quad(
          N3.DataFactory.namedNode(targetId), // Child Node
          N3.DataFactory.namedNode('http://www.w3.org/2004/02/skos/core#broader'), // Predicate
          N3.DataFactory.namedNode(sourceId) // Parent Node
        )
      );
    }
  });

  // 3. Compile layout to text string stream and trigger browser file anchor download
  writer.end((error, result) => {
    if (error) {
      console.error("Failed to generate Turtle serialization file:", error);
      return;
    }

    if (result) {
      const blob = new Blob([result], { type: "text/turtle;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement("a");
      
      downloadAnchor.href = url;
      downloadAnchor.download = filename;
      downloadAnchor.style.display = "none";
      
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(url);
    }
  });
}