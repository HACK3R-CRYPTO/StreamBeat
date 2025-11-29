// Game configuration for StreamBeat

export type GameType = 'rhythm' | 'simon';

export interface GameConfig {
  name: string;
  description: string;
  path: string;
  icon: string;
  type: GameType;
}

export const GAMES: Record<GameType, GameConfig> = {
  rhythm: {
    name: 'Rhythm Rush',
    description: 'Tap buttons in perfect rhythm',
    path: '/play',
    icon: '🎵',
    type: 'rhythm',
  },
  simon: {
    name: 'Simon Game',
    description: 'Memory pattern challenge',
    path: '/simon-game',
    icon: '🧠',
    type: 'simon',
  },
} as const;

export const DEFAULT_GAME: GameType = 'rhythm';

// Rhythm game constants
export const RHYTHM_GAME_CONFIG = {
  DURATION: 30000, // 30 seconds
  BEAT_INTERVAL: 800, // ms between beats
  PERFECT_WINDOW: 400, // ms for perfect hit
  GOOD_WINDOW: 700, // ms for good hit
  PERFECT_SCORE: 10,
  GOOD_SCORE: 5,
  COMBO_MULTIPLIER: 1.5, // Score multiplier for combos
  MAX_COMBO: 50,
  PROGRESSIVE_DIFFICULTY: true, // Increase speed over time
} as const;

// Simon game constants
export const SIMON_GAME_CONFIG = {
  FLASH_DURATION: 300,
  SEQUENCE_DELAY: 600,
  INITIAL_DELAY: 400,
  BASE_SCORE_PER_SEQUENCE: 10,
  SPEED_BONUS_DIVISOR: 1000,
} as const;

