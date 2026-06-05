// ============================================================
// BoxVisualizer — Realistic 3D box packing visualization
// Each item rendered as a proper 3D cube with 6 faces
// Uses shelf-based bin packing for logical arrangement
// ============================================================

import { useState, useRef, useCallback, useMemo } from 'react';
import { RotateCcw, BoxSelect, Play, Pause, Eye, ZoomIn, ZoomOut } from 'lucide-react';

interface BoxItem {
  name: string;
  code: string;
  type: string;
  assignedQty: number;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
}

interface PackedItem {
  item: BoxItem;
  x: number; y: number; z: number;
  l: number; w: number; h: number;
  color: string;
  index: number;
  qtyIndex: number;
}

interface BoxVisualizerProps {
  boxLength: number;
  boxWidth: number;
  boxHeight: number;
  items: BoxItem[];
  boxNum?: string;
  showStacking?: boolean;
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#A855F7', '#E11D48', '#0EA5E9', '#22C55E',
];

function getColor(i: number) { return COLORS[i % COLORS.length]; }

function normalizeDim(v: number): number {
  if (!v || v <= 0) return 15;
  if (v > 1000) return v / 10; // mm → cm
  if (v < 1) return v * 100; // m → cm
  return v;
}

// ─── Shelf-based 3D Bin Packing ───
function packItems(items: BoxItem[], bl: number, bw: number, bh: number): PackedItem[] {
  const packed: PackedItem[] = [];

  // Expand items into individual units (up to a reasonable limit)
  const unitItems: { item: BoxItem; idx: number; l: number; w: number; h: number }[] = [];

  items.forEach((item, idx) => {
    const l = Math.max(3, Math.min(normalizeDim(item.length || 30), bl * 0.7));
    const w = Math.max(2, Math.min(normalizeDim(item.width || 20), bw * 0.7));
    const h = Math.max(2, Math.min(normalizeDim(item.height || 10), bh * 0.7));
    const qty = Math.min(item.assignedQty || 1, 50);
    for (let q = 0; q < qty; q++) {
      unitItems.push({ item, idx, l, w, h });
    }
  });

  // Sort by height (tallest first) — shelf packing strategy
  unitItems.sort((a, b) => b.h - a.h);

  // Shelves: each shelf has a base Z, current X, max height used
  const shelves: { z: number; currentX: number; currentY: number; rowHeight: number; maxH: number }[] = [];

  unitItems.forEach(({ item, idx, l, w, h }) => {
    const color = getColor(idx);
    let placed = false;

    // Try to place on existing shelves
    for (const shelf of shelves) {
      // Check if fits in current position on this shelf
      if (shelf.currentX + l <= bl) {
        // Same row
        if (shelf.currentY + w <= bw) {
          packed.push({
            item, x: shelf.currentX, y: shelf.currentY, z: shelf.z,
            l, w, h, color, index: idx, qtyIndex: packed.length,
          });
          shelf.currentX += l;
          shelf.rowHeight = Math.max(shelf.rowHeight, h);
          placed = true;
          break;
        }
      } else {
        // Start new row on same shelf
        const newRowY = shelf.currentY + shelf.rowHeight;
        if (newRowY + w <= bw && shelf.z + h <= bh) {
          packed.push({
            item, x: 0, y: newRowY, z: shelf.z,
            l, w, h, color, index: idx, qtyIndex: packed.length,
          });
          shelf.currentX = l;
          shelf.currentY = newRowY;
          shelf.rowHeight = h;
          placed = true;
          break;
        }
      }
    }

    // Create new shelf if needed
    if (!placed) {
      const newZ = shelves.length === 0 ? 0 : shelves[shelves.length - 1].z + shelves[shelves.length - 1].maxH;
      if (newZ + h <= bh) {
        packed.push({
          item, x: 0, y: 0, z: newZ,
          l, w, h, color, index: idx, qtyIndex: packed.length,
        });
        shelves.push({ z: newZ, currentX: l, currentY: 0, rowHeight: h, maxH: h });
        placed = true;
      }
    }

    // Fallback: stack with offset
    if (!placed) {
      const lastShelf = shelves[shelves.length - 1];
      const fallbackZ = lastShelf ? lastShelf.z + lastShelf.maxH : 0;
      if (fallbackZ < bh) {
        packed.push({
          item, x: 0, y: 0, z: Math.min(fallbackZ, bh - h),
          l, w, h, color, index: idx, qtyIndex: packed.length,
        });
      }
    }
  });

  return packed;
}

