import { CONFIG } from './config.js';
import { loadMap } from './map.js';
import { initInput, getIntent } from './input.js';
import { createPlayer, updatePlayer } from './player.js';
import { cast } from './raycaster.js';
import { draw, setTextures } from './renderer.js';
import { loadTextures } from './textures.js';
import { spawnEntities, updateEntities } from './entities.js';
import { updateWeapon, createWeaponState } from './weapon.js';
import { updateProjectiles, createProjectilePool } from './projectiles.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let map, player, entities, weapon, projectiles;
let depthBuffer;

function resize() {
  const scale = CONFIG.renderScale;
  canvas.width = Math.floor(window.innerWidth * scale);
  canvas.height = Math.floor(window.innerHeight * scale);
  depthBuffer = new Float64Array(canvas.width);
}

async function init() {
  map = await loadMap('maps/level1.json');
  player = createPlayer(map.player);
  entities = spawnEntities(map.entities);
  weapon = createWeaponState();
  projectiles = createProjectilePool();

  setTextures(await loadTextures());
  initInput(canvas);
  resize();
  window.addEventListener('resize', resize);

  let lastTime = performance.now();
  let accumulator = 0;

  function loop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    accumulator += Math.min(dt, 0.1);

    while (accumulator >= CONFIG.tickRate) {
      const intent = getIntent();
      updatePlayer(player, intent, CONFIG.tickRate, map, entities);
      updateWeapon(weapon, intent, CONFIG.tickRate, player, entities, projectiles, map);
      updateProjectiles(projectiles, CONFIG.tickRate, map, entities);
      updateEntities(entities, CONFIG.tickRate, map, player);
      accumulator -= CONFIG.tickRate;
    }

    const rayResult = cast(player, map, canvas.width, depthBuffer);
    draw(ctx, canvas, player, map, rayResult, depthBuffer, entities, projectiles, weapon);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

init();
