export function projectSprites(spriteList, player, rayResult, canvas, depthBuffer) {
  const { dirX, dirY, planeX, planeY } = rayResult;
  const w = canvas.width;
  const h = canvas.height;
  const horizon = Math.floor(h / 2 + player.pitch * h);
  const invDet = 1.0 / (planeX * dirY - dirX * planeY);

  const projected = [];

  for (let i = 0; i < spriteList.length; i++) {
    const s = spriteList[i];
    const dx = s.x - player.x;
    const dy = s.y - player.y;

    const transformX = invDet * (dirY * dx - dirX * dy);
    const transformY = invDet * (-planeY * dx + planeX * dy);

    if (transformY <= 0.1) continue;

    const screenX = Math.floor((w / 2) * (1 + transformX / transformY));
    const size = Math.abs(Math.floor(h / transformY)) * (s.scale || 1);
    const zOffset = player.z * (h / transformY);

    const drawStartX = Math.floor(screenX - size / 2);
    const drawEndX = Math.floor(screenX + size / 2);
    const drawStartY = Math.floor(horizon - size / 2 + zOffset);
    const drawEndY = Math.floor(horizon + size / 2 + zOffset);

    projected.push({
      index: i,
      transformY,
      screenX,
      size,
      drawStartX,
      drawEndX,
      drawStartY,
      drawEndY,
      color: s.color,
      sprite: s,
    });
  }

  projected.sort((a, b) => b.transformY - a.transformY);
  return projected;
}

export function drawSprites(ctx, projected, depthBuffer, canvasHeight, fogFn) {
  const w = depthBuffer.length;

  for (let i = 0; i < projected.length; i++) {
    const p = projected[i];
    const s = p.sprite;
    const entity = s.entity;

    const startX = Math.max(0, p.drawStartX);
    const endX = Math.min(w - 1, p.drawEndX);
    if (startX >= endX) continue;

    // Check visibility
    let visible = false;
    for (let col = startX; col < endX; col++) {
      if (p.transformY < depthBuffer[col]) { visible = true; break; }
    }
    if (!visible) continue;

    if (entity) {
      drawEntitySprite(ctx, p, depthBuffer, startX, endX, canvasHeight);
    } else {
      // Projectile — simple bright rectangle
      ctx.fillStyle = p.color;
      for (let col = startX; col < endX; col++) {
        if (p.transformY < depthBuffer[col]) {
          ctx.fillRect(col, Math.max(0, p.drawStartY), 1, p.drawEndY - p.drawStartY);
        }
      }
    }

    // Fog overlay on sprite
    if (fogFn) {
      const fog = fogFn(p.transformY);
      if (fog > 0.01) {
        const drawTop = Math.max(0, p.drawStartY);
        const drawBot = Math.min(canvasHeight, p.drawEndY);
        if (drawBot > drawTop) {
          ctx.fillStyle = fogFn.rgba(fog);
          for (let col = startX; col < endX; col++) {
            if (p.transformY < depthBuffer[col]) {
              ctx.fillRect(col, drawTop, 1, drawBot - drawTop);
            }
          }
        }
      }
    }
  }
}

