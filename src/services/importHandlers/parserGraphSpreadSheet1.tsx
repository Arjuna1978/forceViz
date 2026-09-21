import { parse } from "csv-parse/browser/esm/sync";
import type { GraphData, GraphNode, GraphLink } from "../../types";

export const parseGraphTSV = (file: File): Promise<GraphData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const result = reader.result;
        if (typeof result !== "string") {
          throw new Error("Failed to read file as text.");
        }

        // 1. Determine delimiter from file extension
        const extension = file.name.split(".").pop()?.toLowerCase();
        let delimiter = ",";

        switch (extension) {
          case "tsv":
            delimiter = "\t";
            break;
          case "psv":
            delimiter = "|";
            break;
          case "csv":
          default:
            delimiter = ",";
            break;
        }

        // 2. Parse raw matrix of strings (array of arrays)
        const records: string[][] = parse(result, {
          delimiter,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        });

        if (records.length < 2) {
          throw new Error("File is empty or invalid.");
        }

        // 3. Locate the header row containing an 'ID' and 'Name' column
        let headerRowIndex = -1;
        let headers: string[] = [];
        let idIdx = -1;
        let parentIdx = -1;
        let nameIdx = -1;

        // Specofy what words to look for..
        const ID_WORDS = ["id", "key", "node","uuid","guid"];
        const PARENT_WORDS = ["parent", "target", "source"];
        const NAME_WORDS = ["name", "label", "title"];


        // Word-boundary matching helper to prevent false positives
        const matchesWord = (cell: string, word: string): boolean => {
          const regex = new RegExp(`\\b${word}\\b`, "i");
          return regex.test(cell.trim());
        };

        for (let i = 0; i < records.length; i++) {
          const row = records[i];

          const potentialIdIdx = row.findIndex((cell) =>
            ID_WORDS.some((word) => matchesWord(cell, word))
          );

          const potentialParentIdx = row.findIndex((cell) =>
            PARENT_WORDS.some((word) => matchesWord(cell, word))
          );

          const potentialNameIdx = row.findIndex((cell) =>
            NAME_WORDS.some((word) => matchesWord(cell, word))
          );

          // Require at least ID and Name (or ID alone if Name isn't present)
          if (potentialIdIdx !== -1 && potentialNameIdx !== -1) {
            headerRowIndex = i;
            headers = row;
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
        const knownNodeIds = new Set<string>();

        const sanitizeId = (rawId: string | undefined): string => {
          if (!rawId) return "";
          return rawId.replace(/\.0$/, "").trim();
        };

        // 4. Build Nodes and Edges from data rows
        for (let i = headerRowIndex + 1; i < records.length; i++) {
          const cols = records[i];

          const id = sanitizeId(cols[idIdx]);
          if (!id) continue;

          const rawParentId = parentIdx !== -1 && parentIdx < cols.length ? cols[parentIdx] : "";
          const parentId = sanitizeId(rawParentId);

          const rawName = nameIdx !== -1 && nameIdx < cols.length ? cols[nameIdx] : "";
          const name = rawName || id;

          const nodeData: Record<string, unknown> = {
            id,
            name,
            group: parentId && parentId !== id ? 2 : 1,
            val: parentId && parentId !== id ? 5 : 15,
          };

          // Attach remaining metadata attributes
          headers.forEach((header, index) => {
            if (index < cols.length && cols[index] !== "") {
              nodeData[header] = cols[index];
            }
          });

          nodes.push(nodeData as GraphNode);
          knownNodeIds.add(id);

          if (parentId && parentId !== id) {
            links.push({ source: parentId, target: id });
          }
        }

        // 5. Prune dangling links pointing to non-existent parent IDs
        const validLinks = links.filter((link) => knownNodeIds.has(String(link.source)));

        // 6. Handle disconnected root nodes
        const linkedTargets = new Set(validLinks.map((l) => String(l.target)));
        const rootNodes = nodes.filter((n) => !linkedTargets.has(String(n.id)));

        if (rootNodes.length > 1) {
          const masterRootId = "master_root";

          nodes.push({
            id: masterRootId,
            name: "Root",
            group: 0,
            val: 25,
          } as GraphNode);

          rootNodes.forEach((rootNode) => {
            validLinks.push({ source: masterRootId, target: rootNode.id });
          });
        }

        resolve({ nodes, links: validLinks });
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