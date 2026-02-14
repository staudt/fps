# FPS

A retro first-person shooter built from scratch with JavaScript and HTML5 Canvas. No WebGL, no libraries, no build step — just raycasting the way id Software intended.

Inspired by Wolfenstein 3D's grid-based simplicity, with movement that feels closer to Quake and Serious Sam.

![Built with](https://img.shields.io/badge/built%20with-vanilla%20JS-F7DF1E)
![Renderer](https://img.shields.io/badge/renderer-Canvas%202D-333)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)

## Play it

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) and click to start.

## Controls

| Input | Action |
|-------|--------|
| **WASD** | Move / strafe |
| **Mouse** | Look (horizontal + vertical) |
| **Shift** | Sprint |
| **Space** | Jump |
| **Double-tap WASD** | Dash in that direction |
| **Hold mouse** | Machine gun (rapid fire, growing spread) |
| **Tap mouse** | Shotgun blast (5 pellets, high damage) |

## What's under the hood

**Raycasting engine** — DDA (Digital Differential Analyzer) casting one ray per pixel column. Perpendicular distance correction eliminates fisheye. Renders at native resolution with a configurable scale factor for that retro pixel look.

**Variable-height walls** — Walls can be 1, 2, or 3 blocks tall, encoded directly in tile values. Textures tile vertically. Side faces fill automatically at height transitions.

**Procedural textures** — Brick, stone, and metal textures generated at runtime on offscreen canvases. Drop a 64x64 PNG into `assets/textures/wall_N.png` to use custom art instead.

**Textured floors + sky** — Per-pixel floor casting using scanline interpolation. Outdoor levels get a Doom-style scrolling sky panorama with stars. Indoor levels get a perspective-correct textured ceiling. Per-level toggle in the map JSON.

**Sprite system** — Entities and projectiles projected into screen space using the inverse camera transform. Sorted far-to-near with per-column wall occlusion. Each enemy type has a distinct procedural silhouette.

**Modern movement** — Sprint, jump with gravity, and directional dash on double-tap. Axis-separated collision gives smooth wall sliding. Fixed-timestep physics for frame-rate independence.

**Dual-mode weapon** — One gun, two modes. Hold the trigger for sustained machine gun fire with accumulating spread and recoil. Quick tap for a devastating shotgun burst. Visible projectiles travel through the world and handle damage on impact.

## Project structure

```
fps/
├── index.html
├── src/
│   ├── core/
│   │   ├── main.js          # Game loop
│   │   ├── config.js        # All tunable values
│   │   └── input.js         # Keyboard + mouse → intent
│   ├── rendering/
│   │   ├── renderer.js      # All drawing
│   │   ├── raycaster.js     # DDA wall casting
│   │   ├── sprites.js       # Sprite projection + occlusion
│   │   ├── textures.js      # Procedural + image textures
│   │   └── floorceiling.js  # Floor casting + sky/ceiling
│   └── game/
│       ├── player.js        # Movement, collision, dash, jump
│       ├── weapon.js        # Dual-mode weapon, recoil
│       ├── entities.js      # Enemy/item types and state
│       ├── projectiles.js   # Object pool, collision
│       └── map.js           # JSON map loader
├── maps/
│   └── level1.json          # 32x32 test map
└── assets/
    └── textures/            # Optional custom wall PNGs
```

## Map format

Maps are plain JSON. Walls are a 2D tile grid — `0` is empty, positive numbers are wall types. Heights are encoded in the tens digit: `1` = brick at height 1, `21` = brick at height 2, `33` = metal at height 3. Set `"sky": false` for indoor levels with textured ceilings (defaults to `true` for outdoor sky).

```json
{
  "tiles": [[1,1,21,1], [1,0,0,1], [1,0,0,1], [1,1,1,1]],
  "player": { "x": 2.5, "y": 2.5, "angle": 0 },
  "entities": [{ "type": "grunt", "x": 1.5, "y": 1.5 }],
  "sky": true
}
```

## Design philosophy

Each file owns one concern. All state is plain data — no class hierarchies, no singletons. The input layer produces intent objects that the game logic consumes, so swapping in network input for co-op multiplayer is trivial. The raycaster is a pure function with no side effects. Rendering reads state but never writes it.

Zero dependencies means zero headaches. Open `index.html`, start a local server, and you're running.

## Roadmap

- [ ] Enemy AI (pathfinding, attacks, behaviors per type)
- [x] Floor and ceiling textures
- [ ] Distance fog
- [ ] Sound design (Web Audio API)
- [ ] Sprite-based enemy art
- [ ] Co-op multiplayer
- [ ] Level editor

## License

MIT
