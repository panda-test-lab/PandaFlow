import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
  Network, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Play, 
  Pause, 
  Layers, 
  BookOpen, 
  Award, 
  FileText, 
  Sparkles, 
  Info, 
  X, 
  ExternalLink,
  Link2,
  Bookmark,
  Check,
  HelpCircle,
  Copy,
  ArrowRight,
  Code2
} from 'lucide-react';
import { Module, LearningTopic, LectureNote, Exam, GraphNode, GraphEdge, GraphNodeType } from '../types';
import { 
  extractAllWikiLinkEdges, 
  extractWikiLinks, 
  resolveWikiLink, 
  findBacklinks, 
  renderTextWithWikiLinks,
  WikiLinkBadge 
} from '../utils/wikiLinks';

interface KnowledgeGraphProps {
  modules: Module[];
  topics: LearningTopic[];
  notes: LectureNote[];
  exams: Exam[];
  onNavigateToTopic?: (topicId: string) => void;
  onNavigateToNote?: (noteId: string) => void;
  onNavigateToExam?: (examId: string) => void;
  onNavigateToModule?: (moduleId: string) => void;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  modules,
  topics,
  notes,
  exams,
  onNavigateToTopic,
  onNavigateToNote,
  onNavigateToExam,
  onNavigateToModule,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('all');
  const [showModules, setShowModules] = useState(true);
  const [showTopics, setShowTopics] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [showExams, setShowExams] = useState(true);
  const [showWikiLinks, setShowWikiLinks] = useState(true);
  const [showHierarchyEdges, setShowHierarchyEdges] = useState(true);
  const [isPhysicsRunning, setIsPhysicsRunning] = useState(true);

  // Selection
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Information & Guide Modal
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [guideTestText, setGuideTestText] = useState<string>(
    'In der Vorlesung haben wir [[Massenwirkungsgesetz & Säure-Base-Gleichgewichte]] vertieft und mit [[Pufferlösungen & Henderson-Hasselbalch-Gleichung]] im Modul [[MOD-101]] verknüpft.'
  );
  const [copiedExample, setCopiedExample] = useState<string>('');

  // Pan & Zoom
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const isDraggingCanvasRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<GraphNode | null>(null);

