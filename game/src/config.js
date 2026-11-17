// Tuning for Comet Courier: one place for every number that shapes the game.
// The world is a fixed 1280x720 stage; the canvas scales to the window.

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;

export const SHIP_START_X = WORLD_WIDTH / 2;
export const SHIP_START_Y = WORLD_HEIGHT / 2 + 120;
export const SHIP_RADIUS = 16;
export const SHIP_ACCEL = 2600;
export const SHIP_MAX_SPEED = 420;
export const SHIP_FRICTION = 4.2;
export const MOUSE_FOLLOW_STRENGTH = 9.5;

export const DASH_SPEED = 950;
export const DASH_TIME = 0.32;
export const DASH_COOLDOWN = 1.15;
export const DASH_KILL_SCORE = 15;

export const START_LIVES = 3;
export const MAX_LIVES = 5;
export const HIT_INVULN_TIME = 1.6;
export const TARGET_SCORE = 600;

export const CARGO_CAPACITY = 5;
export const SHARD_RADIUS = 11;
export const SHARD_SPAWN_INTERVAL = 1.15;
export const MAX_SHARDS = 14;
export const COLLECT_SCORE = 2;
export const DELIVER_SCORE = 10;
export const DELIVER_COMBO_STEP = 5;
export const COMBO_WINDOW = 4.0;
export const COMBO_MAX = 5;

export const WAVE_TIME = 40;
export const WAVE_BONUS_SCORE = 25;
export const WISP_BASE_INTERVAL = 2.6;
export const WISP_MIN_INTERVAL = 0.9;
export const WISP_MAX_COUNT = 16;

export const POWERUP_INTERVAL = 13;
export const SLOW_TIME = 6;
export const MAGNET_TIME = 8;
export const MAGNET_RADIUS = 190;

// The three shard/gate kinds: each has a color and a shape, so color is never
// the only signal. Names are the courier's own delivery codes.
export const KINDS = [
  { name: 'amber', color: '#ffc857', glow: 'rgba(255, 200, 87, 0.55)', shape: 'triangle' },
  { name: 'cyan', color: '#4de8e0', glow: 'rgba(77, 232, 224, 0.55)', shape: 'circle' },
  { name: 'magenta', color: '#ff6ec7', glow: 'rgba(255, 110, 199, 0.55)', shape: 'square' },
];

export const GATE_POSITIONS = [
  { x: 170, y: 175, kind: 0 },
  { x: WORLD_WIDTH - 170, y: 175, kind: 1 },
  { x: WORLD_WIDTH / 2, y: 175, kind: 2 },
];
export const GATE_RADIUS = 52;

export const PALETTE = {
  spaceTop: '#0b1026',
  spaceBottom: '#1a0f33',
  hudText: '#eaf2ff',
  hudDim: '#9fb2d8',
  danger: '#ff5d6c',
  gold: '#ffd166',
};
