/** The five abstract actions the game understands. Every input source —
 *  keyboard, touch, gamepad, AI — is reduced to this same shape, which is what
 *  lets one Fighter implementation be driven by a human or a bot unchanged. */
export type ActionName = 'left' | 'right' | 'jump' | 'attack' | 'block';

export type InputState = Record<ActionName, boolean>;

export const NEUTRAL_INPUT: InputState = {
  left: false,
  right: false,
  jump: false,
  attack: false,
  block: false,
};

/** Anything that can be polled once per frame for the current action state. */
export interface InputSource {
  sample(): InputState;
}

/** Plain axis-aligned rectangle used by the pure combat math (no Phaser types
 *  here on purpose, so the logic is unit-testable in Node). */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type FighterStateName = 'idle' | 'run' | 'jump' | 'fall' | 'attack' | 'hurt' | 'dead';

export type GameMode = 'cpu' | 'versus';
