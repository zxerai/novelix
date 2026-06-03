import { useEffect, useState } from "react";
import { useChatStore } from "../../store/chat";
import { fetchJson } from "../../hooks/use-api";
import { SidebarCard } from "./SidebarCard";
import { KnowledgeGraph } from "../KnowledgeGraph";

interface GraphNode {
  id: string;
  name: string;
  role: string;
  color: string;
  detail?: Record<string, string>;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  chapter: number | null;
}

interface GraphSectionProps {
  readonly bookId: string;
}

export function GraphSection({ bookId }: GraphSectionProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const bookDataVersion = useChatStore((s) => s.bookDataVersion);

  useEffect(() => {
    fetchJson<{ nodes: GraphNode[]; edges: GraphEdge[] }>(
      `/books/${bookId}/character-graph`,
    )
      .then((data) => {
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      })
      .catch(() => {
        setNodes([]);
        setEdges([]);
      });
  }, [bookId, bookDataVersion]);

  if (nodes.length === 0) return null;

  return (
    <SidebarCard title="角色关系图谱">
      <div className="w-full h-[420px]">
        <KnowledgeGraph nodes={nodes} edges={edges} />
      </div>
    </SidebarCard>
  );
}
