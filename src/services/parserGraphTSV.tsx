// this TSV is an abstraction of the JSON parser allowing for multiple file types
import type { GraphData, GraphNode, GraphLink } from "../types";

export const parseGraphTSV = (file: File): Promise<GraphData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const result = reader.result;
        //Check if the file is ASCII or text
        if (typeof result !== "string") {
          throw new Error("Failed to read file as text.");
        }
// split text into rows
        const lines = result.split(/\r?\n/).filter((line) => line.trim() !== "");
// checks if the file is empty
        if (lines.length < 2) throw new Error("TSV file is empty or invalid.");
let headers: string[] = []; 
let headerRowIndex = -1;
let activeDelimiter = "\t";
// is it a CSV or TSV?
for (let i = 0; i < Math.min(lines.length, 6); i++) {
  const currentLine = lines[i];
  let detectedDelimiter = "";

  if (currentLine.includes("\t")) {
    detectedDelimiter = "\t";
  } else {
    const commaCount = (currentLine.match(/,/g) || []).length;
    if (commaCount >= 3) {
      detectedDelimiter = ",";
    }
  }

  if (detectedDelimiter) {
            const cols = currentLine.split(detectedDelimiter).map(c => c.trim());
            // Strict match for "ID" or "Name" as standalone strings
            const hasID = cols.some(c => /\bid\b/i.test(c));
            const hasName = cols.some(c => /name/i.test(c));

            if (hasID || hasName) {
              headerRowIndex = i;
              headers = cols;
              activeDelimiter = detectedDelimiter;
              break;
            }
          }
        }
        if (headerRowIndex === -1) {
          throw new Error('This is not a compatible CSV or TSV file: there must be a column named "ID" or "Parent"');
        }

        const idIdx = headers.findIndex((h) => h.toLowerCase().includes("id") || h.toLowerCase() === "id");
        const parentIdx = headers.findIndex((h) => h.toLowerCase().includes("parent"));
        const nameIdx = headers.findIndex((h) => h.toLowerCase().includes("name"));

        if (idIdx === -1) {
          throw new Error("Could not find an 'ID' or 'Unique ID' column in the TSV.");
        }
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split("\t").map((c) => c.trim());
          const id = cols[idIdx];

          if (!id) continue;
          
          const parentId = parentIdx !== -1 ? cols[parentIdx] : "";
          const name = nameIdx !== -1 ? cols[nameIdx] : id;

          const nodeData: Record<string, unknown> = {
            id: id,
            name: name,
            group: parentId ? 2 : 1, 
            val: parentId ? 5 : 15,  
          };

          headers.forEach((header, index) => {
            if (cols[index]) nodeData[header] = cols[index];
          });

          nodes.push(nodeData as GraphNode);

          if (parentId) {
            links.push({ source: parentId, target: id });
          }
        }

        resolve({ nodes, links });
        
      } catch (err: unknown) {
        if (err instanceof Error) {
          reject(err);
        } else {
          reject(new Error("An unexpected error occurred while parsing the TSV."));
        }
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read the TSV file."));
    };
//Read as text asks the the browser to read the raw bits of the file as a string array.
    reader.readAsText(file);
  });
};