import Phaser from 'phaser';
import './styles.css';
import { GAME_HEIGHT, GAME_WIDTH, WORLD_GRAVITY } from './config/constants';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { FightScene } from './scenes/FightScene';
import { ResultScene } from './scenes/ResultScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#05060c',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: WORLD_GRAVITY },
      debug: false,
    },
  },
  scene: [BootScene, PreloadScene, MenuScene, FightScene, ResultScene],
};

new Phaser.Game(config);
