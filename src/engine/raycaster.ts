import {
  Direction,
  DIR_RIGHT,
  DIR_DOWN,
  DIR_LEFT,
  DIR_UP,
  Level,
  LightRay,
  OpticalElement,
  RaySegment,
  RGB,
  Room,
  Vec2,
} from '../types';
import {
  directionToVector,
  oppositeDirection,
  rotateDirection,
  transformWallPoint,
  vecAdd,
  vecScale,
  vecSub,
} from '../utils/geometry';
import {
  COLOR_BLUE,
  COLOR_GREEN,
  COLOR_RED,
  applyFilter,
  colorsEqual,
  hasBlue,
  hasGreen,
  hasRed,
  isWhite,
} from '../utils/colors';

const MAX_SEGMENTS = 200;
const MAX_BOUNCES = 200;

type RayState = {
  roomId: string;
  pos: Vec2;
  dir: Direction;
  color: RGB;
  segments: RaySegment[];
  bounces: number;
  visited: Set<string>;
};

export type RayTraceResult = {
  rays: LightRay[];
  activatedReceivers: Map<string, RGB[]>;
};

export function traceAllRays(level: Level): RayTraceResult {
  const result: RayTraceResult = {
    rays: [],
    activatedReceivers: new Map(),
  };

  const sources: OpticalElement[] = [];
  for (const room of level.rooms) {
    for (const el of room.elements) {
      if (el.type === 'source') {
        sources.push(el);
      }
    }
  }

  for (const source of sources) {
    const room = level.rooms.find((r) =>
      r.elements.some((e) => e.id === source.id)
    );
    if (!room || !source.color) continue;

    const initialRay: RayState = {
      roomId: room.id,
      pos: { ...source.position },
      dir: source.rotation as Direction,
      color: { ...source.color },
      segments: [],
      bounces: 0,
      visited: new Set(),
    };

    traceRay(level, initialRay, result);
  }

  return result;
}

function traceRay(level: Level, state: RayState, result: RayTraceResult): void {
  while (state.bounces < MAX_BOUNCES && state.segments.length < MAX_SEGMENTS) {
    const room = level.rooms.find((r) => r.id === state.roomId);
    if (!room) break;

    const visitKey = `${state.roomId}:${state.pos.x},${state.pos.y}:${state.dir}:${state.color.r},${state.color.g},${state.color.b}`;
    if (state.visited.has(visitKey)) break;
    state.visited.add(visitKey);

    const step = stepRay(level, room, state);
    if (!step) break;

    state.segments.push(step.segment);
    state.bounces++;

    if (step.hitReceiver) {
      const recvId = step.hitReceiver;
      if (!result.activatedReceivers.has(recvId)) {
        result.activatedReceivers.set(recvId, []);
      }
      result.activatedReceivers.get(recvId)!.push({ ...state.color });
      break;
    }

    if (step.splitRays) {
      for (const split of step.splitRays) {
        const splitState: RayState = {
          roomId: state.roomId,
          pos: { ...split.pos },
          dir: split.dir,
          color: { ...split.color },
          segments: [...state.segments],
          bounces: state.bounces,
          visited: new Set(state.visited),
        };
        traceRay(level, splitState, result);
      }
      break;
    }

    if (step.next) {
      state.roomId = step.next.roomId;
      state.pos = step.next.pos;
      state.dir = step.next.dir;
      state.color = step.next.color;
    } else {
      break;
    }
  }

  if (state.segments.length > 0) {
    result.rays.push({
      id: `ray_${result.rays.length}`,
      roomId: state.segments[0].roomId,
      start: state.segments[0].from,
      direction: state.dir,
      color: state.color,
      segments: state.segments,
    });
  }
}

type StepResult = {
  segment: RaySegment;
  next?: {
    roomId: string;
    pos: Vec2;
    dir: Direction;
    color: RGB;
  };
  splitRays?: { pos: Vec2; dir: Direction; color: RGB }[];
  hitReceiver?: string;
};

