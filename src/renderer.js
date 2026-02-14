import { CONFIG } from './config.js';
import { getEntitySpriteList } from './entities.js';
import { getProjectileSpriteList } from './projectiles.js';
import { projectSprites, drawSprites } from './sprites.js';
import { TEX_SIZE } from './textures.js';

const WALL_COLORS = CONFIG.wallColors;
let wallTextures = null;

export function setTextures(textures) {
  wallTextures = textures;
}

export function draw(ctx, canvas, player, map, rayResult, depthBuffer, entities, projectiles, weapon) {
  const w = canvas.width;
  const h = canvas.height;
  const horizon = Math.floor(h / 2 + player.pitch * h);

  // Clear / draw ceiling and floor
  ctx.fillStyle = CONFIG.ceilingColor;
  ctx.fillRect(0, 0, w, horizon);
  ctx.fillStyle = CONFIG.floorColor;
  ctx.fillRect(0, horizon, w, h - horizon);

  // Draw wall columns
  const hits = rayResult.hits;
  const colTop = new Array(w);
  const colDepth = new Array(w);

  for (let col = 0; col < w; col++) {
    const hit = hits[col];
    if (!hit) {
      colTop[col] = h;
      colDepth[col] = Infinity;
      continue;
    }

    const baseLineHeight = h / hit.perpDist;
    const wallHeight = hit.height || 1;
    const lineHeight = baseLineHeight * wallHeight;
    const zOffset = player.z * (h / hit.perpDist);
    // Wall grows upward: bottom stays at standard position
    const drawEnd = Math.floor(horizon + baseLineHeight / 2 + zOffset);
    const drawStart = Math.floor(drawEnd - lineHeight);
    const drawHeight = drawEnd - drawStart;

    colTop[col] = drawStart;
    colDepth[col] = hit.perpDist;

    const tex = wallTextures && wallTextures[hit.tile];
    if (tex && drawHeight > 0) {
      const texX = Math.floor(hit.wallX * TEX_SIZE) & (TEX_SIZE - 1);
      const source = hit.side === 1 ? tex.dark : tex.canvas;
      if (wallHeight <= 1) {
        ctx.drawImage(source, texX, 0, 1, TEX_SIZE, col, drawStart, 1, drawHeight);
      } else {
        // Tile texture for each vertical block
        const segHeight = drawHeight / wallHeight;
        for (let t = 0; t < wallHeight; t++) {
          ctx.drawImage(source, texX, 0, 1, TEX_SIZE, col, drawStart + t * segHeight, 1, segHeight);
        }
      }
    } else {
      // Fallback: solid color
      const colors = WALL_COLORS[hit.tile] || WALL_COLORS[1];
      ctx.fillStyle = hit.side === 1 ? colors.dark : colors.light;
      ctx.fillRect(col, drawStart, 1, drawHeight);
    }

    // Block separation for tall walls
    if (wallHeight > 1) {
      const segHeight = drawHeight / wallHeight;
      // Darken upper blocks to distinguish from base
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(col, drawStart, 1, segHeight * (wallHeight - 1));
      // Ledge lines at block boundaries
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (let t = 1; t < wallHeight; t++) {
        const ledgeY = Math.floor(drawStart + t * segHeight);
        ctx.fillRect(col, ledgeY, 1, 2);
      }
    }
  }

  // Fill side faces at height transitions (makes tall blocks look solid)
  ctx.fillStyle = '#2a2a2a';
  for (let col = 1; col < w; col++) {
    const dd = Math.abs(colDepth[col] - colDepth[col - 1]);
    if (dd > 1.5) continue; // different walls, skip
    const diff = colTop[col] - colTop[col - 1];
    if (diff > 2) {
      // Current column shorter — fill gap above it (left side face)
      ctx.fillRect(col, colTop[col - 1], 1, diff);
    } else if (diff < -2) {
      // Previous column shorter — fill gap above it (right side face)
      ctx.fillRect(col - 1, colTop[col], 1, -diff);
    }
  }

  // Collect all sprites (entities + projectiles)
  const spriteList = getEntitySpriteList(entities).concat(getProjectileSpriteList(projectiles));

  // Project and draw sprites
  const projected = projectSprites(spriteList, player, rayResult, canvas, depthBuffer);
  drawSprites(ctx, projected, depthBuffer, h);

  // HUD: crosshair
  const cx = w / 2;
  const cy = horizon;
  const crossSize = Math.max(4, Math.floor(h / 80));
  const gap = Math.max(2, Math.floor(crossSize * 0.6));

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(1, Math.floor(h / 400));
  ctx.beginPath();
  // Top
  ctx.moveTo(cx, cy - crossSize - gap);
  ctx.lineTo(cx, cy - gap);
  // Bottom
  ctx.moveTo(cx, cy + gap);
  ctx.lineTo(cx, cy + crossSize + gap);
  // Left
  ctx.moveTo(cx - crossSize - gap, cy);
  ctx.lineTo(cx - gap, cy);
  // Right
  ctx.moveTo(cx + gap, cy);
  ctx.lineTo(cx + crossSize + gap, cy);
  ctx.stroke();

  // Muzzle flash
  if (weapon.muzzleFlash > 0) {
    const flashSize = Math.floor(h / 8);
    const alpha = Math.min(1, weapon.muzzleFlash / 0.05);
    ctx.fillStyle = `rgba(255, 200, 50, ${alpha * 0.6})`;
    ctx.fillRect(cx - flashSize / 2, h - flashSize, flashSize, flashSize);
  }

  // Dash cooldown indicator
  if (player.dashCooldownTimer > 0) {
    const barW = Math.floor(w * 0.15);
    const barH = Math.max(4, Math.floor(h / 120));
    const barX = Math.floor(cx - barW / 2);
    const barY = Math.floor(h * 0.85);
    const fill = 1 - (player.dashCooldownTimer / CONFIG.dashCooldown);

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = 'rgba(100,200,255,0.7)';
    ctx.fillRect(barX, barY, Math.floor(barW * fill), barH);
  }

  // HP bar
  const hpBarW = Math.floor(w * 0.2);
  const hpBarH = Math.max(6, Math.floor(h / 80));
  const hpBarX = Math.floor(w * 0.02);
  const hpBarY = Math.floor(h - hpBarH - h * 0.02);
  const hpFill = Math.max(0, player.hp / 100);

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
  ctx.fillStyle = hpFill > 0.3 ? 'rgba(50,220,50,0.8)' : 'rgba(220,50,50,0.9)';
  ctx.fillRect(hpBarX, hpBarY, Math.floor(hpBarW * hpFill), hpBarH);

  // Minimap (top-right corner)
  drawMinimap(ctx, w, h, player, map, entities, projectiles);
}

