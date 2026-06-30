import Phaser from 'phaser';
import {
  ARENA_PADDING,
  DIFFICULTIES,
  FLOOR_Y,
  GAME_HEIGHT,
  GAME_WIDTH,
  HITSTOP_KO_MS,
  HITSTOP_MS,
  MAX_HEALTH,
  ROUND_TIME,
  ROUNDS_TO_WIN,
  SHAKE_HIT,
  SHAKE_MAX,
} from '../config/constants';
import { getCharacter } from '../config/characters';
import { Fighter } from '../core/Fighter';
import { AIController } from '../core/AIController';
import { CompositeSource, KeyboardSource, P1_KEYS, P2_KEYS, StateSource } from '../core/input';
import { HealthBar } from '../ui/HealthBar';
import { matchWinner, rectsOverlap, resolveRound } from '../core/combat';
import type { ActionName, GameMode, InputSource } from '../core/types';
import { sound } from '../audio/SoundManager';

interface FightConfig {
  mode: GameMode;
  difficulty: keyof typeof DIFFICULTIES;
}

type Side = 'p1' | 'p2';
type RoundState = 'intro' | 'fighting' | 'roundEnd';

export class FightScene extends Phaser.Scene {
  private cfg!: FightConfig;
  private p1!: Fighter;
  private p2!: Fighter;
  private ai: AIController | null = null;
  private aiSource: StateSource | null = null;
  private touchSource: StateSource | null = null;

  private p1Bar!: HealthBar;
  private p2Bar!: HealthBar;
  private timerText!: Phaser.GameObjects.Text;
  private p1Pips: Phaser.GameObjects.Arc[] = [];
  private p2Pips: Phaser.GameObjects.Arc[] = [];
  private announceText!: Phaser.GameObjects.Text;

  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;

  private roundState: RoundState = 'intro';
  private koActive = false;
  private hitstop = 0;
  private timeLeft = ROUND_TIME;
  private timerEvent?: Phaser.Time.TimerEvent;
  private roundsWon: Record<Side, number> = { p1: 0, p2: 0 };
  private combo: Record<Side, number> = { p1: 0, p2: 0 };
  private comboResetEvent: Record<Side, Phaser.Time.TimerEvent | null> = { p1: null, p2: null };

  constructor() {
    super('FightScene');
  }

  create(data: FightConfig): void {
    this.cfg = data;
    this.roundsWon = { p1: 0, p2: 0 };
    this.koActive = false;
    this.hitstop = 0;

    this.cameras.main.fadeIn(220, 0, 0, 0);
    this.buildArena();
    // Touch controls (single-player only) must exist before fighters so P1's
    // composite input source can include them.
    if (this.game.device.input.touch && this.cfg.mode === 'cpu') this.touchSource = new StateSource();
    this.buildFighters();
    this.buildHud();
    this.buildParticles();
    if (this.touchSource) this.createTouchButtons(this.touchSource);

    this.startRound();
  }

  // ---- Setup ------------------------------------------------------------

