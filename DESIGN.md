# Game Design

The ideas behind the game. Code in `src/data/` should match what's written here.

## Langue / Language

**Règle : tout le jeu est en français.** Les menus, les textes à l'écran, et les noms des héros,
des attaques, des ennemis, des boss et des niveaux doivent être en français.

_Rule: everything in the game is in French. Menus, on-screen text, and the names of heroes,
moves, enemies, bosses and levels must all be in French._

## Story

There was a earthquake and earth floor got shatered and from it bad guys are coming out.

## Heroes

Playable characters:
-Samacaille. Samourai with fire sword.
-Rinoserase. Rhino that spits fire.
-Alima. Human, regular size. He has a big hammer. He has a side bow from which he can launch sleep arrows.
-Lutar. Gnome with double axes.
-Phantominus (secret hero). A ghost with human form. Melee attacks pass through him: only ranged attacks can hurt him.
 _(Hidden on the hero select screen: stand on the last hero (Lutar) and press → to find him.)_

## Moves

_First version made up by Claude. Change anything!_ J = attack, K = special.
- Samacaille: Sword Slash (J), Fire Slash (K, sets enemies on fire)
- Rinoserase: Horn Charge (J, dashes forward), Fire Spit (K, fireball)
- Alima: Hammer Smash (J, big hit), Sleep Arrow (K, enemy falls asleep)
- Lutar: Axe Chop (J, very fast), Axe Spin (K, hits both sides)
- Phantominus: Coup fantôme (J, a phantom kick that leaves fog for 2 seconds; enemies walking through the fog are slower), Croix spectrale (K, a + shaped attack: ghost balls fly in 4 directions, forward, back, up and down the screen)

## Levels

Each level has its own place, enemies and boss. Levels are played in order:
beat the boss to go to the next level.

**To add a level:** copy the "Level 2" block at the bottom, change the number,
and fill it in. Enemies can come back in later levels: just list them again.

---

### Level 1: The Forest

**Place:** A forest where the earthquake split the ground open. Bad guys climb out of glowing cracks.

**Enemies:**
- Crack Crawler: small purple creature with claws
- Rock Brute: big slow rock monster that punches hard
- House: a house with metal fists _(In game: slow and tough, heavy Metal Punch.)_
- Chati-grife: a cat with lava claws _(In game: fast, pounces, its claws set you on fire.)_
- Ningage: ninja hyper-agile with a sword. _(In game: dashing sword slash, hops away from your attacks.)_
- Chimpanze: a big ape that spits ice. _(In game: Ape Slam up close, Ice Spit from far away. Ice makes you slow.)_

**Boss:** Robot that launches missiles and has a shield.
- _In game: "Missile Robot". The shield blocks hits from the front and turns off every few seconds. The robot turns slowly, so you can sneak behind it!_

**How it plays:** 8 waves of enemies, then the boss. You heal a little after each wave.

---

### Level 2: Sushi Mountains

**Place:** Valley of mountains with sushi restaurants all along

**Enemies:**
- MiniSushi: its a salmon sushi. it will absorb projectiles from heroes (arrows, energy balls, etc) _(In game: « MiniSushi », small and quick, bumps you with its rice. Use close attacks on it!)_
- Waiters: Waiters from the sushi restaurants. They have round serving holders they throw like boomerang. _(In game: « Serveur », stays away from you and throws « Plateau boomerang », which can hit you going out and coming back.)_

**Environment:**
- There are soja barrels the player can break, soja spills and makes it slidy for player and also enemies, enemies will also fall at the end of the sliding and be stunned for 1.5 seconds _(In game: break a barrel with any attack. Enemies that step in the soy slide across and fall down: hit them while they're on the ground!)_

**Boss:** Maitre Sushi: Looks like a martial arts teacher with a a kimono with sushi logo, bald. For short range attack he has metallic chopsticks. For long range he launches yellow energy balls. The weak point of maitre sushi is that if the player remains still for 3 seconds maitre sushi will go into salutation posture and stop fighting for 5 seconds, time for the player to attack him, it can be done repeteadly and attacking him during his salutation does not break him from doing it.
- _In game: « Maître Sushi », attacks « Baguettes d'acier » and « Boule d'énergie ». He sometimes hops away from your attacks. Don't touch the controls for 3 seconds and he bows (🙇 on his health bar): run in and hit him!_

**How it plays:** 6 waves of enemies, then the boss. You heal a little after each wave.
