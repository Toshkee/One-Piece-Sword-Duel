# Credits & Asset Licenses

This project is **IP-clean**: it uses no copyrighted characters or music. Every
asset below is free to use; sound is generated procedurally in code.

## Character sprites — "Martial Hero" 1 & 2

- **Artist:** LuizMelo (a.k.a. Sutemo) — https://luizmelo.itch.io/
- **Packs:** _Martial Hero_ and _Martial Hero 2_
- **Use in this project:** the two fighters ("Ronin" and "Oni") and their
  Idle / Run / Jump / Fall / Attack / Take-Hit / Death animations.
- **License:** free for use in commercial and non-commercial projects; the
  assets themselves may not be resold or redistributed as an asset pack.
  Crediting the artist is appreciated — hence this file.

## Background

- _Oak Woods_ style forest backdrop + shop tileset, used as the arena and a
  foreground prop.

> The sprite sheets in this repo were obtained via the public
> [`chriscourses/fighting-game`](https://github.com/chriscourses/fighting-game)
> teaching repository, which bundles LuizMelo's freely-licensed art. All
> original art rights remain with LuizMelo.

## Audio

- **100% procedural.** Every sound effect (swing, impact, block, jump, land,
  KO) and the ambient music bed are synthesised at runtime with the Web Audio
  API in [`src/audio/SoundManager.ts`](src/audio/SoundManager.ts). No audio
  files are shipped, so there is nothing to license.

## Code

- All game code is original and released under the MIT License (see
  [`LICENSE`](LICENSE)).

---

### A note on this project's history

This started life as a General Assembly bootcamp project ("One Piece Sword
Duel") that used copyrighted One Piece characters and music. It has been fully
rebuilt and re-themed to be IP-safe. The original vanilla-JS version is
preserved on the `legacy/one-piece-vanilla` git branch for posterity.
