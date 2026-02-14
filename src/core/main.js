import { CONFIG } from './config.js';
import { loadMap } from '../game/map.js';
import { initInput, getIntent } from './input.js';
import { createPlayer, updatePlayer } from '../game/player.js';
import { cast } from '../rendering/raycaster.js';
import { draw, setTextures } from '../rendering/renderer.js';
import { loadTextures } from '../rendering/textures.js';
import { spawnEntities, updateEntities } from '../game/entities.js';
import { updateWeapon, createWeaponState } from '../game/weapon.js';
import { updateProjectiles, createProjectilePool } from '../game/projectiles.js';

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

  // Adaptive resolution
  let adaptFrames = 0;
  let adaptLastTime = performance.now();
  const TARGET_FPS = 35;
  const SCALE_MIN = 0.25;
  const SCALE_MAX = 1.0;
  const SCALE_STEP = 0.05;

  function loop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    accumulator += Math.min(dt, 0.1);

    // Adjust render scale every second
    adaptFrames++;
    if (now - adaptLastTime >= 1000) {
      const fps = adaptFrames / ((now - adaptLastTime) / 1000);
      adaptFrames = 0;
      adaptLastTime = now;
      if (fps < TARGET_FPS && CONFIG.renderScale > SCALE_MIN) {
        CONFIG.renderScale = Math.max(SCALE_MIN, CONFIG.renderScale - SCALE_STEP);
        resize();
      } else if (fps > TARGET_FPS + 5 && CONFIG.renderScale < SCALE_MAX) {
        CONFIG.renderScale = Math.min(SCALE_MAX, CONFIG.renderScale + SCALE_STEP);
        resize();
      }
    }

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
