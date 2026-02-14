import { CONFIG } from '../core/config.js';

export function createPlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    angle: spawn.angle || 0,
    hp: 100,
    pitch: 0,
    z: 0,
    vz: 0,
    // Dash state
    dashTimer: 0,
    dashCooldownTimer: 0,
    dashDirX: 0,
    dashDirY: 0,
    // Recoil (set by weapon, decayed here)
    recoilOffset: 0,
  };
}

function collidesAt(x, y, map) {
  const r = CONFIG.playerRadius;
  // Check 4 corners of bounding box
  return (
    map.isWall(Math.floor(x - r), Math.floor(y - r)) ||
    map.isWall(Math.floor(x + r), Math.floor(y - r)) ||
    map.isWall(Math.floor(x - r), Math.floor(y + r)) ||
    map.isWall(Math.floor(x + r), Math.floor(y + r))
  );
}

function collidesWithEntity(x, y, entities) {
  const r = CONFIG.playerRadius + CONFIG.entityRadius;
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (!e.active || e.hp <= 0) continue;
    const dx = x - e.x;
    const dy = y - e.y;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

export function updatePlayer(player, intent, dt, map, entities) {
  // Rotation from mouse
  player.angle += intent.mouseDelta * CONFIG.mouseSensitivity;

  // Pitch from mouse Y
  player.pitch -= intent.mouseDeltaY * CONFIG.pitchSensitivity;
  player.pitch = Math.max(-CONFIG.maxPitch, Math.min(CONFIG.maxPitch, player.pitch));

  // Jump
  if (intent.jump && player.z === 0) {
    player.vz = CONFIG.jumpVelocity;
  }

  // Gravity
  player.vz -= CONFIG.gravity * dt;
  player.z += player.vz * dt;
  if (player.z < 0) {
    player.z = 0;
    player.vz = 0;
  }

  // Recoil decay
  if (player.recoilOffset !== 0) {
    const decay = CONFIG.recoilDecay * dt;
    if (Math.abs(player.recoilOffset) <= decay) {
      player.recoilOffset = 0;
    } else {
      player.recoilOffset -= Math.sign(player.recoilOffset) * decay;
    }
  }

  // Dash cooldown
  if (player.dashCooldownTimer > 0) {
    player.dashCooldownTimer -= dt;
  }

  // Direction vectors
  const cos = Math.cos(player.angle);
  const sin = Math.sin(player.angle);

  // Movement from WASD
  let moveX = 0, moveY = 0;
  if (intent.forward !== 0 || intent.strafe !== 0) {
    moveX = cos * intent.forward + (-sin) * intent.strafe;
    moveY = sin * intent.forward + cos * intent.strafe;
    // Normalize diagonal movement
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    if (len > 0) {
      moveX /= len;
      moveY /= len;
    }
  }

  let speed = CONFIG.walkSpeed;
  if (intent.sprint) speed *= CONFIG.sprintMultiplier;

  let velX = moveX * speed;
  let velY = moveY * speed;

  // Initiate dash (double-tap direction)
  if (intent.dashDirection && player.dashCooldownTimer <= 0 && player.dashTimer <= 0) {
    player.dashTimer = CONFIG.dashDuration;
    player.dashCooldownTimer = CONFIG.dashCooldown;
    // Convert direction name to world-space vector
    let dashX = 0, dashY = 0;
    if (intent.dashDirection === 'forward')  { dashX = cos;  dashY = sin;  }
    if (intent.dashDirection === 'back')     { dashX = -cos; dashY = -sin; }
    if (intent.dashDirection === 'left')     { dashX = sin;  dashY = -cos; }
    if (intent.dashDirection === 'right')    { dashX = -sin; dashY = cos;  }
    player.dashDirX = dashX;
    player.dashDirY = dashY;
  }

  // Apply dash velocity
  if (player.dashTimer > 0) {
    player.dashTimer -= dt;
    velX += player.dashDirX * CONFIG.dashSpeed;
    velY += player.dashDirY * CONFIG.dashSpeed;
  }

  // Axis-separated collision against walls and entities
  const newX = player.x + velX * dt;
  if (!collidesAt(newX, player.y, map) && !collidesWithEntity(newX, player.y, entities)) {
    player.x = newX;
  }

  const newY = player.y + velY * dt;
  if (!collidesAt(player.x, newY, map) && !collidesWithEntity(player.x, newY, entities)) {
    player.y = newY;
  }
}
