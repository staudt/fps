import { CONFIG } from '../core/config.js';

let imageBuffer = null;
let pixels32 = null;
let bufferW = 0;
let bufferH = 0;

// Pre-packed Uint32 texture lookups (built once on first call)
let floorPacked = null;
let ceilingPacked = null;
let skyPacked = null;

function ensureBuffer(ctx, w, h) {
  if (bufferW !== w || bufferH !== h) {
    bufferW = w;
    bufferH = h;
    imageBuffer = ctx.createImageData(w, h);
    pixels32 = new Uint32Array(imageBuffer.data.buffer);
  }
}

function packTexture(data, len) {
  const packed = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const j = i * 4;
    packed[i] = data[j] | (data[j + 1] << 8) | (data[j + 2] << 16) | 0xFF000000;
  }
  return packed;
}

function ensurePacked(textures) {
  if (floorPacked) return;
  const f = textures.floor;
  floorPacked = packTexture(f.data, f.size * f.size);
  const c = textures.ceiling;
  ceilingPacked = packTexture(c.data, c.size * c.size);
  const s = textures.sky;
  skyPacked = packTexture(s.data, s.width * s.height);
}

export function drawFloorAndSky(ctx, w, h, horizon, player, rayResult, textures, useSky) {
  ensureBuffer(ctx, w, h);
  ensurePacked(textures);
  const buf = pixels32;

  const { dirX, dirY, planeX, planeY } = rayResult;
  const fSize = textures.floor.size;
  const cSize = textures.ceiling.size;
  const fMask = fSize - 1;
  const cMask = cSize - 1;

  // Leftmost and rightmost ray directions
  const rayDirX0 = dirX - planeX;
  const rayDirY0 = dirY - planeY;
  const stepRayDirX = (planeX * 2) / w;
  const stepRayDirY = (planeY * 2) / w;

  // Clear buffer
  buf.fill(0);

  // --- Floor (rows below horizon) ---
  const horizonClamped = Math.max(0, Math.min(h, horizon));
  const halfH = 0.5 + player.z;

  for (let y = horizonClamped; y < h; y++) {
    const p = y - horizon;
    if (p <= 0) continue;
    const rowDist = h * halfH / p;

    let floorX = player.x + rowDist * rayDirX0;
    let floorY = player.y + rowDist * rayDirY0;
    const floorStepX = rowDist * stepRayDirX;
    const floorStepY = rowDist * stepRayDirY;

    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      const tx = (floorX * fSize) & fMask;
      const ty = (floorY * fSize) & fMask;
      buf[rowOffset + x] = floorPacked[ty * fSize + tx];
      floorX += floorStepX;
      floorY += floorStepY;
    }
  }

  // --- Ceiling / Sky (rows above horizon) ---
  if (useSky) {
    // Doom-style scrolling sky — linear interpolation across row
    const skyW = textures.sky.width;
    const skyH = textures.sky.height;
    const fov = CONFIG.fov;
    const angleBase = player.angle - fov * 0.5;
    const angleStep = fov / w;
    const invTwoPi = skyW / (Math.PI * 2);

    for (let y = 0; y < horizonClamped; y++) {
      const skyV = Math.min(skyH - 1, ((horizonClamped - y) / horizonClamped * (skyH - 1)) | 0);
      const texRow = skyV * skyW;
      const rowOffset = y * w;

      let angle = angleBase;
      for (let x = 0; x < w; x++) {
        let su = (angle * invTwoPi) | 0;
        su = ((su % skyW) + skyW) % skyW;
        buf[rowOffset + x] = skyPacked[texRow + su];
        angle += angleStep;
      }
    }
  } else {
    // Indoor textured ceiling (mirrored floor casting)
    const halfHCeil = 0.5 - player.z;
    for (let y = 0; y < horizonClamped; y++) {
      const p = horizon - y;
      if (p <= 0) continue;
      const rowDist = h * halfHCeil / p;
      if (rowDist < 0) continue;

      let ceilX = player.x + rowDist * rayDirX0;
      let ceilY = player.y + rowDist * rayDirY0;
      const ceilStepX = rowDist * stepRayDirX;
      const ceilStepY = rowDist * stepRayDirY;

      const rowOffset = y * w;
      for (let x = 0; x < w; x++) {
        const tx = (ceilX * cSize) & cMask;
        const ty = (ceilY * cSize) & cMask;
        buf[rowOffset + x] = ceilingPacked[ty * cSize + tx];
        ceilX += ceilStepX;
        ceilY += ceilStepY;
      }
    }
  }

  ctx.putImageData(imageBuffer, 0, 0);

  // Fog gradient overlay on floor (GPU-accelerated)
  const [fr, fg, fb] = CONFIG.fogColor;
  const fogMax = CONFIG.fogMaxAlpha;
  if (fogMax > 0 && horizonClamped < h) {
    const grad = ctx.createLinearGradient(0, horizonClamped, 0, h);
    grad.addColorStop(0, `rgba(${fr},${fg},${fb},${fogMax})`);
    grad.addColorStop(1, `rgba(${fr},${fg},${fb},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, horizonClamped, w, h - horizonClamped);
  }

  // Fog gradient on ceiling (indoor only — sky doesn't get fog)
  if (!useSky && fogMax > 0 && horizonClamped > 0) {
    const grad = ctx.createLinearGradient(0, horizonClamped, 0, 0);
    grad.addColorStop(0, `rgba(${fr},${fg},${fb},${fogMax})`);
    grad.addColorStop(1, `rgba(${fr},${fg},${fb},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, horizonClamped);
  }
}
