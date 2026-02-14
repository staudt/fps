# CLAUDE.md — Project Context

## What is this?

A browser-based FPS prototype inspired by Wolfenstein 3D's map simplicity but with modern movement feel (think Quake/Serious Sam). Pure JavaScript + HTML5 Canvas 2D. No WebGL, no libraries, runs locally from a static HTTP server.

**Guiding principles:** Simplicity over realism. Playability and fun over visual fidelity.

## How to run

```bash
cd /home/ricardo/git/fps
python3 -m http.server 8080
# Open http://localhost:8080
```

Click the canvas to capture the mouse (pointer lock). Esc to release.

## Architecture

```
Input → Intent → Update (Player, Weapon, Projectiles, Entities) → Raycast → Render
```

Every game object is a **plain data object** (no classes). Functions operate on data. This keeps everything serializable for future co-op multiplayer.

The game loop uses a **fixed timestep** (1/60s) with accumulator. Rendering happens at display refresh rate, physics at fixed rate.

### File map

```
src/
├── core/
│   ├── main.js          # Init, game loop, resize handler
│   ├── config.js        # Single source of truth for ALL tunable numbers
│   └── input.js         # Keyboard + pointer-locked mouse → intent objects
├── rendering/
│   ├── renderer.js      # All drawing: walls, sprites, HUD, minimap
│   ├── raycaster.js     # DDA wall casting, depth buffer. Pure function
│   ├── sprites.js       # Sprite projection, depth sorting, per-column occlusion
│   ├── textures.js      # Procedural texture generation + image file fallback
│   └── floorceiling.js  # Per-pixel floor casting + Doom-style sky / indoor ceiling
└── game/
    ├── player.js        # Position, angle, pitch, z, movement, collision, dash, jump
    ├── weapon.js        # Dual-mode weapon (hold=MG, tap=shotgun), recoil
    ├── entities.js      # Entity types, spawn, update loop, death animations
    ├── projectiles.js   # Object pool, movement, wall/entity collision
    └── map.js           # JSON map loader, tile/height queries
```

Also: `maps/level1.json` (32x32 test map), `assets/textures/` (optional custom PNGs).

### Key technical details

**Raycaster (DDA):** One ray per screen column. Perpendicular distance eliminates fisheye. Returns hits array with `{ perpDist, side, tile, wallX, mapX, mapY, height }`. The raycaster also returns `dirX, dirY, planeX, planeY` for sprite projection.

**Variable wall heights:** Tile values encode both type and height: `type = value % 10`, `height = floor(value / 10) || 1`. So tile `1` = brick height 1, `21` = brick height 2, `33` = metal height 3. Walls grow upward from floor level. Textures tile vertically. Side faces are filled at height transitions between adjacent columns (post-processing pass in renderer). This is visual-only (Level 1) — rays still stop at first wall hit.

**Textures:** 64x64 procedural canvases (brick, stone, metal) generated at init. Each has a `canvas` (light) and `dark` variant (35% darker, used for side=1 shading). Image fallback: place a 64x64 PNG at `assets/textures/wall_N.png` and it auto-loads. Floor/ceiling/sky textures provide raw pixel data (`Uint8ClampedArray`) for per-pixel scanline rendering.

**Floor/ceiling rendering:** Per-row scanline floor casting using `ImageData` buffer (reused across frames). Floor uses perspective-correct world coord interpolation per row. Sky is Doom-style: a wide panoramic texture (512x200) scrolled by player angle. Indoor ceiling option uses mirrored floor casting with ceiling texture. Per-level toggle via `map.sky` (defaults to `true`).

