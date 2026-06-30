/**
 * Global tunables. Centralising every magic number here (instead of sprinkling
 * `15`, `190`, `60` through the code like the original prototype did) keeps the
 * game balanced from one place and makes the logic readable.
 */

// --- World ---
export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 576;
/** World Y at which a fighter's feet rest — aligned to the dirt path baked into
 *  background.png (the walkable surface, not the canvas bottom). */
export const FLOOR_Y = 512;
export const WORLD_GRAVITY = 2100;
/** Horizontal padding that keeps fighters inside the arena. */
export const ARENA_PADDING = 60;

// --- Match rules ---
export const ROUND_TIME = 60; // seconds
export const ROUNDS_TO_WIN = 2; // best of 3
export const MAX_HEALTH = 100;

// --- Combat feel ---
/** Fraction of damage that still lands when a hit is blocked (chip damage). */
export const BLOCK_CHIP_FACTOR = 0.2;
/** Seconds a fighter is locked in hit-reaction. */
export const HURT_DURATION = 0.32;
/** Seconds of i-frames after being hit, so a single swing can't multi-hit. */
export const HIT_INVULN = 0.35;
export const KNOCKBACK_DECAY = 0.86;

// --- Juice (see README "Game feel") ---
export const HITSTOP_MS = 95; // freeze-frame on a connecting hit
export const HITSTOP_KO_MS = 380; // longer freeze on the killing blow
export const FLASH_MS = 90; // white tint flash on the victim
export const SHAKE_HIT = 0.0045; // camera trauma added per point of damage
export const SHAKE_MAX = 0.05;
export const SLOWMO_KO_SCALE = 0.25; // time scale during the KO finisher
export const SLOWMO_KO_MS = 900;

// --- Difficulty presets for the AI opponent ---
export interface Difficulty {
  label: string;
  reactionMs: number; // how slowly the AI responds to range changes
  aggression: number; // 0..1 chance to advance/attack when in range
  blockChance: number; // 0..1 chance to block an incoming swing
  jitter: number; // 0..1 randomness in spacing
}

export const DIFFICULTIES: Record<'easy' | 'normal' | 'hard', Difficulty> = {
  easy: { label: 'Easy', reactionMs: 360, aggression: 0.45, blockChance: 0.12, jitter: 0.5 },
  normal: { label: 'Normal', reactionMs: 200, aggression: 0.7, blockChance: 0.3, jitter: 0.3 },
  hard: { label: 'Hard', reactionMs: 90, aggression: 0.92, blockChance: 0.55, jitter: 0.12 },
};
