import Phaser from 'phaser';

/** Minimal boot: removes the HTML loading fallback and hands off to Preload. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    document.getElementById('boot-fallback')?.remove();
    this.scene.start('PreloadScene');
  }
}
