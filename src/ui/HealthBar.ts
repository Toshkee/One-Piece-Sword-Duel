import Phaser from 'phaser';
import { clamp } from '../core/combat';

/**
 * A two-layer "ghost" health bar. The front layer (team colour) snaps to the
 * new value instantly; the ghost layer (bright) trails behind for ~400ms so a
 * hit leaves a visible chip of damage draining away — a small touch that reads
 * as far more responsive than a single bar easing down.
 *
 * P1 drains toward the centre of the screen; P2 (mirrored) drains the other
 * way, like a classic fighting-game HUD.
 */
export class HealthBar {
  private front: Phaser.GameObjects.Rectangle;
  private ghost: Phaser.GameObjects.Rectangle;
  private scene: Phaser.Scene;
  private color: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    mirrored: boolean,
    name: string
  ) {
    this.scene = scene;
    this.color = color;
    const originX = mirrored ? 1 : 0;
    const edgeX = mirrored ? x + width : x;

    scene.add
      .rectangle(x, y, width, height, 0x0a0a12, 0.82)
      .setOrigin(0, 0.5)
      .setStrokeStyle(3, 0xffffff, 0.9)
      .setDepth(40);

    this.ghost = scene.add
      .rectangle(edgeX, y, width, height - 8, 0xffe28a)
      .setOrigin(originX, 0.5)
      .setDepth(41);

    this.front = scene.add
      .rectangle(edgeX, y, width, height - 8, color)
      .setOrigin(originX, 0.5)
      .setDepth(42);

    scene.add
      .text(edgeX, y - height, name.toUpperCase(), {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(originX, 1)
      .setDepth(43);
  }

  set(health: number, max: number): void {
    const pct = clamp(health / max, 0, 1);
    this.front.scaleX = pct;
    // Brief tint flash on the front layer for extra punch.
    this.front.setFillStyle(0xffffff);
    this.scene.time.delayedCall(60, () => this.front.setFillStyle(this.color));

    this.scene.tweens.killTweensOf(this.ghost);
    this.scene.tweens.add({
      targets: this.ghost,
      scaleX: pct,
      delay: 130,
      duration: 420,
      ease: 'Quad.easeOut',
    });
  }
}
