import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
  const [isolateMode, setIsolateMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); // NEW: Search state
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null); // NEW: Store filename
  const [error, setError] = useState<string | null>(null);
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink>>(undefined);

  // Calculate matched nodes for the dropdown list
  const matchedNodes = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return graphData.nodes.filter(
      (n) =>
        String(n.name || "").toLowerCase().includes(query) ||
        String(n.id || "").toLowerCase().includes(query)
    );
  }, [searchQuery, graphData.nodes]);

  // Calculate the visible portion of the graph based on the isolate mode
  const visibleGraphData = useMemo(() => {
    if (!isolateMode || !selectedNode) return graphData;

    const visibleNodeIds = new Set<string | number>();
    const startId = selectedNode.id;
    visibleNodeIds.add(startId);

    const getId = (nodeOrId: string|number|GraphNode) => (typeof nodeOrId === "object" && nodeOrId !== null) ? nodeOrId.id : nodeOrId;

    let queue = [startId];
    while (queue.length > 0) {
      const currId = queue.shift();
      graphData.links.forEach((link) => {
        if (getId(link.source) === currId) {
          const targetId = getId(link.target);
          if (!visibleNodeIds.has(targetId)) {
            visibleNodeIds.add(targetId);
            queue.push(targetId);
          }
        }
      });
    }

    queue = [startId];
    while (queue.length > 0) {
      const currId = queue.shift();
      graphData.links.forEach((link) => {
        if (getId(link.target) === currId) {
          const sourceId = getId(link.source);
          if (!visibleNodeIds.has(sourceId)) {
            visibleNodeIds.add(sourceId);
            queue.push(sourceId);
          }
        }
      });
    }

    return {
      nodes: graphData.nodes.filter((n) => visibleNodeIds.has(n.id)),
      links: graphData.links.filter(
        (l) => visibleNodeIds.has(getId(l.source)) && visibleNodeIds.has(getId(l.target))
      ),
    };
  }, [graphData, selectedNode, isolateMode]);


  useEffect(() => {
    const timer = setTimeout(() => {
      if (fgRef.current && visibleGraphData.nodes.length > 0) {
        const fg = fgRef.current;
        if (fg.d3Force("link")) {
          fg.d3Force("link")?.distance(150);
        }
        if (fg.d3Force("charge")) {
          fg.d3Force("charge")?.strength(-2000);
        }
        fg.d3ReheatSimulation();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [visibleGraphData]);

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
        { id: "1", name: "Built by Arjuna", val: 10, group: 1 },
        { id: "2", name: "Upload a file to start", val: 5, group: 2, filesSupported:"CSV,TSV,JSON"},

      ],
      links: [{ source: "1", target: "2" },
      ]
    };
    setGraphData(initData);
  }, []);

  const handleNodeClick = useCallback((node: object) => {
    setSelectedNode(node as GraphNode);
    setIsolateMode(false);
  }, []);

  const handleCloseModal = () => {
    setSelectedNode(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Extract filename and strip the extension (.tsv, .json, etc.)
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const json = await processUploadedFile(file);
        setGraphData(json);
        setError(null);
        setSelectedNode(null);
        setIsolateMode(false);
        setSearchQuery(""); // Reset search on load
        setLoadedFileName(nameWithoutExt); // Save the filename to state

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
      const label = node.name || String(node.id);
      const fontSize = 12 / globalScale;
      const radius = Math.sqrt(node.val || 4) * 2;

      // Determine search matches
      const isMatched = searchQuery && (
        String(node.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(node.id || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
      const isDimmed = Boolean(searchQuery) && !isMatched;

      ctx.globalAlpha = isDimmed ? 0.15 : 1.0;

      ctx.beginPath();
      ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = node.color || "#60a5fa";
      ctx.fill();

      // Highlight matched nodes
      if (isMatched) {
        ctx.strokeStyle = "#fbbf24"; // Yellow
        ctx.lineWidth = 4 / globalScale; 
        ctx.stroke();
      }

      // Hide text for dimmed nodes to make matched nodes pop and improve performance
      if (!isDimmed) {
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#e2e8f0"; 
        ctx.fillText(label, node.x!, node.y! + radius + fontSize);
      }

      ctx.globalAlpha = 1.0; // Reset
    },
    [searchQuery], // Depends on search query!
  );

  return (
    <div className="flex flex-col bg-transparent h-screen text-white font-sans overflow-hidden">
      <header className="p-4 bg-transparent flex justify-between items-center z-10">
        <h1 className="text-xl  text-left font-bold text-blue-400">
           <img className="h-12 w-12 object-scale-down inline-block mr-2" src={logo} alt="logo"/>
          Force Viz
        </h1>

        <div className="flex items-center gap-4">
          
          {/* NEW: Search Bar and Results Dropdown */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-800 text-sm text-white px-4 py-2 border border-gray-600 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-64 shadow-inner"
            />
            {/* Results Dropdown */}
            {searchQuery && (
              <div className="absolute top-full right-0 mt-2 w-80 max-h-72 overflow-y-auto bg-gray-800 border border-gray-600 rounded-md shadow-2xl z-50 custom-scrollbar">
                {matchedNodes.length > 0 ? (
                  <>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 border-b border-gray-700 bg-gray-900/50 sticky top-0">
                      Found {matchedNodes.length} result{matchedNodes.length !== 1 ? 's' : ''}
                    </div>
                    {matchedNodes.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => {
                          setSelectedNode(node);
                          setIsolateMode(false);
                          setSearchQuery(""); // Clear search
                          // Zoom to node
                          if (node.x !== undefined && node.y !== undefined) {
                            fgRef.current?.centerAt(node.x, node.y, 1000);
                            fgRef.current?.zoom(4, 1000);
                          }
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700/50 last:border-0 transition-colors"
                      >
                        <div className="font-medium text-sm text-blue-300 truncate">{node.name || node.id}</div>
                        {node.name && <div className="text-xs text-gray-500 truncate">ID: {node.id}</div>}
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="p-4 text-sm text-gray-400 text-center">
                    No matching nodes found.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* NEW: Display loaded filename */}
          {loadedFileName && (
            <div
              className="text-sm font-medium text-blue-200 bg-blue-900/30 px-3 py-1.5 rounded-md border border-blue-800/50 truncate max-w-[200px] select-none"
              title={loadedFileName}
            >
              {loadedFileName}
            </div>
          )}

          <label className="cursor-pointer bg-blue-600 px-4 py-2 rounded-md hover:bg-blue-500 transition-colors shadow-lg active:scale-95 text-sm font-medium whitespace-nowrap">
            Load
            <input type="file" accept=".json, .tsv" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
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
            height={dimensions.height - 10}
            graphData={visibleGraphData}
            nodeCanvasObject={renderNodeWithLabel}
            nodeAutoColorBy="group"
            nodePointerAreaPaint={(node, color, ctx) => {
              const n = node as GraphNode;
              const nodeVal = typeof n.val === "number" ? n.val : 4;
              const visualRadius = Math.sqrt(nodeVal) * 2;
              const hitboxRadius = visualRadius + 10;

              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(n.x || 0, n.y || 0, hitboxRadius, 0, 2 * Math.PI, false);
              ctx.fill();
            }}
            onNodeClick={handleNodeClick}
            backgroundColor="#0f172a"
            // Dim links slightly if searching to make matches pop out more
            linkColor={() => searchQuery ? "#1e293b" : "#475569"}
            linkWidth={1.5}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.005}
            dagMode="radialout"
            dagLevelDistance={200}
          />
        )}

        {selectedNode && (
          <div className="absolute z-50 top-4 right-4 w-80 bg-gray-800/95 graph-overlay-panel p-4 panel-animate-in slide-from-right rounded-lg shadow-2xl border border-gray-700">
            <div className="flex justify-between items-center mb-3 border-b border-gray-700 pb-2">
              <h2 className="font-bold text-blue-300 text-lg pr-4">{selectedNode.name || selectedNode.id}</h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition">✕</button>
            </div>

            <div className="flex items-center gap-2 mb-3 bg-gray-700/50 p-2 rounded">
              <input
                type="checkbox"
                id="isolate-branch"
                checked={isolateMode}
                onChange={(e) => setIsolateMode(e.target.checked)}
                className="w-4 h-4 rounded bg-gray-900 border-gray-600 text-blue-500 focus:ring-blue-600 cursor-pointer"
              />
              <label htmlFor="isolate-branch" className="text-sm font-medium text-gray-200 cursor-pointer select-none">
                Isolate Branch
              </label>
            </div>

            <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
              {Object.entries(selectedNode).map(([key, value]) => {
                if (HIDDEN_KEYS.includes(key) || value === undefined) return null;
                return (
                  <div key={key} className="bg-black/30 p-2 rounded text-sm border border-gray-700/50">
                    <span className="block text-xs font-semibold text-gray-400 capitalize mb-1">{key.replace(/_/g, " ")}</span>
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
