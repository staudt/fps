import { CONFIG } from './config.js';

const MAX_PROJECTILES = 100;

export function createProjectilePool() {
  const pool = new Array(MAX_PROJECTILES);
  for (let i = 0; i < MAX_PROJECTILES; i++) {
    pool[i] = { x: 0, y: 0, dx: 0, dy: 0, speed: 0, lifetime: 0, damage: 0, active: false, color: '#ff0' };
  }
  return pool;
}

export function spawnProjectile(pool, x, y, angle, speed, damage, color) {
  for (let i = 0; i < pool.length; i++) {
    if (!pool[i].active) {
      const p = pool[i];
      p.x = x;
      p.y = y;
      p.dx = Math.cos(angle);
      p.dy = Math.sin(angle);
      p.speed = speed;
      p.lifetime = CONFIG.projectileLifetime;
      p.damage = damage;
      p.color = color || '#ff0';
      p.active = true;
      return p;
    }
  }
  return null;
}

export function updateProjectiles(pool, dt, map, entities) {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.active) continue;

    p.lifetime -= dt;
    if (p.lifetime <= 0) {
      p.active = false;
      continue;
    }

    const newX = p.x + p.dx * p.speed * dt;
    const newY = p.y + p.dy * p.speed * dt;

    // Wall collision
    if (map.isWall(Math.floor(newX), Math.floor(newY))) {
      p.active = false;
      continue;
    }

    p.x = newX;
    p.y = newY;

    // Entity collision
    for (let j = 0; j < entities.length; j++) {
      const e = entities[j];
      if (!e.active || e.hp <= 0) continue;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = dx * dx + dy * dy;
      const r = CONFIG.entityRadius + CONFIG.projectileRadius;
      if (dist < r * r) {
        e.hp -= p.damage;
        e.hitFlash = 0.1;
        p.active = false;
        break;
      }
    }
  }
}

export function getProjectileSpriteList(pool) {
  const list = [];
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.active) continue;
    list.push({
      x: p.x,
      y: p.y,
      color: p.color,
      scale: 0.2,
    });
  }
  return list;
}
