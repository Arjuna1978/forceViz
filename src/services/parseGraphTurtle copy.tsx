import * as N3 from 'n3';
import type { GraphData, GraphNode, GraphLink } from "../types";

// Constants for Semantic URIs
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'; // defines what nodes look like
const SKOS_CONCEPT = 'http://www.w3.org/2004/02/skos/core#Concept';// defines concept
const SKOS_PREF_LABEL = 'http://www.w3.org/2004/02/skos/core#prefLabel'; //defines pref lables for node name
const SKOS_BROADER = 'http://www.w3.org/2004/02/skos/core#broader'; // defines the broader concept for traversal

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
      } 
      
      else {
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];

        // Identify all Subjects that are SKOS Concepts
        const concepts = store.getSubjects(RDF_TYPE, SKOS_CONCEPT, null);

        concepts.forEach((subject) => {
          const subjectIri = subject.id;
          const labels = store.getObjects(subject, SKOS_PREF_LABEL, null);
          const bestLabel =
            labels.find(l => l.id.toLowerCase().includes('@en-gb')) ||
            labels.find(l => l.id.toLowerCase().includes('@en')) ||
            labels[0];
          const name = bestLabel ? (bestLabel as N3.Literal).value : subjectIri;
          nodes.push({
            id: subjectIri,
            name: name,
            val: 1
          });
          
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