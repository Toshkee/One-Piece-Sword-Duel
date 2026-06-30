import type { Fighter } from './Fighter';
import type { StateSource } from './input';
import type { Difficulty } from '../config/constants';

/**
 * A small behaviour controller for the CPU fighter. It does NOT drive the
 * fighter directly — it writes the same five named actions a human keyboard
 * would, into a StateSource. That's the payoff of the input abstraction: the
 * Fighter can't tell a person from this class.
 *
 * Behaviour is a lightweight state machine over distance/health/timing:
 *   far  → advance (occasional hop)
 *   near → swing on a cooldown, sometimes micro-space backwards
 *   under threat → block based on difficulty
 */
export class AIController {
  private attackCd = 0;
  private jumpCd = 0;
  private thinkMs = 0;
  private wantAdvance = true;

  constructor(
    private self: Fighter,
    private out: StateSource,
    private diff: Difficulty
  ) {}

  update(dt: number): void {
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.jumpCd = Math.max(0, this.jumpCd - dt);
    this.thinkMs -= dt * 1000;

    this.out.reset();

    const self = this.self;
    const opp = self.opponent;
    if (!opp || !self.isAlive) return;
    // Can't act mid-swing / mid-stagger anyway.
    if (self.state === 'attack' || self.state === 'hurt' || self.state === 'dead') return;

    const dx = opp.x - self.x;
    const dist = Math.abs(dx);
    const towards = dx < 0 ? 'left' : 'right';
    const away = dx < 0 ? 'right' : 'left';
    const range = self.config.attack.reach + 55;

    // Re-roll disposition on the difficulty's reaction cadence (slower = dumber).
    if (this.thinkMs <= 0) {
      this.thinkMs = this.diff.reactionMs;
      this.wantAdvance = Math.random() < this.diff.aggression;
    }

    // Defensive read: block an incoming swing (probability scaled per second).
    if (opp.state === 'attack' && dist < range + 30 && Math.random() < this.diff.blockChance * dt * 60) {
      this.out.set('block', true);
      return;
    }

    if (dist > range) {
      if (this.wantAdvance) this.out.set(towards, true);
      // Hop toward an airborne opponent or just to feel less robotic.
      const oppAirborne = opp.body ? (opp.body as { velocity: { y: number } }).velocity.y < -10 : false;
      if (this.jumpCd <= 0 && (oppAirborne || Math.random() < 0.008 + this.diff.jitter * 0.012)) {
        this.out.set('jump', true);
        this.jumpCd = 1.1;
      }
    } else {
      // In range: swing on cooldown, weighted by aggression.
      if (this.attackCd <= 0 && Math.random() < this.diff.aggression) {
        this.out.set('attack', true);
        this.attackCd = 0.45 + (1 - this.diff.aggression) * 0.55;
      } else if (Math.random() < this.diff.jitter * 0.03) {
        this.out.set(away, true); // micro-space backwards
      }
    }
  }
}
