export interface GraphNode extends Record<string, unknown> {
  id: string | number;
  name?: string;
  val?: number;
  group?: number;
  x?: number;
  y?: number;
  color?: string;
  forceEngine ?:string
}

export interface GraphLink extends Record<string, unknown> {
  source: string | number | GraphNode;
  target: string | number | GraphNode;
  value?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}