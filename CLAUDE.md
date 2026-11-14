# CLAUDE.md

Side-scrolling beat 'em up, made by a parent and their kid. Three.js + Vite, plain JavaScript (no TypeScript), no frameworks.

## Commands
- `npm run dev`: dev server (uses `--host`, so it can be opened from other devices on the LAN)
- `npm run build`: production build into `dist/`
- `npm test`: headless bot plays the level with every hero (no browser needed). Run after gameplay or data changes; every hero should still win.
- `?hero=<id>` URL param skips the select screen.

## Architecture
- **Data-driven.** Game content lives in `src/data/*.js` as plain objects: `characters`, `moves`, `enemies` (bosses have `boss: true`), `levels` (waves trigger by x position). Add content there before touching engine code.
- `DESIGN.md` is the source of truth for the kid's ideas. Keep it in sync when adding content.
- Coordinates: **x** = scroll direction (left→right), **y** = up (jumping), **z** = depth lane (`LANE_MIN_Z..LANE_MAX_Z`).
- `Fighter` (src/entities/Fighter.js) is the shared base: hp, jump, attack timing (startup/active/recovery), hit detection, knockback, status effects (burn, sleep), shields. `Player` adds input; `Enemy` adds AI (emerges from cracks; `turnDelay` makes slow turners).
- `Projectile` handles anything a move with `projectile: {...}` shoots.
- `Game` (src/core/Game.js) owns one play-through: player, level, projectiles, hit sparks, camera x, win/lose. It only needs a THREE.Scene, so it runs headless in Node (that's how `npm test` works).
- `Level` builds scenery by `theme`, spawns waves out of cracks, and locks the camera until a wave is cleared.
- Art is placeholder primitives built in `src/entities/models.js` (a `model` id per character/enemy). Weapons are pivots that swing during attacks.

## Visual testing
Headless Firefox `--screenshot` does NOT capture WebGL canvases (they come out black). To screenshot gameplay, render with `preserveDrawingBuffer: true` and `drawImage` the WebGL canvas onto a 2D canvas.

## Conventions
- Keep code simple and readable for a beginner; comment the "why".
- Content values (damage, speed, hp) go in data files, never hardcoded in logic.
