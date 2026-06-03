import { useEffect, useState } from "react";
import { fetchJson } from "../../hooks/use-api";
import { SidebarCard } from "./SidebarCard";
import { PlotMindMap } from "../PlotMindMap";

interface VolumeData {
  readonly volumes: ReadonlyArray<{
    readonly volume: number;
    readonly title: string;
    readonly range: string;
    readonly chapters: string;
    readonly theme: string;
    readonly highlight: string;
    readonly okrs: ReadonlyArray<string>;
    readonly hooks: ReadonlyArray<string>;
  }>;
}

interface MindMapSectionProps {
  readonly bookId: string;
}

export function MindMapSection({ bookId }: MindMapSectionProps) {
  const [volumes, setVolumes] = useState<VolumeData["volumes"]>([]);

  useEffect(() => {
    fetchJson<VolumeData>(`/books/${bookId}/plot-mindmap`)
      .then((data) => setVolumes(data.volumes || []))
      .catch(() => setVolumes([]));
  }, [bookId]);

  if (volumes.length === 0) return null;

  return (
    <SidebarCard title="故事卷纲">
      <div className="w-full max-h-[500px] overflow-y-auto">
        <PlotMindMap volumes={volumes} />
      </div>
    </SidebarCard>
  );
}