function drawEntitySprite(ctx, p, depthBuffer, startX, endX, canvasHeight) {
  const entity = p.sprite.entity;
  const sx = p.drawStartX;
  const sy = p.drawStartY;
  const size = p.size;
  const color = p.color;

  // Parse color for darker/lighter variants
  const darkColor = darken(color, 0.6);
  const outlineColor = darken(color, 0.4);

  // Draw body column-by-column (for wall occlusion)
  for (let col = startX; col < endX; col++) {
    if (p.transformY >= depthBuffer[col]) continue;

    const localX = (col - sx) / size; // 0..1 across sprite width

    // Shape depends on entity type
    let topFrac = 0, botFrac = 1;
    if (entity.type === 'grunt') {
      // Humanoid — narrower at top (head), wider body
      const headWidth = 0.3;
      const isHead = localX > 0.5 - headWidth / 2 && localX < 0.5 + headWidth / 2;
      topFrac = isHead ? 0.0 : 0.25;
      botFrac = 1.0;
    } else if (entity.type === 'charger') {
      // Triangular/wedge — narrow top, wide bottom
      const widthAtTop = 0.15;
      const taper = widthAtTop + (1 - widthAtTop) * 1.0;
      topFrac = Math.abs(localX - 0.5) < widthAtTop ? 0.0 : (Math.abs(localX - 0.5) < taper * 0.5 ? 0.3 : 0.5);
      botFrac = 1.0;
    } else if (entity.type === 'turret') {
      // Square/blocky with a barrel bump in center
      topFrac = 0.15;
      botFrac = 0.95;
      if (localX > 0.35 && localX < 0.65) topFrac = 0.0; // barrel
    } else if (entity.type === 'tank') {
      // Wide, thick rectangle
      topFrac = 0.1;
      botFrac = 1.0;
    } else if (entity.type === 'health') {
      // Cross shape
      const isCrossH = localX > 0.2 && localX < 0.8;
      const isCrossV = localX > 0.35 && localX < 0.65;
      topFrac = isCrossV ? 0.1 : (isCrossH ? 0.35 : 1.0);
      botFrac = isCrossV ? 0.9 : (isCrossH ? 0.65 : 0.0);
      if (topFrac >= botFrac) continue;
    }

    const colTop = Math.max(0, Math.floor(sy + size * topFrac));
    const colBot = Math.min(canvasHeight, Math.floor(sy + size * botFrac));
    if (colTop >= colBot) continue;

    // Main body fill
    ctx.fillStyle = color;
    ctx.fillRect(col, colTop, 1, colBot - colTop);

    // Darker edge shading (first and last 15% of width)
    if (localX < 0.15 || localX > 0.85) {
      ctx.fillStyle = darkColor;
      ctx.fillRect(col, colTop, 1, colBot - colTop);
    }

    // Outline (top and bottom pixels)
    ctx.fillStyle = outlineColor;
    ctx.fillRect(col, colTop, 1, Math.min(2, colBot - colTop));
    ctx.fillRect(col, colBot - Math.min(2, colBot - colTop), 1, Math.min(2, colBot - colTop));
  }

  // Outline left and right edges
  ctx.fillStyle = outlineColor;
  if (startX > p.drawStartX) {} // clipped, skip
  else {
    const colTop = Math.max(0, p.drawStartY);
    const colBot = Math.min(canvasHeight, p.drawEndY);
    if (p.transformY < depthBuffer[startX]) ctx.fillRect(startX, colTop, 1, colBot - colTop);
  }
  if (endX < p.drawEndX) {}
  else if (endX - 1 >= 0 && p.transformY < depthBuffer[endX - 1]) {
    const colTop = Math.max(0, p.drawStartY);
    const colBot = Math.min(canvasHeight, p.drawEndY);
    ctx.fillRect(endX - 1, colTop, 1, colBot - colTop);
  }

  // Health bar (enemies only, not items)
  if (entity.maxHp > 0 && entity.hp < entity.maxHp && entity.hp > 0) {
    const barW = Math.max(10, endX - startX);
    const barH = Math.max(2, Math.floor(size / 20));
    const barX = Math.floor(p.screenX - barW / 2);
    const barY = Math.max(0, p.drawStartY - barH - 4);
    const hpFrac = entity.hp / entity.maxHp;

    // Only draw if not behind wall at center column
    const centerCol = Math.max(0, Math.min(depthBuffer.length - 1, p.screenX));
    if (p.transformY < depthBuffer[centerCol]) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = hpFrac > 0.3 ? '#4e4' : '#e44';
      ctx.fillRect(barX, barY, Math.floor(barW * hpFrac), barH);
    }
  }
}

function darken(hex, factor) {
  const r = parseInt(hex.slice(1, 2), 16) * 17;
  const g = parseInt(hex.slice(2, 3), 16) * 17;
  const b = parseInt(hex.slice(3, 4), 16) * 17;
  return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
}
