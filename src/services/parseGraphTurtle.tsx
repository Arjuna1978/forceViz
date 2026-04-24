import * as N3 from 'n3';
import type { GraphData, GraphNode, GraphLink } from "../types";

// Constants for Semantic URIs
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const SKOS_CONCEPT = 'http://www.w3.org/2004/02/skos/core#Concept';
const SKOS_PREF_LABEL = 'http://www.w3.org/2004/02/skos/core#prefLabel';
const SKOS_BROADER = 'http://www.w3.org/2004/02/skos/core#broader';

/**
 * Parses a Turtle (.ttl) file into GraphData using N3.js.
 */
export const parseGraphTurtle = async (file: File): Promise<GraphData> => {
  const text = await file.text();
  const parser = new N3.Parser();
  const store = new N3.Store();

  return new Promise((resolve, reject) => {
    parser.parse(text, (error, quad) => {
      if (error) {
        reject(error);
      } else if (quad) {
        store.add(quad);
      } else {
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];

        // 1. Identify all Subjects that are SKOS Concepts
        const concepts = store.getSubjects(RDF_TYPE, SKOS_CONCEPT, null);

        concepts.forEach((subject) => {
          const subjectIri = subject.id;

          // 2. Extract the Label (prefLabel)
          const labels = store.getObjects(subject, SKOS_PREF_LABEL, null);
          
          // Find the UK English label, or fall back to the first available label
          const labelQuad = labels.find(l => l.id.includes('@en-gb')) || labels[0];
          
          // Use .value for a clean string, or the IRI if no label exists
          const name = labelQuad ? labelQuad.id.split('"')[1] : subjectIri;

          nodes.push({
            id: subjectIri,
            name: name,
            val: 1
          });

          // 3. Extract Relationships (broader)
          const broaders = store.getObjects(subject, SKOS_BROADER, null);
          
          broaders.forEach((parent) => {
            links.push({
              source: parent.id, 
              target: subjectIri 
            });
          });
        });

        resolve({ nodes, links });
      }
    });
  });
};