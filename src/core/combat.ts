import type { Rect } from './types';
import { BLOCK_CHIP_FACTOR, MAX_HEALTH } from '../config/constants';

/**
 * Pure combat math — no Phaser, no DOM, no side effects. This is the "rules
 * engine" the README talks about and the part covered by unit tests
 * (tests/combat.test.ts). Keeping it pure is what makes the combat verifiable.
 */

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Build the rectangular hitbox a fighter's swing sweeps through. `facing` is
 *  +1 (right) or -1 (left); the box starts at the fighter's leading edge. */
export function computeAttackHitbox(body: Rect, facing: 1 | -1, reach: number, height: number): Rect {
  const x = facing === 1 ? body.x + body.width : body.x - reach;
  // Centre the swing vertically on the upper torso, where a sword arc lands.
  const y = body.y + body.height * 0.1;
  return { x, y, width: reach, height };
}

/** Damage actually dealt once blocking is taken into account. */
export function damageAfterBlock(raw: number, blocking: boolean): number {
  return blocking ? Math.round(raw * BLOCK_CHIP_FACTOR) : raw;
}

export function applyDamage(health: number, damage: number): number {
  return clamp(health - damage, 0, MAX_HEALTH);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export type RoundOutcome =
  | { result: 'p1'; reason: 'ko' | 'time' }
  | { result: 'p2'; reason: 'ko' | 'time' }
  | { result: 'draw'; reason: 'ko' | 'time' };

/** Decide a round given both fighters' health and whether it ended on a KO or
 *  the clock. Used by the Fight scene and exercised directly by tests. */
export function resolveRound(p1Health: number, p2Health: number, reason: 'ko' | 'time'): RoundOutcome {
  if (p1Health <= 0 && p2Health <= 0) return { result: 'draw', reason };
  if (p1Health <= 0) return { result: 'p2', reason };
  if (p2Health <= 0) return { result: 'p1', reason };
  if (p1Health > p2Health) return { result: 'p1', reason };
  if (p2Health > p1Health) return { result: 'p2', reason };
  return { result: 'draw', reason };
}

/** Match is won by the first side to reach `roundsToWin` round wins. */
export function matchWinner(
  p1Rounds: number,
  p2Rounds: number,
  roundsToWin: number
): 'p1' | 'p2' | null {
  if (p1Rounds >= roundsToWin) return 'p1';
  if (p2Rounds >= roundsToWin) return 'p2';
  return null;
}
