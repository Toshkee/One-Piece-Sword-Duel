import { MAX_HEALTH } from './constants';

/** One animation strip: how many frames the sheet holds and how to play it. */
export interface AnimDef {
  frames: number;
  frameRate: number;
  repeat: number; // -1 = loop
}

export interface CharacterConfig {
  id: string;
  name: string;
  tagline: string;
  /** Accent colour for this fighter's HUD/health bar (hex int). */
  themeColor: number;
  /** Folder under public/assets/fighters that holds the sprite sheets. */
  spriteDir: string;
  /** How much to scale the 200×200 source frames in the world. */
  scale: number;
  /** Physics/hurt body, in source-frame pixels (before scale). Decoupled from
   *  the art so the body stays stable even when attack frames extend the art. */
  body: { width: number; height: number; offsetX: number; offsetY: number };

  speed: number; // px/sec horizontal
  jumpVelocity: number; // px/sec (negative = up)
  maxHealth: number;

  attack: {
    damage: number;
    reach: number; // world px the swing extends past the body's leading edge
    height: number; // world px tall
    knockback: number; // px/sec imparted to the victim
    /** Fraction of the attack animation during which the hitbox is live. */
    activeStart: number;
    activeEnd: number;
  };

  anims: {
    idle: AnimDef;
    run: AnimDef;
    jump: AnimDef;
    fall: AnimDef;
    attack1: AnimDef;
    attack2: AnimDef;
    takeHit: AnimDef;
    death: AnimDef;
  };
}

/**
 * Two fighters from the same artist (LuizMelo "Martial Hero" 1 & 2) so the art
 * style is consistent. Frame counts below were read directly from each PNG's
 * width ÷ 200. See CREDITS.md for licensing.
 */
export const CHARACTERS: CharacterConfig[] = [
  {
    id: 'ronin',
    name: 'Ronin',
    tagline: 'The wandering blade',
    themeColor: 0x3fb6ff,
    spriteDir: 'martial-hero-1',
    scale: 3.0,
    // Measured from the idle frame's alpha bbox: char occupies x[76,113] y[70,122].
    body: { width: 37, height: 52, offsetX: 76, offsetY: 70 },
    speed: 300,
    jumpVelocity: -780,
    maxHealth: MAX_HEALTH,
    attack: {
      damage: 12,
      reach: 92,
      height: 150,
      knockback: 230,
      activeStart: 0.35,
      activeEnd: 0.65,
    },
    anims: {
      idle: { frames: 8, frameRate: 8, repeat: -1 },
      run: { frames: 8, frameRate: 13, repeat: -1 },
      jump: { frames: 2, frameRate: 5, repeat: 0 },
      fall: { frames: 2, frameRate: 5, repeat: 0 },
      attack1: { frames: 6, frameRate: 16, repeat: 0 },
      attack2: { frames: 6, frameRate: 16, repeat: 0 },
      takeHit: { frames: 4, frameRate: 14, repeat: 0 },
      death: { frames: 6, frameRate: 10, repeat: 0 },
    },
  },
  {
    id: 'oni',
    name: 'Oni',
    tagline: 'The crimson onslaught',
    themeColor: 0xff5a6e,
    spriteDir: 'martial-hero-2',
    scale: 3.0,
    // Measured from the idle frame's alpha bbox: char occupies x[86,119] y[74,128].
    body: { width: 33, height: 54, offsetX: 86, offsetY: 74 },
    speed: 320,
    jumpVelocity: -780,
    maxHealth: MAX_HEALTH,
    attack: {
      damage: 11,
      reach: 100,
      height: 150,
      knockback: 240,
      activeStart: 0.3,
      activeEnd: 0.6,
    },
    anims: {
      idle: { frames: 4, frameRate: 6, repeat: -1 },
      run: { frames: 8, frameRate: 13, repeat: -1 },
      jump: { frames: 2, frameRate: 5, repeat: 0 },
      fall: { frames: 2, frameRate: 5, repeat: 0 },
      attack1: { frames: 4, frameRate: 14, repeat: 0 },
      attack2: { frames: 4, frameRate: 14, repeat: 0 },
      takeHit: { frames: 3, frameRate: 12, repeat: 0 },
      death: { frames: 7, frameRate: 10, repeat: 0 },
    },
  },
];

export function getCharacter(id: string): CharacterConfig {
  const c = CHARACTERS.find((ch) => ch.id === id);
  if (!c) throw new Error(`Unknown character: ${id}`);
  return c;
}
