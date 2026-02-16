import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  MUSCLE_PATHS,
  SVG_VIEWBOX,
  FRONT_VIEW_MUSCLES,
  BACK_VIEW_MUSCLES,
  BODY_FILL_PATHS,
} from '../assets/muscle-model';
import { MuscleGroup, MUSCLE_GROUP_NAMES } from '../types/strength';
import frontImage from '../assets/muscle-model-front.jpg';
import backImage from '../assets/muscle-model-back.jpg';
import {
  MuscleTransform,
  DEFAULT_TRANSFORM,
  PathCommand,
  getPathBounds,
  getSvgTransformString,
  applyTransformToPath,
  transformPoint,
  parsePath,
  serializePath,
} from '../components/dev/PathUtils';

const STORAGE_KEY = 'dev-muscle-editor-v2';
const ALL_MUSCLES = Object.keys(MUSCLE_PATHS) as MuscleGroup[];

// Persisted state shape
interface EditorPersist {
  transforms: Record<string, MuscleTransform>;
  pathOverrides: Record<string, { path: string; fiberPaths: string[] }>;
}

function loadPersisted(): EditorPersist {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Try migrating from v1
      const v1 = localStorage.getItem('dev-muscle-editor-transforms');
      if (v1) {
        const transforms = JSON.parse(v1);
        return { transforms, pathOverrides: {} };
      }
      return { transforms: {}, pathOverrides: {} };
    }
    const parsed = JSON.parse(raw);
    // Handle if it's just a flat transforms object (old format)
    if (parsed.transforms === undefined) return { transforms: parsed, pathOverrides: {} };
    return parsed;
  } catch {
    return { transforms: {}, pathOverrides: {} };
  }
}

// Helper: get the last endpoint position before a given command index
function getPrevEndpoint(commands: PathCommand[], idx: number): { x: number; y: number } {
  for (let i = idx - 1; i >= 0; i--) {
    const c = commands[i];
    const u = c.type.toUpperCase();
    if (u === 'Z') continue;
    if (u === 'C') return { x: c.coords[4], y: c.coords[5] };
    if (u === 'Q') return { x: c.coords[2], y: c.coords[3] };
    if (u === 'M' || u === 'L') return { x: c.coords[0], y: c.coords[1] };
  }
  return { x: 0, y: 0 };
}

