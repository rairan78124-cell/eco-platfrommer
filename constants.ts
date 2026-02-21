import { LevelConfig, EntityType } from './types';

export const GRAVITY = 0.6;
export const FRICTION = 0.85;

// Speed Constants
export const RUN_SPEED = 9; // Original Max Speed
export const WALK_SPEED = RUN_SPEED * 0.74; // 26% slower
export const RUN_ACCEL = 0.8; // Original Acceleration
export const WALK_ACCEL = RUN_ACCEL * 0.74;

export const JUMP_FORCE = -15;
export const THROW_FORCE_X = 12;
export const THROW_FORCE_Y = -6;

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;

export const PLAYER_WIDTH = 40;
export const PLAYER_HEIGHT = 60;
export const TILE_SIZE = 50;

export const COLORS = {
  sky: '#f0f9ff', // lighter sky
  ground: '#334155', // slate-700
  player: '#6366f1', // indigo-500
  npc: '#f59e0b', // amber-500 for Village Headman
  text: '#1e293b',
};

// Thai Waste Standards
// 0: Hazardous (Red)
// 1: General (Blue)
// 2: Organic (Green)
// 3: Recycle (Yellow)
export const VARIANT_NAMES = ['Hazardous', 'General', 'Organic', 'Recycle'];

export const VARIANT_COLORS = [
  '#ef4444', // Red (Hazardous)
  '#3b82f6', // Blue (General)
  '#22c55e', // Green (Organic)
  '#eab308', // Yellow (Recycle)
];

export const GOAL_COLORS = [
  'rgba(239, 68, 68, 0.2)', 
  'rgba(59, 130, 246, 0.2)', 
  'rgba(34, 197, 94, 0.2)',  
  'rgba(234, 179, 8, 0.2)',  
];

export const WASTE_EMOJIS = [
  ['☣️', '🔋', '💉', '🧪', '☠️'], // Hazardous
  ['🥡', '🧻', '🥢', '🍬', '🚬'], // General
  ['🍎', '🍌', '🦴', '🥬', '🐟'], // Organic
  ['🥤', '📰', '📦', '🍾', '🥫']  // Recycle
];

export const ASSET_URLS = {
  backgrounds: {
    level1: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80', // Nature
    level2: 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=1200&q=80', // Park
    level3: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=80', // City
    level4: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80', // Construction
    level5: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=1200&q=80', // Landfill
  },
  platforms: {
    grass: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjNzgzNTBmIi8+PHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjE1IiBmaWxsPSIjNGFkZTgwIi8+PHBhdGggZD0iTTAgMTUgUTEwIDI1IDIwIDE1IFQ0MCAxNSBUNjAgMTUiIHN0cm9rZT0iIzRhZGU4MCIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==',
    stone: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjNjQ3NDhiIi8+PHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSJub25lIiBzdHJva2U9IiM0NzU1NjkiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
  },
  objects: {
    crate: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZDk3NzA2Ii8+PHJlY3QgeD0iNSIgeT0iNSIgd2lkdGg9IjMwIiBoZWlnaHQ9IjMwIiBzdHJva2U9IiM5MjQwMGUiIGZpbGw9Im5vbmUiLz48bGluZSB4MT0iMCIgeTE9IjAiIHgyPSI0MCIgeTI9IjQwIiBzdHJva2U9IiM5MjQwMGUiLz48bGluZSB4MT0iNDAiIHkxPSIwIiB4Mj0iMCIgeTI9IjQwIiBzdHJva2U9IiM5MjQwMGUiLz48L3N2Zz4=',
  }
};

// --- LEVELS ---

const createPlatform = (id: string, x: number, y: number, w: number, h: number, color = COLORS.ground) => ({
    id, type: EntityType.PLATFORM, x, y, w, h, color, vx: 0, vy: 0, facing: 0, isGrounded: true
});

const createGoal = (variant: number, x: number, y: number) => ({
    id: `g-${variant}`, type: EntityType.GOAL, variant, x, y, w: 120, h: 100, 
    color: GOAL_COLORS[variant], vx: 0, vy: 0, facing: 0, isGrounded: true
});

// Common ground for most levels
// OPTIMIZATION: Use a single large block instead of many small tiles to prevent friction snagging
const baseGround = [
    createPlatform('floor-main', -500, 600, 6000, 50)
];

// LEVEL 1: Training Yard (Flat, easy)
const LEVEL_1: LevelConfig = {
    playerStart: { x: 100, y: 500 },
    platforms: [
        ...baseGround,
        createPlatform('w1', -50, 0, 50, 800),
        createPlatform('w2', 1500, 0, 50, 800),
    ],
    goals: [
        createGoal(0, 400, 500),
        createGoal(1, 600, 500),
        createGoal(2, 800, 500),
        createGoal(3, 1000, 500),
    ],
    boxes: [
        { variant: 0, x: 200, y: 500 },
        { variant: 1, x: 250, y: 500 },
        { variant: 2, x: 300, y: 500 },
        { variant: 3, x: 350, y: 500 },
    ],
    npcs: [
        { x: 50, y: 500 } // Village Headman at start
    ]
};

