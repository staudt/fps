import { CONFIG } from './config.js';
import { spawnProjectile } from './projectiles.js';

export function createWeaponState() {
  return {
    cooldownTimer: 0,
    spread: CONFIG.machineGunSpread,
    muzzleFlash: 0,
    recoilKick: 0,
    mode: 'idle', // idle, machinegun, shotgun-fired
  };
}

function hitscanRay(player, angle, maxDist, entities) {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  let closest = null;
  let closestDist = maxDist;

  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (!e.active || e.hp <= 0) continue;

    // Circle-line intersection
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const dot = dx * dirX + dy * dirY;
    if (dot < 0 || dot > closestDist) continue;

    const closestX = player.x + dirX * dot;
    const closestY = player.y + dirY * dot;
    const distToCenter = Math.sqrt((closestX - e.x) ** 2 + (closestY - e.y) ** 2);

    if (distToCenter < CONFIG.entityRadius) {
      closestDist = dot;
      closest = e;
    }
  }

  return closest;
}

export function updateWeapon(weapon, intent, dt, player, entities, projectiles, map) {
  // Cooldown
  if (weapon.cooldownTimer > 0) weapon.cooldownTimer -= dt;
  if (weapon.muzzleFlash > 0) weapon.muzzleFlash -= dt;

  // Spread recovery when not firing
  if (!intent.firing) {
    weapon.spread = Math.max(CONFIG.machineGunSpread,
      weapon.spread - CONFIG.machineGunSpreadGrowth * 5 * dt);
  }

  // Machine gun mode (hold)
  if (intent.firing && weapon.cooldownTimer <= 0) {
    weapon.mode = 'machinegun';
    weapon.cooldownTimer = 1 / CONFIG.machineGunFireRate;
    weapon.muzzleFlash = 0.05;

    const spreadAngle = (Math.random() - 0.5) * weapon.spread * 2;
    const fireAngle = player.angle + spreadAngle;

    // Spawn visible projectile (projectile handles damage on collision)
    spawnProjectile(projectiles, player.x, player.y, fireAngle,
      CONFIG.projectileSpeed, CONFIG.machineGunDamage, '#ff0');

    // Grow spread
    weapon.spread = Math.min(CONFIG.machineGunSpreadMax,
      weapon.spread + CONFIG.machineGunSpreadGrowth);

    // Recoil
    player.recoilOffset += (Math.random() - 0.5) * CONFIG.machineGunRecoil;
  }

  // Shotgun mode (tap)
  if (intent.shotgunTap && weapon.cooldownTimer <= 0) {
    weapon.mode = 'shotgun-fired';
    weapon.cooldownTimer = CONFIG.shotgunCooldown;
    weapon.muzzleFlash = 0.1;

    for (let i = 0; i < CONFIG.shotgunPellets; i++) {
      const spreadAngle = (Math.random() - 0.5) * CONFIG.shotgunSpread * 2;
      const fireAngle = player.angle + spreadAngle;

      // Spawn visible pellet (projectile handles damage on collision)
      spawnProjectile(projectiles, player.x, player.y, fireAngle,
        CONFIG.projectileSpeed * 0.8, CONFIG.shotgunDamage, '#fa0');
    }

    // Big recoil kick
    player.recoilOffset += CONFIG.shotgunRecoil * (Math.random() > 0.5 ? 1 : -1);
  }

  if (!intent.firing && !intent.shotgunTap) {
    weapon.mode = 'idle';
  }
}
