import { parseGraphJSON } from "./parseGraphJSON";
import { parseGraphTSV } from "./parserGraphSpreadSheet";
import type { GraphData } from "../types";

export const processUploadedFile = async (file: File): Promise<GraphData> => {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".tsv")||fileName.endsWith(".csv") ){
    return await parseGraphTSV(file);
  } 
  if (fileName.endsWith(".json")) {
    return await parseGraphJSON(file);
  } 
  
  throw new Error("Unsupported file type. Please upload a .json or .tsv file.");
};