// ---------------------------------------------------------------------------
// Slider Control
// ---------------------------------------------------------------------------
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  onCommit: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300 font-mono">{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={onCommit}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 accent-blue-500"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Editor
// ---------------------------------------------------------------------------
export function DevMuscleEditor() {
  const initial = useMemo(() => loadPersisted(), []);

  // ---- State ----
  const [activeView, setActiveView] = useState<'front' | 'back'>('front');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [transforms, setTransforms] = useState<Record<string, MuscleTransform>>(initial.transforms);
  const [pathOverrides, setPathOverrides] = useState<Record<string, { path: string; fiberPaths: string[] }>>(initial.pathOverrides);
  const [editMode, setEditMode] = useState<'move' | 'points'>('move');
  const [globalOpacity, setGlobalOpacity] = useState(0.55);
  const [showGrid, setShowGrid] = useState(false);
  const [showBodyOutline, setShowBodyOutline] = useState(false);
  const [showImage, setShowImage] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [draggingPointIdx, setDraggingPointIdx] = useState<{ cmdIdx: number; coordIdx: number } | null>(null);
  const dragStartRef = useRef({ svgX: 0, svgY: 0, tx: 0, ty: 0 });
  const pointDragStartRef = useRef({ svgX: 0, svgY: 0, origX: 0, origY: 0 });
  const panStartRef = useRef({ clientX: 0, clientY: 0, px: 0, py: 0, scaleX: 1, scaleY: 1 });

  // ---- Computed ----
  const viewBox = SVG_VIEWBOX[activeView];
  const musclesForView = activeView === 'front' ? FRONT_VIEW_MUSCLES : BACK_VIEW_MUSCLES;
  const imageSrc = activeView === 'front' ? frontImage : backImage;

  const boundsCache = useMemo(() => {
    const cache: Record<string, { x: number; y: number }> = {};
    for (const [key, data] of Object.entries(MUSCLE_PATHS)) {
      const path = pathOverrides[key]?.path || data.path;
      const bounds = getPathBounds(path);
      cache[key] = { x: bounds.cx, y: bounds.cy };
    }
    return cache;
  }, [pathOverrides]);

  const vbW = viewBox.width / zoom;
  const vbH = viewBox.height / zoom;
  const vbX = (viewBox.width - vbW) / 2 + panOffset.x;
  const vbY = (viewBox.height - vbH) / 2 + panOffset.y;
  const effectiveViewBox = `${vbX} ${vbY} ${vbW} ${vbH}`;

  // ---- Helpers ----
  const getTransform = useCallback(
    (muscle: string): MuscleTransform => transforms[muscle] || { ...DEFAULT_TRANSFORM },
    [transforms],
  );

  const getEffectivePath = useCallback(
    (muscle: string) => pathOverrides[muscle]?.path || MUSCLE_PATHS[muscle as MuscleGroup].path,
    [pathOverrides],
  );

  const getEffectiveFibers = useCallback(
    (muscle: string) => pathOverrides[muscle]?.fiberPaths || MUSCLE_PATHS[muscle as MuscleGroup].fiberPaths || [],
    [pathOverrides],
  );

  const pushHistory = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-100), JSON.stringify({ transforms, pathOverrides })]);
    setRedoStack([]);
  }, [transforms, pathOverrides]);

  // ---- Persistence ----
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ transforms, pathOverrides }));
  }, [transforms, pathOverrides]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        setUndoStack((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          setRedoStack((r) => [...r, JSON.stringify({ transforms, pathOverrides })]);
          const state: EditorPersist = JSON.parse(last);
          setTransforms(state.transforms || {});
          setPathOverrides(state.pathOverrides || {});
          return prev.slice(0, -1);
        });
      }
      if (e.ctrlKey && ((e.key === 'Z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        setRedoStack((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          setUndoStack((u) => [...u, JSON.stringify({ transforms, pathOverrides })]);
          const state: EditorPersist = JSON.parse(last);
          setTransforms(state.transforms || {});
          setPathOverrides(state.pathOverrides || {});
          return prev.slice(0, -1);
        });
      }
      // Escape exits edit points mode
      if (e.key === 'Escape' && editMode === 'points') {
        setEditMode('move');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [transforms, pathOverrides, editMode]);

  // Deselect or exit edit mode when switching views
  useEffect(() => {
    if (selectedMuscle) {
      const data = MUSCLE_PATHS[selectedMuscle];
      if (data.view !== activeView) {
        setSelectedMuscle(null);
        setEditMode('move');
      }
    }
  }, [activeView, selectedMuscle]);

  // Exit edit mode when deselecting
  useEffect(() => {
    if (!selectedMuscle && editMode === 'points') setEditMode('move');
  }, [selectedMuscle, editMode]);

  // ---- SVG coordinate conversion ----
  const screenToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  // ---- Enter edit points mode ----
  const enterPointsMode = useCallback(() => {
    if (!selectedMuscle) return;
    const muscle = selectedMuscle;
    const t = getTransform(muscle);
    const center = boundsCache[muscle];
    const hasTransform = t.tx !== 0 || t.ty !== 0 || t.sx !== 1 || t.sy !== 1 || t.rotate !== 0;

    if (hasTransform) {
      pushHistory();
      const currentPath = getEffectivePath(muscle);
      const currentFibers = getEffectiveFibers(muscle);

      const bakedPath = applyTransformToPath(currentPath, t, center);
      const bakedFibers = currentFibers.map((f) => applyTransformToPath(f, t, center).trim());

      setPathOverrides((prev) => ({
        ...prev,
        [muscle]: { path: bakedPath, fiberPaths: bakedFibers },
      }));

      // Reset transform, but transform the label position too
      const origLabel = MUSCLE_PATHS[muscle].labelPosition;
      const labelPt = transformPoint(
        origLabel.x + t.labelDx,
        origLabel.y + t.labelDy,
        { ...t, labelDx: 0, labelDy: 0 },
        center,
      );
      setTransforms((prev) => ({
        ...prev,
        [muscle]: {
          ...DEFAULT_TRANSFORM,
          labelDx: Math.round(labelPt.x - origLabel.x),
          labelDy: Math.round(labelPt.y - origLabel.y),
        },
      }));
    } else if (!pathOverrides[muscle]) {
      // No transform, no override yet — create override from original
      const data = MUSCLE_PATHS[muscle];
      setPathOverrides((prev) => ({
        ...prev,
        [muscle]: { path: data.path, fiberPaths: data.fiberPaths || [] },
      }));
    }

    setEditMode('points');
  }, [selectedMuscle, getTransform, boundsCache, getEffectivePath, getEffectiveFibers, pushHistory, pathOverrides]);

  // ---- Control point drag ----
  const handlePointMouseDown = useCallback(
    (e: React.MouseEvent, cmdIdx: number, coordIdx: number) => {
      e.preventDefault();
      e.stopPropagation();
      if (!selectedMuscle) return;
      pushHistory();
      setDraggingPointIdx({ cmdIdx, coordIdx });
      const svgPt = screenToSvg(e.clientX, e.clientY);
      const commands = parsePath(getEffectivePath(selectedMuscle));
      pointDragStartRef.current = {
        svgX: svgPt.x,
        svgY: svgPt.y,
        origX: commands[cmdIdx].coords[coordIdx],
        origY: commands[cmdIdx].coords[coordIdx + 1],
      };
    },
    [selectedMuscle, screenToSvg, getEffectivePath, pushHistory],
  );

  // ---- Muscle drag (move mode) ----
  const handleMuscleMouseDown = useCallback(
    (e: React.MouseEvent, muscle: MuscleGroup) => {
      if (e.button !== 0 || e.altKey) return;
      e.preventDefault();
      e.stopPropagation();

      // If clicking a different muscle, select it and exit points mode
      if (muscle !== selectedMuscle) {
        setSelectedMuscle(muscle);
        setEditMode('move');
        return;
      }

      // In points mode, clicking the path body does nothing (points handle reshaping)
      if (editMode === 'points') return;

      setIsDragging(true);
      pushHistory();
      const svgPt = screenToSvg(e.clientX, e.clientY);
      const t = getTransform(muscle);
      dragStartRef.current = { svgX: svgPt.x, svgY: svgPt.y, tx: t.tx, ty: t.ty };
    },
    [screenToSvg, getTransform, pushHistory, selectedMuscle, editMode],
  );

  // ---- Mouse move (drag muscle, drag point, or pan) ----
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Point dragging
      if (draggingPointIdx && selectedMuscle) {
        const svgPt = screenToSvg(e.clientX, e.clientY);
        const commands = parsePath(getEffectivePath(selectedMuscle));
        const { cmdIdx, coordIdx } = draggingPointIdx;

        let newX = svgPt.x;
        let newY = svgPt.y;
        if (e.shiftKey) {
          const dx = Math.abs(svgPt.x - pointDragStartRef.current.svgX);
          const dy = Math.abs(svgPt.y - pointDragStartRef.current.svgY);
          if (dx > dy) newY = pointDragStartRef.current.origY;
          else newX = pointDragStartRef.current.origX;
        }

        commands[cmdIdx].coords[coordIdx] = Math.round(newX * 10) / 10;
        commands[cmdIdx].coords[coordIdx + 1] = Math.round(newY * 10) / 10;
        const newPath = serializePath(commands);

        setPathOverrides((prev) => ({
          ...prev,
          [selectedMuscle]: {
            path: newPath,
            fiberPaths: prev[selectedMuscle]?.fiberPaths || MUSCLE_PATHS[selectedMuscle].fiberPaths || [],
          },
        }));
        return;
      }

      // Whole-muscle dragging
      if (isDragging && selectedMuscle) {
        const svgPt = screenToSvg(e.clientX, e.clientY);
        let newTx = dragStartRef.current.tx + svgPt.x - dragStartRef.current.svgX;
        let newTy = dragStartRef.current.ty + svgPt.y - dragStartRef.current.svgY;
        if (e.shiftKey) {
          const dx = Math.abs(svgPt.x - dragStartRef.current.svgX);
          const dy = Math.abs(svgPt.y - dragStartRef.current.svgY);
          if (dx > dy) newTy = dragStartRef.current.ty;
          else newTx = dragStartRef.current.tx;
        }
        setTransforms((prev) => ({
          ...prev,
          [selectedMuscle]: {
            ...getTransform(selectedMuscle),
            tx: Math.round(newTx * 10) / 10,
            ty: Math.round(newTy * 10) / 10,
          },
        }));
        return;
      }

      // Panning
      if (isPanning) {
        const dx = (e.clientX - panStartRef.current.clientX) * panStartRef.current.scaleX;
        const dy = (e.clientY - panStartRef.current.clientY) * panStartRef.current.scaleY;
        setPanOffset({
          x: panStartRef.current.px - dx,
          y: panStartRef.current.py - dy,
        });
      }
    },
    [draggingPointIdx, isDragging, isPanning, selectedMuscle, screenToSvg, getTransform, getEffectivePath],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsPanning(false);
    setDraggingPointIdx(null);
  }, []);

  // ---- Pan (middle click or alt+drag) ----
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        panStartRef.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          px: panOffset.x,
          py: panOffset.y,
          scaleX: vbW / rect.width,
          scaleY: vbH / rect.height,
        };
      }
      // Click on empty canvas area deselects
      if (e.button === 0 && !e.altKey && (e.target === svgRef.current || (e.target as SVGElement).tagName === 'image')) {
        setSelectedMuscle(null);
        setEditMode('move');
      }
    },
    [panOffset, vbW, vbH],
  );

  // ---- Zoom ----
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    setZoom((prev) => Math.max(0.3, Math.min(8, prev * factor)));
  }, []);

  // ---- Transform update helpers ----
  const updateField = useCallback(
    (field: keyof MuscleTransform, value: number) => {
      if (!selectedMuscle) return;
      setTransforms((prev) => ({
        ...prev,
        [selectedMuscle]: { ...getTransform(selectedMuscle), [field]: value },
      }));
    },
    [selectedMuscle, getTransform],
  );

  const resetMuscle = useCallback(
    (muscle: string) => {
      pushHistory();
      setTransforms((prev) => {
        const next = { ...prev };
        delete next[muscle];
        return next;
      });
      setPathOverrides((prev) => {
        const next = { ...prev };
        delete next[muscle];
        return next;
      });
      if (editMode === 'points') setEditMode('move');
    },
    [pushHistory, editMode],
  );

  const resetAll = useCallback(() => {
    pushHistory();
    setTransforms({});
    setPathOverrides({});
    setEditMode('move');
  }, [pushHistory]);

  // ---- Export ----
  const buildExport = useCallback(() => {
    const lines: string[] = [];
    lines.push('export const MUSCLE_PATHS: Record<MuscleGroup, MusclePathData> = {');

    for (const muscle of ALL_MUSCLES) {
      const data = MUSCLE_PATHS[muscle];
      const t = getTransform(muscle);
      const center = boundsCache[muscle];
      const hasTransform = t.tx !== 0 || t.ty !== 0 || t.sx !== 1 || t.sy !== 1 || t.rotate !== 0;

      let basePath = pathOverrides[muscle]?.path || data.path;
      let baseFibers = pathOverrides[muscle]?.fiberPaths || data.fiberPaths || [];

      let finalPath = basePath;
      let finalFibers = [...baseFibers];
      let labelX = data.labelPosition.x + t.labelDx;
      let labelY = data.labelPosition.y + t.labelDy;

      if (hasTransform && center) {
        finalPath = applyTransformToPath(basePath, t, center);
        finalFibers = baseFibers.map((f) => applyTransformToPath(f, t, center).trim());
        const labelPt = transformPoint(labelX, labelY, { ...t, labelDx: 0, labelDy: 0 }, center);
        labelX = labelPt.x;
        labelY = labelPt.y;
      }

      lines.push(`  // ${MUSCLE_GROUP_NAMES[muscle]}`);
      lines.push(`  ${muscle}: {`);
      lines.push(`    view: '${data.view}',`);
      lines.push(`    path: \`${finalPath}\`,`);
      if (finalFibers.length > 0) {
        lines.push(`    fiberPaths: [`);
        for (const f of finalFibers) {
          lines.push(`      '${f}',`);
        }
        lines.push(`    ],`);
      }
      lines.push(`    labelPosition: { x: ${Math.round(labelX)}, y: ${Math.round(labelY)} },`);
      lines.push(`  },`);
      lines.push('');
    }

    lines.push('};');
    return lines.join('\n');
  }, [getTransform, boundsCache, pathOverrides]);

  const handleExport = useCallback(() => {
    const output = buildExport();
    navigator.clipboard.writeText(output).then(
      () => alert('Exported MUSCLE_PATHS to clipboard!'),
      () => alert('Failed to copy. Check console.'),
    );
  }, [buildExport]);

  const handleCopyMuscle = useCallback(() => {
    if (!selectedMuscle) return;
    const data = MUSCLE_PATHS[selectedMuscle];
    const t = getTransform(selectedMuscle);
    const center = boundsCache[selectedMuscle];
    const hasTransform = t.tx !== 0 || t.ty !== 0 || t.sx !== 1 || t.sy !== 1 || t.rotate !== 0;

    let basePath = pathOverrides[selectedMuscle]?.path || data.path;
    let baseFibers = pathOverrides[selectedMuscle]?.fiberPaths || data.fiberPaths || [];
    let finalPath = basePath;
    let finalFibers = [...baseFibers];
    let labelX = data.labelPosition.x + t.labelDx;
    let labelY = data.labelPosition.y + t.labelDy;

    if (hasTransform && center) {
      finalPath = applyTransformToPath(basePath, t, center);
      finalFibers = baseFibers.map((f) => applyTransformToPath(f, t, center).trim());
      const labelPt = transformPoint(labelX, labelY, { ...t, labelDx: 0, labelDy: 0 }, center);
      labelX = labelPt.x;
      labelY = labelPt.y;
    }

    const lines = [
      `${selectedMuscle}: {`,
      `  view: '${data.view}',`,
      `  path: \`${finalPath}\`,`,
    ];
    if (finalFibers.length > 0) {
      lines.push(`  fiberPaths: [`);
      finalFibers.forEach((f) => lines.push(`    '${f}',`));
      lines.push(`  ],`);
    }
    lines.push(`  labelPosition: { x: ${Math.round(labelX)}, y: ${Math.round(labelY)} },`);
    lines.push(`},`);
    navigator.clipboard.writeText(lines.join('\n'));
  }, [selectedMuscle, getTransform, boundsCache, pathOverrides]);

  // ---- Render helpers ----
  const selectedTransform = selectedMuscle ? getTransform(selectedMuscle) : null;

  const modifiedCount = useMemo(() => {
    const modified = new Set<string>();
    for (const k of Object.keys(transforms)) {
      const t = transforms[k];
      if (t.tx !== 0 || t.ty !== 0 || t.sx !== 1 || t.sy !== 1 || t.rotate !== 0 || t.labelDx !== 0 || t.labelDy !== 0)
        modified.add(k);
    }
    for (const k of Object.keys(pathOverrides)) modified.add(k);
    return modified.size;
  }, [transforms, pathOverrides]);

  const hasAnyChanges = modifiedCount > 0;

  // Parse selected muscle commands for control point rendering
  const selectedCommands = useMemo(() => {
    if (!selectedMuscle || editMode !== 'points') return null;
    return parsePath(getEffectivePath(selectedMuscle));
  }, [selectedMuscle, editMode, getEffectivePath]);

  return (
    <div
      className="h-screen flex flex-col bg-gray-900 text-gray-100 select-none overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ===================== TOOLBAR ===================== */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <h1 className="text-sm font-bold text-blue-400 mr-2">Muscle Editor</h1>

        {/* View toggle */}
        <div className="flex rounded bg-gray-700">
          <button
            onClick={() => setActiveView('front')}
            className={`px-3 py-1 text-xs font-medium rounded-l transition-colors ${
              activeView === 'front' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'
            }`}
          >
            Front
          </button>
          <button
            onClick={() => setActiveView('back')}
            className={`px-3 py-1 text-xs font-medium rounded-r transition-colors ${
              activeView === 'back' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'
            }`}
          >
            Back
          </button>
        </div>

        <div className="w-px h-5 bg-gray-600" />

        <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
          <input type="checkbox" checked={showImage} onChange={(e) => setShowImage(e.target.checked)} className="accent-blue-500" />
          Image
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} className="accent-blue-500" />
          Grid
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
          <input type="checkbox" checked={showBodyOutline} onChange={(e) => setShowBodyOutline(e.target.checked)} className="accent-blue-500" />
          Outline
        </label>

        <div className="w-px h-5 bg-gray-600" />

        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span>Opacity</span>
          <input
            type="range" min={0} max={1} step={0.05} value={globalOpacity}
            onChange={(e) => setGlobalOpacity(parseFloat(e.target.value))}
            className="w-16 h-1 accent-blue-500"
          />
          <span className="w-6 text-right font-mono text-gray-300">{Math.round(globalOpacity * 100)}</span>
        </div>

        <div className="w-px h-5 bg-gray-600" />

        <span className="text-xs text-gray-400 font-mono">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}
          className="text-xs text-gray-400 hover:text-white px-1"
          title="Reset zoom & pan"
        >
          Fit
        </button>

        <div className="flex-1" />

        {editMode === 'points' && (
          <span className="text-xs text-purple-400 font-medium">EDIT POINTS</span>
        )}
        {modifiedCount > 0 && (
          <span className="text-xs text-yellow-400">{modifiedCount} modified</span>
        )}
        <span className="text-xs text-gray-500">
          Undo: {undoStack.length} | Redo: {redoStack.length}
        </span>

        <div className="w-px h-5 bg-gray-600" />

        <button
          onClick={handleExport}
          className="px-3 py-1 text-xs font-medium bg-green-700 hover:bg-green-600 rounded transition-colors"
        >
          Export JSON
        </button>
        <button
          onClick={resetAll}
          disabled={!hasAnyChanges}
          className="px-3 py-1 text-xs font-medium bg-red-800 hover:bg-red-700 rounded transition-colors disabled:opacity-30"
        >
          Reset All
        </button>
      </div>

      {/* ===================== MAIN CONTENT ===================== */}
      <div className="flex flex-1 min-h-0">
        {/* ---- CANVAS ---- */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center overflow-hidden bg-gray-950"
          style={{ cursor: editMode === 'points' ? 'default' : 'crosshair' }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <svg
            ref={svgRef}
            viewBox={effectiveViewBox}
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Background image */}
            {showImage && (
              <image href={imageSrc} x={0} y={0} width={viewBox.width} height={viewBox.height} />
            )}

            {/* Body outline */}
            {showBodyOutline && (
              <path
                d={BODY_FILL_PATHS[activeView]}
                fill="none"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={1.5}
                className="pointer-events-none"
              />
            )}

            {/* Grid */}
            {showGrid && (
              <g className="pointer-events-none" opacity={0.15}>
                {Array.from({ length: Math.ceil(viewBox.width / 20) + 1 }, (_, i) => (
                  <line key={`gv${i}`} x1={i * 20} y1={0} x2={i * 20} y2={viewBox.height} stroke="#888" strokeWidth={i % 5 === 0 ? 1 : 0.5} />
                ))}
                {Array.from({ length: Math.ceil(viewBox.height / 20) + 1 }, (_, i) => (
                  <line key={`gh${i}`} x1={0} y1={i * 20} x2={viewBox.width} y2={i * 20} stroke="#888" strokeWidth={i % 5 === 0 ? 1 : 0.5} />
                ))}
                <line x1={viewBox.width / 2} y1={0} x2={viewBox.width / 2} y2={viewBox.height} stroke="#F59E0B" strokeWidth={0.8} opacity={0.5} />
              </g>
            )}

            {/* Muscle overlays */}
            {musclesForView.map((muscle) => {
              const data = MUSCLE_PATHS[muscle];
              const t = getTransform(muscle);
              const center = boundsCache[muscle];
              const isSelected = selectedMuscle === muscle;
              const svgTransform = getSvgTransformString(t, center);
              const effectivePath = getEffectivePath(muscle);
              const effectiveFibers = getEffectiveFibers(muscle);

              return (
                <g key={muscle} transform={svgTransform || undefined}>
                  {/* Main muscle path */}
                  <path
                    d={effectivePath}
                    fill={isSelected ? 'rgba(59, 130, 246, 0.45)' : 'rgba(239, 68, 68, 0.3)'}
                    fillRule="evenodd"
                    stroke={isSelected ? '#60A5FA' : 'rgba(239, 68, 68, 0.6)'}
                    strokeWidth={isSelected ? 2 : 1}
                    strokeLinejoin="round"
                    opacity={globalOpacity}
                    style={{ cursor: editMode === 'points' && isSelected ? 'default' : 'grab' }}
                    onMouseDown={(e) => handleMuscleMouseDown(e, muscle)}
                  />

                  {/* Fiber paths */}
                  {effectiveFibers.map((fp, fi) => (
                    <path
                      key={fi}
                      d={fp}
                      fill="none"
                      stroke={isSelected ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.15)'}
                      strokeWidth={0.8}
                      className="pointer-events-none"
                      opacity={globalOpacity}
                    />
                  ))}

                  {/* Label marker */}
                  <circle
                    cx={data.labelPosition.x + t.labelDx}
                    cy={data.labelPosition.y + t.labelDy}
                    r={isSelected ? 3 : 2}
                    fill={isSelected ? '#60A5FA' : 'rgba(255,255,255,0.5)'}
                    className="pointer-events-none"
                  />
                  <text
                    x={data.labelPosition.x + t.labelDx}
                    y={data.labelPosition.y + t.labelDy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={isSelected ? 11 : 9}
                    fontWeight="bold"
                    fill="white"
                    stroke="rgba(0,0,0,0.6)"
                    strokeWidth={0.4}
                    className="pointer-events-none"
                  >
                    88
                  </text>

                  {/* ---- CONTROL POINTS (edit points mode) ---- */}
                  {isSelected && editMode === 'points' && selectedCommands && (
                    <g>
                      {selectedCommands.map((cmd, cmdIdx) => {
                        const upper = cmd.type.toUpperCase();
                        if (upper === 'Z') return null;

                        // Gather point info for this command
                        type Pt = { x: number; y: number; ci: number; kind: 'end' | 'ctrl' };
                        const pts: Pt[] = [];

                        if (upper === 'C') {
                          pts.push({ x: cmd.coords[0], y: cmd.coords[1], ci: 0, kind: 'ctrl' });
                          pts.push({ x: cmd.coords[2], y: cmd.coords[3], ci: 2, kind: 'ctrl' });
                          pts.push({ x: cmd.coords[4], y: cmd.coords[5], ci: 4, kind: 'end' });
                        } else if (upper === 'Q') {
                          pts.push({ x: cmd.coords[0], y: cmd.coords[1], ci: 0, kind: 'ctrl' });
                          pts.push({ x: cmd.coords[2], y: cmd.coords[3], ci: 2, kind: 'end' });
                        } else if (upper === 'M' || upper === 'L') {
                          pts.push({ x: cmd.coords[0], y: cmd.coords[1], ci: 0, kind: 'end' });
                        }

                        const prev = getPrevEndpoint(selectedCommands, cmdIdx);

                        return (
                          <g key={`cp-${cmdIdx}`}>
                            {/* Bezier tangent lines */}
                            {upper === 'C' && (
                              <>
                                <line
                                  x1={prev.x} y1={prev.y}
                                  x2={cmd.coords[0]} y2={cmd.coords[1]}
                                  stroke="rgba(251,191,36,0.5)" strokeWidth={0.7}
                                  strokeDasharray="2 2"
                                  className="pointer-events-none"
                                />
                                <line
                                  x1={cmd.coords[2]} y1={cmd.coords[3]}
                                  x2={cmd.coords[4]} y2={cmd.coords[5]}
                                  stroke="rgba(251,191,36,0.5)" strokeWidth={0.7}
                                  strokeDasharray="2 2"
                                  className="pointer-events-none"
                                />
                              </>
                            )}
                            {upper === 'Q' && (
                              <>
                                <line
                                  x1={prev.x} y1={prev.y}
                                  x2={cmd.coords[0]} y2={cmd.coords[1]}
                                  stroke="rgba(251,191,36,0.5)" strokeWidth={0.7}
                                  strokeDasharray="2 2"
                                  className="pointer-events-none"
                                />
                                <line
                                  x1={cmd.coords[0]} y1={cmd.coords[1]}
                                  x2={cmd.coords[2]} y2={cmd.coords[3]}
                                  stroke="rgba(251,191,36,0.5)" strokeWidth={0.7}
                                  strokeDasharray="2 2"
                                  className="pointer-events-none"
                                />
                              </>
                            )}

                            {/* Handles */}
                            {pts.map((pt) => (
                              <React.Fragment key={`${cmdIdx}-${pt.ci}`}>
                                {/* Larger invisible hit area */}
                                <circle
                                  cx={pt.x} cy={pt.y}
                                  r={8}
                                  fill="transparent"
                                  style={{ cursor: 'grab' }}
                                  onMouseDown={(e) => handlePointMouseDown(e, cmdIdx, pt.ci)}
                                />
                                {/* Visible handle */}
                                {pt.kind === 'end' ? (
                                  <circle
                                    cx={pt.x} cy={pt.y}
                                    r={4}
                                    fill="#3B82F6"
                                    stroke="white"
                                    strokeWidth={1.2}
                                    className="pointer-events-none"
                                  />
                                ) : (
                                  <rect
                                    x={pt.x - 3} y={pt.y - 3}
                                    width={6} height={6}
                                    fill="#F59E0B"
                                    stroke="white"
                                    strokeWidth={1}
                                    className="pointer-events-none"
                                  />
                                )}
                              </React.Fragment>
                            ))}
                          </g>
                        );
                      })}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* ---- SIDE PANEL ---- */}
        <div className="w-80 flex-shrink-0 bg-gray-800 border-l border-gray-700 overflow-y-auto">
          {/* Muscle list */}
          <div className="p-3 border-b border-gray-700">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {activeView === 'front' ? 'Front' : 'Back'} Muscles ({musclesForView.length})
            </h2>
            <div className="flex flex-col gap-0.5">
              {musclesForView.map((muscle) => {
                const isSelected = selectedMuscle === muscle;
                const t = transforms[muscle];
                const hasOverride = !!pathOverrides[muscle];
                const isModified =
                  hasOverride ||
                  (t &&
                    (t.tx !== 0 || t.ty !== 0 || t.sx !== 1 || t.sy !== 1 ||
                      t.rotate !== 0 || t.labelDx !== 0 || t.labelDy !== 0));

                return (
                  <button
                    key={muscle}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedMuscle(null);
                        setEditMode('move');
                      } else {
                        setSelectedMuscle(muscle);
                        setEditMode('move');
                      }
                    }}
                    className={`flex items-center gap-2 px-2 py-1 rounded text-xs text-left transition-colors ${
                      isSelected
                        ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-500/50'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: hasOverride
                          ? '#A855F7'
                          : isModified
                          ? '#F59E0B'
                          : isSelected
                          ? '#60A5FA'
                          : '#6B7280',
                      }}
                    />
                    <span className="flex-1 truncate">{MUSCLE_GROUP_NAMES[muscle]}</span>
                    <span className="text-gray-500 font-mono text-[10px]">{muscle}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Edit mode toggle */}
          {selectedMuscle && (
            <div className="p-3 border-b border-gray-700">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Edit Mode
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditMode('move')}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                    editMode === 'move'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Move / Scale
                </button>
                <button
                  onClick={enterPointsMode}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                    editMode === 'points'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Edit Points
                </button>
              </div>
              {editMode === 'points' && selectedCommands && (
                <div className="mt-2 text-[10px] text-purple-300">
                  {selectedCommands.length} path commands &middot; Drag handles to reshape
                </div>
              )}
            </div>
          )}

          {/* Transform controls (move mode) */}
          {selectedMuscle && selectedTransform && editMode === 'move' && (
            <div className="p-3 border-b border-gray-700">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Transform: {MUSCLE_GROUP_NAMES[selectedMuscle]}
              </h2>
              <div className="flex flex-col gap-2.5">
                <Slider label="Translate X" value={selectedTransform.tx} min={-200} max={200} step={0.5} onChange={(v) => updateField('tx', v)} onCommit={pushHistory} />
                <Slider label="Translate Y" value={selectedTransform.ty} min={-200} max={200} step={0.5} onChange={(v) => updateField('ty', v)} onCommit={pushHistory} />
                <Slider label="Scale X" value={selectedTransform.sx} min={0.1} max={3} step={0.01} onChange={(v) => updateField('sx', v)} onCommit={pushHistory} />
                <Slider label="Scale Y" value={selectedTransform.sy} min={0.1} max={3} step={0.01} onChange={(v) => updateField('sy', v)} onCommit={pushHistory} />
                <Slider label="Rotate" value={selectedTransform.rotate} min={-180} max={180} step={0.5} onChange={(v) => updateField('rotate', v)} onCommit={pushHistory} />
              </div>
            </div>
          )}

          {/* Label position */}
          {selectedMuscle && selectedTransform && (
            <div className="p-3 border-b border-gray-700">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Label Position
              </h2>
              <div className="flex flex-col gap-2.5">
                <Slider label="Label Offset X" value={selectedTransform.labelDx} min={-100} max={100} step={1} onChange={(v) => updateField('labelDx', v)} onCommit={pushHistory} />
                <Slider label="Label Offset Y" value={selectedTransform.labelDy} min={-100} max={100} step={1} onChange={(v) => updateField('labelDy', v)} onCommit={pushHistory} />
              </div>
              <div className="mt-2 text-[10px] text-gray-500">
                Original: ({MUSCLE_PATHS[selectedMuscle].labelPosition.x},{' '}
                {MUSCLE_PATHS[selectedMuscle].labelPosition.y})
              </div>
            </div>
          )}

          {/* Actions */}
          {selectedMuscle && (
            <div className="p-3 border-b border-gray-700 flex flex-col gap-2">
              <button
                onClick={handleCopyMuscle}
                className="w-full px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Copy Path Data
              </button>
              <button
                onClick={() => resetMuscle(selectedMuscle)}
                className="w-full px-3 py-1.5 text-xs font-medium bg-red-900/50 hover:bg-red-800/50 text-red-300 rounded transition-colors"
              >
                Reset This Muscle
              </button>
            </div>
          )}

          {/* Help */}
          <div className="p-3 text-[10px] text-gray-600 leading-relaxed">
            <p className="mb-1"><strong className="text-gray-400">Click</strong> muscle to select. <strong className="text-gray-400">Drag</strong> to reposition.</p>
            <p className="mb-1"><strong className="text-gray-400">Edit Points</strong> mode: drag blue circles (endpoints) and orange squares (bezier handles) to reshape.</p>
            <p className="mb-1"><strong className="text-gray-400">Shift+drag</strong> constrains to axis.</p>
            <p className="mb-1"><strong className="text-gray-400">Scroll</strong> to zoom. <strong className="text-gray-400">Alt+drag</strong> to pan.</p>
            <p><strong className="text-gray-400">Ctrl+Z</strong> undo, <strong className="text-gray-400">Ctrl+Shift+Z</strong> redo, <strong className="text-gray-400">Esc</strong> exits edit points.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DevMuscleEditor;
