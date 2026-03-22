import type { GraphData } from "../types"; // Adjust path if needed

export const parseGraphJSON = (file: File): Promise<GraphData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== "string") {
          throw new Error("Failed to read file as text.");
        }

        const json = JSON.parse(result);
        
        if (!json.nodes || !json.links) {
          throw new Error("Invalid format: JSON must contain 'nodes' and 'links' arrays.");
        }

        // If everything is good, resolve the promise with the data
        resolve(json as GraphData);
      } catch (err: unknown) {
        if (err instanceof Error) {
          reject(err);
        } else {
          reject(new Error("An unexpected error occurred while parsing the file."));
        }
      }
    };

    // Handle standard file reading errors
    reader.onerror = () => {
      reject(new Error("Failed to read the file."));
    };

    reader.readAsText(file);
  });
};