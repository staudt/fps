import { CONFIG } from './config.js';

const keys = {};
let mouseDX = 0;
let mouseDY = 0;
let mouseDown = false;
let mouseDownTime = 0;
let mouseJustUp = false;
let locked = false;

// Double-tap dash detection
const lastTapTime = {};  // code -> timestamp of last keydown after a release
const lastReleaseTime = {}; // code -> timestamp of last keyup
let pendingDash = null;  // direction string or null

const directionKeys = { KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right' };

export function initInput(canvas) {
  const gameKeys = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ShiftLeft', 'ShiftRight', 'Space', 'Tab',
  ]);

  window.addEventListener('keydown', (e) => {
    if (gameKeys.has(e.code)) e.preventDefault();
    if (keys[e.code]) return; // ignore key repeat
    keys[e.code] = true;

    // Double-tap detection for WASD
    if (directionKeys[e.code]) {
      const now = performance.now() / 1000;
      const lastRelease = lastReleaseTime[e.code] || 0;
      if (now - lastRelease < CONFIG.doubleTapWindow) {
        pendingDash = directionKeys[e.code];
      }
      lastTapTime[e.code] = now;
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (gameKeys.has(e.code)) e.preventDefault();
    if (directionKeys[e.code]) {
      lastReleaseTime[e.code] = performance.now() / 1000;
    }
  });

  canvas.addEventListener('click', () => {
    if (!locked) canvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
  });

  document.addEventListener('mousemove', (e) => {
    if (locked) {
      mouseDX += e.movementX;
      mouseDY += e.movementY;
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (locked && e.button === 0) {
      mouseDown = true;
      mouseDownTime = performance.now() / 1000;
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (e.button === 0 && mouseDown) {
      mouseDown = false;
      mouseJustUp = true;
    }
  });
}

export function getIntent() {
  const now = performance.now() / 1000;
  let forward = 0, strafe = 0;

  if (keys['KeyW']) forward += 1;
  if (keys['KeyS']) forward -= 1;
  if (keys['KeyA']) strafe -= 1;
  if (keys['KeyD']) strafe += 1;

  const sprint = !!keys['ShiftLeft'] || !!keys['ShiftRight'];
  const jump = !!keys['Space'];

  const mouseDelta = mouseDX;
  const mouseDeltaY = mouseDY;
  mouseDX = 0;
  mouseDY = 0;

  // Consume pending dash
  const dashDirection = pendingDash;
  pendingDash = null;

  const holdTime = mouseDown ? now - mouseDownTime : 0;
  const firing = mouseDown && holdTime >= CONFIG.holdThreshold;
  const shotgunTap = mouseJustUp && holdTime < CONFIG.holdThreshold;
  mouseJustUp = false;

  return {
    forward,
    strafe,
    sprint,
    jump,
    dashDirection,
    mouseDelta,
    mouseDeltaY,
    firing,
    shotgunTap,
  };
}
