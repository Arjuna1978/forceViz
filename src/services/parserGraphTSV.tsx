// src/parseGraphTSV.ts
import type { GraphData, GraphNode, GraphLink } from "../types";

export const parseGraphTSV = (file: File): Promise<GraphData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const result = reader.result;
        if (typeof result !== "string") {
          throw new Error("Failed to read file as text.");
        }

        const lines = result.split(/\r?\n/).filter((line) => line.trim() !== "");
        if (lines.length < 2) throw new Error("TSV file is empty or invalid.");

        const headers = lines[0].split("\t").map((h) => h.trim());

        const idIdx = headers.findIndex((h) => h.toLowerCase().includes("id") || h.toLowerCase() === "id");
        const parentIdx = headers.findIndex((h) => h.toLowerCase().includes("parent"));
        const nameIdx = headers.findIndex((h) => h.toLowerCase().includes("name"));

        if (idIdx === -1) {
          throw new Error("Could not find a row with 'ID' and 'Name' column in the TSV.");
          
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

    reader.readAsText(file);
  });
};