  // Construct Nodes and Edges
  const { nodes, edges, wikiLinkEdgesCount } = useMemo(() => {
    const rawNodes: GraphNode[] = [];
    const rawEdges: GraphEdge[] = [];

    const getModule = (modId?: string) => modules.find((m) => m.id === modId);

    // 1. Module Nodes
    if (showModules) {
      modules.forEach((mod) => {
        if (selectedModuleFilter !== 'all' && mod.id !== selectedModuleFilter) return;
        rawNodes.push({
          id: `mod-${mod.id}`,
          label: mod.shortName || mod.name,
          type: 'module',
          moduleId: mod.id,
          color: mod.color || '#06b6d4',
          radius: 24,
          itemData: mod,
        });
      });
    }

    // 2. Learning Topics Nodes
    if (showTopics) {
      topics.forEach((top) => {
        if (selectedModuleFilter !== 'all' && top.moduleId !== selectedModuleFilter) return;
        const mod = getModule(top.moduleId);
        rawNodes.push({
          id: `top-${top.id}`,
          label: top.title,
          type: 'topic',
          moduleId: top.moduleId,
          color: mod?.color || '#10b981',
          radius: 16,
          itemData: top,
        });

        // Structural connection: Topic to its Module
        if (showHierarchyEdges && showModules && (!selectedModuleFilter || selectedModuleFilter === 'all' || selectedModuleFilter === top.moduleId)) {
          rawEdges.push({
            id: `edge-mod-${top.id}`,
            source: `mod-${top.moduleId}`,
            target: `top-${top.id}`,
            edgeType: 'hierarchy',
          });
        }

        // Structural connection: Related Topics
        if (showHierarchyEdges && top.relatedTopicIds) {
          top.relatedTopicIds.forEach((relId) => {
            rawEdges.push({
              id: `edge-rel-${top.id}-${relId}`,
              source: `top-${top.id}`,
              target: `top-${relId}`,
              dashed: true,
              edgeType: 'related',
            });
          });
        }
      });
    }

    // 3. Notes Nodes
    if (showNotes) {
      notes.forEach((note) => {
        if (selectedModuleFilter !== 'all' && note.moduleId !== selectedModuleFilter) return;
        rawNodes.push({
          id: `note-${note.id}`,
          label: note.title,
          type: 'note',
          moduleId: note.moduleId,
          color: '#94a3b8',
          radius: 12,
          itemData: note,
        });

        // Structural connection: Note to Module
        if (showHierarchyEdges && showModules) {
          rawEdges.push({
            id: `edge-note-mod-${note.id}`,
            source: `mod-${note.moduleId}`,
            target: `note-${note.id}`,
            edgeType: 'hierarchy',
          });
        }

        // Structural connection: Explicitly linked topics
        if (showHierarchyEdges && showTopics && note.linkedTopicIds) {
          note.linkedTopicIds.forEach((tId) => {
            rawEdges.push({
              id: `edge-note-top-${note.id}-${tId}`,
              source: `top-${tId}`,
              target: `note-${note.id}`,
              edgeType: 'hierarchy',
            });
          });
        }
      });
    }

    // 4. Exams Nodes
    if (showExams) {
      exams.forEach((ex) => {
        if (selectedModuleFilter !== 'all' && ex.moduleId !== selectedModuleFilter) return;
        rawNodes.push({
          id: `exam-${ex.id}`,
          label: ex.title,
          type: 'exam',
          moduleId: ex.moduleId,
          color: '#f59e0b',
          radius: 18,
          itemData: ex,
        });

        // Structural connection: Exam to Module
        if (showHierarchyEdges && showModules) {
          rawEdges.push({
            id: `edge-ex-mod-${ex.id}`,
            source: `mod-${ex.moduleId}`,
            target: `exam-${ex.id}`,
            edgeType: 'exam_link',
          });
        }

        // Structural connection: Exam to linked topics
        if (showHierarchyEdges && showTopics && ex.linkedTopicIds) {
          ex.linkedTopicIds.forEach((tId) => {
            rawEdges.push({
              id: `edge-ex-top-${ex.id}-${tId}`,
              source: `top-${tId}`,
              target: `exam-${ex.id}`,
              edgeType: 'exam_link',
            });
          });
        }
      });
    }

    // 5. Textuelle WikiLinks ([[...]]) Edges extracted from text
    let wikiCount = 0;
    if (showWikiLinks) {
      const activeNodeIdSet = new Set(rawNodes.map((n) => n.id));
      const extractedWikiEdges = extractAllWikiLinkEdges(notes, topics, modules, exams);
      
      extractedWikiEdges.forEach((wEdge) => {
        if (activeNodeIdSet.has(wEdge.source) && activeNodeIdSet.has(wEdge.target)) {
          rawEdges.push(wEdge);
          wikiCount++;
        }
      });
    }

    return { 
      nodes: rawNodes, 
      edges: rawEdges,
      wikiLinkEdgesCount: wikiCount
    };
  }, [modules, topics, notes, exams, selectedModuleFilter, showModules, showTopics, showNotes, showExams, showWikiLinks, showHierarchyEdges]);

  // Keep persistent coordinates in simulationRef
  const simulationRef = useRef<{
    nodes: (GraphNode & { x: number; y: number; vx: number; vy: number })[];
    edges: GraphEdge[];
  }>({ nodes: [], edges: [] });

