import { CONFIG } from './config.js';

const ENTITY_TYPES = {
  grunt: { hp: 100, speed: 2.0, color: '#e44', scale: 1.0 },
  charger: { hp: 60, speed: 5.0, color: '#e82', scale: 0.9 },
  turret: { hp: 150, speed: 0, color: '#88e', scale: 1.1 },
  tank: { hp: 300, speed: 1.0, color: '#a4a', scale: 1.4 },
  health: { hp: 0, speed: 0, color: '#4e4', scale: 0.6 },
};

const DEATH_DURATION = 0.4;

export function spawnEntities(entityDefs) {
  return entityDefs.map((def) => {
    const typeDef = ENTITY_TYPES[def.type] || ENTITY_TYPES.grunt;
    return {
      type: def.type,
      x: def.x,
      y: def.y,
      hp: typeDef.hp,
      maxHp: typeDef.hp,
      speed: typeDef.speed,
      color: typeDef.color,
      scale: typeDef.scale,
      state: 'idle',
      stateTimer: 0,
      active: true,
      hitFlash: 0,
      dying: false,
      deathTimer: 0,
    };
  });
}

export function updateEntities(entities, dt, map, player) {
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (!e.active) continue;

    // Decay hit flash
    if (e.hitFlash > 0) e.hitFlash -= dt;

    // Death animation
    if (e.dying) {
      e.deathTimer += dt;
      if (e.deathTimer >= DEATH_DURATION) {
        e.active = false;
      }
      continue;
    }

    // Check if just died
    if (e.hp <= 0 && !e.dying) {
      e.dying = true;
      e.deathTimer = 0;
    }
  }
}

export function getEntitySpriteList(entities) {
  const list = [];
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (!e.active) continue;

    let scale = e.scale;
    let color = e.hitFlash > 0 ? '#fff' : e.color;

    // Death animation: shrink and redden
    if (e.dying) {
      const t = e.deathTimer / DEATH_DURATION;
      scale *= (1 - t * 0.7); // shrink to 30%
      color = `rgb(${Math.floor(200 * (1 - t))},0,0)`;
    }

    list.push({
      x: e.x,
      y: e.y,
      color,
      scale,
      entity: e,
    });
  }
  return list;
}
