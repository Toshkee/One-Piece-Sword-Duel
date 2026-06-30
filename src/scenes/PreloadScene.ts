import Phaser from 'phaser';
import { CHARACTERS, type AnimDef, type CharacterConfig } from '../config/characters';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';

/** Maps each animation key to the sprite-sheet file that backs it. */
const SHEET_FILES: Record<keyof CharacterConfig['anims'], string> = {
  idle: 'Idle.png',
  run: 'Run.png',
  jump: 'Jump.png',
  fall: 'Fall.png',
  attack1: 'Attack1.png',
  attack2: 'Attack2.png',
  takeHit: 'TakeHit.png',
  death: 'Death.png',
};

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.buildLoadingBar();

    this.load.setPath(`${import.meta.env.BASE_URL}assets`);
    this.load.image('background', 'background/background.png');
    // shop.png is a 6-frame animation strip (708×128 → 118px frames), not a
    // single image. Load it as a sheet so we can play it as a small prop.
    this.load.spritesheet('shop', 'background/shop.png', { frameWidth: 118, frameHeight: 128 });

    for (const char of CHARACTERS) {
      for (const animName of Object.keys(SHEET_FILES) as (keyof CharacterConfig['anims'])[]) {
        this.load.spritesheet(`${char.id}-${animName}`, `fighters/${char.spriteDir}/${SHEET_FILES[animName]}`, {
          frameWidth: 200,
          frameHeight: 200,
        });
      }
    }
  }

  create(): void {
    for (const char of CHARACTERS) {
      (Object.keys(char.anims) as (keyof CharacterConfig['anims'])[]).forEach((animName) => {
        const def: AnimDef = char.anims[animName];
        this.anims.create({
          key: `${char.id}-${animName}`,
          frames: this.anims.generateFrameNumbers(`${char.id}-${animName}`, { start: 0, end: def.frames - 1 }),
          frameRate: def.frameRate,
          repeat: def.repeat,
        });
      });
    }

    this.anims.create({
      key: 'shop-anim',
      frames: this.anims.generateFrameNumbers('shop', { start: 0, end: 5 }),
      frameRate: 4,
      repeat: -1,
    });

    this.makeParticleTextures();
    this.scene.start('MenuScene');
  }

  private buildLoadingBar(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add.text(cx, cy - 50, '⚔️ SWORD DUEL', {
      fontFamily: 'Georgia, serif',
      fontSize: '34px',
      color: '#ffd34d',
    }).setOrigin(0.5);

    const barW = 360;
    this.add.rectangle(cx, cy + 20, barW, 18, 0x222838).setStrokeStyle(2, 0xffffff, 0.5);
    const fill = this.add.rectangle(cx - barW / 2 + 2, cy + 20, 2, 12, 0x3fb6ff).setOrigin(0, 0.5);

    this.load.on('progress', (p: number) => {
      fill.width = (barW - 4) * p;
    });
  }

  /** Generate small white/grey blobs for impact sparks and landing dust so we
   *  don't have to ship particle PNGs. */
  private makeParticleTextures(): void {
    const spark = this.make.graphics({ x: 0, y: 0 });
    spark.fillStyle(0xffffff, 1);
    spark.fillCircle(8, 8, 8);
    spark.generateTexture('spark', 16, 16);
    spark.destroy();

    const dust = this.make.graphics({ x: 0, y: 0 });
    dust.fillStyle(0xcfd6e6, 1);
    dust.fillCircle(10, 10, 10);
    dust.generateTexture('dust', 20, 20);
    dust.destroy();
  }
}