  // Initialize node positions in a radial pattern
  useEffect(() => {
    const existingMap = new Map(simulationRef.current.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
    const width = 1000;
    const height = 650;
    const centerX = width / 2;
    const centerY = height / 2;

    const initialized = nodes.map((node, i) => {
      const existing = existingMap.get(node.id);
      if (existing) {
        return { ...node, x: existing.x, y: existing.y, vx: 0, vy: 0 };
      }
      const angle = (i / Math.max(1, nodes.length)) * 2 * Math.PI;
      const dist = node.type === 'module' ? 120 : node.type === 'topic' ? 240 : 320;
      return {
        ...node,
        x: centerX + Math.cos(angle) * dist + (Math.random() - 0.5) * 40,
        y: centerY + Math.sin(angle) * dist + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
      };
    });

    simulationRef.current = { nodes: initialized, edges };
  }, [nodes, edges]);

  // Physics loop
  useEffect(() => {
    let animId: number;

    const stepPhysics = () => {
      if (!isPhysicsRunning) return;

      const sim = simulationRef.current;
      const simNodes = sim.nodes;
      const simEdges = sim.edges;
      const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

      const width = 1000;
      const height = 650;
      const cx = width / 2;
      const cy = height / 2;

      // 1. Repulsion between all node pairs
      for (let i = 0; i < simNodes.length; i++) {
        const n1 = simNodes[i];
        for (let j = i + 1; j < simNodes.length; j++) {
          const n2 = simNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);

          if (dist < 450) {
            const force = 3500 / (distSq + 100);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }

        // Center gravity
        const cdx = cx - n1.x;
        const cdy = cy - n1.y;
        n1.vx += cdx * 0.003;
        n1.vy += cdy * 0.003;
      }

      // 2. Spring attraction along edges
      for (const edge of simEdges) {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) continue;

        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const desiredDist = edge.edgeType === 'wikilink' ? 120 : (s.type === 'module' || t.type === 'module' ? 140 : 100);
        const springForce = (dist - desiredDist) * 0.012;

        const fx = (dx / dist) * springForce;
        const fy = (dy / dist) * springForce;

        s.vx += fx;
        s.vy += fy;
        t.vx -= fx;
        t.vy -= fy;
      }

      // 3. Update positions with damping
      for (const n of simNodes) {
        if (draggedNodeRef.current && draggedNodeRef.current.id === n.id) {
          n.vx = 0;
          n.vy = 0;
          continue;
        }

        n.vx *= 0.88;
        n.vy *= 0.88;

        n.x += n.vx;
        n.y += n.vy;
      }
    };

    const render = () => {
      stepPhysics();

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Apply Pan & Zoom
      const { x, y, k } = transformRef.current;
      ctx.translate(x, y);
      ctx.scale(k, k);

      const sim = simulationRef.current;
      const simNodes = sim.nodes;
      const simEdges = sim.edges;
      const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

      // Draw Edges
      for (const edge of simEdges) {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) continue;

        const isHighlighted =
          selectedNode && (selectedNode.id === s.id || selectedNode.id === t.id);

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);

        if (edge.dashed) {
          ctx.setLineDash([4, 4]);
        } else {
          ctx.setLineDash([]);
        }

        if (edge.edgeType === 'wikilink') {
          // Purple glowing edge
          ctx.strokeStyle = isHighlighted
            ? 'rgba(216, 180, 254, 1)' // Bright purple highlight
            : 'rgba(168, 85, 247, 0.75)'; // Purple
          ctx.lineWidth = isHighlighted ? 3.0 : 1.8;
        } else {
          // Standard structural database edge
          ctx.strokeStyle = isHighlighted
            ? 'rgba(45, 212, 191, 0.85)' // Teal glow
            : edge.dashed
            ? 'rgba(100, 116, 139, 0.25)'
            : 'rgba(148, 163, 184, 0.2)';
          ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
        }
        ctx.stroke();

        // When zoomed in, draw a small indicator for WikiLinks
        if (edge.edgeType === 'wikilink' && (isHighlighted || k >= 1.2)) {
          const midX = (s.x + t.x) / 2;
          const midY = (s.y + t.y) / 2;
          ctx.beginPath();
          ctx.arc(midX, midY, 3, 0, 2 * Math.PI);
          ctx.fillStyle = isHighlighted ? '#f3e8ff' : '#a855f7';
          ctx.fill();
        }
      }

      ctx.setLineDash([]);

      // Draw Nodes
      for (const node of simNodes) {
        const isSelected = selectedNode?.id === node.id;
        const matchesSearch =
          searchQuery.trim().length > 0 &&
          node.label.toLowerCase().includes(searchQuery.toLowerCase());

        // Outer glow on hover / select / search
        if (isSelected || matchesSearch) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 8, 0, 2 * Math.PI);
          ctx.fillStyle = isSelected
            ? 'rgba(45, 212, 191, 0.25)'
            : 'rgba(245, 158, 11, 0.3)';
          ctx.fill();
        }

