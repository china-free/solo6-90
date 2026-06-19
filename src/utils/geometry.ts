import { Direction, Vec2, DIR_RIGHT, DIR_DOWN, DIR_LEFT, DIR_UP } from '../types';

export function directionToVector(dir: Direction): Vec2 {
  switch (dir) {
    case DIR_RIGHT: return { x: 1, y: 0 };
    case DIR_DOWN: return { x: 0, y: 1 };
    case DIR_LEFT: return { x: -1, y: 0 };
    case DIR_UP: return { x: 0, y: -1 };
  }
}

export function vectorToDirection(v: Vec2): Direction {
  if (Math.abs(v.x) >= Math.abs(v.y)) {
    return v.x >= 0 ? DIR_RIGHT : DIR_LEFT;
  }
  return v.y >= 0 ? DIR_DOWN : DIR_UP;
}

export function rotateDirection(dir: Direction, steps: number): Direction {
  let d = (dir + steps) % 4;
  if (d < 0) d += 4;
  return d as Direction;
}

export function oppositeDirection(dir: Direction): Direction {
  return rotateDirection(dir, 2);
}

export function directionToAngle(dir: Direction): number {
  return dir * 90;
}

export function vecAdd(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vecSub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vecScale(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

export function vecDot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function vecLen(a: Vec2): number {
  return Math.sqrt(a.x * a.x + a.y * a.y);
}

export function vecNorm(a: Vec2): Vec2 {
  const l = vecLen(a);
  if (l === 0) return { x: 0, y: 0 };
  return { x: a.x / l, y: a.y / l };
}

export function vecEquals(a: Vec2, b: Vec2, eps: number = 0.001): boolean {
  return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;
}

export function rotateVec(v: Vec2, angleDeg: number): Vec2 {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

export function reflectVec(v: Vec2, normal: Vec2): Vec2 {
  const d = 2 * vecDot(v, normal);
  return { x: v.x - d * normal.x, y: v.y - d * normal.y };
}

export function rotatePoint(p: Vec2, center: Vec2, angleDeg: number): Vec2 {
  const rel = vecSub(p, center);
  const rotated = rotateVec(rel, angleDeg);
  return vecAdd(center, rotated);
}

export function pointOnWall(
  point: Vec2,
  wall: Direction,
  roomSize: number,
  eps: number = 0.1
): boolean {
  switch (wall) {
    case DIR_RIGHT: return Math.abs(point.x - roomSize) < eps;
    case DIR_LEFT: return Math.abs(point.x) < eps;
    case DIR_DOWN: return Math.abs(point.y - roomSize) < eps;
    case DIR_UP: return Math.abs(point.y) < eps;
  }
}

export function getWallMidpoint(wall: Direction, roomSize: number): Vec2 {
  const half = roomSize / 2;
  switch (wall) {
    case DIR_RIGHT: return { x: roomSize, y: half };
    case DIR_LEFT: return { x: 0, y: half };
    case DIR_DOWN: return { x: half, y: roomSize };
    case DIR_UP: return { x: half, y: 0 };
  }
}

export function transformWallPoint(
  point: Vec2,
  fromWall: Direction,
  toWall: Direction,
  roomSize: number,
  rotation: number,
  flip: boolean
): Vec2 {
  let rel: number;
  if (fromWall === DIR_RIGHT || fromWall === DIR_LEFT) {
    rel = point.y / roomSize;
  } else {
    rel = point.x / roomSize;
  }

  if (flip) {
    rel = 1 - rel;
  }

  const mid = getWallMidpoint(toWall, roomSize);
  const dirVec = directionToVector(toWall);
  const perpVec = { x: -dirVec.y, y: dirVec.x };
  const offset = (rel - 0.5) * roomSize;

  return {
    x: mid.x + perpVec.x * offset,
    y: mid.y + perpVec.y * offset,
  };
}
