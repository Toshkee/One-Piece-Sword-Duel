import Phaser from 'phaser';
import type { CharacterConfig } from '../config/characters';
import type { FighterStateName, InputSource, InputState, Rect } from './types';
import { NEUTRAL_INPUT } from './types';
import { applyDamage, computeAttackHitbox, damageAfterBlock } from './combat';
import { FLOOR_Y, HIT_INVULN, HURT_DURATION } from '../config/constants';
import { sound } from '../audio/SoundManager';

export interface HitResult {
  blocked: boolean;
  damage: number;
  ko: boolean;
}

/**
 * A fighter is a physics sprite driven by an explicit finite-state machine.
 * The body (hurtbox) is a narrow rectangle decoupled from the 200×200 art, and
 * attacks expose a hitbox only during their active animation frames. The same
 * class is used for the human player and the AI — the only difference is which
 * `InputSource` feeds it.
 */
export class Fighter extends Phaser.Physics.Arcade.Sprite {
  readonly config: CharacterConfig;
  private source: InputSource;
  opponent!: Fighter;

  health: number;
  facing: 1 | -1 = 1;
  state: FighterStateName = 'idle';

  private prev: InputState = { ...NEUTRAL_INPUT };
  private attackElapsed = 0;
  private attackDuration = 0;
  private attackIndex = 0; // alternates attack1 / attack2 for combo variety
  private hasHit = false;
  private hurtTimer = 0;
  private invulnTimer = 0;
  private blocking = false;
  private wasOnGround = true;
  private frozen = false; // set true during hitstop

