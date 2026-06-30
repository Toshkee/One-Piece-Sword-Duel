import Phaser from 'phaser';
import type { ActionName, InputSource, InputState } from './types';
import { NEUTRAL_INPUT } from './types';

/**
 * Input abstraction. Keyboard, touch and AI each implement the same
 * `InputSource.sample()` contract, so a Fighter never knows (or cares) what is
 * driving it. Adding gamepad support later is just another source here — the
 * Fighter, combat and animation code stay untouched.
 */

type KeyMap = Record<ActionName, number>;

export const P1_KEYS: KeyMap = {
  left: Phaser.Input.Keyboard.KeyCodes.A,
  right: Phaser.Input.Keyboard.KeyCodes.D,
  jump: Phaser.Input.Keyboard.KeyCodes.W,
  attack: Phaser.Input.Keyboard.KeyCodes.SPACE,
  block: Phaser.Input.Keyboard.KeyCodes.SHIFT,
};

export const P2_KEYS: KeyMap = {
  left: Phaser.Input.Keyboard.KeyCodes.LEFT,
  right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
  jump: Phaser.Input.Keyboard.KeyCodes.UP,
  attack: Phaser.Input.Keyboard.KeyCodes.ENTER,
  block: Phaser.Input.Keyboard.KeyCodes.FORWARD_SLASH,
};

export class KeyboardSource implements InputSource {
  private keys: Record<ActionName, Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene, map: KeyMap) {
    const kb = scene.input.keyboard!;
    this.keys = {
      left: kb.addKey(map.left),
      right: kb.addKey(map.right),
      jump: kb.addKey(map.jump),
      attack: kb.addKey(map.attack),
      block: kb.addKey(map.block),
    };
  }

  sample(): InputState {
    return {
      left: this.keys.left.isDown,
      right: this.keys.right.isDown,
      jump: this.keys.jump.isDown,
      attack: this.keys.attack.isDown,
      block: this.keys.block.isDown,
    };
  }
}

/** A mutable state holder written to by on-screen touch buttons or by the AI. */
export class StateSource implements InputSource {
  state: InputState = { ...NEUTRAL_INPUT };
  sample(): InputState {
    return { ...this.state };
  }
  set(action: ActionName, value: boolean): void {
    this.state[action] = value;
  }
  reset(): void {
    this.state = { ...NEUTRAL_INPUT };
  }
}

/** Logical OR of several sources so a player can use keyboard *and* touch. */
export class CompositeSource implements InputSource {
  constructor(private sources: InputSource[]) {}
  sample(): InputState {
    const out: InputState = { ...NEUTRAL_INPUT };
    for (const src of this.sources) {
      const s = src.sample();
      out.left ||= s.left;
      out.right ||= s.right;
      out.jump ||= s.jump;
      out.attack ||= s.attack;
      out.block ||= s.block;
    }
    return out;
  }
}
