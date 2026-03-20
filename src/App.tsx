import React, { useState, useCallback, useRef, useEffect } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';

// Define the shape of our Graph Data
interface GraphNode extends Record<string, unknown> {
  id: string | number;
  name?: string;
  val?: number;
  group?: number;
  x?: number;
  y?: number;
  color?: string;
}

interface GraphLink {
  source: string | number;
  target: string | number;
  value?: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export default function App() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink>>(undefined);

  useEffect(() => {
    const initData: GraphData = {
      nodes: [
        { id: '1', name: 'Upload a JSON file', val: 10, group: 1 },
        { id: '2', name: 'Nodes & Links', val: 5, group: 2 },
      ],
      links: [{ source: '1', target: '2' }]
    };
    setGraphData(initData);
  }, []);

  const handleNodeClick = useCallback((node: object) => {
    setSelectedNode(node as GraphNode);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== 'string') return;

        const json = JSON.parse(result);
        if (!json.nodes || !json.links) {
          throw new Error("Invalid format: JSON must contain 'nodes' and 'links' arrays.");
        }
        
        setGraphData(json);
        setError(null);
        setSelectedNode(null);
        
        setTimeout(() => fgRef.current?.zoomToFit(400), 300);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unexpected error occurred while parsing the file.");
        }
      }
    };
    reader.readAsText(file);
  };

  /**
   * Custom Node Renderer
   * Draws a circle and then adds the 'name' as text beneath it.
   */
  const renderNodeWithLabel = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name || String(node.id);
    const fontSize = 12 / globalScale;
    const radius = Math.sqrt(node.val || 4) * 2;

    // Draw Circle
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = node.color || '#60a5fa'; // Default blue-400
    ctx.fill();

    // Draw Label Text
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e2e8f0'; // slate-200
    ctx.fillText(label, node.x!, node.y! + radius + fontSize);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans overflow-hidden">
      <header className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center z-10">
        <div>
          <h1 className="text-xl font-bold text-blue-400">Arjuna's Network Graph Visualiser</h1>
        </div>
        <div className="flex items-center gap-4">
          <label className="cursor-pointer bg-blue-600 px-4 py-2 rounded-md hover:bg-blue-500 transition-colors shadow-lg active:scale-95 text-sm font-medium">
            Load JSON
            <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </header>

      <main className="flex-1 relative bg-slate-950">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-red-900 border border-red-500 px-4 py-2 rounded-lg shadow-2xl animate-in fade-in slide-in-from-top-4">
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError(null)} className="hover:bg-red-800 p-1 rounded transition-colors">✕</button>
          </div>
        )}

        <ForceGraph2D<GraphNode, GraphLink>
          ref={fgRef}
          graphData={graphData}
          nodeCanvasObject={renderNodeWithLabel}
          nodePointerAreaPaint={(node, color, ctx) => {
            // This ensures the node remains clickable even with a custom renderer
            const radius = Math.sqrt(node.val || 4) * 2;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false);
            ctx.fill();
          }}
          onNodeClick={handleNodeClick}
          backgroundColor="#0f172a"
          linkColor={() => '#475569'}
          linkWidth={1.5}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.005}
        />

        {selectedNode && (
          <div className="absolute top-4 right-4 w-72 bg-gray-800/95 backdrop-blur-sm border border-gray-600 p-4 rounded-lg shadow-xl z-20 animate-in fade-in slide-in-from-right-4">
             <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-1">
               <h2 className="font-bold text-blue-300">Node Details</h2>
               <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-white">✕</button>
             </div>
             <pre className="text-[10px] font-mono overflow-auto max-h-64 bg-black/30 p-2 rounded">
               {JSON.stringify(selectedNode, (key, val) => 
                 ['x', 'y', 'vx', 'vy', 'index', 'fx', 'fy'].includes(key) ? undefined : val
               , 2)}
             </pre>
          </div>
        )}
      </main>
      
      <footer className="p-2 bg-gray-800 border-t border-gray-700 text-[10px] text-center text-gray-500 uppercase tracking-tighter">
        Scroll to zoom • Drag to pan • Click node to inspect • UK English
      </footer>
    </div>
  );
}
