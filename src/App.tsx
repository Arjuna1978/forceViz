import React, { useState, useCallback, useRef, useEffect } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import type { GraphNode, GraphData, GraphLink } from "./types";
import { processUploadedFile } from "./services/processFileUpload";
import logo from "./assets/favicon.svg";


const HIDDEN_KEYS = [
  "id",
  "name",
  "x",
  "y",
  "vx",
  "vy",
  "index",
  "fx",
  "fy",
  "color",
  "val",
  "group",
  "indexColor"
];
export default function App() {
  const containerRef = useRef<HTMLElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink>>(undefined);

useEffect(() => {
    const timer = setTimeout(() => {
      if (fgRef.current && graphData.nodes.length > 0) {
        const fg = fgRef.current;
        if (fg.d3Force("link")) {
          fg.d3Force("link")?.distance(150); 
        }
        if (fg.d3Force("charge")) {
          fg.d3Force("charge")?.strength(-800); 
        }
        fg.d3ReheatSimulation();
      }
    }, 100);
    return () => clearTimeout(timer); 
  }, [graphData]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const initData: GraphData = {
      nodes: [
        { id: "1", name: "Upload a file to start", val: 10, group: 1 },
        { id: "2", name: "Brought to you by Arjuna", val: 5, group: 2 },
      ],
      links: [{ source: "1", target: "2" }],
    };
    setGraphData(initData);
  }, []);

  const handleNodeClick = useCallback((node: object) => {
    setSelectedNode(node as GraphNode);
  }, []);

const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

  const reader = new FileReader();
    reader.onload = async () => {
   try {
    const json = await processUploadedFile(file);
    setGraphData(json);
    setError(null);
    setSelectedNode(null);

    setTimeout(() => fgRef.current?.zoomToFit(400), 300);
    
  } catch (err: unknown) {
    if (err instanceof Error) {
      setError(err.message);
    } else {
      setError("An unexpected error occurred.");
    }
  } finally {
    event.target.value = '';
  }
};
    reader.readAsText(file);
  };


  const renderNodeWithLabel = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      //Node look n feel
      const label = node.name || String(node.id);
      const fontSize = 12 / globalScale;
      const radius = Math.sqrt(node.val || 4) * 2;

      ctx.beginPath();
      ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = node.color || "#60a5fa";
      ctx.fill();

      //  Label Text
      ctx.font = `${fontSize}px Sans-Serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#e2e8f0"; 
      ctx.fillText(label, node.x!, node.y! + radius + fontSize);
    },
    [],
  );

  

 return (
    <div className="flex flex-col bg-transparent h-screen text-white font-sans overflow-hidden">
      <header className="p-4 bg-transparent flex justify-between items-center z-10">
       
        <h1 className="text-xl  text-left font-bold text-blue-400">
           <img className="h-12 w-12 object-scale-down ..." src = {logo}/>
          Force Viz</h1>

        <label className="cursor-pointer bg-blue-600 px-4 py-2 rounded-md hover:bg-blue-500 transition-colors shadow-lg active:scale-95 text-sm font-medium">
          Load
          <input type="file" accept=".json, .tsv" className="hidden" onChange={handleFileUpload} />
        </label>
      </header>

      <main ref={containerRef} className="flex-1 relative w-full">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-red-900 border border-red-500 px-4 py-2 rounded-lg shadow-2xl panel-animate-in slide-from-top">
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError(null)} className="hover:bg-red-800 p-1 rounded">✕</button>
          </div>
        )}

        {dimensions.width > 0 && dimensions.height > 0 && (
          <ForceGraph2D<GraphNode, GraphLink>
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height- 10}
            graphData={graphData}
            nodeCanvasObject={renderNodeWithLabel}
            nodeAutoColorBy="group"
            nodePointerAreaPaint={(node, color, ctx) => {
              const n = node as GraphNode;
              const nodeVal = typeof n.val === "number" ? n.val : 4;

              // Calculate visual radius, then ADD 10 extra pixels for a generous click target!
              const visualRadius = Math.sqrt(nodeVal) * 2;
              const hitboxRadius = visualRadius + 10;

              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(n.x || 0, n.y || 0, hitboxRadius, 0, 2 * Math.PI, false);
              ctx.fill();
            }}
            onNodeClick={handleNodeClick}
            backgroundColor="#0f172a"
            linkColor={() => "#475569"}
            linkWidth={1.5}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.005}
          />
        )}
   
        {selectedNode && (
          <div className="top-4 right-4 w-80 bg-gray-800/95 graph-overlay-panel p-4 panel-animate-in slide-from-right">
            <div className="flex justify-between items-center mb-3 border-b border-gray-700 pb-2">
              <h2 className="font-bold text-blue-300 text-lg">{selectedNode.name || selectedNode.id}</h2>
              <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {Object.entries(selectedNode).map(([key, value]) => {
                if (HIDDEN_KEYS.includes(key) || value === undefined) return null;
                return (
                  <div key={key} className="bg-black/30 p-2 rounded text-sm">
                    <span className="block text-xs font-semibold text-gray-400 capitalize">{key.replace(/_/g, " ")}</span>
                    <span className="text-gray-200 break-words">{Array.isArray(value) ? value.join(", ") : String(value)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <footer className="p-2 bg-gray-800 border-t border-gray-700 text-[10px] text-center text-gray-500 uppercase tracking-tighter">
        Thank you for trying out my little program
      </footer>
    </div>
  );
}