function drawMinimap(ctx, canvasW, canvasH, player, map, entities, projectiles) {
  const cellSize = Math.max(3, Math.floor(canvasH / 120));
  const viewRadius = 12; // tiles visible around player
  const mapSize = cellSize * viewRadius * 2;
  const mapX = canvasW - mapSize - Math.floor(canvasW * 0.01);
  const mapY = Math.floor(canvasH * 0.01);

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(mapX, mapY, mapSize, mapSize);

  const centerTileX = Math.floor(player.x);
  const centerTileY = Math.floor(player.y);

  // Draw tiles
  for (let dy = -viewRadius; dy < viewRadius; dy++) {
    for (let dx = -viewRadius; dx < viewRadius; dx++) {
      const tileX = centerTileX + dx;
      const tileY = centerTileY + dy;
      const tile = map.getTile(tileX, tileY);
      if (tile > 0) {
        const colors = CONFIG.wallColors[tile] || CONFIG.wallColors[1];
        ctx.fillStyle = colors.light;
        ctx.fillRect(
          mapX + (dx + viewRadius) * cellSize,
          mapY + (dy + viewRadius) * cellSize,
          cellSize, cellSize
        );
      }
    }
  }

  // Draw entities
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (!e.active || e.dying) continue;
    const ex = mapX + (e.x - centerTileX + viewRadius) * cellSize;
    const ey = mapY + (e.y - centerTileY + viewRadius) * cellSize;
    if (ex < mapX || ex > mapX + mapSize || ey < mapY || ey > mapY + mapSize) continue;
    ctx.fillStyle = e.color;
    ctx.fillRect(ex - 1, ey - 1, 3, 3);
  }

  // Draw projectiles
  for (let i = 0; i < projectiles.length; i++) {
    const p = projectiles[i];
    if (!p.active) continue;
    const px = mapX + (p.x - centerTileX + viewRadius) * cellSize;
    const py = mapY + (p.y - centerTileY + viewRadius) * cellSize;
    if (px < mapX || px > mapX + mapSize || py < mapY || py > mapY + mapSize) continue;
    ctx.fillStyle = p.color;
    ctx.fillRect(px, py, 2, 2);
  }

  // Draw player (center, with direction indicator)
  const pcx = mapX + viewRadius * cellSize;
  const pcy = mapY + viewRadius * cellSize;
  ctx.fillStyle = '#0f0';
  ctx.fillRect(pcx - 2, pcy - 2, 4, 4);

  // Direction line
  const dirLen = cellSize * 2;
  ctx.strokeStyle = '#0f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pcx, pcy);
  ctx.lineTo(pcx + Math.cos(player.angle) * dirLen, pcy + Math.sin(player.angle) * dirLen);
  ctx.stroke();
}
