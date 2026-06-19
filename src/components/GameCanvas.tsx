import React, { useRef, useEffect, useState } from 'react';
import {
  Level,
  OpticalElement,
  Room,
  RaySegment,
  DIR_RIGHT,
  DIR_DOWN,
  DIR_LEFT,
  DIR_UP,
  Direction,
} from '../types';
import { rgbToCss } from '../utils/colors';
import { RayTraceResult } from '../engine/raycaster';

interface GameCanvasProps {
  level: Level;
  traceResult: RayTraceResult;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onRotateElement: (id: string, delta: number) => void;
  solved: boolean;
}

const CANVAS_PADDING = 40;

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  traceResult,
  selectedElementId,
  onSelectElement,
  onRotateElement,
  solved,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 1200, h: 700 });
  const [hoverEl, setHoverEl] = useState<string | null>(null);

  useEffect(() => {
    const updateSize = () => {
      const w = Math.min(window.innerWidth - 360, 1400);
      const h = Math.min(window.innerHeight - 80, 900);
      setCanvasSize({ w, h });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const roomsById = new Map<string, Room>();
  for (const r of level.rooms) roomsById.set(r.id, r);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bounds = computeBounds(level);
    const worldW = bounds.maxX - bounds.minX;
    const worldH = bounds.maxY - bounds.minY;
    const scale = Math.min(
      (canvas.width - CANVAS_PADDING * 2) / worldW,
      (canvas.height - CANVAS_PADDING * 2) / worldH
    );
    const offsetX = CANVAS_PADDING - bounds.minX * scale;
    const offsetY = CANVAS_PADDING - bounds.minY * scale;

    const worldToScreen = (x: number, y: number) => ({
      x: x * scale + offsetX,
      y: y * scale + offsetY,
    });

    const segmentsByRoom = new Map<string, RaySegment[]>();
    for (const ray of traceResult.rays) {
      for (const seg of ray.segments) {
        if (!segmentsByRoom.has(seg.roomId)) {
          segmentsByRoom.set(seg.roomId, []);
        }
        segmentsByRoom.get(seg.roomId)!.push(seg);
      }
    }

    drawBackground(ctx, canvas.width, canvas.height);

    for (const room of level.rooms) {
      drawRoomConnections(ctx, room, roomsById, worldToScreen, scale);
    }

    for (const room of level.rooms) {
      drawRoom(ctx, room, worldToScreen, scale);
    }

    for (const room of level.rooms) {
      const segs = segmentsByRoom.get(room.id) ?? [];
      if (segs.length === 0) continue;

      ctx.save();

      createRoomClipPath(ctx, room, worldToScreen, scale);
      ctx.clip();

      for (const seg of segs) {
        drawRaySegment(ctx, seg, room, worldToScreen, scale);
      }

      ctx.restore();
    }

    for (const room of level.rooms) {
      const segs = segmentsByRoom.get(room.id) ?? [];
      for (const seg of segs) {
        if (seg.exitWall !== undefined && room.walls[seg.exitWall].connection) {
          drawWallExitGlow(ctx, seg, room, worldToScreen, scale);
        }
      }
    }

    for (const room of level.rooms) {
      for (const el of room.elements) {
        drawElement(
          ctx,
          el,
          room,
          worldToScreen,
          scale,
          el.id === selectedElementId,
          el.id === hoverEl,
          traceResult.activatedReceivers.get(el.id)
        );
      }
    }

    if (solved) {
      drawSolved(ctx, canvas.width, canvas.height);
    }
  }, [level, traceResult, selectedElementId, hoverEl, canvasSize, solved]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const { worldToScreen } = getTransform(level, canvasSize);

    let clicked: OpticalElement | null = null;
    let clickedRoom: Room | null = null;

    for (const room of level.rooms) {
      for (const el of room.elements) {
        const sp = worldToScreen(room.position.x + el.position.x, room.position.y + el.position.y);
        const dist = Math.hypot(sp.x - sx, sp.y - sy);
        const size = (el.size ?? 20) * getScale(level, canvasSize);
        if (dist <= size) {
          clicked = el;
          clickedRoom = room;
        }
      }
    }

    if (clicked && clicked.rotatable) {
      if (selectedElementId === clicked.id) {
        onRotateElement(clicked.id, 15);
      } else {
        onSelectElement(clicked.id);
      }
    } else if (clicked && clicked.type === 'source') {
      onSelectElement(null);
    } else {
      onSelectElement(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const { worldToScreen } = getTransform(level, canvasSize);
    const scale = getScale(level, canvasSize);

    let hovered: string | null = null;
    for (const room of level.rooms) {
      for (const el of room.elements) {
        const sp = worldToScreen(room.position.x + el.position.x, room.position.y + el.position.y);
        const dist = Math.hypot(sp.x - sx, sp.y - sy);
        const size = (el.size ?? 20) * scale;
        if (dist <= size) {
          hovered = el.id;
        }
      }
    }
    setHoverEl(hovered);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (selectedElementId) {
      onRotateElement(selectedElementId, -15);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.w}
      height={canvasSize.h}
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverEl(null)}
      onContextMenu={handleContextMenu}
      style={{
        background: '#050510',
        borderRadius: 12,
        boxShadow: '0 0 40px rgba(80, 100, 255, 0.15)',
        cursor: hoverEl ? 'pointer' : 'default',
      }}
    />
  );
};

function getScale(level: Level, canvasSize: { w: number; h: number }) {
  const bounds = computeBounds(level);
  const worldW = bounds.maxX - bounds.minX;
  const worldH = bounds.maxY - bounds.minY;
  return Math.min(
    (canvasSize.w - CANVAS_PADDING * 2) / worldW,
    (canvasSize.h - CANVAS_PADDING * 2) / worldH
  );
}

function getTransform(level: Level, canvasSize: { w: number; h: number }) {
  const bounds = computeBounds(level);
  const scale = getScale(level, canvasSize);
  const offsetX = CANVAS_PADDING - bounds.minX * scale;
  const offsetY = CANVAS_PADDING - bounds.minY * scale;
  const worldToScreen = (x: number, y: number) => ({
    x: x * scale + offsetX,
    y: y * scale + offsetY,
  });
  return { worldToScreen, scale, offsetX, offsetY };
}

function computeBounds(level: Level) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const room of level.rooms) {
    minX = Math.min(minX, room.position.x);
    minY = Math.min(minY, room.position.y);
    maxX = Math.max(maxX, room.position.x + room.size);
    maxY = Math.max(maxY, room.position.y + room.size);
  }
  return { minX, minY, maxX, maxY };
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
  grad.addColorStop(0, '#0f1030');
  grad.addColorStop(1, '#050510');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(60, 80, 160, 0.08)';
  ctx.lineWidth = 1;
  const grid = 40;
  for (let x = 0; x < w; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function drawRoom(
  ctx: CanvasRenderingContext2D,
  room: Room,
  worldToScreen: (x: number, y: number) => { x: number; y: number },
  scale: number
) {
  const tl = worldToScreen(room.position.x, room.position.y);
  const br = worldToScreen(room.position.x + room.size, room.position.y + room.size);
  const w = br.x - tl.x;
  const h = br.y - tl.y;

  const bgGrad = ctx.createLinearGradient(tl.x, tl.y, br.x, br.y);
  bgGrad.addColorStop(0, 'rgba(30, 40, 90, 0.45)');
  bgGrad.addColorStop(1, 'rgba(20, 25, 60, 0.55)');
  ctx.fillStyle = bgGrad;
  roundRect(ctx, tl.x, tl.y, w, h, 8);
  ctx.fill();

  ctx.strokeStyle = 'rgba(100, 130, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  for (let i = 0; i < 4; i++) {
    const wall = room.walls[i as Direction];
    drawWall(ctx, tl, w, h, i as Direction, wall.connection !== undefined);
  }

  ctx.fillStyle = 'rgba(180, 200, 255, 0.7)';
  ctx.font = `${Math.max(12, 14 * scale)}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(room.name, tl.x + 10, tl.y + 8);

  ctx.strokeStyle = 'rgba(80, 110, 200, 0.08)';
  ctx.lineWidth = 1;
  const innerGrid = 50 * scale;
  for (let gx = tl.x + innerGrid; gx < br.x; gx += innerGrid) {
    ctx.beginPath();
    ctx.moveTo(gx, tl.y);
    ctx.lineTo(gx, br.y);
    ctx.stroke();
  }
  for (let gy = tl.y + innerGrid; gy < br.y; gy += innerGrid) {
    ctx.beginPath();
    ctx.moveTo(tl.x, gy);
    ctx.lineTo(br.x, gy);
    ctx.stroke();
  }
}

function drawWall(
  ctx: CanvasRenderingContext2D,
  tl: { x: number; y: number },
  w: number,
  h: number,
  dir: Direction,
  hasConnection: boolean
) {
  ctx.lineWidth = hasConnection ? 5 : 3;
  if (hasConnection) {
    ctx.strokeStyle = 'rgba(120, 220, 255, 0.85)';
    ctx.shadowColor = 'rgba(100, 200, 255, 0.6)';
    ctx.shadowBlur = 15;
  } else {
    ctx.strokeStyle = 'rgba(140, 160, 220, 0.7)';
    ctx.shadowBlur = 0;
  }
  ctx.lineCap = 'round';
  ctx.beginPath();
  switch (dir) {
    case DIR_RIGHT:
      ctx.moveTo(tl.x + w, tl.y);
      ctx.lineTo(tl.x + w, tl.y + h);
      break;
    case DIR_DOWN:
      ctx.moveTo(tl.x, tl.y + h);
      ctx.lineTo(tl.x + w, tl.y + h);
      break;
    case DIR_LEFT:
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tl.x, tl.y + h);
      break;
    case DIR_UP:
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tl.x + w, tl.y);
      break;
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawRoomConnections(
  ctx: CanvasRenderingContext2D,
  room: Room,
  roomsById: Map<string, Room>,
  worldToScreen: (x: number, y: number) => { x: number; y: number },
  scale: number
) {
  for (let i = 0; i < 4; i++) {
    const wall = room.walls[i as Direction];
    if (!wall.connection) continue;
    const target = roomsById.get(wall.connection.targetRoomId);
    if (!target) continue;

    let fromX = room.position.x, fromY = room.position.y;
    let toX = target.position.x, toY = target.position.y;

    const halfRoom = room.size / 2;
    const halfTarget = target.size / 2;

    switch (i as Direction) {
      case DIR_RIGHT:
        fromX += room.size;
        fromY += halfRoom;
        break;
      case DIR_DOWN:
        fromX += halfRoom;
        fromY += room.size;
        break;
      case DIR_LEFT:
        fromY += halfRoom;
        break;
      case DIR_UP:
        fromX += halfRoom;
        break;
    }

    switch (wall.connection.targetWall) {
      case DIR_RIGHT:
        toX += target.size;
        toY += halfTarget;
        break;
      case DIR_DOWN:
        toX += halfTarget;
        toY += target.size;
        break;
      case DIR_LEFT:
        toY += halfTarget;
        break;
      case DIR_UP:
        toX += halfTarget;
        break;
    }

    const p1 = worldToScreen(fromX, fromY);
    const p2 = worldToScreen(toX, toY);

    ctx.strokeStyle = 'rgba(100, 200, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(100, 220, 255, 0.7)';
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    ctx.beginPath();
    ctx.arc(midX, midY, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

function createRoomClipPath(
  ctx: CanvasRenderingContext2D,
  room: Room,
  worldToScreen: (x: number, y: number) => { x: number; y: number },
  scale: number
) {
  const tl = worldToScreen(room.position.x, room.position.y);
  const br = worldToScreen(room.position.x + room.size, room.position.y + room.size);
  const w = br.x - tl.x;
  const h = br.y - tl.y;

  const expand = 0.25 * scale;

  ctx.beginPath();
  ctx.rect(tl.x - expand, tl.y - expand, w + expand * 2, h + expand * 2);
  ctx.closePath();
}

function drawWallExitGlow(
  ctx: CanvasRenderingContext2D,
  seg: RaySegment,
  room: Room,
  worldToScreen: (x: number, y: number) => { x: number; y: number },
  scale: number
) {
  if (seg.exitWall === undefined) return;

  const from = worldToScreen(room.position.x + seg.from.x, room.position.y + seg.from.y);
  const to = worldToScreen(room.position.x + seg.to.x, room.position.y + seg.to.y);

  const color = rgbToCss(seg.color, 0.9);
  const glowColor = rgbToCss(seg.color, 0.35);

  const glowExtend = 6 * scale;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) return;
  const nx = dx / len;
  const ny = dy / len;

  const extTo = {
    x: to.x + nx * glowExtend,
    y: to.y + ny * glowExtend,
  };

  const extFrom = {
    x: to.x - nx * glowExtend * 0.5,
    y: to.y - ny * glowExtend * 0.5,
  };

  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 10 * Math.max(0.5, scale);
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(extFrom.x, extFrom.y);
  ctx.lineTo(extTo.x, extTo.y);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 3 * Math.max(0.5, scale);
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(extFrom.x, extFrom.y);
  ctx.lineTo(extTo.x, extTo.y);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.lineCap = 'butt';
}

function drawRaySegment(
  ctx: CanvasRenderingContext2D,
  seg: RaySegment,
  room: Room,
  worldToScreen: (x: number, y: number) => { x: number; y: number },
  scale: number
) {
  const from = worldToScreen(room.position.x + seg.from.x, room.position.y + seg.from.y);
  const to = worldToScreen(room.position.x + seg.to.x, room.position.y + seg.to.y);

  const color = rgbToCss(seg.color, 0.95);
  const glowColor = rgbToCss(seg.color, 0.4);

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  let nx = 0, ny = 0;
  if (len > 0.001) {
    nx = dx / len;
    ny = dy / len;
  }

  const isExitAtConn =
    seg.exitWall !== undefined &&
    room.walls[seg.exitWall].connection !== undefined;

  const padStart = 0.8 * scale;
  const padEnd = isExitAtConn ? 0 : 0.8 * scale;

  const drawFrom = {
    x: from.x + nx * padStart,
    y: from.y + ny * padStart,
  };
  const drawTo = {
    x: to.x - nx * padEnd,
    y: to.y - ny * padEnd,
  };

  const s = Math.max(0.5, scale);

  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 10 * s;
  ctx.lineCap = 'butt';
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(drawFrom.x, drawFrom.y);
  ctx.lineTo(drawTo.x, drawTo.y);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 3 * s;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(drawFrom.x, drawFrom.y);
  ctx.lineTo(drawTo.x, drawTo.y);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.lineCap = 'butt';
}

function drawElement(
  ctx: CanvasRenderingContext2D,
  el: OpticalElement,
  room: Room,
  worldToScreen: (x: number, y: number) => { x: number; y: number },
  scale: number,
  selected: boolean,
  hovered: boolean,
  activatedColors?: { r: number; g: number; b: number }[]
) {
  const sp = worldToScreen(room.position.x + el.position.x, room.position.y + el.position.y);
  const size = (el.size ?? 20) * scale;

  ctx.save();
  ctx.translate(sp.x, sp.y);
  ctx.rotate((el.rotation * Math.PI) / 180);

  if (selected || hovered) {
    ctx.shadowColor = selected ? 'rgba(255, 220, 100, 0.9)' : 'rgba(180, 220, 255, 0.6)';
    ctx.shadowBlur = 20;
  }

  switch (el.type) {
    case 'source':
      drawSource(ctx, size, el.color ?? { r: 255, g: 255, b: 255 });
      break;
    case 'receiver':
      drawReceiver(ctx, size, el.color ?? { r: 255, g: 255, b: 255 }, activatedColors);
      break;
    case 'mirror':
      drawMirror(ctx, size);
      break;
    case 'splitter':
      drawSplitter(ctx, size);
      break;
    case 'prism':
      drawPrism(ctx, size);
      break;
    case 'filter':
      drawFilter(ctx, size, el.color ?? { r: 255, g: 255, b: 255 });
      break;
  }

  ctx.restore();

  if (selected) {
    ctx.strokeStyle = 'rgba(255, 220, 100, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, size + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawSource(ctx: CanvasRenderingContext2D, size: number, color: { r: number; g: number; b: number }) {
  const c = rgbToCss(color, 1);

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
  grad.addColorStop(0, c);
  grad.addColorStop(0.5, rgbToCss(color, 0.6));
  grad.addColorStop(1, rgbToCss(color, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = c;
  ctx.shadowColor = c;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = c;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(size * 0.5, 0);
  ctx.lineTo(size * 0.95, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(size * 0.75, -size * 0.2);
  ctx.lineTo(size * 0.95, 0);
  ctx.lineTo(size * 0.75, size * 0.2);
  ctx.stroke();
}

function drawReceiver(
  ctx: CanvasRenderingContext2D,
  size: number,
  targetColor: { r: number; g: number; b: number },
  activatedColors?: { r: number; g: number; b: number }[]
) {
  const activated = activatedColors && activatedColors.length > 0;

  ctx.strokeStyle = activated ? rgbToCss(targetColor, 1) : rgbToCss(targetColor, 0.5);
  ctx.lineWidth = 3;
  if (activated) {
    ctx.shadowColor = rgbToCss(targetColor, 1);
    ctx.shadowBlur = 25;
  }
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = activated ? rgbToCss(targetColor, 0.8) : 'rgba(20, 20, 40, 0.8)';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.75, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = activated ? '#fff' : rgbToCss(targetColor, 0.4);
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
  ctx.fill();

  if (activated) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.strokeStyle = rgbToCss(targetColor, 0.8);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * size * 1.1, Math.sin(a) * size * 1.1);
      ctx.lineTo(Math.cos(a) * size * 1.4, Math.sin(a) * size * 1.4);
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
}

function drawMirror(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = 'rgba(180, 200, 240, 0.2)';
  roundRect(ctx, -size * 0.5, -size * 0.12, size, size * 0.24, 3);
  ctx.fill();

  const mirrorGrad = ctx.createLinearGradient(0, -size * 0.1, 0, size * 0.1);
  mirrorGrad.addColorStop(0, '#eef4ff');
  mirrorGrad.addColorStop(0.5, '#b8c8e8');
  mirrorGrad.addColorStop(1, '#7a8ab8');
  ctx.fillStyle = mirrorGrad;
  roundRect(ctx, -size * 0.48, -size * 0.08, size * 0.96, size * 0.16, 2);
  ctx.fill();

  ctx.strokeStyle = '#556699';
  ctx.lineWidth = 1.5;
  roundRect(ctx, -size * 0.48, -size * 0.08, size * 0.96, size * 0.16, 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-size * 0.4, -size * 0.05);
  ctx.lineTo(size * 0.3, -size * 0.05);
  ctx.stroke();
}

function drawSplitter(ctx: CanvasRenderingContext2D, size: number) {
  const grad = ctx.createLinearGradient(0, -size * 0.1, 0, size * 0.1);
  grad.addColorStop(0, 'rgba(200, 230, 255, 0.9)');
  grad.addColorStop(0.5, 'rgba(150, 180, 255, 0.6)');
  grad.addColorStop(1, 'rgba(100, 140, 220, 0.9)');
  ctx.fillStyle = grad;
  roundRect(ctx, -size * 0.48, -size * 0.08, size * 0.96, size * 0.16, 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(180, 200, 255, 0.9)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, -size * 0.48, -size * 0.08, size * 0.96, size * 0.16, 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(i * size * 0.15, 0, size * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPrism(ctx: CanvasRenderingContext2D, size: number) {
  const s = size * 0.55;

  const grad = ctx.createLinearGradient(-s, -s * 0.6, s, s * 0.6);
  grad.addColorStop(0, 'rgba(255, 100, 100, 0.6)');
  grad.addColorStop(0.5, 'rgba(100, 255, 100, 0.6)');
  grad.addColorStop(1, 'rgba(100, 100, 255, 0.6)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.87, s * 0.5);
  ctx.lineTo(-s * 0.87, s * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(220, 220, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.6);
  ctx.lineTo(s * 0.4, s * 0.15);
  ctx.lineTo(-s * 0.4, s * 0.15);
  ctx.closePath();
  ctx.stroke();
}

function drawFilter(ctx: CanvasRenderingContext2D, size: number, color: { r: number; g: number; b: number }) {
  const c = rgbToCss(color, 0.75);
  const cBorder = rgbToCss(color, 1);

  ctx.fillStyle = c;
  roundRect(ctx, -size * 0.45, -size * 0.1, size * 0.9, size * 0.2, 4);
  ctx.fill();

  ctx.strokeStyle = cBorder;
  ctx.lineWidth = 2.5;
  roundRect(ctx, -size * 0.45, -size * 0.1, size * 0.9, size * 0.2, 4);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-size * 0.35, -size * 0.05);
  ctx.lineTo(size * 0.25, -size * 0.05);
  ctx.stroke();
}

function drawSolved(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = 'rgba(20, 40, 20, 0.4)';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(120, 255, 150, 0.95)';
  ctx.font = 'bold 48px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(100, 255, 150, 0.8)';
  ctx.shadowBlur = 30;
  ctx.fillText('✓ 通关！', w / 2, h / 2 - 10);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(180, 255, 200, 0.85)';
  ctx.font = '20px "Segoe UI", sans-serif';
  ctx.fillText('光线成功到达所有接收器', w / 2, h / 2 + 35);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