function stepRay(level: Level, room: Room, state: RayState): StepResult | null {
  const dirVec = directionToVector(state.dir);
  const roomSize = room.size;

  let hitT = Infinity;
  let hitWall: Direction | null = null;
  let hitElement: OpticalElement | null = null;
  let hitPoint: Vec2 = { x: 0, y: 0 };

  for (let d = 0; d < 4; d++) {
    const wall = d as Direction;
    const wallVec = directionToVector(wall);
    const dot = dirVec.x * wallVec.x + dirVec.y * wallVec.y;
    if (dot <= 0) continue;

    let t: number;
    if (wall === DIR_RIGHT) t = (roomSize - state.pos.x) / dirVec.x;
    else if (wall === DIR_LEFT) t = -state.pos.x / dirVec.x;
    else if (wall === DIR_DOWN) t = (roomSize - state.pos.y) / dirVec.y;
    else t = -state.pos.y / dirVec.y;

    if (t > 0.001 && t < hitT) {
      hitT = t;
      hitWall = wall;
      hitElement = null;
      hitPoint = vecAdd(state.pos, vecScale(dirVec, t));
      hitPoint.x = clamp(hitPoint.x, 0, roomSize);
      hitPoint.y = clamp(hitPoint.y, 0, roomSize);
    }
  }

  for (const el of room.elements) {
    if (el.type === 'source') continue;

    const elT = rayElementIntersect(state.pos, dirVec, el);
    if (elT !== null && elT > 0.001 && elT < hitT) {
      hitT = elT;
      hitWall = null;
      hitElement = el;
      hitPoint = vecAdd(state.pos, vecScale(dirVec, elT));
    }
  }

  if (hitT === Infinity) return null;

  const segment: RaySegment = {
    roomId: room.id,
    from: { ...state.pos },
    to: { ...hitPoint },
    color: { ...state.color },
    exitWall: hitWall ?? undefined,
  };

  if (hitElement) {
    return handleElementHit(level, room, state, hitElement, hitPoint, segment);
  }

  if (hitWall !== null) {
    return handleWallHit(level, room, state, hitWall, hitPoint, segment);
  }

  return null;
}

function handleElementHit(
  level: Level,
  room: Room,
  state: RayState,
  el: OpticalElement,
  hitPoint: Vec2,
  segment: RaySegment
): StepResult {
  switch (el.type) {
    case 'mirror': {
      const reflected = reflectDirection(state.dir, el.rotation);
      if (reflected === null) return { segment };
      return {
        segment,
        next: {
          roomId: room.id,
          pos: { ...hitPoint },
          dir: reflected,
          color: { ...state.color },
        },
      };
    }

    case 'splitter': {
      const dirs: Direction[] = [];
      const reflected = reflectDirection(state.dir, el.rotation);
      if (reflected !== null) dirs.push(reflected);
      dirs.push(state.dir);

      const splitRays = dirs.map((d) => ({
        pos: { ...hitPoint },
        dir: d,
        color: { ...state.color },
      }));

      return { segment, splitRays };
    }

    case 'prism': {
      if (isWhite(state.color)) {
        const splitRays: { pos: Vec2; dir: Direction; color: RGB }[] = [];
        const baseDir = state.dir;
        splitRays.push({
          pos: { ...hitPoint },
          dir: rotateDirection(baseDir, -1),
          color: { ...COLOR_RED },
        });
        splitRays.push({
          pos: { ...hitPoint },
          dir: baseDir,
          color: { ...COLOR_GREEN },
        });
        splitRays.push({
          pos: { ...hitPoint },
          dir: rotateDirection(baseDir, 1),
          color: { ...COLOR_BLUE },
        });
        return { segment, splitRays };
      } else {
        return {
          segment,
          next: {
            roomId: room.id,
            pos: { ...hitPoint },
            dir: state.dir,
            color: { ...state.color },
          },
        };
      }
    }

    case 'filter': {
      if (!el.color) return { segment };
      const filtered = applyFilter(state.color, el.color);
      if (filtered.r === 0 && filtered.g === 0 && filtered.b === 0) {
        return { segment };
      }
      return {
        segment,
        next: {
          roomId: room.id,
          pos: { ...hitPoint },
          dir: state.dir,
          color: filtered,
        },
      };
    }

    case 'receiver': {
      return { segment, hitReceiver: el.id };
    }

    default:
      return { segment };
  }
}

function handleWallHit(
  level: Level,
  room: Room,
  state: RayState,
  wall: Direction,
  hitPoint: Vec2,
  segment: RaySegment
): StepResult {
  const wallData = room.walls[wall];
  if (!wallData.connection) {
    return { segment };
  }

  const conn = wallData.connection;
  const targetRoom = level.rooms.find((r) => r.id === conn.targetRoomId);
  if (!targetRoom) return { segment };

  const newPos = transformWallPoint(
    hitPoint,
    wall,
    conn.targetWall,
    targetRoom.size,
    conn.rotation,
    conn.flip
  );

  const exitDir = state.dir;
  let newDir = exitDir;

  const wallDelta = (conn.targetWall - wall + 4) % 4;
  const rotSteps = Math.round(conn.rotation / 90);
  newDir = rotateDirection(exitDir, wallDelta + rotSteps);

  if (conn.flip) {
    if (conn.targetWall === DIR_RIGHT || conn.targetWall === DIR_LEFT) {
      if (newDir === DIR_UP) newDir = DIR_DOWN;
      else if (newDir === DIR_DOWN) newDir = DIR_UP;
    } else {
      if (newDir === DIR_LEFT) newDir = DIR_RIGHT;
      else if (newDir === DIR_RIGHT) newDir = DIR_LEFT;
    }
  }

  newDir = oppositeDirection(newDir);

  return {
    segment,
    next: {
      roomId: targetRoom.id,
      pos: newPos,
      dir: newDir,
      color: { ...state.color },
    },
  };
}