        // Draw shape based on node type
        ctx.beginPath();
        if (node.type === 'exam') {
          // Diamond shape for exams
          const r = node.radius * 1.2;
          ctx.moveTo(node.x, node.y - r);
          ctx.lineTo(node.x + r, node.y);
          ctx.lineTo(node.x, node.y + r);
          ctx.lineTo(node.x - r, node.y);
          ctx.closePath();
        } else {
          // Circle
          ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        }

        ctx.fillStyle = node.color;
        ctx.fill();

        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(15, 23, 42, 0.8)';
        ctx.stroke();

        // Node Label
        ctx.font = node.type === 'module' ? 'bold 12px "Plus Jakarta Sans"' : '11px "Plus Jakarta Sans"';
        ctx.fillStyle = isSelected ? '#ffffff' : matchesSearch ? '#fef08a' : '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Draw label with subtle text shadow
        const labelText =
          node.label.length > 24 ? node.label.slice(0, 22) + '…' : node.label;
        ctx.fillText(labelText, node.x, node.y + node.radius + 4);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isPhysicsRunning, selectedNode, searchQuery]);

  // Screen to world transform
  const screenToWorld = (screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const { x, y, k } = transformRef.current;
    return {
      x: (screenX - rect.left - x) / k,
      y: (screenY - rect.top - y) / k,
    };
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const world = screenToWorld(e.clientX, e.clientY);
    const simNodes = simulationRef.current.nodes;

    // Check hit on node
    for (let i = simNodes.length - 1; i >= 0; i--) {
      const n = simNodes[i];
      const dx = world.x - n.x;
      const dy = world.y - n.y;
      if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) {
        draggedNodeRef.current = n;
        setSelectedNode(n);
        return;
      }
    }

    // Otherwise pan canvas
    isDraggingCanvasRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      const world = screenToWorld(e.clientX, e.clientY);
      draggedNodeRef.current.x = world.x;
      draggedNodeRef.current.y = world.y;
      return;
    }

    if (isDraggingCanvasRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    draggedNodeRef.current = null;
    isDraggingCanvasRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.02 : 0.98;
    const newK = Math.max(0.25, Math.min(3.5, transformRef.current.k * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    transformRef.current.x = mouseX - (mouseX - transformRef.current.x) * (newK / transformRef.current.k);
    transformRef.current.y = mouseY - (mouseY - transformRef.current.y) * (newK / transformRef.current.k);
    transformRef.current.k = newK;
  };

  const handleZoomBy = (factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newK = Math.max(0.25, Math.min(3.5, transformRef.current.k * factor));
    transformRef.current.x = centerX - (centerX - transformRef.current.x) * (newK / transformRef.current.k);
    transformRef.current.y = centerY - (centerY - transformRef.current.y) * (newK / transformRef.current.k);
    transformRef.current.k = newK;
  };

  const handleResetZoom = () => {
    transformRef.current = { x: 0, y: 0, k: 1 };
  };

  const nodeTypeLabels: Record<GraphNodeType, string> = {
    module: 'Modul / Fachgebiet',
    topic: 'Lerninhalt / Konzept',
    note: 'Vorlesungsmitschrift',
    exam: 'Prüfungstermin',
  };

  // Compute backlinks and outgoing links for the selected node
  const selectedNodeWikiData = useMemo(() => {
    if (!selectedNode || !selectedNode.itemData) return null;

    const db = { modules, topics, notes, exams };
    let textCorpus = '';
    let targetType: 'topic' | 'module' | 'note' | 'exam' = selectedNode.type;
    let targetId = selectedNode.itemData.id;

    if (selectedNode.type === 'note') {
      const n = selectedNode.itemData as LectureNote;
      textCorpus = [
        n.content,
        n.summary,
        ...(n.connectionsList || []),
        ...(n.keyTakeaways || []),
      ].join('\n');
    } else if (selectedNode.type === 'topic') {
      const t = selectedNode.itemData as LearningTopic;
      textCorpus = [t.description, ...(t.keyFormulas || [])].join('\n');
    }

    // 1. Outgoing WikiLinks
    const outgoingMatches = extractWikiLinks(textCorpus);
    const outgoingResolved = outgoingMatches.map((m) => resolveWikiLink(m.target, m.alias, db));

    // 2. Incoming Backlinks
    const incomingBacklinks = findBacklinks(targetId, targetType, notes, topics, modules, exams);

    return {
      outgoing: outgoingResolved,
      incoming: incomingBacklinks,
    };
  }, [selectedNode, modules, topics, notes, exams]);

  // Live parsed results for Guide Tester Sandbox
  const guideTestParsed = useMemo(() => {
    const db = { modules, topics, notes, exams };
    const matches = extractWikiLinks(guideTestText);
    return matches.map((m) => resolveWikiLink(m.target, m.alias, db));
  }, [guideTestText, modules, topics, notes, exams]);

  return (
    <div className="space-y-5">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-lg text-teal-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-100">
                Wissensgraph &amp; Vernetzte Mind-Map
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-300 font-semibold">
                [[WikiLinks]]
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>Interaktive Vernetzung von Modulen, Konzepten, Text-WikiLinks &amp; Prüfungen</span>
            </div>
          </div>
        </div>

        {/* Filter & Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Guide / How-To Button */}
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="px-3 py-1.5 bg-purple-950/40 hover:bg-purple-900/40 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Erfahre, wie sich Wissen über Datenbank-Einträge und WikiLinks vernetzen lässt"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Wissensvernetzung &amp; WikiLinks</span>
          </button>

          {/* Search in graph */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Konzept suchen (z.B. Puffer)..."
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 w-44"
            />
          </div>

          {/* Module selector */}
          <select
            value={selectedModuleFilter}
            onChange={(e) => setSelectedModuleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500"
          >
            <option value="all">Alle Fächer</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.shortName || m.code}
              </option>
            ))}
          </select>

          {/* Physics toggle */}
          <button
            onClick={() => setIsPhysicsRunning(!isPhysicsRunning)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
              isPhysicsRunning
                ? 'bg-slate-800 text-teal-300 border-teal-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title={isPhysicsRunning ? 'Physik pausieren' : 'Physik starten'}
          >
            {isPhysicsRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Zoom controls */}
          <button
            onClick={() => handleZoomBy(1.1)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
            title="Vergrößern"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoomBy(0.9)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
            title="Verkleinern"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
            title="Ansicht zentrieren"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Layer Toggles */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-300">
        <span className="text-slate-500 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          Sichtbare Ebenen:
        </span>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showModules}
            onChange={(e) => setShowModules(e.target.checked)}
            className="accent-teal-500 rounded"
          />
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
            Module
          </span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showTopics}
            onChange={(e) => setShowTopics(e.target.checked)}
            className="accent-teal-500 rounded"
          />
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            Lerninhalte & Konzepte
          </span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showNotes}
            onChange={(e) => setShowNotes(e.target.checked)}
            className="accent-teal-500 rounded"
          />
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
            Mitschriften
          </span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showExams}
            onChange={(e) => setShowExams(e.target.checked)}
            className="accent-teal-500 rounded"
          />
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rotate-45 bg-amber-400 inline-block" />
            Klausuren & Testate
          </span>
        </label>

        {/* WikiLink Toggle */}
        <label className="flex items-center gap-1.5 cursor-pointer ml-1 sm:ml-2">
          <input
            type="checkbox"
            checked={showWikiLinks}
            onChange={(e) => setShowWikiLinks(e.target.checked)}
            className="accent-purple-500 rounded"
          />
          <span className="flex items-center gap-1 text-purple-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block shadow-xs shadow-purple-500/50" />
            Text-Verknüpfungen [[WikiLinks]] ({wikiLinkEdgesCount})
          </span>
        </label>

        <span className="ml-auto text-[11px] text-slate-500 font-mono">
          {nodes.length} Knoten · {edges.length} Kanten
        </span>
      </div>

      {/* Interactive Info Banner for Knowledge Linking */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900/70 to-cyan-950/40 border border-purple-500/30 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0 mt-0.5 sm:mt-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-100">
                Wissensvernetzung &amp; Text-WikiLinks im Wissensgraphen
              </span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
                Aktiv
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Verknüpfe Wissen auf zwei Wegen: <strong className="text-cyan-300 font-medium">1. Strukturierte DB-Relationen</strong> (Module, Prüfungen, Lernthemen) &amp; <strong className="text-purple-300 font-medium">2. Textuelle [[WikiLinks]]</strong> im Fließtext. Auszeichnungen im Text spannen automatisch lila Kanten und werden im Text zu direkten Klick-Links!
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowGuideModal(true)}
          className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors shadow-sm shadow-purple-900/50"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Anleitung &amp; Live-Test</span>
        </button>
      </div>

      {/* Main Canvas Viewport with Node Details Drawer */}
      <div className="relative w-full h-[620px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full cursor-grab active:cursor-grabbing block"
        />

        {/* Legend */}
        <div className="absolute top-4 left-4 p-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg text-xs text-slate-300 space-y-1.5 pointer-events-none">
          <div className="font-semibold text-slate-200 text-[11px] uppercase tracking-wider mb-1">
            Legende
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" />
            <span>Modul</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
            <span>Lerninhalt</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" />
            <span>Mitschrift</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rotate-45 bg-amber-400 inline-block" />
            <span>Prüfung</span>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
            <span className="w-4 h-0.5 bg-purple-400 inline-block shadow-xs shadow-purple-500/60" />
            <span className="text-purple-300 font-medium">[[WikiLink]] Kante</span>
          </div>
        </div>

        {/* Navigation Info Tooltip */}
        <div className="absolute bottom-4 left-4 p-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg text-[11px] text-slate-400 space-y-1 pointer-events-none">
          <div className="font-semibold text-slate-200">Navigation:</div>
          <div>· Ziehen zum Bewegen · Scrollen zum Zoomen</div>
          <div>· Knoten anklicken für Details, Querverweise &amp; Backlinks</div>
        </div>

        {/* Node Detail Slide-out Drawer */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-84 max-w-[calc(100%-2rem)] max-h-[580px] overflow-y-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-right-4 duration-200 z-10">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span
                  style={{ color: selectedNode.color }}
                  className="text-[10px] font-mono font-semibold uppercase tracking-wider block"
                >
                  {nodeTypeLabels[selectedNode.type]}
                </span>
                <h3 className="text-sm font-bold text-slate-100 mt-1 leading-snug">
                  {selectedNode.label}
                </h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-slate-200 text-sm p-1 rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content according to node type */}
            {selectedNode.type === 'topic' && selectedNode.itemData && (
              <div className="space-y-3 text-xs">
                <div className="text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  {renderTextWithWikiLinks(
                    selectedNode.itemData.description,
                    { modules, topics, notes, exams },
                    { onNavigateToTopic, onNavigateToModule, onNavigateToNote, onNavigateToExam }
                  )}
                </div>

                {selectedNode.itemData.keyFormulas && selectedNode.itemData.keyFormulas.length > 0 && (
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-teal-300 space-y-1">
                    <span className="text-[10px] uppercase text-slate-500 block font-sans">
                      Formeln &amp; Reaktionen:
                    </span>
                    {selectedNode.itemData.keyFormulas.map((f: string, i: number) => (
                      <div key={i}>{f}</div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
                  <span>Wissensstatus:</span>
                  <span className="font-semibold text-teal-400 capitalize">
                    {selectedNode.itemData.masteryLevel}
                  </span>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      if (onNavigateToTopic) onNavigateToTopic(selectedNode.itemData.id);
                    }}
                    className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Lerninhalt öffnen</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {selectedNode.type === 'module' && selectedNode.itemData && (
              <div className="space-y-3 text-xs">
                <div className="text-slate-400">
                  <span className="font-mono text-cyan-400 font-bold">
                    {selectedNode.itemData.code}
                  </span>{' '}
                  · {selectedNode.itemData.credits} ECTS
                </div>
                <div className="text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  {renderTextWithWikiLinks(
                    selectedNode.itemData.description,
                    { modules, topics, notes, exams },
                    { onNavigateToTopic, onNavigateToModule, onNavigateToNote, onNavigateToExam }
                  )}
                </div>
                <div className="text-slate-400">
                  Dozent: {selectedNode.itemData.lecturer || '-'}
                </div>
                {onNavigateToModule && (
                  <div className="pt-1">
                    <button
                      onClick={() => onNavigateToModule(selectedNode.itemData.id)}
                      className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Modulübersicht öffnen</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {selectedNode.type === 'note' && selectedNode.itemData && (
              <div className="space-y-3 text-xs">
                <div className="text-slate-400 font-mono text-[11px]">
                  Vorlesung vom {selectedNode.itemData.lectureDate}
                </div>
                {selectedNode.itemData.summary && (
                  <div className="text-slate-300 italic bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    {renderTextWithWikiLinks(
                      `„${selectedNode.itemData.summary}“`,
                      { modules, topics, notes, exams },
                      { onNavigateToTopic, onNavigateToModule, onNavigateToNote, onNavigateToExam }
                    )}
                  </div>
                )}
                <div className="pt-1">
                  <button
                    onClick={() => {
                      if (onNavigateToNote) onNavigateToNote(selectedNode.itemData.id);
                    }}
                    className="w-full py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Mitschrift im Editor öffnen</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {selectedNode.type === 'exam' && selectedNode.itemData && (
              <div className="space-y-3 text-xs">
                <div className="p-2.5 bg-amber-950/40 border border-amber-800/50 rounded-lg text-amber-300">
                  Termin: {selectedNode.itemData.date} ({selectedNode.itemData.time} Uhr)
                </div>
                <div className="text-slate-400">
                  Raum: {selectedNode.itemData.room}
                </div>
                {selectedNode.itemData.notes && (
                  <p className="text-slate-400 italic text-[11px]">
                    {selectedNode.itemData.notes}
                  </p>
                )}
                <div className="pt-1">
                  <button
                    onClick={() => {
                      if (onNavigateToExam) onNavigateToExam(selectedNode.itemData.id);
                    }}
                    className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Prüfungsdetails aufrufen</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* [[WikiLinks]] & Backlinks Section for Selected Node */}
            {selectedNodeWikiData && (
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-300">
                  <Link2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Text-Verknüpfungen</span>
                </div>

                {/* Outgoing References */}
                {selectedNodeWikiData.outgoing.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Ausgehende Querverweise ({selectedNodeWikiData.outgoing.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selectedNodeWikiData.outgoing.map((res, i) => (
                        <WikiLinkBadge
                          key={`out-${i}`}
                          resolved={res}
                          handlers={{ onNavigateToTopic, onNavigateToModule, onNavigateToNote, onNavigateToExam }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Incoming Backlinks */}
                {selectedNodeWikiData.incoming.length > 0 ? (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Erwähnt in / Backlinks ({selectedNodeWikiData.incoming.length}):
                    </span>
                    <div className="space-y-1">
                      {selectedNodeWikiData.incoming.map((bl, i) => (
                        <div
                          key={`bl-${i}`}
                          onClick={() => {
                            if (bl.sourceNote && onNavigateToNote) onNavigateToNote(bl.sourceNote.id);
                            else if (bl.sourceTopic && onNavigateToTopic) onNavigateToTopic(bl.sourceTopic.id);
                          }}
                          className="p-1.5 rounded bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 hover:bg-purple-950/30 cursor-pointer transition-colors flex items-center justify-between text-[11px]"
                        >
                          <span className="text-slate-200 truncate">
                            {bl.sourceNote ? `Mitschrift: ${bl.sourceNote.title}` : `Thema: ${bl.sourceTopic?.title}`}
                          </span>
                          <span className="font-mono text-[10px] text-purple-400 shrink-0 ml-1">
                            {bl.matchedLink}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 italic">
                    Keine eingehenden Backlinks. Erwähne diesen Knoten mit <code className="text-purple-400">[[{selectedNode.label}]]</code> in einer Mitschrift!
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Guide Modal: Wie sich Wissen grafisch vernetzt & WikiLinks */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in duration-150 my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Network className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>Wissen grafisch vernetzen in PandaFlow</span>
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/50">
                      Vernetztes Wissen
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lerne, wie Beziehungen automatisch entstehen und wie du sie im Text auszeichnest.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explanation Columns: Method 1 & Method 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Method 1: Structured DB entries */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-cyan-500/10 text-cyan-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    1. Strukturierte DB-Relationen
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Beziehungen entstehen automatisch durch die Zuordnungen in deiner Datenbank:
                </p>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                  <li>
                    <strong className="text-slate-200">Modul ↔ Lerninhalte:</strong> Alle Themen gruppieren sich um das Eltern-Modul.
                  </li>
                  <li>
                    <strong className="text-slate-200">Prüfungen ↔ Lernthemen:</strong> Bei Prüfungen verknüpfte Themen werden mit Bernsteinfarben angebunden.
                  </li>
                  <li>
                    <strong className="text-slate-200">Mitschriften ↔ Themen:</strong> Explizit behandelte Themen verbinden die Vorlesung direkt.
                  </li>
                  <li>
                    <strong className="text-slate-200">Verwandte Themen:</strong> Themen untereinander verbinden sich über gestrichelte Linien.
                  </li>
                </ul>
              </div>

              {/* Method 2: WikiLinks in text */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-500/30 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-purple-500/10 text-purple-400">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                    2. Textuelle WikiLinks im Text
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tippe in Mitschriften, Zusammenhängen oder Formeln einfach:
                </p>
                <div className="p-2 rounded bg-slate-900 border border-purple-500/40 font-mono text-[11px] text-purple-300">
                  [[Name des Themas]] oder [[MOD-101]]
                </div>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                  <li>
                    <strong className="text-slate-200">Klickbare Links:</strong> Wird im Text sofort zu einem interaktiven Hyperlink mit Pfeil.
                  </li>
                  <li>
                    <strong className="text-slate-200">Lila Kante im Graphen:</strong> PandaFlow zieht sofort eine leuchtende Verbindung!
                  </li>
                  <li>
                    <strong className="text-slate-200">Aliase möglich:</strong> <code className="text-purple-300">[[Thema|Anzeigename]]</code> für Kurzformen.
                  </li>
                  <li>
                    <strong className="text-slate-200">Backlinks:</strong> Jeder Knoten zeigt, in welchen Texten er erwähnt wurde.
                  </li>
                </ul>
              </div>
            </div>

            {/* Interactive Live Tester Sandbox */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-purple-400" />
                  <span>Live-Sandbox: Auszeichnung im Text testen</span>
                </label>
                <span className="text-[10px] text-slate-400">Einfach tippen und Vorschau beobachten</span>
              </div>

              <textarea
                rows={2}
                value={guideTestText}
                onChange={(e) => setGuideTestText(e.target.value)}
                placeholder="Schreibe z.B.: In der Vorlesung haben wir [[Pufferlösungen & Henderson-Hasselbalch-Gleichung]] besprochen..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
              />

              {/* Live Preview of WikiLinks */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Ergebnis &amp; Klickbare Hyperlinks:
                </span>
                <div className="p-2.5 bg-slate-900/90 rounded-lg border border-purple-500/20 text-xs text-slate-300 leading-relaxed">
                  {renderTextWithWikiLinks(
                    guideTestText,
                    { modules, topics, notes, exams },
                    { 
                      onNavigateToTopic: (id) => { setShowGuideModal(false); if (onNavigateToTopic) onNavigateToTopic(id); },
                      onNavigateToModule: (id) => { setShowGuideModal(false); if (onNavigateToModule) onNavigateToModule(id); },
                      onNavigateToNote: (id) => { setShowGuideModal(false); if (onNavigateToNote) onNavigateToNote(id); },
                      onNavigateToExam: (id) => { setShowGuideModal(false); if (onNavigateToExam) onNavigateToExam(id); }
                    }
                  )}
                </div>
              </div>

              {/* Status List of detected links */}
              {guideTestParsed.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap text-[11px] pt-1">
                  <span className="text-slate-500 font-medium">Erkannte Ziele:</span>
                  {guideTestParsed.map((res, i) => (
                    <span 
                      key={i} 
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] ${
                        res.type !== 'unresolved' 
                          ? 'bg-purple-950 text-purple-300 border border-purple-800/40' 
                          : 'bg-slate-900 text-slate-400 border border-slate-700 border-dashed'
                      }`}
                    >
                      <span>[[{res.target}]]</span>
                      <span className="font-sans text-[9px] text-slate-400">
                        ({res.type === 'topic' ? 'Thema ✓' : res.type === 'module' ? 'Modul ✓' : res.type === 'note' ? 'Mitschrift ✓' : 'Nicht gefunden'})
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Syntax Snippets to Copy */}
            <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>Im Notiz-Editor steht dir zusätzlich ein <strong>[[WikiLink]]</strong>-Schnellwähler zur Verfügung.</span>
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Verstanden &amp; Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
