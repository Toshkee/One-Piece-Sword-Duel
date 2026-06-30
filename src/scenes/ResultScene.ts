import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, DIFFICULTIES } from '../config/constants';
import type { GameMode } from '../core/types';
import { sound } from '../audio/SoundManager';

export interface ResultData {
  mode: GameMode;
  difficulty: keyof typeof DIFFICULTIES;
  winnerName: string;
  winnerColor: number;
  p1Name: string;
  p2Name: string;
  p1Rounds: number;
  p2Rounds: number;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  create(data: ResultData): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x05060c, 0.78);
    this.cameras.main.fadeIn(260, 0, 0, 0);

    const banner = this.add
      .text(GAME_WIDTH / 2, 180, `${data.winnerName.toUpperCase()} WINS`, {
        fontFamily: 'Georgia, serif',
        fontSize: '76px',
        color: Phaser.Display.Color.IntegerToColor(data.winnerColor).rgba,
        stroke: '#000000',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setShadow(0, 6, '#000000', 14, false, true);
    banner.setScale(0.5);
    this.tweens.add({ targets: banner, scale: 1, duration: 520, ease: 'Back.easeOut' });

    this.add
      .text(GAME_WIDTH / 2, 262, `${data.p1Name} ${data.p1Rounds}  —  ${data.p2Rounds} ${data.p2Name}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '26px',
        color: '#cbd2e6',
      })
      .setOrigin(0.5);

    this.makeButton(GAME_WIDTH / 2 - 130, 380, 'REMATCH', 0x4ade80, () => {
      sound.uiClick();
      this.scene.start('FightScene', { mode: data.mode, difficulty: data.difficulty });
    });
    this.makeButton(GAME_WIDTH / 2 + 130, 380, 'MAIN MENU', 0x3fb6ff, () => {
      sound.uiClick();
      this.scene.start('MenuScene');
    });

    this.input.keyboard?.once('keydown-ENTER', () =>
      this.scene.start('FightScene', { mode: data.mode, difficulty: data.difficulty })
    );
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('MenuScene'));
  }

  private makeButton(x: number, y: number, label: string, color: number, onClick: () => void): void {
    const w = label.length * 13 + 50;
    const bg = this.add.rectangle(x, y, w, 50, 0x101626).setStrokeStyle(2, color, 0.9);
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
}
