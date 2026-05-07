// src/parseGraphTurtle.ts
import * as N3 from 'n3';
import type { GraphData, GraphNode, GraphLink } from "../types";

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const SKOS_CONCEPT_SCHEME = 'http://www.w3.org/2004/02/skos/core#ConceptScheme';
const SKOS_PREF_LABEL = 'http://www.w3.org/2004/02/skos/core#prefLabel';
const SKOS_BROADER = 'http://www.w3.org/2004/02/skos/core#broader';
const SKOS_NARROWER = 'http://www.w3.org/2004/02/skos/core#narrower';
const OWL_ONTOLOGY = 'http://www.w3.org/2002/07/owl#Ontology';
const RDFS_SUBCLASS = 'http://www.w3.org/2000/01/rdf-schema#subClassOf';
const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';

const DESCRIPTIVE_PREDICATES = new Set([
  'http://www.w3.org/2004/02/skos/core#definition',
  'http://www.w3.org/2000/01/rdf-schema#comment',
  'http://purl.org/dc/terms/description',
  'http://www.w3.org/2004/02/skos/core#scopeNote',
  'http://www.w3.org/2004/02/skos/core#historyNote'
]);
const SKOS_HAS_TOP_CONCEPT = 'http://www.w3.org/2004/02/skos/core#hasTopConcept';

export async function parseGraphTurtle(file: File): Promise<GraphData> {
  const text = await file.text();
  const parser = new N3.Parser();
  const store = new N3.Store();

  return new Promise((resolve, reject) => {
    parser.parse(text, (error: Error | null, quad: N3.Quad | null) => {
      if (error) {
        return reject(error);
      }

      // 1. If it's a quad, add it to the store and exit the callback
      if (quad) {
        store.add(quad);
        return; 
      }

      // 2. If quad is null, parsing is finished! Now we build the graph.
      const nodesMap = new Map<string, GraphNode>(); //this holds the node by nodeID and node object
      const links: GraphLink[] = [];
      const linkSet = new Set<string>();
      const childrenMap = new Map<string, string[]>();
      const visited = new Set<string>();

      function ensureNode(id: string) {
        if (!nodesMap.has(id)) {
          nodesMap.set(id, {
            id,
            name: id.split(/#|\//).pop() || id,
            val: 5,
            group: 5
          } as GraphNode); 
        }
      }

      function registerRel(parent: string, child: string) {
        if (parent === child) return; //this is a root node
        ensureNode(parent);
        ensureNode(child);

        let children = childrenMap.get(parent);

        if (!children) {
          children = [];
          childrenMap.set(parent, children);
        }

        if (!children.includes(child)) children.push(child);

        const linkId = parent + "->" + child;
        if (!linkSet.has(linkId)) {
          links.push({ source: parent, target: child });
          linkSet.add(linkId);
        }
      }

      function processHierarchy(iri: string, depth: number) {
        if (visited.has(iri)) return;
        visited.add(iri);
        const node = nodesMap.get(iri);
        if (node) {
          node.val = depth === 0 ? 30 : depth === 1 ? 20 : depth === 2 ? 10 : 5;
          node.group = depth + 1;
        }

        const children = childrenMap.get(iri);
        
        if (children) {
          for (let i = 0; i < children.length; i++) {
            processHierarchy(children[i], depth + 1);
          }
        }
      }

function getLinkId(linkPart: string | number | GraphNode | undefined | null): string {
  if (typeof linkPart === 'string') {
    return linkPart;
  }
  if (typeof linkPart === 'number') {
    return linkPart.toString();
  }
if (linkPart && typeof linkPart === 'object' && 'id' in linkPart) {
    return String(linkPart.id);
  }
return '';
}

      // 1. PRE-FILTERING
const validEntities = new Set<string>();
const relevantPredicates = [RDF_TYPE, SKOS_PREF_LABEL, RDFS_LABEL];

for (const pred of relevantPredicates) {
  store.getSubjects(pred, null, null).forEach(s => validEntities.add(s.id));
}

      

      // 2. HARVESTING & MAPPING
      const subjects = store.getSubjects(null, null, null);
      
      for (let i = 0; i < subjects.length; i++) {
        const iri = subjects[i].id;
        if (!validEntities.has(iri)) continue;

        const quads = store.getQuads(subjects[i], null, null, null);
        
        let name = "";
        let bestLabelScore = -1;
        const metadata: Record<string, string> = {};

        for (let j = 0; j < quads.length; j++) {
          const pred = quads[j].predicate.id;
          const obj = quads[j].object;

          // Label Logic
          if (pred === SKOS_PREF_LABEL || pred === RDFS_LABEL) {
            let score = 0;
            if (obj.id.includes('@en-gb')) score = 3;
            else if (obj.id.includes('@en')) score = 2;
            else score = 1;

            if (score > bestLabelScore) {
              name = obj.value; 
              bestLabelScore = score;
            }
          }

          // Relationship Logic
          if (pred === SKOS_BROADER || pred === RDFS_SUBCLASS) {
            if (validEntities.has(obj.id)) registerRel(obj.id, iri);
          } else if (pred === SKOS_NARROWER || pred === SKOS_HAS_TOP_CONCEPT) {
            if (validEntities.has(obj.id)) registerRel(iri, obj.id);
          }

          // Metadata Logic
          if (DESCRIPTIVE_PREDICATES.has(pred)) {
            const key = pred.split(/#|\//).pop() || 'info';
            if (!metadata[key] || obj.id.includes('@en-gb')) {
              metadata[key] = obj.value;
            }
          }
        }

        nodesMap.set(iri, {
          id: iri,
          name: name || iri.split(/#|\//).pop() || iri,
          val: 5,
          group: 4,
          ...metadata
        } as GraphNode);
      }

      // 3. ANCHORING
      const officialRoots = [
        ...store.getSubjects(RDF_TYPE, SKOS_CONCEPT_SCHEME, null),
        ...store.getSubjects(RDF_TYPE, OWL_ONTOLOGY, null)
      ];

      for (let i = 0; i < officialRoots.length; i++) {
        processHierarchy(officialRoots[i].id, 0);
      }

      nodesMap.forEach((node, iri) => {
        if (!visited.has(iri)) {
          const hasChildren = childrenMap.has(iri);
          let hasParent = false;
          for (let j = 0; j < links.length; j++) {
            if (getLinkId(links[j].target) === iri) {
              hasParent = true;
              break;
            }
          }

          if (hasChildren && !hasParent) {
            processHierarchy(iri, 0);
          } else if (!hasChildren && !hasParent) {
            node.val = 5;
            node.group = 5;
            visited.add(iri);
          }
        }
      });

      resolve({ nodes: Array.from(nodesMap.values()), links: links });
    });
  });
}