function rayElementIntersect(
  origin: Vec2,
  dir: Vec2,
  el: OpticalElement
): number | null {
  const size = el.size ?? 20;
  const half = size / 2;

  const elType = el.type;
  if (elType === 'source') return null;

  if (
    elType === 'mirror' ||
    elType === 'splitter' ||
    elType === 'prism' ||
    elType === 'filter'
  ) {
    const angleRad = (el.rotation * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    const relOrigin = vecSub(origin, el.position);
    const localOrigin = {
      x: relOrigin.x * cos + relOrigin.y * sin,
      y: -relOrigin.x * sin + relOrigin.y * cos,
    };
    const localDir = {
      x: dir.x * cos + dir.y * sin,
      y: -dir.x * sin + dir.y * cos,
    };

    const halfLen = half;
    const thickness = 3;

    if (Math.abs(localDir.x) < 0.0001) return null;
    const t = -localOrigin.x / localDir.x;
    if (t <= 0) return null;

    const hitY = localOrigin.y + localDir.y * t;
    if (Math.abs(hitY) <= halfLen && Math.abs(localOrigin.x) <= thickness + 0.5) {
      return t;
    }
    return null;
  }

  if (elType === 'receiver') {
    const dx = el.position.x - origin.x;
    const dy = el.position.y - origin.y;
    const t = dx * dir.x + dy * dir.y;
    if (t <= 0) return null;

    const closestX = origin.x + dir.x * t;
    const closestY = origin.y + dir.y * t;
    const distSq =
      (closestX - el.position.x) ** 2 + (closestY - el.position.y) ** 2;
    if (distSq <= half * half) {
      return t;
    }
  }

  return null;
}

function reflectDirection(incoming: Direction, mirrorRotationDeg: number): Direction | null {
  const normalized = ((mirrorRotationDeg % 180) + 180) % 180;
  const isHorizontal = normalized < 22.5 || normalized >= 157.5;
  const isVertical = normalized >= 67.5 && normalized < 112.5;
  const isDiag1 = normalized >= 22.5 && normalized < 67.5;
  const isDiag2 = normalized >= 112.5 && normalized < 157.5;

  if (isHorizontal) {
    if (incoming === DIR_UP) return DIR_DOWN;
    if (incoming === DIR_DOWN) return DIR_UP;
    return null;
  }
  if (isVertical) {
    if (incoming === DIR_LEFT) return DIR_RIGHT;
    if (incoming === DIR_RIGHT) return DIR_LEFT;
    return null;
  }
  if (isDiag1) {
    if (incoming === DIR_RIGHT) return DIR_UP;
    if (incoming === DIR_DOWN) return DIR_LEFT;
    if (incoming === DIR_LEFT) return DIR_DOWN;
    if (incoming === DIR_UP) return DIR_RIGHT;
  }
  if (isDiag2) {
    if (incoming === DIR_RIGHT) return DIR_DOWN;
    if (incoming === DIR_UP) return DIR_LEFT;
    if (incoming === DIR_LEFT) return DIR_UP;
    if (incoming === DIR_DOWN) return DIR_RIGHT;
  }
  return null;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function checkLevelSolved(
  level: Level,
  activated: Map<string, RGB[]>
): boolean {
  const receivers: { el: OpticalElement; room: Room }[] = [];
  for (const room of level.rooms) {
    for (const el of room.elements) {
      if (el.type === 'receiver') {
        receivers.push({ el, room });
      }
    }
  }

  if (receivers.length === 0) return false;

  for (const { el } of receivers) {
    const colors = activated.get(el.id);
    if (!colors || colors.length === 0) return false;
    if (!el.color) continue;

    const target = el.color;
    let matched = false;
    for (const c of colors) {
      if (colorsEqual(c, target) ||
          (target.r > 0 && Math.abs(c.r - target.r) < 30 &&
           target.g > 0 && Math.abs(c.g - target.g) < 30 &&
           target.b > 0 && Math.abs(c.b - target.b) < 30) ||
          (target.r === 0 && target.g === 0 && c.r < 30 && c.g < 30 && Math.abs(c.b - target.b) < 30) ||
          (target.r === 0 && target.b === 0 && c.r < 30 && c.b < 30 && Math.abs(c.g - target.g) < 30) ||
          (target.g === 0 && target.b === 0 && c.g < 30 && c.b < 30 && Math.abs(c.r - target.r) < 30)) {
        matched = true;
        break;
      }
    }
    if (!matched) return false;
  }

  return true;
}