  private buildArena(): void {
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'background');
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(0);
    this.add.image(GAME_WIDTH / 2 + 250, GAME_HEIGHT - 96, 'shop').setScale(2).setDepth(1).setAlpha(0.95);
    // Mood overlay for contrast behind the HUD/fighters.
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x05060c, 0.22).setDepth(2);

    // Ambient embers drifting up, behind the fighters.
    this.add
      .particles(0, 0, 'spark', {
        x: { min: 0, max: GAME_WIDTH },
        y: GAME_HEIGHT + 10,
        speedY: { min: -22, max: -55 },
        speedX: { min: -12, max: 12 },
        lifespan: 6500,
        scale: { start: 0.22, end: 0 },
        alpha: { start: 0.4, end: 0 },
        frequency: 360,
        tint: 0xff9a3c,
        blendMode: 'ADD',
      })
      .setDepth(4);

    this.physics.world.setBounds(ARENA_PADDING, 0, GAME_WIDTH - 2 * ARENA_PADDING, GAME_HEIGHT);
  }

  private buildFighters(): void {
    const ronin = getCharacter('ronin');
    const oni = getCharacter('oni');

    // Player 1: keyboard (+ touch on phones).
    const p1Sources: InputSource[] = [new KeyboardSource(this, P1_KEYS)];
    if (this.touchSource) p1Sources.push(this.touchSource);
    this.p1 = new Fighter(this, 300, 0, ronin, new CompositeSource(p1Sources));

    // Player 2: AI or second keyboard.
    if (this.cfg.mode === 'cpu') {
      this.aiSource = new StateSource();
      this.p2 = new Fighter(this, GAME_WIDTH - 300, 0, oni, this.aiSource);
      this.ai = new AIController(this.p2, this.aiSource, DIFFICULTIES[this.cfg.difficulty]);
    } else {
      this.p2 = new Fighter(this, GAME_WIDTH - 300, 0, oni, new KeyboardSource(this, P2_KEYS));
    }

    this.p1.setOpponent(this.p2);
    this.p2.setOpponent(this.p1);

    // Ground + body-to-body collisions.
    const ground = this.add.rectangle(GAME_WIDTH / 2, FLOOR_Y + 47, GAME_WIDTH, 94, 0x000000, 0);
    this.physics.add.existing(ground, true);
    this.physics.add.collider(this.p1, ground);
    this.physics.add.collider(this.p2, ground);
    this.physics.add.collider(this.p1, this.p2);

    // Kick up dust where a fighter lands. (this.dust is created in buildParticles,
    // which runs before any landing can occur.)
    const onLand = (x: number, y: number) => this.dust.explode(8, x, y);
    this.p1.on('land', onLand);
    this.p2.on('land', onLand);
  }

  private buildHud(): void {
    const barW = 408;
    this.p1Bar = new HealthBar(this, 36, 52, barW, 26, this.p1.config.themeColor, false, this.p1.config.name);
    this.p2Bar = new HealthBar(this, GAME_WIDTH - 36 - barW, 52, barW, 26, this.p2.config.themeColor, true, this.p2.config.name);

    this.timerText = this.add
      .text(GAME_WIDTH / 2, 44, String(ROUND_TIME), {
        fontFamily: 'Georgia, serif',
        fontSize: '44px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(45);

    // Round pips (best of 3 → 2 to win).
    for (let i = 0; i < ROUNDS_TO_WIN; i++) {
      this.p1Pips.push(this.add.circle(54 + i * 24, 90, 8, 0x333a4d).setStrokeStyle(2, 0xffffff, 0.7).setDepth(45));
      this.p2Pips.push(
        this.add.circle(GAME_WIDTH - 54 - i * 24, 90, 8, 0x333a4d).setStrokeStyle(2, 0xffffff, 0.7).setDepth(45)
      );
    }

    this.announceText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '88px',
        color: '#ffd34d',
        stroke: '#000000',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(60)
      .setAlpha(0);

    // Pause / quit to menu.
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MenuScene'));
  }

  private buildParticles(): void {
    this.sparks = this.add
      .particles(0, 0, 'spark', {
        speed: { min: 120, max: 360 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.75, end: 0 },
        lifespan: 360,
        gravityY: 320,
        blendMode: 'ADD',
        tint: [0xffffff, 0xffd34d, 0xff8a3c],
        emitting: false,
      })
      .setDepth(30);

    this.dust = this.add
      .particles(0, 0, 'dust', {
        speed: { min: 30, max: 95 },
        angle: { min: 200, max: 340 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.5, end: 0 },
        lifespan: 450,
        gravityY: -10,
        tint: 0xcfd6e6,
        emitting: false,
      })
      .setDepth(9);
  }

  /** On-screen controls for phones. Each button writes the same named action a
   *  key would into the touch StateSource, so the Fighter is none the wiser. */
  private createTouchButtons(src: StateSource): void {
    this.input.addPointer(3); // allow simultaneous move + attack

    const mk = (x: number, y: number, r: number, label: string, action: ActionName) => {
      const c = this.add
        .circle(x, y, r, 0xffffff, 0.12)
        .setStrokeStyle(2, 0xffffff, 0.45)
        .setScrollFactor(0)
        .setDepth(100)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(x, y, label, { fontSize: `${Math.round(r * 0.8)}px`, color: '#ffffff' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(101);
      const press = () => {
        src.set(action, true);
        c.setFillStyle(0xffffff, 0.32);
      };
      const release = () => {
        src.set(action, false);
        c.setFillStyle(0xffffff, 0.12);
      };
      c.on('pointerdown', press);
      c.on('pointerup', release);
      c.on('pointerout', release);
      c.on('pointerupoutside', release);
    };

    const by = GAME_HEIGHT - 72;
    mk(74, by, 44, '◀', 'left');
    mk(180, by, 44, '▶', 'right');
    mk(GAME_WIDTH - 84, by, 48, '⚔', 'attack');
    mk(GAME_WIDTH - 196, by - 52, 38, '↑', 'jump');
    mk(GAME_WIDTH - 196, by + 22, 34, '⛊', 'block');
  }

  // ---- Round lifecycle --------------------------------------------------

  private startRound(): void {
    this.roundState = 'intro';
    this.koActive = false;
    this.combo = { p1: 0, p2: 0 };
    this.p1.anims.timeScale = 1;
    this.p2.anims.timeScale = 1;

    this.p1.resetForRound(300, 1);
    this.p2.resetForRound(GAME_WIDTH - 300, -1);
    this.p1Bar.set(MAX_HEALTH, MAX_HEALTH);
    this.p2Bar.set(MAX_HEALTH, MAX_HEALTH);

    this.timeLeft = ROUND_TIME;
    this.timerText.setText(String(this.timeLeft)).setColor('#ffffff');

    const roundNo = this.roundsWon.p1 + this.roundsWon.p2 + 1;
    this.announce(`ROUND ${roundNo}`, '#ffffff', () => {
      this.announce('FIGHT!', '#ffd34d', () => {
        this.roundState = 'fighting';
        sound.roundStart();
        this.startTimer();
      });
    });
  }

  private startTimer(): void {
    this.timerEvent?.remove();
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.roundState !== 'fighting') return;
        this.timeLeft--;
        this.timerText.setText(String(Math.max(0, this.timeLeft)));
        if (this.timeLeft <= 10) {
          this.timerText.setColor('#ff5a6e');
          this.tweens.add({ targets: this.timerText, scale: 1.25, duration: 180, yoyo: true });
        }
        if (this.timeLeft <= 0) this.endRoundByTime();
      },
    });
  }

  private endRoundByTime(): void {
    this.roundState = 'roundEnd';
    this.timerEvent?.remove();
    const outcome = resolveRound(this.p1.health, this.p2.health, 'time');
    if (outcome.result === 'draw') {
      this.announce('DRAW', '#cbd2e6', () => this.startRound());
    } else {
      this.finishRound(outcome.result);
    }
  }

  private finishRound(winner: Side): void {
    this.roundState = 'roundEnd';
    this.roundsWon[winner]++;
    this.updatePips();

    const champ = matchWinner(this.roundsWon.p1, this.roundsWon.p2, ROUNDS_TO_WIN);
    const winnerFighter = winner === 'p1' ? this.p1 : this.p2;

    this.time.delayedCall(this.koActive ? 250 : 0, () => {
      this.announce(`${winnerFighter.config.name.toUpperCase()} WINS THE ROUND`, '#ffd34d', () => {
        if (champ) {
          this.endMatch(champ);
        } else {
          this.startRound();
        }
      });
    });
  }

  private endMatch(winner: Side): void {
    const wf = winner === 'p1' ? this.p1 : this.p2;
    this.cameras.main.fadeOut(280, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('ResultScene', {
        mode: this.cfg.mode,
        difficulty: this.cfg.difficulty,
        winnerName: wf.config.name,
        winnerColor: wf.config.themeColor,
        p1Name: this.p1.config.name,
        p2Name: this.p2.config.name,
        p1Rounds: this.roundsWon.p1,
        p2Rounds: this.roundsWon.p2,
      });
    });
  }

  // ---- Main loop --------------------------------------------------------

  update(_time: number, delta: number): void {
    // Hitstop: freeze the action for a beat on a connecting hit.
    if (this.hitstop > 0) {
      this.hitstop -= delta;
      if (this.hitstop <= 0) {
        this.p1.setFrozen(false);
        this.p2.setFrozen(false);
      }
      return;
    }

    if (this.roundState !== 'fighting') return;

    const dt = delta / 1000;
    if (this.ai) this.ai.update(dt);
    this.p1.step(dt);
    this.p2.step(dt);

    this.resolveHits(this.p1, this.p2);
    this.resolveHits(this.p2, this.p1);
  }

  private resolveHits(attacker: Fighter, defender: Fighter): void {
    if (!attacker.isHitActive()) return;
    if (!rectsOverlap(attacker.getAttackRect(), defender.getHurtRect())) return;

    attacker.markConnected();
    const dir = attacker.facing;
    const res = defender.applyHit(attacker.config.attack.damage, dir, attacker.config.attack.knockback);

    // Whiffed into i-frames — nothing to celebrate.
    if (res.damage <= 0 && !res.ko && !res.blocked) return;

    const contactX = (attacker.x + defender.x) / 2;
    const contactY = defender.getHurtRect().y + 46;
    this.onConnect(attacker, defender, res, contactX, contactY);
  }

  private onConnect(
    attacker: Fighter,
    defender: Fighter,
    res: { blocked: boolean; damage: number; ko: boolean },
    x: number,
    y: number
  ): void {
    const defSide: Side = defender === this.p1 ? 'p1' : 'p2';
    const atkSide: Side = attacker === this.p1 ? 'p1' : 'p2';
    const bar = defSide === 'p1' ? this.p1Bar : this.p2Bar;
    bar.set(defender.health, MAX_HEALTH);

    if (res.blocked) {
      sound.block();
      this.sparks.explode(7, x, y);
      this.cameras.main.shake(80, 0.004);
      this.floatText(x, y - 20, 'BLOCK', '#7fd0ff');
      return;
    }

    sound.hit(res.ko ? 1 : 0.7);
    this.sparks.explode(res.ko ? 24 : 14, x, y);
    this.floatText(x, y - 20, `-${res.damage}`, '#ffffff');

    // White silhouette flash on the victim (Phaser 4: tint colour + FILL mode).
    defender.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(90, () => {
      if (defender.isAlive) {
        defender.clearTint();
        defender.setTintMode(Phaser.TintModes.MULTIPLY);
      }
    });

    const intensity = Math.min(SHAKE_MAX, SHAKE_HIT * res.damage);
    this.cameras.main.shake(res.ko ? 260 : 110, res.ko ? SHAKE_MAX : intensity);

    // Combo tracking for the attacker.
    this.combo[atkSide]++;
    if (this.combo[atkSide] >= 2) this.showCombo(atkSide, attacker.x);
    this.comboResetEvent[atkSide]?.remove();
    this.comboResetEvent[atkSide] = this.time.delayedCall(1300, () => {
      this.combo[atkSide] = 0;
    });

    if (res.ko) {
      this.doKO(atkSide);
    } else {
      this.doHitstop(HITSTOP_MS);
    }
  }

  private doHitstop(ms: number): void {
    this.hitstop = ms;
    this.p1.setFrozen(true);
    this.p2.setFrozen(true);
  }

  private doKO(winner: Side): void {
    this.koActive = true;
    this.roundState = 'roundEnd';
    this.timerEvent?.remove();
    sound.ko();

    // Full-screen white flash.
    const flash = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0.85)
      .setScrollFactor(0)
      .setDepth(55);
    this.tweens.add({ targets: flash, alpha: 0, duration: 420, onComplete: () => flash.destroy() });

    // Cinematic vignette darkens the edges during the finisher.
    const vignette = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x05060c, 0)
      .setScrollFactor(0)
      .setDepth(54);
    this.tweens.add({ targets: vignette, alpha: 0.42, duration: 320 });

    this.doHitstop(HITSTOP_KO_MS);

    // Slow-mo on the death animation + a hard shake. (No camera zoom, so the
    // world-anchored HUD stays put.)
    this.p1.anims.timeScale = 0.4;
    this.p2.anims.timeScale = 0.4;
    this.cameras.main.shake(280, 0.012);

    this.announce('K.O.', '#ff5a6e');

    this.time.delayedCall(950, () => {
      this.p1.anims.timeScale = 1;
      this.p2.anims.timeScale = 1;
      vignette.destroy();
      this.finishRound(winner);
    });
  }

  // ---- Small UI helpers -------------------------------------------------

  private announce(text: string, color: string, onDone?: () => void): void {
    this.announceText.setText(text).setColor(color).setAlpha(0).setScale(0.5);
    this.tweens.add({
      targets: this.announceText,
      alpha: 1,
      scale: 1,
      duration: 260,
      ease: 'Back.easeOut',
    });
    this.time.delayedCall(820, () => {
      this.tweens.add({
        targets: this.announceText,
        alpha: 0,
        scale: 1.3,
        duration: 220,
        onComplete: () => onDone?.(),
      });
    });
  }

  private floatText(x: number, y: number, text: string, color: string): void {
    const t = this.add
      .text(x, y, text, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '28px',
        color,
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(50);
    this.tweens.add({
      targets: t,
      y: y - 60,
      alpha: 0,
      scale: 1.3,
      duration: 700,
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  private showCombo(side: Side, x: number): void {
    const t = this.add
      .text(x, 170, `${this.combo[side]} HITS`, {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        color: '#ffd34d',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setScale(0.6);
    this.tweens.add({ targets: t, scale: 1.1, duration: 140, yoyo: true });
    this.tweens.add({ targets: t, alpha: 0, delay: 500, duration: 350, onComplete: () => t.destroy() });
  }

  private updatePips(): void {
    this.p1Pips.forEach((p, i) => p.setFillStyle(i < this.roundsWon.p1 ? this.p1.config.themeColor : 0x333a4d));
    this.p2Pips.forEach((p, i) => p.setFillStyle(i < this.roundsWon.p2 ? this.p2.config.themeColor : 0x333a4d));
  }
}