**Sprite rendering:** Entities + projectiles go through the same projection pipeline. Inverse camera transform gives `transformX` (horizontal) and `transformY` (depth). Sorted farthest-first (painter's). Per-column occlusion against wall depth buffer. Entities get type-specific procedural shapes (humanoid, wedge, blocky, cross). Sprites shift with player pitch and jump height.

**Input system:** Produces intent objects each tick: `{ forward, strafe, sprint, jump, dashDirection, mouseDelta, mouseDeltaY, firing, shotgunTap }`. Intent system is designed for future co-op — remote player intents arrive over network and are consumed identically.

**Dual-mode weapon:** Hold mouse > 150ms = machine gun (rapid fire, growing spread, small recoil). Release mouse < 150ms = shotgun (5 pellets in a burst, big recoil). Both modes spawn projectiles. Hitscan function exists but is unused — projectiles handle all damage via collision.

**Collision:** Axis-separated (check X then Y independently) for free wall sliding. Player collides with walls (bounding box corners) and entities (circle-circle). Projectiles collide with walls (instant kill) and entities (damage + hit flash).

**Double-tap dash:** Input tracks keyup timestamps per WASD key. On keydown, if same key was released < 250ms ago, triggers dash in that direction. Space = jump.

## Entity types

| Type | HP | Speed | Color | Shape | Scale |
|------|----|-------|-------|-------|-------|
| grunt | 100 | 2.0 | red | humanoid | 1.0 |
| charger | 60 | 5.0 | orange | wedge | 0.9 |
| turret | 150 | 0 | blue | blocky | 1.1 |
| tank | 300 | 1.0 | purple | wide rect | 1.4 |
| health | 0 | 0 | green | cross | 0.6 |

Entities currently have no AI — they stand still and take damage. Death animation: shrink to 30% + fade to dark red over 0.4s.

## Map format

```json
{
  "tiles": [[1,1,21,...], ...],
  "player": { "x": 3.5, "y": 3.5, "angle": 0 },
  "entities": [{ "type": "grunt", "x": 10.5, "y": 5.5 }, ...],
  "sky": true
}
```

- `tiles`: 2D array. `0` = empty, `1-9` = wall type at height 1, `21` = type 1 height 2, `33` = type 3 height 3, etc.
- Width/height derived from array dimensions (no explicit fields needed).
- Player/entity coords use `.5` for tile center.
- `sky`: `true` (default) = Doom-style scrolling sky. `false` = indoor textured ceiling.

## What's been built

- [x] Full-viewport responsive canvas (renderScale config for performance)
- [x] DDA raycasting with depth buffer
- [x] Textured walls (procedural brick/stone/metal + image fallback)
- [x] Variable wall heights (visual-only, encoded in tile values)
- [x] Side-face fill at height transitions
- [x] Block separation visuals (ledge lines, darkened upper blocks)
- [x] WASD movement + sprint (Shift) + wall sliding
- [x] Mouse look (horizontal + vertical pitch via y-shearing)
- [x] Jump (Space) + gravity
- [x] Double-tap dash (WASD) with cooldown
- [x] Dual-mode weapon (hold=MG, tap=shotgun)
- [x] Projectile system (object pool, collision)
- [x] Entity rendering (type-specific shapes, health bars, death animations)
- [x] Player-entity collision
- [x] Minimap (top-right, local 12-tile radius)
- [x] HUD (crosshair follows pitch, HP bar, dash cooldown, muzzle flash)
- [x] Textured floor (per-pixel floor casting)
- [x] Doom-style scrolling sky (outdoor) / textured ceiling (indoor)
- [x] Source organized into folders (core/, rendering/, game/)

## What's NOT built yet

- [ ] Enemy AI (movement, targeting, attacking)
- [ ] Health pickup functionality
- [ ] Distance fog
- [ ] Sound (Web Audio API)
- [ ] Screen shake / camera effects
- [ ] Sprite-based entity graphics (image textures instead of procedural shapes)
- [ ] More maps / level design tools
- [ ] Co-op multiplayer (architecture supports it — needs networking layer)

## Design decisions to preserve

1. **All game objects are plain data** — no class hierarchies. Everything is trivially serializable for future co-op.
2. **Input produces intents, not raw input** — `getIntent()` returns a clean object consumed by update functions.
3. **Config is the single source of truth** — no magic numbers in code. Every tunable value lives in `config.js`.
4. **Raycaster is a pure function** — takes state, returns results. No side effects, no rendering.
5. **Rendering reads state but never mutates it** — strict separation.
6. **Fixed timestep for physics, uncapped for rendering** — frame-rate independent feel.
7. **Entity update is player-count agnostic** — designed so `players[]` array works for 1 or N players.
8. **Floor/ceiling isolated in its own module** — `floorceiling.js` keeps pixel-level rendering separate from the main renderer.

## Past bugs and fixes

- **Double damage:** Weapon did both projectile AND hitscan damage. Fixed by removing hitscan damage — projectiles are the sole damage source.
- **Touchpad palm rejection:** `preventDefault()` on ALL keydown blocked touchpad input. Fixed by only preventing on game keys.
- **Left/right dash swapped:** Direction vectors for left/right were inverted. Fixed: left = `(sin, -cos)`, right = `(-sin, cos)`.
- **Wall height not visible:** Browser caching old JSON/JS. Ctrl+Shift+R to hard refresh when changing map data.

## Coding style

- ES modules (`import`/`export`), no bundler
- Functions over classes
- Plain objects for all game state
- No external dependencies
- Comments only where logic isn't self-evident
