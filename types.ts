export enum EntityType {
  PLAYER = 'PLAYER',
  PLATFORM = 'PLATFORM',
  BOX = 'BOX',
  GOAL = 'GOAL',
  NPC = 'NPC',
  SIGN = 'SIGN'
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Entity extends Rect {
  id: string;
  type: EntityType;
  color: string;
  vx: number;
  vy: number;
  facing: number; // 1 for right, -1 for left
  isGrounded: boolean;
  heldBy?: string; // ID of entity holding this
  variant?: number; // 0=Hazardous, 1=General, 2=Organic, 3=Recycle
  content?: string; // Emoji to display OR Text for signs
  assetKey?: string; // Key to look up in AssetLibrary
}

export interface AssetLibrary {
  [key: string]: HTMLImageElement;
}

export interface GameState {
  player: Entity;
  platforms: Entity[];
  boxes: Entity[];
  goals: Entity[];
  npcs: Entity[];
  signs: Entity[]; // Added Signs
  camera: Vector2;
  score: number;
  level: number; // Current Level (1-5)
  levelComplete: boolean;
  gameComplete: boolean;
  gameOver: boolean; // New Game Over state
  zoneProgress: number[]; // Progress for each of the 4 zones
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  run: boolean; // Added for running (Shift)
  interact: boolean; // For grabbing/throwing
  talk: boolean; // For NPC/Sign interaction (F)
  inspect: boolean; // For AI description
}

export interface AIResponse {
  title?: string;
  text: string;
  loading: boolean;
  visible: boolean;
}

export interface LevelConfig {
  playerStart: Vector2;
  platforms: Entity[];
  goals: Entity[];
  boxes: { variant: number, x: number, y: number }[];
  npcs: { x: number, y: number }[];
  signs: { x: number, y: number, text: string }[]; // Added Signs to config
}