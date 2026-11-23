# CLAUDE.md

Side-scrolling beat 'em up, made by a parent and their kid. Three.js + Vite, plain JavaScript (no TypeScript), no frameworks.

## Commands
- `npm run dev`: dev server (uses `--host`, so it can be opened from other devices on the LAN)
- `npm run build`: production build into `dist/`
- `npm test`: headless bot plays the level with every hero (no browser needed). Run after gameplay or data changes; every hero should still win.
- `?hero=<id>&level=<n>` URL params skip the menus. Flow: hero select → level select → game (Échap goes back).
- God mode (G, on by default, saved in localStorage) sets `player.invincible`: hits land but no HP is lost.

## Architecture
- **Data-driven.** Game content lives in `src/data/*.js` as plain objects: `characters`, `moves`, `enemies` (bosses have `boss: true`), `levels` (played in order; each has `theme`, `waves` triggered by x position, and a `boss` that `Level` appends as the final wave). Add content there before touching engine code.
- `DESIGN.md` is the source of truth for the kid's ideas. Keep it in sync when adding content. It's organized per level: each `### Level N` lists its place, enemies and boss. New levels go in `LEVELS`; enemies live in the shared `enemies.js` pool and can appear in any level. A new `theme` needs scenery in `Level.js` (unknown themes get bare ground).
- Coordinates: **x** = scroll direction (left→right), **y** = up (jumping), **z** = depth lane (`LANE_MIN_Z..LANE_MAX_Z`).
- `Fighter` (src/entities/Fighter.js) is the shared base: hp, jump, attack timing (startup/active/recovery), hit detection, knockback, status effects (burn, sleep), shields. `Player` adds input; `Enemy` adds AI (emerges from cracks; `turnDelay` makes slow turners).
- `Projectile` handles anything a move with `projectile: {...}` shoots.
- `Game` (src/core/Game.js) owns one play-through: player, level, projectiles, hit sparks, camera x, win/lose. It only needs a THREE.Scene, so it runs headless in Node (that's how `npm test` works).
- `Level` builds scenery by `theme`, spawns waves out of cracks, and locks the camera until a wave is cleared.
- Art is toon-shaded primitives with outlines, built in `src/entities/models.js` (a `model` id per character/enemy). Builders return `legs`/`arms` pivots (walk swing by `userData.phase`) and `weapons` pivots animated by `pose(rest, windup, strike)` angles around z. Parts with `flicker` wobble (flames). The select screen renders hero portraits from the same models.
- Heroes can be `hidden` (secret: revealed in the menu by pressing → on the last visible card; secret cards go last) and `meleeImmune` (only projectiles hurt). Moves can leave `fog` (slows the other team) and shoot projectiles in several `directions`. Weapon poses can be limited to `onlyFor: 'melee' | 'projectile'`; `floats` models hover.
- Status effects: `burn`, `sleep`, `freeze` (slow). Enemy options: `shield`, `turnDelay`, `dodge`, `absorbsProjectiles`, `keepDistance`, `bowWhenStill`. Projectiles can be `boomerang`.
- Level props: soy `barrels` (Level.js `Barrel`, duck-typed like a fighter so attacks hit it) leave puddles; `Game` sets `onSoy` each frame. On soy, movement is momentum-based; enemies entering soy go `slide` → `stun`.
- During a fight, enemies are clamped to the screen so ranged enemies can't hide off-screen.
- Clearing a wave heals the hero 25% (`WAVE_CLEAR_HEAL` in Level.js).

## Visual testing
Headless Firefox `--screenshot` does NOT capture WebGL canvases (they come out black). To screenshot gameplay, render with `preserveDrawingBuffer: true` and `drawImage` the WebGL canvas onto a 2D canvas.

## Conventions
- **All player-facing text is in French** (rule in DESIGN.md): UI, messages, and every `name`/`title` in `src/data`. Code, comments and ids stay in English.
- French keyboards are AZERTY: movement uses `KeyboardEvent.code` (physical keys, so WASD positions = ZQSD), but letter shortcuts (M, G) use `e.key` so they match the printed letter.
- Keep code simple and readable for a beginner; comment the "why".
- Content values (damage, speed, hp) go in data files, never hardcoded in logic.
