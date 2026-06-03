import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface GraphNode {
  id: string;
  name: string;
  role: string;
  color: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  detail?: Record<string, string>;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  chapter: number | null;
}

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ---- Force layout hook ----

function useForceLayout(
  rawNodes: GraphNode[],
  rawEdges: GraphEdge[],
  width: number,
  height: number,
) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const nodesRef = useRef<GraphNode[]>([]);
  const draggingRef = useRef<string | null>(null);
  const rafRef = useRef<number>(0);

  // Initialize positions — golden-angle spiral for even distribution
  useEffect(() => {
    if (rawNodes.length === 0) {
      nodesRef.current = [];
      setNodes([]);
      return;
    }
    const cx = width / 2;
    const cy = height / 2;
    const spread = Math.min(width, height) * 0.35;
    const initial = rawNodes.map((n, i) => {
      const angle = i * 2.39996; // golden angle ~137.5°
      const r = (spread * Math.sqrt(i + 1)) / Math.sqrt(rawNodes.length);
      return {
        ...n,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        vx: 0,
        vy: 0,
      };
    });
    nodesRef.current = initial;
    setNodes(initial);
  }, [rawNodes, width, height]);

  const tick = useCallback(() => {
    const ns = nodesRef.current;
    if (ns.length === 0) return;

    const cx = width / 2;
    const cy = height / 2;
    const kRepel = 8000;
    const kSpring = 0.008;
    const kCenter = 0.003;
    const damping = 0.92;
    const minDist = 40;
    const idealEdgeLen = 150;
    const maxSpeed = 12;
    const boundary = 50;

    // Index map: id → index for O(1) edge lookups
    const idxMap = new Map<string, number>();
    for (let i = 0; i < ns.length; i++) idxMap.set(ns[i].id, i);

    // Repulsion between all pairs
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        const dx = (ns[i].x ?? 0) - (ns[j].x ?? 0);
        const dy = (ns[i].y ?? 0) - (ns[j].y ?? 0);
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) dist = minDist;
        const force = kRepel / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        ns[i].vx = (ns[i].vx ?? 0) + fx;
        ns[i].vy = (ns[i].vy ?? 0) + fy;
        ns[j].vx = (ns[j].vx ?? 0) - fx;
        ns[j].vy = (ns[j].vy ?? 0) - fy;
      }
    }

    // Spring attraction along edges
    for (const e of rawEdges) {
      const si = idxMap.get(e.source);
      const ti = idxMap.get(e.target);
      if (si === undefined || ti === undefined) continue;
      const s = ns[si];
      const t = ns[ti];
      const dx = (t.x ?? 0) - (s.x ?? 0);
      const dy = (t.y ?? 0) - (s.y ?? 0);
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = kSpring * (dist - idealEdgeLen);
      s.vx = (s.vx ?? 0) + (dx / dist) * force;
      s.vy = (s.vy ?? 0) + (dy / dist) * force;
      t.vx = (t.vx ?? 0) - (dx / dist) * force;
      t.vy = (t.vy ?? 0) - (dy / dist) * force;
    }

    // Center gravity + damp + boundary clamp + apply
    for (const n of ns) {
      if (draggingRef.current === n.id) {
        n.vx = 0;
        n.vy = 0;
        continue;
      }
      n.vx = (n.vx ?? 0) + (cx - (n.x ?? 0)) * kCenter;
      n.vy = (n.vy ?? 0) + (cy - (n.y ?? 0)) * kCenter;
      n.vx = (n.vx ?? 0) * damping;
      n.vy = (n.vy ?? 0) * damping;
      const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (speed > maxSpeed) {
        n.vx = (n.vx / speed) * maxSpeed;
        n.vy = (n.vy / speed) * maxSpeed;
      }
      n.x = (n.x ?? 0) + n.vx;
      n.y = (n.y ?? 0) + n.vy;
      if ((n.x ?? 0) < boundary) n.x = boundary;
      if ((n.x ?? 0) > width - boundary) n.x = width - boundary;
      if ((n.y ?? 0) < boundary) n.y = boundary;
      if ((n.y ?? 0) > height - boundary) n.y = height - boundary;
    }
  }, [rawEdges, width, height]);

  // Build a node map for O(1) lookup by id
  const nodeMapRef = useRef(new Map<string, GraphNode>());

  // Sync the map whenever nodes change
  useEffect(() => {
    const map = new Map<string, GraphNode>();
    for (const n of nodesRef.current) {
      map.set(n.id, n);
    }
    nodeMapRef.current = map;
  }, [nodes]);

  // Animation loop using requestAnimationFrame
  useEffect(() => {
    if (nodesRef.current.length === 0) return;
    let freezeFrames = 0;

    const loop = () => {
      const isDragging = draggingRef.current !== null;

      // Skip all physics while dragging to prevent jitter/fighting
      if (!isDragging) {
        tick();
      }

      // Still render every frame during drag so position updates show up
      setNodes([...nodesRef.current]);

      // Auto-freeze when stable (skip during drag)
      if (!isDragging) {
        const totalEnergy = nodesRef.current.reduce(
          (sum, n) => sum + Math.abs(n.vx ?? 0) + Math.abs(n.vy ?? 0),
          0,
        );

        if (totalEnergy > 20) tick(); // extra tick for fast convergence

        if (totalEnergy < 0.5) {
          freezeFrames++;
          if (freezeFrames > 3) return; // stop loop
        } else {
          freezeFrames = 0;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  return { nodes, nodeMapRef, nodesRef, draggingRef };
}

// ---- Label helpers ----

const EDGE_LABELS: Record<string, string> = {
  ally: "盟友",
  friend: "朋友",
  enemy: "敌人",
  rival: "对手",
  lover: "恋人",
  master: "师徒",
  family: "家人",
  mentor: "导师",
  student: "弟子",
  colleague: "同事",
  neutral: "中立",
};

function edgeLabel(type: string): string {
  const parts = type.split("/");
  for (const part of parts) {
    const mapped = EDGE_LABELS[part.toLowerCase().trim()];
    if (mapped) return mapped;
  }
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed && !trimmed.match(/^[Cc]h\d+$/)) return trimmed;
  }
  return type;
}

const ROLE_LABELS: Record<string, string> = {
  protagonist: "主角",
  antagonist: "反派",
  ally: "盟友",
  minor: "配角",
  mentioned: "提及",
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] || role;
}

const DETAIL_FIELD_LABELS: Record<string, string> = {
  定位: "定位",
  标签: "标签",
  性格: "性格",
  动机: "动机",
  当前: "当前章节",
  已知: "已知信息",
  未知: "未知信息",
  反差: "反差细节",
  说话: "说话风格",
  内在驱动: "内在驱动",
  成长弧光: "成长弧光",
  弧光点: "弧光点",
  人物小传: "人物小传",
  当前现状: "当前现状",
};

function detailFieldLabel(key: string): string {
  return DETAIL_FIELD_LABELS[key] || key;
}

// ---- Main component ----

export function KnowledgeGraph({
  nodes: rawNodes,
  edges: rawEdges,
}: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDims({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { nodes, nodeMapRef, nodesRef, draggingRef } = useForceLayout(
    rawNodes,
    rawEdges,
    dims.width,
    dims.height,
  );

  // Connected node sets for highlight
  const connectedIds = useMemo(() => {
    const s = new Set<string>();
    if (hoveredNode) {
      s.add(hoveredNode);
      for (const e of rawEdges) {
        if (e.source === hoveredNode) s.add(e.target);
        if (e.target === hoveredNode) s.add(e.source);
      }
    }
    return s;
  }, [hoveredNode, rawEdges]);

  const selectedConnectedIds = useMemo(() => {
    const s = new Set<string>();
    if (selectedNode) {
      s.add(selectedNode.id);
      for (const e of rawEdges) {
        if (e.source === selectedNode.id) s.add(e.target);
        if (e.target === selectedNode.id) s.add(e.source);
      }
    }
    return s;
  }, [selectedNode, rawEdges]);

  // Pointer-based drag — O(1) lookup via nodeMapRef
  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent, nodeId: string) => {
      e.stopPropagation();
      e.preventDefault();
      draggingRef.current = nodeId;

      const onMove = (ev: PointerEvent) => {
        const target = nodeMapRef.current.get(nodeId);
        if (target) {
          target.x = (target.x ?? 0) + ev.movementX / zoom;
          target.y = (target.y ?? 0) + ev.movementY / zoom;
        }
      };
      const onUp = () => {
        draggingRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [zoom, draggingRef, nodeMapRef],
  );

  const handleNodeClick = useCallback(
    (e: React.MouseEvent, node: GraphNode) => {
      e.stopPropagation();
      setSelectedNode((prev) => (prev?.id === node.id ? null : node));
    },
    [],
  );

  const closeDetail = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Cursor-centered zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setZoom((prevZ) => {
      const newZ = Math.max(0.2, Math.min(3, prevZ * (1 - e.deltaY * 0.002)));
      setPan((prevPan) => ({
        x: mouseX - ((mouseX - prevPan.x) / prevZ) * newZ,
        y: mouseY - ((mouseY - prevPan.y) / prevZ) * newZ,
      }));
      return newZ;
    });
  }, []);

  const handleSvgPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (
        (e.target as SVGElement).tagName === "svg" ||
        e.target === e.currentTarget
      ) {
        setIsPanning(true);
        panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        const onMove = (ev: PointerEvent) => {
          setPan({
            x: ev.clientX - panStart.current.x,
            y: ev.clientY - panStart.current.y,
          });
        };
        const onUp = () => {
          setIsPanning(false);
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      }
    },
    [pan],
  );

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground text-sm">
        暂无角色关系数据。完成章节创作后，角色关系图谱将在此显示。
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px] relative bg-background rounded-lg border overflow-hidden"
    >
      {/* Legend */}
      <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-2 text-[10px] bg-background/80 backdrop-blur-sm p-1.5 rounded-lg border border-border/30">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#e74c3c]" /> 主角
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2c3e50]" /> 反派
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2ecc71]" /> 盟友
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#95a5a6]" /> 配角
        </span>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1.5 rounded-lg border border-border/30">
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="hover:text-foreground transition-colors px-1"
          title="重置视图"
        >
          重置
        </button>
        <span className="opacity-30">|</span>
        <button
          onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
          className="hover:text-foreground transition-colors px-1"
          title="放大"
        >
          +
        </button>
        <span className="min-w-[2.5rem] text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(0.2, z - 0.2))}
          className="hover:text-foreground transition-colors px-1"
          title="缩小"
        >
          −
        </button>
      </div>

      {/* Hint */}
      <div className="absolute bottom-2 left-2 z-10 text-[10px] text-muted-foreground/60">
        拖拽节点 | 滚轮缩放 | 点击角色查看详情
      </div>

      <svg
        ref={svgRef}
        width={dims.width}
        height={dims.height}
        className="select-none"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onWheel={handleWheel}
        onPointerDown={handleSvgPointerDown}
      >
        <defs>
          <marker
            id="arrowhead"
            viewBox="0 0 10 10"
            refX="20"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
        </defs>

        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {rawEdges.map((edge, i) => {
            const s = nodes.find((n) => n.id === edge.source);
            const t = nodes.find((n) => n.id === edge.target);
            if (!s || !t) return null;
            const midX = ((s.x ?? 0) + (t.x ?? 0)) / 2;
            const midY = ((s.y ?? 0) + (t.y ?? 0)) / 2;
            const highlighted =
              !hoveredNode ||
              edge.source === hoveredNode ||
              edge.target === hoveredNode;
            const selected =
              selectedNode &&
              (edge.source === selectedNode.id ||
                edge.target === selectedNode.id);
            const dimmed = !highlighted && !selected;

            return (
              <g key={`e-${i}`} opacity={dimmed ? 0.15 : 1}>
                <line
                  x1={s.x ?? 0}
                  y1={s.y ?? 0}
                  x2={t.x ?? 0}
                  y2={t.y ?? 0}
                  stroke={
                    selected ? "#6366f1" : highlighted ? "#94a3b8" : "#e2e8f0"
                  }
                  strokeWidth={selected ? 2.5 : highlighted ? 1.5 : 1}
                  markerEnd={
                    highlighted || selected ? "url(#arrowhead)" : undefined
                  }
                />
                {(highlighted || selected) && (
                  <g>
                    <rect
                      x={midX - edgeLabel(edge.type).length * 4 - 2}
                      y={midY - 10}
                      width={edgeLabel(edge.type).length * 8 + 4}
                      height={16}
                      rx={3}
                      fill="rgba(0,0,0,0.5)"
                    />
                    <text
                      x={midX}
                      y={midY + 3}
                      textAnchor="middle"
                      fill={selected ? "#a5b4fc" : "#cbd5e1"}
                      fontSize={10}
                      fontWeight={selected ? 600 : 400}
                      fontFamily="system-ui"
                    >
                      {edgeLabel(edge.type)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isHovered = hoveredNode === node.id;
            const isSelected = selectedNode?.id === node.id;
            const isConnected = connectedIds.has(node.id);
            const isSelectedConn = selectedConnectedIds.has(node.id);
            const dimmed =
              (hoveredNode && !isConnected) ||
              (selectedNode && !isSelectedConn);
            const r = isSelected
              ? 26
              : isHovered
                ? 24
                : node.role === "protagonist" || node.role === "antagonist"
                  ? 20
                  : 15;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x ?? 0},${node.y ?? 0})`}
                onPointerEnter={() => setHoveredNode(node.id)}
                onPointerLeave={() => setHoveredNode(null)}
                onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                onClick={(e) => handleNodeClick(e, node)}
                style={{ cursor: "pointer", opacity: dimmed ? 0.2 : 1 }}
              >
                {isSelected && (
                  <circle
                    r={r + 5}
                    fill="transparent"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    strokeDasharray="5 3"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0"
                      to="360"
                      dur="8s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                {isHovered && !isSelected && (
                  <circle
                    r={r + 3}
                    fill="transparent"
                    stroke={node.color}
                    strokeWidth={2}
                    opacity={0.6}
                  />
                )}
                <circle
                  r={r}
                  fill={node.color}
                  stroke={
                    isHovered || isSelected
                      ? "rgba(255,255,255,0.3)"
                      : "rgba(255,255,255,0.08)"
                  }
                  strokeWidth={isHovered || isSelected ? 1.5 : 0.5}
                />
                <text
                  textAnchor="middle"
                  dy={r + 14}
                  fill={
                    isSelected ? "#a5b4fc" : isHovered ? "#f1f5f9" : "#94a3b8"
                  }
                  fontSize={isSelected ? 14 : isHovered ? 13 : 11}
                  fontWeight={isSelected ? 700 : isHovered ? 600 : 400}
                  fontFamily="system-ui"
                >
                  {node.name.length > 5
                    ? node.name.slice(0, 5) + "…"
                    : node.name}
                </text>
                {(isHovered || isSelected) && (
                  <text
                    textAnchor="middle"
                    dy={r + 28}
                    fill="#64748b"
                    fontSize={10}
                    fontFamily="system-ui"
                  >
                    {roleLabel(node.role)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Detail Popup */}
      {selectedNode && (
        <div
          className="absolute top-3 right-3 z-20 w-72 max-h-[85%] overflow-y-auto bg-background/95 backdrop-blur-sm border rounded-xl shadow-2xl shadow-black/20 p-4 text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-white/10"
                style={{ backgroundColor: selectedNode.color }}
              />
              <span className="font-semibold text-base">
                {selectedNode.name}
              </span>
            </div>
            <button
              onClick={closeDetail}
              className="text-muted-foreground hover:text-foreground text-lg leading-none p-1 rounded-lg hover:bg-secondary/50 transition-colors"
              aria-label="关闭"
            >
              ×
            </button>
          </div>

          <div className="mb-3">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${selectedNode.color}20`,
                color: selectedNode.color,
              }}
            >
              {roleLabel(selectedNode.role)}
            </span>
          </div>

          {selectedNode.detail &&
          Object.keys(selectedNode.detail).length > 0 ? (
            <dl className="space-y-2">
              {Object.entries(selectedNode.detail).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs font-medium text-muted-foreground mb-0.5">
                    {detailFieldLabel(key)}
                  </dt>
                  <dd className="text-xs text-foreground leading-relaxed">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              暂无详细角色信息
            </p>
          )}

          {(() => {
            const nodeEdges = rawEdges.filter(
              (e) =>
                e.source === selectedNode.id || e.target === selectedNode.id,
            );
            if (nodeEdges.length === 0) return null;
            return (
              <div className="mt-3 pt-3 border-t border-border/30">
                <dt className="text-xs font-medium text-muted-foreground mb-1.5">
                  关系网络
                </dt>
                {nodeEdges.map((e, i) => {
                  const isSource = e.source === selectedNode.id;
                  const otherName = isSource ? e.target : e.source;
                  const otherNode = rawNodes.find((n) => n.name === otherName);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-xs py-0.5"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: otherNode?.color || "#95a5a6",
                        }}
                      />
                      <span
                        className="font-medium hover:text-indigo-400 cursor-pointer transition-colors"
                        onClick={() => {
                          const other = rawNodes.find(
                            (n) => n.name === otherName,
                          );
                          if (other) setSelectedNode(other);
                        }}
                      >
                        {otherName}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">
                        {isSource ? "→" : "←"} {edgeLabel(e.type)}
                      </span>
                      {e.chapter && (
                        <span className="text-muted-foreground text-[10px]">
                          (Ch{e.chapter})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
