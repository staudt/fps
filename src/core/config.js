export const CONFIG = {
  // Rendering
  fov: 66 * (Math.PI / 180),   // 66 degrees in radians
  renderScale: 1.0,             // 1.0 = native, adaptive scaling adjusts down if needed
  maxRayDist: 64,               // fog cutoff distance in tiles

  // Colors
  ceilingColor: '#333',
  floorColor: '#555',
  wallColors: {
    1: { light: '#b84', dark: '#945' },
    2: { light: '#88b', dark: '#669' },
    3: { light: '#8b8', dark: '#696' },
  },

  // Fog
  fogStart: 4,                  // distance (tiles) where fog begins
  fogEnd: 20,                   // distance where fog reaches max density
  fogMaxAlpha: 0.75,            // max fog opacity (< 1 keeps distant walls visible)
  fogColor: [0, 0, 0],          // RGB fog color

  // Player movement
  walkSpeed: 3.5,
  sprintMultiplier: 1.8,
  mouseSensitivity: 0.002,
  pitchSensitivity: 0.002,
  maxPitch: 0.4,
  playerRadius: 0.2,

  // Jump
  jumpVelocity: 6,
  gravity: 20,

  // Dash (double-tap direction)
  dashSpeed: 12,
  dashDuration: 0.15,
  dashCooldown: 1.0,
  doubleTapWindow: 0.25,

  // Weapon
  machineGunFireRate: 10,       // shots per second
  machineGunDamage: 10,
  machineGunSpread: 0.04,       // radians, grows with sustained fire
  machineGunSpreadGrowth: 0.008,
  machineGunSpreadMax: 0.12,
  machineGunRecoil: 0.01,

  shotgunPellets: 5,
  shotgunDamage: 30,
  shotgunSpread: 0.08,
  shotgunCooldown: 0.4,
  shotgunRange: 8,
  shotgunRecoil: 0.04,

  holdThreshold: 0.15,          // seconds before machine gun mode activates
  recoilDecay: 15,              // recoil recovery speed (per second)

  // Projectiles
  projectileSpeed: 20,
  projectileLifetime: 2.0,
  projectileRadius: 0.1,

  // Entities
  entityRadius: 0.3,

  // Game loop
  tickRate: 1 / 60,
};