  constructor(scene: Phaser.Scene, x: number, y: number, config: CharacterConfig, source: InputSource) {
    super(scene, x, y, `${config.id}-idle`, 0);
    this.config = config;
    this.source = source;
    this.health = config.maxHealth;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(config.body.width, config.body.height);
    body.setOffset(config.body.offsetX, config.body.offsetY);
    body.setCollideWorldBounds(true);

    this.setScale(config.scale);
    this.setDepth(10);
    this.play(`${config.id}-idle`);

    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onAnimComplete, this);
  }

  setOpponent(other: Fighter): void {
    this.opponent = other;
  }

  get isAlive(): boolean {
    return this.state !== 'dead';
  }

  get isBlocking(): boolean {
    return this.blocking;
  }

  /** Freeze for hitstop: pause animation + physics without losing state. */
  setFrozen(frozen: boolean): void {
    this.frozen = frozen;
    if (frozen) {
      this.anims.pause();
      (this.body as Phaser.Physics.Arcade.Body).moves = false;
    } else {
      this.anims.resume();
      (this.body as Phaser.Physics.Arcade.Body).moves = true;
    }
  }

  // ---- Per-frame update -------------------------------------------------

  step(dtSeconds: number): void {
    if (this.frozen) return;
    this.invulnTimer = Math.max(0, this.invulnTimer - dtSeconds);

    if (this.state === 'dead') {
      this.setVelocityX(0);
      return;
    }

    const input = this.source.sample();
    const onGround = (this.body as Phaser.Physics.Arcade.Body).blocked.down;

    if (this.state === 'hurt') {
      this.hurtTimer -= dtSeconds;
      if (this.hurtTimer <= 0) this.toGroundedState(onGround);
      this.prev = input;
      this.handleLanding(onGround);
      return;
    }

    if (this.state === 'attack') {
      this.attackElapsed += dtSeconds;
      if (onGround) this.setVelocityX(0);
      this.prev = input;
      this.handleLanding(onGround);
      return;
    }

    // --- Free to act ---
    this.faceOpponent();

    this.blocking = input.block && onGround;
    if (this.blocking) {
      this.setVelocityX(0);
      this.playState('idle');
      this.setTint(0x6fa8ff);
      this.prev = input;
      this.handleLanding(onGround);
      return;
    }
    this.clearTint();

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    this.setVelocityX(dir * this.config.speed);

    const jumpPressed = input.jump && !this.prev.jump;
    if (jumpPressed && onGround) {
      this.setVelocityY(this.config.jumpVelocity);
      sound.jump();
    }

    const attackPressed = input.attack && !this.prev.attack;
    if (attackPressed && onGround) {
      this.startAttack();
    } else {
      this.updateLocomotionAnim(onGround, dir);
    }

    this.handleLanding(onGround);
    this.prev = input;
  }

  private handleLanding(onGround: boolean): void {
    if (onGround && !this.wasOnGround) {
      sound.land();
      this.emit('land', this.x, FLOOR_Y);
    }
    this.wasOnGround = onGround;
  }

  private updateLocomotionAnim(onGround: boolean, dir: number): void {
    if (!onGround) {
      this.playState((this.body as Phaser.Physics.Arcade.Body).velocity.y < 0 ? 'jump' : 'fall');
    } else {
      this.playState(dir !== 0 ? 'run' : 'idle');
    }
  }

  private toGroundedState(onGround: boolean): void {
    this.state = onGround ? 'idle' : 'fall';
    this.playState(this.state);
  }

  private faceOpponent(): void {
    if (!this.opponent) return;
    this.facing = this.opponent.x < this.x ? -1 : 1;
    this.setFlipX(this.facing === -1);
  }

  // ---- Attacking --------------------------------------------------------

  private startAttack(): void {
    this.state = 'attack';
    this.attackElapsed = 0;
    this.hasHit = false;
    this.setVelocityX(0);
    const anim = this.attackIndex % 2 === 0 ? 'attack1' : 'attack2';
    this.attackIndex++;
    const def = this.config.anims[anim];
    this.attackDuration = def.frames / def.frameRate;
    this.playState(anim, true);
    sound.swing();
  }

  /** True only on the active frames of a swing that hasn't connected yet. */
  isHitActive(): boolean {
    if (this.state !== 'attack' || this.hasHit) return false;
    const p = this.attackDuration > 0 ? this.attackElapsed / this.attackDuration : 0;
    return p >= this.config.attack.activeStart && p <= this.config.attack.activeEnd;
  }

  markConnected(): void {
    this.hasHit = true;
  }

  getHurtRect(): Rect {
    const b = this.body as Phaser.Physics.Arcade.Body;
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  }

  getAttackRect(): Rect {
    return computeAttackHitbox(this.getHurtRect(), this.facing, this.config.attack.reach, this.config.attack.height);
  }

  // ---- Taking damage ----------------------------------------------------

  /** Apply an incoming hit. Returns what happened so the scene can drive
   *  juice (hitstop/shake/particles) and the right sound. */
  applyHit(rawDamage: number, knockbackDir: 1 | -1, knockback: number): HitResult {
    if (this.state === 'dead' || this.invulnTimer > 0) {
      return { blocked: false, damage: 0, ko: false };
    }
    const blocked = this.blocking;
    const dmg = damageAfterBlock(rawDamage, blocked);
    this.health = applyDamage(this.health, dmg);
    this.invulnTimer = HIT_INVULN;

    if (this.health <= 0) {
      this.die(knockbackDir);
      return { blocked, damage: dmg, ko: true };
    }

    if (blocked) {
      // Chip damage only: small shove, stay on your feet.
      this.setVelocityX(knockbackDir * knockback * 0.4);
      return { blocked, damage: dmg, ko: false };
    }

    this.state = 'hurt';
    this.hurtTimer = HURT_DURATION;
    this.setVelocity(knockbackDir * knockback, -knockback * 0.35);
    this.playState('takeHit', true);
    return { blocked, damage: dmg, ko: false };
  }

  private die(knockbackDir: 1 | -1): void {
    this.state = 'dead';
    this.blocking = false;
    this.clearTint();
    this.setVelocity(knockbackDir * 120, -200);
    this.playState('death', true);
  }

  // ---- Helpers ----------------------------------------------------------

  private playState(
    name: FighterStateName | 'attack1' | 'attack2' | 'takeHit' | 'death',
    force = false
  ): void {
    const key = `${this.config.id}-${name}`;
    if (name === 'idle' || name === 'run' || name === 'jump' || name === 'fall') {
      this.state = name;
    }
    this.play(key, !force ? true : undefined);
  }

  private onAnimComplete(anim: Phaser.Animations.Animation): void {
    if (anim.key.endsWith('attack1') || anim.key.endsWith('attack2')) {
      if (this.state === 'attack') {
        const onGround = (this.body as Phaser.Physics.Arcade.Body).blocked.down;
        this.toGroundedState(onGround);
      }
    } else if (anim.key.endsWith('takeHit')) {
      if (this.state === 'hurt' && this.hurtTimer <= 0) {
        const onGround = (this.body as Phaser.Physics.Arcade.Body).blocked.down;
        this.toGroundedState(onGround);
      }
    }
  }

  /** Put the fighter back to full health at a spawn position for a new round. */
  resetForRound(x: number, facing: 1 | -1): void {
    this.health = this.config.maxHealth;
    this.state = 'idle';
    this.attackIndex = 0;
    this.hasHit = false;
    this.hurtTimer = 0;
    this.invulnTimer = 0;
    this.blocking = false;
    this.frozen = false;
    this.facing = facing;
    this.clearTint();
    this.setActive(true).setVisible(true);
    const restY = FLOOR_Y - (this.config.body.offsetY + this.config.body.height - 100) * this.config.scale;
    this.setPosition(x, restY);
    this.setVelocity(0, 0);
    this.setFlipX(facing === -1);
    (this.body as Phaser.Physics.Arcade.Body).moves = true;
    this.anims.resume();
    this.playState('idle', true);
  }
}
