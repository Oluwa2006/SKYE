"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Search, BarChart2, Plus, Mic, Send, Play, Zap, X, GitBranch, Scissors } from "lucide-react";

// ─── Voice data (mirrors src/lib/elevenlabs.ts) ───────────────────────────────
const VOICES = [
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam",      desc: "Deep & authoritative" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh",      desc: "Young & hype"         },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella",     desc: "Warm & inviting"      },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi",      desc: "Bold & expressive"    },
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel",    desc: "Clear & professional" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", desc: "Friendly & upbeat"    },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice",     desc: "Confident & modern"   },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel",    desc: "Smooth & persuasive"  },
];

const LANGUAGES = [
  { code: "en", label: "English"    },
  { code: "hi", label: "Hindi"      },
  { code: "es", label: "Spanish"    },
  { code: "fr", label: "French"     },
  { code: "de", label: "German"     },
  { code: "ar", label: "Arabic"     },
  { code: "zh", label: "Chinese"    },
  { code: "ja", label: "Japanese"   },
  { code: "ko", label: "Korean"     },
  { code: "pt", label: "Portuguese" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type NodeType = "trigger" | "scrape" | "analyse" | "generate" | "clip" | "voice" | "publish";

interface FlowNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  data: Record<string, string | number>;
}

interface FlowEdge {
  id: string;
  fromId: string;
  toId: string;
}

// ─── Node visual config ───────────────────────────────────────────────────────
const CFG: Record<NodeType, { label: string; Icon: React.ElementType; color: string; bg: string; border: string; h: number }> = {
  trigger:  { label: "Trigger",        Icon: Zap,      color: "#8b5cf6", bg: "#faf5ff", border: "#e9d5ff", h: 100 },
  scrape:   { label: "Scrape",         Icon: Search,   color: "#0ea5e9", bg: "#f0f9ff", border: "#bae6fd", h: 78  },
  analyse:  { label: "Analyse",        Icon: BarChart2,color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0", h: 78  },
  generate: { label: "Generate Script",Icon: Plus,     color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", h: 100 },
  clip:     { label: "Clip / Trim",    Icon: Scissors, color: "#ec4899", bg: "#fdf2f8", border: "#fbcfe8", h: 100 },
  voice:    { label: "Voice",          Icon: Mic,      color: "#ef4444", bg: "#fff1f2", border: "#fecdd3", h: 152 },
  publish:  { label: "Publish",        Icon: Send,     color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe", h: 100 },
};

const NODE_W = 228;
let _id = 20;
const uid = () => String(++_id);

// ─── Edge bezier ──────────────────────────────────────────────────────────────
function portPos(node: FlowNode, side: "l" | "r") {
  const h = CFG[node.type].h;
  return {
    x: node.x + (side === "r" ? NODE_W : 0),
    y: node.y + h / 2,
  };
}

function bezier(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = Math.max(Math.abs(to.x - from.x) * 0.5, 60);
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}

// ─── Inline select ────────────────────────────────────────────────────────────
function FieldSelect({
  label, value, options, onChange, onMouseDown,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <div>
      <p className="text-[10px] text-dm mb-1">{label}</p>
      <select
        className="w-full text-xs border border-glass rounded-md px-2 py-1 glass-card text-dp outline-none focus:border-gray-400 cursor-pointer"
        value={value}
        onChange={e => onChange(e.target.value)}
        onMouseDown={onMouseDown}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Node body content ────────────────────────────────────────────────────────
function NodeBody({ node, update }: { node: FlowNode; update: (d: Record<string, string>) => void }) {
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  if (node.type === "trigger") {
    return (
      <FieldSelect
        label="Run schedule"
        value={String(node.data.schedule ?? "daily")}
        options={[
          { value: "manual",  label: "Manual only"   },
          { value: "daily",   label: "Daily at 8 AM" },
          { value: "weekly",  label: "Weekly (Mon)"  },
          { value: "hourly",  label: "Hourly"        },
        ]}
        onChange={v => update({ schedule: v })}
        onMouseDown={stop}
      />
    );
  }
  if (node.type === "scrape") {
    return <p className="text-[11px] text-ds leading-relaxed">Pulls latest posts from all active sources.</p>;
  }
  if (node.type === "analyse") {
    return <p className="text-[11px] text-ds leading-relaxed">AI-scores tone, hook, urgency, and topic for each post.</p>;
  }
  if (node.type === "generate") {
    return (
      <FieldSelect
        label="Ideas to generate"
        value={String(node.data.count ?? "5")}
        options={["3","5","10","20"].map(v => ({ value: v, label: `${v} ideas` }))}
        onChange={v => update({ count: v })}
        onMouseDown={stop}
      />
    );
  }
  if (node.type === "clip") {
    return (
      <FieldSelect
        label="Max clip length"
        value={String(node.data.length ?? "60")}
        options={["15","30","60","90"].map(v => ({ value: v, label: `${v} seconds` }))}
        onChange={v => update({ length: v })}
        onMouseDown={stop}
      />
    );
  }
  if (node.type === "voice") {
    return (
      <div className="space-y-2.5">
        <FieldSelect
          label="Voice"
          value={String(node.data.voiceId ?? VOICES[0].id)}
          options={VOICES.map(v => ({ value: v.id, label: `${v.name} — ${v.desc}` }))}
          onChange={v => update({ voiceId: v })}
          onMouseDown={stop}
        />
        <FieldSelect
          label="Language"
          value={String(node.data.language ?? "en")}
          options={LANGUAGES.map(l => ({ value: l.code, label: l.label }))}
          onChange={v => update({ language: v })}
          onMouseDown={stop}
        />
      </div>
    );
  }
  if (node.type === "publish") {
    return (
      <FieldSelect
        label="Platform"
        value={String(node.data.platform ?? "instagram")}
        options={[
          { value: "instagram", label: "Instagram"      },
          { value: "tiktok",    label: "TikTok"         },
          { value: "youtube",   label: "YouTube Shorts" },
          { value: "twitter",   label: "X / Twitter"    },
        ]}
        onChange={v => update({ platform: v })}
        onMouseDown={stop}
      />
    );
  }
  return null;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LS_NODES = "wf_nodes";
const LS_EDGES = "wf_edges";

function loadNodes(): FlowNode[] {
  try {
    const s = localStorage.getItem(LS_NODES);
    if (s) return JSON.parse(s);
  } catch {}
  return DEFAULT_NODES_INIT;
}

function loadEdges(): FlowEdge[] {
  try {
    const s = localStorage.getItem(LS_EDGES);
    if (s) return JSON.parse(s);
  } catch {}
  return DEFAULT_EDGES_INIT;
}

// ─── Default canvas state ─────────────────────────────────────────────────────
const DEFAULT_NODES_INIT: FlowNode[] = [
  { id: "1", type: "trigger",  x: 60,   y: 200, data: { schedule: "daily"           } },
  { id: "2", type: "scrape",   x: 340,  y: 110, data: {}                              },
  { id: "3", type: "analyse",  x: 340,  y: 300, data: {}                              },
  { id: "4", type: "generate", x: 640,  y: 200, data: { count: "5"                  } },
  { id: "5", type: "voice",    x: 940,  y: 160, data: { voiceId: VOICES[0].id, language: "en" } },
  { id: "6", type: "publish",  x: 1240, y: 200, data: { platform: "instagram"       } },
];

const DEFAULT_EDGES_INIT: FlowEdge[] = [
  { id: "e1", fromId: "1", toId: "2" },
  { id: "e2", fromId: "1", toId: "3" },
  { id: "e3", fromId: "2", toId: "4" },
  { id: "e4", fromId: "3", toId: "4" },
  { id: "e5", fromId: "4", toId: "5" },
  { id: "e6", fromId: "5", toId: "6" },
];

// ─── Toolbar node palette ─────────────────────────────────────────────────────
const PALETTE: { type: NodeType }[] = [
  { type: "trigger"  },
  { type: "scrape"   },
  { type: "analyse"  },
  { type: "generate" },
  { type: "clip"     },
  { type: "voice"    },
  { type: "publish"  },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function WorkflowPage() {
  const [nodes, setNodes] = useState<FlowNode[]>(DEFAULT_NODES_INIT);
  const [edges, setEdges] = useState<FlowEdge[]>(DEFAULT_EDGES_INIT);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [linking, setLinking] = useState<string | null>(null); // fromId while drawing edge
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);

  // Load from localStorage on first mount
  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      setNodes(loadNodes());
      setEdges(loadEdges());
    }
  }, []);

  // Auto-save to localStorage whenever nodes/edges change
  useEffect(() => {
    if (!didInit.current) return;
    try {
      localStorage.setItem(LS_NODES, JSON.stringify(nodes));
      localStorage.setItem(LS_EDGES, JSON.stringify(edges));
    } catch {}
  }, [nodes, edges]);

  // Delete selected node with keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selected && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement)) {
        setNodes(ns => ns.filter(n => n.id !== selected));
        setEdges(es => es.filter(e => e.fromId !== selected && e.toId !== selected));
        setSelected(null);
      }
      if (e.key === "Escape") setLinking(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const getCanvasXY = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasXY(e);
    setMouse(pos);
    if (drag) {
      setNodes(ns => ns.map(n =>
        n.id === drag.id ? { ...n, x: pos.x - drag.ox, y: pos.y - drag.oy } : n
      ));
    }
  }, [drag]);

  const onMouseUp = useCallback(() => setDrag(null), []);

  function startDrag(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const node = nodes.find(n => n.id === id)!;
    const pos = getCanvasXY(e);
    setDrag({ id, ox: pos.x - node.x, oy: pos.y - node.y });
    setSelected(id);
  }

  function startLink(e: React.MouseEvent, fromId: string) {
    e.stopPropagation();
    setLinking(fromId);
  }

  function finishLink(e: React.MouseEvent, toId: string) {
    e.stopPropagation();
    if (!linking || linking === toId) { setLinking(null); return; }
    const dup = edges.some(ed => ed.fromId === linking && ed.toId === toId);
    if (!dup) setEdges(es => [...es, { id: uid(), fromId: linking, toId }]);
    setLinking(null);
  }

  function addNode(type: NodeType) {
    setNodes(ns => [...ns, {
      id: uid(), type,
      x: 160 + Math.random() * 500,
      y: 120 + Math.random() * 280,
      data: type === "voice" ? { voiceId: VOICES[0].id, language: "en" } : {},
    }]);
  }

  function removeNode(id: string) {
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.fromId !== id && e.toId !== id));
    if (selected === id) setSelected(null);
  }

  async function handleRun() {
    if (running) return;
    setRunning(true);
    setRunMsg("Running pipeline...");
    try {
      const res = await fetch("/api/run-pipeline", { cache: "no-store" });
      if (res.status === 409) { setRunMsg("Pipeline already running."); }
      else if (!res.ok) { const d = await res.json(); setRunMsg(d.error ?? "Pipeline failed."); }
      else { setRunMsg("Pipeline complete."); setTimeout(() => setRunMsg(""), 3000); }
    } catch {
      setRunMsg("Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  function updateData(id: string, patch: Record<string, string>) {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
  }

  return (
    <div className="relative overflow-hidden select-none" style={{ height: "100vh" }}>
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="absolute inset-0 overflow-auto"
        style={{
          backgroundColor: "#ffffff",
          backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          cursor: linking ? "crosshair" : "default",
        }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onClick={() => { setSelected(null); setLinking(null); }}
      >
        {/* SVG edge layer — 4000×2400 virtual canvas */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: 4000, height: 2400 }}
        >
          {/* Committed edges */}
          {edges.map(edge => {
            const fn = nodes.find(n => n.id === edge.fromId);
            const tn = nodes.find(n => n.id === edge.toId);
            if (!fn || !tn) return null;
            return (
              <path
                key={edge.id}
                d={bezier(portPos(fn, "r"), portPos(tn, "l"))}
                stroke="#d1d5db"
                strokeWidth={2}
                fill="none"
                strokeDasharray="5,3"
              />
            );
          })}

          {/* Live preview edge while linking */}
          {linking && (() => {
            const fn = nodes.find(n => n.id === linking);
            if (!fn) return null;
            return (
              <path
                d={bezier(portPos(fn, "r"), mouse)}
                stroke="#6366f1"
                strokeWidth={2}
                fill="none"
                strokeDasharray="5,3"
                opacity={0.7}
              />
            );
          })()}

          {/* Arrowhead markers on edge endpoints */}
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#d1d5db" />
            </marker>
          </defs>
        </svg>

        {/* Nodes */}
        {nodes.map(node => {
          const cfg = CFG[node.type];
          const isActive = selected === node.id;
          const portY = cfg.h / 2 - 6;

          return (
            <div
              key={node.id}
              className="absolute"
              style={{ left: node.x, top: node.y, width: NODE_W }}
              onMouseDown={e => startDrag(e, node.id)}
            >
              {/* Card */}
              <div
                className="rounded-xl border overflow-hidden"
                style={{
                  background: cfg.bg,
                  borderColor: isActive ? cfg.color : cfg.border,
                  boxShadow: isActive
                    ? `0 0 0 2px ${cfg.color}44, 0 4px 16px rgba(0,0,0,0.08)`
                    : "0 1px 6px rgba(0,0,0,0.06)",
                  transition: "box-shadow 150ms ease, border-color 150ms ease",
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-3 py-2"
                  style={{ borderBottom: `1px solid ${cfg.border}`, background: `${cfg.color}0d` }}
                >
                  <div className="flex items-center gap-1.5">
                    <cfg.Icon size={13} strokeWidth={2} style={{ color: cfg.color }} />
                    <span className="text-[11px] font-semibold tracking-wide" style={{ color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  <button
                    className="text-dm hover:text-ds transition-colors p-0.5 rounded"
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => removeNode(node.id)}
                  >
                    <X size={11} />
                  </button>
                </div>

                {/* Body */}
                <div className="px-3 py-2.5">
                  <NodeBody node={node} update={p => updateData(node.id, p)} />
                </div>
              </div>

              {/* Input port (left) */}
              <div
                className="absolute rounded-full border-2 border-white z-10 transition-transform hover:scale-125"
                style={{
                  width: 12, height: 12,
                  background: cfg.color,
                  left: -6, top: portY,
                  cursor: linking ? "cell" : "crosshair",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.12)",
                }}
                onMouseDown={e => e.stopPropagation()}
                onMouseUp={e => finishLink(e, node.id)}
              />

              {/* Output port (right) */}
              <div
                className="absolute rounded-full border-2 border-white z-10 transition-transform hover:scale-125"
                style={{
                  width: 12, height: 12,
                  background: cfg.color,
                  right: -6, top: portY,
                  cursor: "crosshair",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.12)",
                }}
                onMouseDown={e => startLink(e, node.id)}
              />
            </div>
          );
        })}
      </div>

      {/* Run status message */}
      {runMsg && !linking && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 bg-gray-900/90 backdrop-blur text-white text-xs px-3 py-1.5 rounded-lg pointer-events-none">
          {runMsg}
        </div>
      )}

      {/* Hint while linking */}
      {linking && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-gray-900/90 backdrop-blur text-white text-xs px-3 py-1.5 rounded-lg pointer-events-none">
          Click an input port to connect · Esc to cancel
        </div>
      )}

      {/* Bottom toolbar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-0 glass-card border border-glass rounded-xl shadow-lg px-3 py-1.5">
          {PALETTE.map(({ type }) => {
            const cfg = CFG[type];
            return (
              <button
                key={type}
                title={`Add ${cfg.label}`}
                onClick={() => addNode(type)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg hover:glass-sub transition-colors group"
              >
                <cfg.Icon size={13} strokeWidth={1.8} style={{ color: cfg.color }} className="shrink-0" />
                <span className="text-[11px] font-medium text-dm group-hover:text-ds transition-colors whitespace-nowrap">
                  {cfg.label}
                </span>
              </button>
            );
          })}

          <div className="w-px h-5 bg-gray-200 mx-2" />

          <button
            title="Run Pipeline"
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg hover:bg-blue-50 transition-colors group disabled:opacity-50"
          >
            {running
              ? <span className="w-3 h-3 rounded-full border-2 border-gray-300 border-t-blue-500 animate-spin shrink-0" />
              : <Play size={13} strokeWidth={1.8} className="text-dm group-hover:text-blue-500 transition-colors shrink-0" />
            }
            <span className="text-[11px] font-medium text-dm group-hover:text-blue-500 transition-colors">
              {running ? "Running..." : "Run"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
