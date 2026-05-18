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
        if (lines.length < 2) throw new Error("File is empty or invalid.");

        // Detect delimiter: if any of the first few lines contain a tab, assume TSV. Otherwise, assume CSV.
        const sampleLines = lines.slice(0, Math.min(5, lines.length));
        const delimiter = sampleLines.some(line => line.includes("\t")) ? "\t" : ",";

        let headerRowIndex = -1;
        let headers: string[] = [];
        let idIdx = -1, parentIdx = -1, nameIdx = -1;

        // 1. Smartly find the header row (ignores context rows above the table)
        for (let i = 0; i < lines.length; i++) {
          const currentLineCols = lines[i].split(delimiter).map((h) => h.trim());
          const potentialIdIdx = currentLineCols.findIndex((h) => h.toLowerCase().includes("id") || h.toLowerCase() === "id");
          const potentialParentIdx = currentLineCols.findIndex((h) => h.toLowerCase().includes("parent"));
          const potentialNameIdx = currentLineCols.findIndex((h) => h.toLowerCase().includes("name"));

          // Ensure the row has both an ID and a Name column
          if (potentialIdIdx !== -1 && potentialNameIdx !== -1) {
            headerRowIndex = i;
            headers = currentLineCols;
            idIdx = potentialIdIdx;
            parentIdx = potentialParentIdx;
            nameIdx = potentialNameIdx;
            break;
          }
        }

        if (headerRowIndex === -1 || idIdx === -1 || nameIdx === -1) {
          throw new Error("Could not find both an 'ID' and 'Name' column in the file.");
        }

        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];

        // 2. Parse data starting from the row after headers
        for (let i = headerRowIndex + 1; i < lines.length; i++) {
          const cols = lines[i].split(delimiter).map((c) => c.trim());
          const id = cols[idIdx].replace(/\.0$/, "");

          if (!id) continue;
          
          const parentId = parentIdx !== -1 ? cols[parentIdx] : "";
          const name = nameIdx !== -1 ? cols[nameIdx] : id;

          const nodeData: Record<string, unknown> = {
            id: id,
            name: name,
            group: parentId && parentId !== id ? 2 : 1, // Root node group coloring
            val: parentId && parentId !== id ? 5 : 15,  // Root nodes are larger
          };

          headers.forEach((header, index) => {
            if (cols[index]) nodeData[header] = cols[index];
          });

          nodes.push(nodeData as GraphNode);

          // 3. CRITICAL FIX: Prevent self-referencing loops (like ID 1000 pointing to 1000)
          if (parentId && parentId !== id) {
            links.push({ source: parentId, target: id });
          }
        }

        // 4. Detect multiple root nodes and create a single "Root" if needed
        const linkedTargets = new Set(links.map(l => String(l.target)));
        const rootNodes = nodes.filter(n => !linkedTargets.has(String(n.id)));

        if (rootNodes.length > 1) {
          const masterRootId = "master_root";
          
          // Add the new master root node
          nodes.push({
            id: masterRootId,
            name: "Root",
            group: 0, 
            val: 25, // Make it slightly larger than the other nodes
          } as GraphNode);

          // Connect all disconnected roots to the new master root
          rootNodes.forEach(rootNode => {
            links.push({ source: masterRootId, target: rootNode.id });
          });
        }

        resolve({ nodes, links });
        
      } catch (err: unknown) {
        if (err instanceof Error) {
          reject(err);
        } else {
          reject(new Error("An unexpected error occurred while parsing the file."));
        }
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read the file."));
    };

    reader.readAsText(file);
  });
};
