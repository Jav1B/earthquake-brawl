# Earthquake Brawl

A side-scrolling beat 'em up built with [Three.js](https://threejs.org/) and [Vite](https://vite.dev/).

## Play locally

```sh
npm install
npm run dev
```

Then open the URL it prints (usually http://localhost:5173).
Add `?hero=lutar` (or any hero id) to the URL to skip the select screen.

`npm test` runs a bot that plays the level with every hero to make sure nothing is broken.

## Controls

| Action | Keys |
| ------ | ---- |
| Move   | WASD / Arrow keys |
| Attack | J |
| Special | K |
| Jump   | Space |
| Choose hero / start | ← → or 1–4, Enter |

## Where things live

| Folder | What's in it |
| ------ | ------------ |
| `src/data/` | **The fun part:** characters, moves, enemies/bosses, levels. Edit these to change the game. |
| `src/entities/` | Fighter logic (movement, jumping, attacks, getting hit), enemy AI, projectiles, and the placeholder 3D models (`models.js`) |
| `src/levels/` | Level building and enemy waves |
| `src/core/` | The game loop (`Game.js`) and input |
| `public/assets/` | Images, sounds, models |
| `DESIGN.md` | The game design: ideas for heroes, moves, bosses and levels |

## Deploying

Every push to `main` builds the game and publishes it to GitHub Pages
(enable it once under **Settings → Pages → Source: GitHub Actions**).
