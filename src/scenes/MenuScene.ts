import Phaser from 'phaser';
import { FLOOR_Y, GAME_HEIGHT, GAME_WIDTH, DIFFICULTIES } from '../config/constants';
import type { GameMode } from '../core/types';
import { sound } from '../audio/SoundManager';

interface StartConfig {
  mode: GameMode;
  difficulty: keyof typeof DIFFICULTIES;
}

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.buildBackdrop();

    // Fighter previews squaring off, planted on the dirt path.
    const previewY = FLOOR_Y - 55; // feet land on FLOOR_Y at scale 2.5
    this.add.ellipse(250, FLOOR_Y + 3, 92, 20, 0x000000, 0.3);
    this.add.ellipse(GAME_WIDTH - 250, FLOOR_Y + 3, 92, 20, 0x000000, 0.3);
    // Ronin art faces right, Oni art faces left → both already face centre.
    this.add.sprite(250, previewY, 'ronin-idle').setScale(2.5).play('ronin-idle');
    this.add.sprite(GAME_WIDTH - 250, previewY, 'oni-idle').setScale(2.5).play('oni-idle');

    // Title.
    const title = this.add
      .text(GAME_WIDTH / 2, 84, 'RONIN DUEL', {
        fontFamily: 'Georgia, serif',
        fontSize: '72px',
        color: '#ffd34d',
        stroke: '#1a1300',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setShadow(0, 6, '#000000', 12, false, true);
    this.tweens.add({ targets: title, scale: 1.03, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add
      .text(GAME_WIDTH / 2, 138, 'Ronin  vs  Oni', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '22px',
        color: '#cbd2e6',
      })
      .setOrigin(0.5);

    // --- VS CPU ---
    this.add
      .text(GAME_WIDTH / 2, 210, 'VS CPU', { fontFamily: 'Georgia, serif', fontSize: '26px', color: '#ffffff' })
      .setOrigin(0.5);

    const diffKeys = Object.keys(DIFFICULTIES) as (keyof typeof DIFFICULTIES)[];
    const spacing = 150;
    diffKeys.forEach((key, i) => {
      const x = GAME_WIDTH / 2 + (i - 1) * spacing;
      this.makeButton(x, 262, DIFFICULTIES[key].label, 0x3fb6ff, () => this.start({ mode: 'cpu', difficulty: key }));
    });

    // --- 2 players ---
    this.makeButton(GAME_WIDTH / 2, 338, '2 PLAYERS (LOCAL)', 0xff5a6e, () =>
      this.start({ mode: 'versus', difficulty: 'normal' })
    );

    // Controls hint.
    this.add
      .text(
        GAME_WIDTH / 2,
        452,
        'P1  A/D move · W jump · SPACE attack · LSHIFT block\nP2  ←/→ move · ↑ jump · ENTER attack · / block',
        {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '17px',
          color: '#9aa3bd',
          align: 'center',
          lineSpacing: 6,
        }
      )
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 22, 'Phaser 4 · TypeScript · procedural audio — art: LuizMelo (see CREDITS)', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '13px',
        color: '#6b7390',
      })
      .setOrigin(0.5)
      .setAlpha(0.7);

    this.buildAudioToggles();

    // Keyboard shortcuts.
    this.input.keyboard?.once('keydown-ONE', () => this.start({ mode: 'cpu', difficulty: 'normal' }));
    this.input.keyboard?.once('keydown-TWO', () => this.start({ mode: 'versus', difficulty: 'normal' }));
  }

  private start(cfg: StartConfig): void {
    sound.unlock();
    sound.uiClick();
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('FightScene', cfg);
    });
  }

  private buildBackdrop(): void {
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'background');
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add
      .sprite(GAME_WIDTH / 2 + 250, FLOOR_Y + 4, 'shop')
      .setOrigin(0.5, 1)
      .setScale(1.6)
      .setAlpha(0.95)
      .play('shop-anim');
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x05060c, 0.55);
  }

  private makeButton(x: number, y: number, label: string, color: number, onClick: () => void): void {
    const w = Math.max(150, label.length * 13 + 40);
    const bg = this.add.rectangle(x, y, w, 46, 0x101626).setStrokeStyle(2, color, 0.9);
    const txt = this.add
      .text(x, y, label, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '20px', color: '#ffffff' })
      .setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      bg.setFillStyle(color, 0.25);
      this.tweens.add({ targets: [bg, txt], scale: 1.06, duration: 120 });
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x101626, 1);
      this.tweens.add({ targets: [bg, txt], scale: 1, duration: 120 });
    });
    bg.on('pointerdown', onClick);
  }

  private buildAudioToggles(): void {
    const mute = this.add
      .text(GAME_WIDTH - 24, 26, sound.muted ? '🔇' : '🔊', { fontSize: '24px' })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });
    mute.on('pointerdown', () => {
      sound.unlock();
      mute.setText(sound.toggleMute() ? '🔇' : '🔊');
    });

    const music = this.add
      .text(GAME_WIDTH - 64, 26, '🎵', { fontSize: '22px' })
      .setOrigin(1, 0.5)
      .setAlpha(sound.musicOn ? 1 : 0.4)
      .setInteractive({ useHandCursor: true });
    music.on('pointerdown', () => {
      sound.unlock();
      music.setAlpha(sound.toggleMusic() ? 1 : 0.4);
    });
  }
}
