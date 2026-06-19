export type RGB = { r: number; g: number; b: number };

export type Direction = 0 | 1 | 2 | 3;

export const DIR_RIGHT = 0;
export const DIR_DOWN = 1;
export const DIR_LEFT = 2;
export const DIR_UP = 3;

export type Vec2 = { x: number; y: number };

export type WallConnection = {
  targetRoomId: string;
  targetWall: Direction;
  rotation: number;
  flip: boolean;
};

export type RoomWall = {
  exists: boolean;
  connection?: WallConnection;
};

export type Room = {
  id: string;
  name: string;
  walls: [RoomWall, RoomWall, RoomWall, RoomWall];
  size: number;
  position: Vec2;
  rotation: number;
  elements: OpticalElement[];
};

export type OpticalElementType =
  | 'mirror'
  | 'splitter'
  | 'filter'
  | 'source'
  | 'receiver'
  | 'prism';

export type OpticalElement = {
  id: string;
  type: OpticalElementType;
  position: Vec2;
  rotation: number;
  color?: RGB;
  size?: number;
  rotatable?: boolean;
};

export type Level = {
  id: string;
  name: string;
  description: string;
  rooms: Room[];
};

export type LightRay = {
  id: string;
  roomId: string;
  start: Vec2;
  direction: Direction;
  color: RGB;
  segments: RaySegment[];
  dead?: boolean;
};

export type RaySegment = {
  roomId: string;
  from: Vec2;
  to: Vec2;
  color: RGB;
  exitWall?: Direction;
};

export type GameState = {
  level: Level;
  selectedElementId: string | null;
  isSolved: boolean;
};