// ─── A single 3D cube with 6 faces ───
function ItemCube({ p, s, bl, bw, bh, isHovered, onHover, onLeave }: {
  p: PackedItem; s: number; bl: number; bw: number; bh: number;
  isHovered: boolean; onHover: () => void; onLeave: () => void;
}) {
  const color = isHovered ? '#FBBF24' : p.color;
  const faceOpacity = isHovered ? 'E0' : 'B0';
  const sideOpacity = isHovered ? '90' : '60';
  const topOpacity = isHovered ? '70' : '50';

  // Convert packing coordinates to CSS 3D transform
  // Origin is center of the container
  const tx = (p.x - bl / 2 + p.l / 2) * s;
  const ty = (p.z - bh / 2 + p.h / 2) * s * -1; // flip Y (z in packing → y in CSS)
  const tz = (p.y - bw / 2 + p.w / 2) * s;

  const wPx = p.l * s;
  const hPx = p.h * s;
  const dPx = p.w * s;

  return (
    <div
      className="absolute"
      style={{
        width: wPx, height: hPx,
        transform: `translateX(${tx}px) translateY(${ty}px) translateZ(${tz}px)`,
        transformStyle: 'preserve-3d',
        cursor: 'pointer',
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* FRONT face */}
      <div style={{
        position: 'absolute', width: wPx, height: hPx,
        background: `${color}${faceOpacity}`,
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: 2,
        backfaceVisibility: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {wPx > 20 && hPx > 12 && (
          <span style={{
            fontSize: Math.max(5, Math.min(8, wPx * 0.15)),
            fontWeight: 'bold', color: 'white',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            textAlign: 'center', lineHeight: 1.2,
            padding: '0 2px', overflow: 'hidden',
          }}>
            {p.item.code.slice(0, 6)}
          </span>
        )}
      </div>
      {/* BACK face */}
      <div style={{
        position: 'absolute', width: wPx, height: hPx,
        background: `${color}${sideOpacity}`,
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 2,
        transform: `translateZ(-${dPx}px) rotateY(180deg)`,
        backfaceVisibility: 'hidden',
      }} />
      {/* RIGHT face */}
      <div style={{
        position: 'absolute', width: dPx, height: hPx,
        background: `${color}${sideOpacity}`,
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 2,
        transform: `translateX(${wPx / 2}px) translateZ(-${dPx / 2}px) rotateY(90deg)`,
        backfaceVisibility: 'hidden',
      }} />
      {/* LEFT face */}
      <div style={{
        position: 'absolute', width: dPx, height: hPx,
        background: `${color}${sideOpacity}`,
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 2,
        transform: `translateX(-${wPx / 2}px) translateZ(-${dPx / 2}px) rotateY(-90deg)`,
        backfaceVisibility: 'hidden',
      }} />
      {/* TOP face */}
      <div style={{
        position: 'absolute', width: wPx, height: dPx,
        background: `${color}${topOpacity}`,
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 2,
        transform: `translateY(-${hPx / 2}px) translateZ(-${dPx / 2}px) rotateX(90deg)`,
        backfaceVisibility: 'hidden',
      }} />
      {/* BOTTOM face */}
      <div style={{
        position: 'absolute', width: wPx, height: dPx,
        background: `${color}30`,
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 2,
        transform: `translateY(${hPx / 2}px) translateZ(-${dPx / 2}px) rotateX(-90deg)`,
        backfaceVisibility: 'hidden',
      }} />
    </div>
  );
}

export default function BoxVisualizer({ boxLength, boxWidth, boxHeight, items, boxNum }: BoxVisualizerProps) {
  const [rotateX, setRotateX] = useState(-20);
  const [rotateY, setRotateY] = useState(35);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number>(-1);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const animRef = useRef<number>(0);
  const dragStart = useRef({ x: 0, y: 0, rotX: 0, rotY: 0 });

  const bl = Math.max(5, boxLength || 60);
  const bw = Math.max(5, boxWidth || 40);
  const bh = Math.max(5, boxHeight || 30);

  const maxDim = Math.max(bl, bw, bh);
  const baseScale = 200 / maxDim;
  const s = baseScale * zoom;

  const packedItems = useMemo(() => packItems(items, bl, bw, bh), [items, bl, bw, bh]);
  const hoveredItem = hoveredIdx >= 0 ? packedItems[hoveredIdx] : null;

  const totalQty = items.reduce((sum, i) => sum + (i.assignedQty || 1), 0);
  const placedQty = packedItems.length;
  const fillPercent = Math.round((placedQty / totalQty) * 100);

  // Auto-rotate
  const toggleAutoRotate = useCallback(() => {
    if (autoRotate) { setAutoRotate(false); cancelAnimationFrame(animRef.current); return; }
    setAutoRotate(true);
    const animate = () => { setRotateY(p => p + 0.3); animRef.current = requestAnimationFrame(animate); };
    animRef.current = requestAnimationFrame(animate);
  }, [autoRotate]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (autoRotate) { setAutoRotate(false); cancelAnimationFrame(animRef.current); }
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, rotX: rotateX, rotY: rotateY };
  }, [rotateX, rotateY, autoRotate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setRotateY(dragStart.current.rotY + dx * 0.5);
    setRotateX(Math.max(-90, Math.min(90, dragStart.current.rotX - dy * 0.5)));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const handleReset = () => { setRotateX(-20); setRotateY(35); setZoom(1); setAutoRotate(false); cancelAnimationFrame(animRef.current); };

  // Container dimensions in pixels
  const cw = bl * s;
  const ch = bh * s;
  const cd = bw * s;

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-bold text-gray-600 flex items-center gap-1">
            <BoxSelect className="w-3 h-3" /> {bl}×{bw}×{bh} سم
          </p>
          <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{totalQty} قطعة</span>
          <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">{items.length} صنف</span>
          <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">{placedQty}/{totalQty} موضوعة</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.min(2.5, z + 0.2))} className="p-1 hover:bg-gray-100 rounded text-gray-400" title="تكبير"><ZoomIn className="w-3 h-3" /></button>
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} className="p-1 hover:bg-gray-100 rounded text-gray-400" title="تصغير"><ZoomOut className="w-3 h-3" /></button>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          <button onClick={toggleAutoRotate} className={`p-1 rounded ${autoRotate ? 'bg-cyan-100 text-cyan-600' : 'hover:bg-gray-100 text-gray-400'}`} title="دوران تلقائي">
            {autoRotate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button onClick={handleReset} className="p-1 hover:bg-gray-100 rounded text-gray-400" title="إعادة"><RotateCcw className="w-3 h-3" /></button>
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 hover:bg-gray-100 rounded text-gray-400" title="إخفاء/إظهار"><Eye className="w-3 h-3" /></button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* 3D Scene */}
          <div
            className={`relative mx-auto select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{
              width: cw + 80,
              height: ch + 80,
              perspective: 1000,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className="absolute inset-0 flex items-center justify-center" style={{
              transformStyle: 'preserve-3d',
              transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            }}>
              {/* Container wireframe — 6 faces */}
              {/* Front */}
              <div style={{
                position: 'absolute', width: cw, height: ch,
                transform: `translateZ(${cd / 2}px)`,
                background: 'rgba(220,225,230,0.06)',
                border: '1px solid rgba(150,160,170,0.25)',
              }} />
              {/* Back */}
              <div style={{
                position: 'absolute', width: cw, height: ch,
                transform: `translateZ(-${cd / 2}px) rotateY(180deg)`,
                background: 'rgba(220,225,230,0.04)',
                border: '1px solid rgba(150,160,170,0.15)',
              }} />
              {/* Right */}
              <div style={{
                position: 'absolute', width: cd, height: ch,
                transform: `translateX(${cw / 2}px) rotateY(90deg)`,
                background: 'rgba(220,225,230,0.04)',
                border: '1px solid rgba(150,160,170,0.2)',
              }} />
              {/* Left */}
              <div style={{
                position: 'absolute', width: cd, height: ch,
                transform: `translateX(-${cw / 2}px) rotateY(-90deg)`,
                background: 'rgba(220,225,230,0.04)',
                border: '1px solid rgba(150,160,170,0.2)',
              }} />
              {/* Top */}
              <div style={{
                position: 'absolute', width: cw, height: cd,
                transform: `translateY(-${ch / 2}px) rotateX(90deg)`,
                background: 'rgba(220,225,230,0.03)',
                border: '1px solid rgba(150,160,170,0.15)',
              }} />
              {/* Bottom (floor) */}
              <div style={{
                position: 'absolute', width: cw, height: cd,
                transform: `translateY(${ch / 2}px) rotateX(-90deg)`,
                background: 'rgba(180,150,100,0.06)',
                border: '1px solid rgba(150,160,170,0.2)',
              }} />

              {/* Floor grid lines */}
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`gx${i}`} style={{
                  position: 'absolute',
                  width: 1, height: cd,
                  background: 'rgba(100,110,120,0.12)',
                  transform: `translateX(${(-cw / 2 + (cw / 6) * i)}px)`,
                }} />
              ))}
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`gy${i}`} style={{
                  position: 'absolute',
                  width: cw, height: 1,
                  background: 'rgba(100,110,120,0.12)',
                  transform: `translateZ(${cd / 2}px) translateY(${(-ch / 2 + (ch / 6) * i)}px)`,
                }} />
              ))}

              {/* Item cubes */}
              {packedItems.map((p, i) => (
                <ItemCube
                  key={i}
                  p={p}
                  s={s}
                  bl={bl}
                  bw={bw}
                  bh={bh}
                  isHovered={hoveredIdx === i}
                  onHover={() => setHoveredIdx(i)}
                  onLeave={() => setHoveredIdx(-1)}
                />
              ))}

              {/* Box number label */}
              {boxNum && (
                <div style={{
                  position: 'absolute',
                  transform: `translateY(-${ch / 2 + 24}px)`,
                }}>
                  <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full shadow-md">
                    {boxNum}
                  </span>
                </div>
              )}
            </div>

            {/* Hover tooltip */}
            {hoveredItem && (
              <div className="absolute top-2 right-2 bg-gray-800/95 text-white text-[10px] rounded-lg p-2.5 z-50 pointer-events-none shadow-xl backdrop-blur-sm border border-gray-700" style={{ maxWidth: 200 }}>
                <p className="font-bold text-cyan-300 truncate">{hoveredItem.item.name}</p>
                <p className="text-gray-400 font-mono text-[9px]">{hoveredItem.item.code}</p>
                <div className="mt-1.5 pt-1.5 border-t border-gray-700 space-y-0.5">
                  <p className="text-gray-400">{hoveredItem.l.toFixed(0)}×{hoveredItem.w.toFixed(0)}×{hoveredItem.h.toFixed(0)} سم</p>
                  {hoveredItem.item.weight ? <p className="text-gray-400">{hoveredItem.item.weight}كغ</p> : null}
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[9px]">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 border border-white/20" style={{ background: getColor(idx) }} />
                <span className="text-gray-600 truncate flex-1">{item.name}</span>
                <span className="text-gray-400 font-mono">{item.code}</span>
                <span className="bg-gray-100 text-gray-500 px-1 rounded-full">×{item.assignedQty}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
