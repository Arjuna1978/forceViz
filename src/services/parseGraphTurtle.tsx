import * as N3 from 'n3';
import type { GraphData, GraphNode, GraphLink } from "../types";

/**
 * Parses a Turtle (.ttl) file into GraphData using N3.js.
 * Specifically looks for skos:prefLabel for names and skos:broader for links.
 */
export const parseGraphTurtle = async (file: File): Promise<GraphData> => {
  const text = await file.text();
  const parser = new N3.Parser();
  const store = new N3.Store();

  return new Promise((resolve, reject) => {
    // Parse the text and add quads to the store for easy querying
    parser.parse(text, (error, quad) => {
      if (error) {
        reject(error);
      } else if (quad) {
        store.add(quad);
      } else {
        // Parsing is complete, now transform the store into nodes/links
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];
        
        // 1. Identify all Subjects that are SKOS Concepts
        const concepts = store.getSubjects(
          'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
          'http://www.w3.org/2004/02/skos/core#Concept',
          null
        );

        concepts.forEach((subject) => {
          const subjectIri = subject.id;

          // 2. Extract the Label (prefLabel)
          // We look for en-GB as per your preference
          const labels = store.getObjects(subject, 'http://www.w3.org/2004/02/skos/core#prefLabel', null);
          const name = labels.find(l => l.id.includes('@en-gb'))?.id.split('"')[1] || subjectIri;

          nodes.push({
            id: subjectIri,
            name: name,
            val: 1
          });

          // 3. Extract Relationships (broader)
          const broaders = store.getObjects(subject, 'http://www.w3.org/2004/02/skos/core#broader', null);
          broaders.forEach((parent) => {
            links.push({
              source: parent.id, // The broader/parent concept
              target: subjectIri // The current/child concept
            });
          });
        });

        resolve({ nodes, links });
      }
    });
  });
};