import type { GraphNode } from "../types";
import { isNodeMatched } from "./graphSearch";

interface RenderOptions {
  ctx: CanvasRenderingContext2D;
  globalScale: number;
  searchQuery: string;
}

export const drawNode = (node: GraphNode, options: RenderOptions) => {
  const { ctx, globalScale, searchQuery } = options;
  const label = node.name || String(node.id);
  const fontSize = 12 / globalScale;
  const radius = Math.sqrt(node.val || 4) * 2;

  const matched = isNodeMatched(node, searchQuery);
  const isDimmed = Boolean(searchQuery) && !matched;

  ctx.globalAlpha = isDimmed ? 0.15 : 1.0;

  // Draw Circle
  ctx.beginPath();
  ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false);
  ctx.fillStyle = node.color || "#60a5fa";
  ctx.fill();

  // Draw Highlight
  if (matched) {
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 4 / globalScale;
    ctx.stroke();
  }

  // Draw Text
  if (!isDimmed) {
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(label, node.x!, node.y! + radius + fontSize);
  }

  ctx.globalAlpha = 1.0;
};