// LEVEL 2: The Park (Simple platforms)
const LEVEL_2: LevelConfig = {
    playerStart: { x: 100, y: 500 },
    platforms: [
        ...baseGround,
        createPlatform('p1', 300, 450, 200, 20),
        createPlatform('p2', 700, 350, 200, 20),
        createPlatform('w1', -50, 0, 50, 800),
        createPlatform('w2', 1600, 0, 50, 800),
    ],
    goals: [
        createGoal(2, 350, 350), // Organic high
        createGoal(3, 750, 250), // Recycle higher
        createGoal(0, 1200, 500), // Hazard ground
        createGoal(1, 1400, 500), // General ground
    ],
    boxes: [
        { variant: 2, x: 200, y: 500 }, // Organic
        { variant: 2, x: 250, y: 500 }, 
        { variant: 3, x: 600, y: 500 }, // Recycle
        { variant: 3, x: 650, y: 500 },
        { variant: 0, x: 500, y: 200 }, // Hazard on p1
        { variant: 1, x: 800, y: 200 }, // General on p2
    ],
    npcs: [
        { x: 50, y: 500 }
    ]
};

// LEVEL 3: Urban Rooftops (Verticality)
const LEVEL_3: LevelConfig = {
    playerStart: { x: 100, y: 300 },
    platforms: [
        createPlatform('base', 0, 600, 400, 50), // Small start ground
        createPlatform('gap1', 500, 500, 200, 50),
        createPlatform('gap2', 800, 400, 200, 50),
        createPlatform('tower', 1100, 600, 300, 50),
        createPlatform('high1', 200, 250, 150, 20),
        createPlatform('high2', 600, 200, 150, 20),
        createPlatform('w1', -50, 0, 50, 800),
        createPlatform('w2', 1500, 0, 50, 800),
    ],
    goals: [
        createGoal(0, 200, 150), // High Hazard
        createGoal(1, 600, 100), // High General
        createGoal(2, 550, 400), // Mid Organic
        createGoal(3, 1200, 500), // Low Recycle
    ],
    boxes: [
        { variant: 0, x: 1250, y: 500 },
        { variant: 0, x: 1300, y: 500 },
        { variant: 1, x: 550, y: 400 },
        { variant: 1, x: 600, y: 400 },
        { variant: 2, x: 50, y: 500 },
        { variant: 3, x: 100, y: 500 },
    ],
    npcs: [
        { x: 50, y: 300 }
    ]
};

// LEVEL 4: Construction Site (Complex)
const LEVEL_4: LevelConfig = {
    playerStart: { x: 50, y: 500 },
    platforms: [
        createPlatform('floor', 0, 600, 2000, 50),
        createPlatform('p1', 300, 450, 100, 20),
        createPlatform('p2', 500, 350, 100, 20),
        createPlatform('p3', 700, 250, 100, 20), // Stairs up
        createPlatform('top', 800, 150, 400, 20), // Top floor
        createPlatform('cage', 900, 450, 200, 20), // Underneath top
        createPlatform('w1', -50, 0, 50, 800),
        createPlatform('w2', 2000, 0, 50, 800),
    ],
    goals: [
        createGoal(0, 900, 50), // Top Hazard
        createGoal(1, 950, 350), // Middle General
        createGoal(2, 100, 500), // Start Organic
        createGoal(3, 1600, 500), // Far Recycle
    ],
    boxes: [
        { variant: 0, x: 1600, y: 500 }, // Hazard Far
        { variant: 0, x: 1650, y: 500 },
        { variant: 1, x: 320, y: 400 }, // On p1
        { variant: 1, x: 520, y: 300 }, // On p2
        { variant: 2, x: 1000, y: 100 }, // On top
        { variant: 2, x: 1100, y: 100 },
        { variant: 3, x: 100, y: 200 }, // Falling from sky? No, just high start
    ],
    npcs: [
        { x: 100, y: 500 }
    ]
};

// LEVEL 5: The Landfill (Chaos)
const LEVEL_5: LevelConfig = {
    playerStart: { x: 1200, y: 200 },
    platforms: [
        createPlatform('g1', 0, 600, 600, 50),
        createPlatform('pit', 600, 750, 400, 50), // Deep pit
        createPlatform('g2', 1000, 600, 800, 50),
        createPlatform('island1', 200, 400, 200, 20),
        createPlatform('island2', 1400, 400, 200, 20),
        createPlatform('bridge', 700, 300, 200, 20), // High bridge
        createPlatform('w1', -50, 0, 50, 800),
        createPlatform('w2', 1800, 0, 50, 800),
    ],
    goals: [
        createGoal(0, 50, 500), // Left Corner
        createGoal(1, 1600, 500), // Right Corner
        createGoal(2, 250, 300), // Left Island
        createGoal(3, 1450, 300), // Right Island
    ],
    boxes: [
        { variant: 0, x: 1600, y: 300 },
        { variant: 0, x: 1650, y: 300 },
        { variant: 1, x: 100, y: 300 },
        { variant: 1, x: 150, y: 300 },
        { variant: 2, x: 750, y: 250 }, // Bridge
        { variant: 2, x: 800, y: 250 },
        { variant: 3, x: 700, y: 700 }, // In the pit
        { variant: 3, x: 750, y: 700 },
    ],
    npcs: [
        { x: 1100, y: 200 }
    ]
};

export const LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5];