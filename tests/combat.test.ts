import { describe, it, expect } from 'vitest';
import {
  applyDamage,
  clamp,
  computeAttackHitbox,
  damageAfterBlock,
  matchWinner,
  rectsOverlap,
  resolveRound,
} from '../src/core/combat';
import type { Rect } from '../src/core/types';

describe('rectsOverlap', () => {
  const a: Rect = { x: 0, y: 0, width: 10, height: 10 };
  it('detects overlap', () => {
    expect(rectsOverlap(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
  });
  it('rejects separated rects', () => {
    expect(rectsOverlap(a, { x: 20, y: 0, width: 5, height: 5 })).toBe(false);
  });
  it('treats edge-touching as non-overlapping', () => {
    expect(rectsOverlap(a, { x: 10, y: 0, width: 5, height: 5 })).toBe(false);
  });
});

describe('computeAttackHitbox', () => {
  const body: Rect = { x: 100, y: 50, width: 40, height: 120 };
  it('puts the box in front when facing right', () => {
    const box = computeAttackHitbox(body, 1, 90, 150);
    expect(box.x).toBe(140); // body right edge
    expect(box.width).toBe(90);
  });
  it('puts the box in front when facing left', () => {
    const box = computeAttackHitbox(body, -1, 90, 150);
    expect(box.x).toBe(10); // body left edge minus reach
    expect(box.width).toBe(90);
  });
});

describe('damageAfterBlock', () => {
  it('passes full damage when not blocking', () => {
    expect(damageAfterBlock(12, false)).toBe(12);
  });
  it('reduces to chip damage when blocking', () => {
    expect(damageAfterBlock(12, true)).toBe(2); // round(12 * 0.2)
  });
});

describe('applyDamage / clamp', () => {
  it('subtracts and floors at 0', () => {
    expect(applyDamage(10, 15)).toBe(0);
  });
  it('never exceeds max', () => {
    expect(applyDamage(100, -50)).toBe(100);
  });
  it('clamps within range', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });
});

describe('resolveRound', () => {
  it('awards the round to the fighter with more health on time-out', () => {
    expect(resolveRound(70, 40, 'time')).toEqual({ result: 'p1', reason: 'time' });
    expect(resolveRound(20, 90, 'time')).toEqual({ result: 'p2', reason: 'time' });
  });
  it('is a draw on equal health', () => {
    expect(resolveRound(50, 50, 'time').result).toBe('draw');
  });
  it('awards to the survivor on a KO', () => {
    expect(resolveRound(0, 25, 'ko')).toEqual({ result: 'p2', reason: 'ko' });
    expect(resolveRound(25, 0, 'ko')).toEqual({ result: 'p1', reason: 'ko' });
  });
  it('is a draw on a double KO', () => {
    expect(resolveRound(0, 0, 'ko').result).toBe('draw');
  });
});

describe('matchWinner', () => {
  it('returns null before anyone reaches the target', () => {
    expect(matchWinner(1, 1, 2)).toBeNull();
  });
  it('returns the first to reach the target', () => {
    expect(matchWinner(2, 1, 2)).toBe('p1');
    expect(matchWinner(0, 2, 2)).toBe('p2');
  });
});
