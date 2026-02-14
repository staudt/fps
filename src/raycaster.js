import { CONFIG } from './config.js';

export function cast(player, map, screenWidth, depthBuffer) {
  const angle = player.angle + player.recoilOffset;
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const planeLen = Math.tan(CONFIG.fov / 2);
  const planeX = -dirY * planeLen;
  const planeY = dirX * planeLen;

  const hits = new Array(screenWidth);

  for (let col = 0; col < screenWidth; col++) {
    const cameraX = 2 * col / screenWidth - 1;
    const rayDirX = dirX + planeX * cameraX;
    const rayDirY = dirY + planeY * cameraX;

    let mapX = Math.floor(player.x);
    let mapY = Math.floor(player.y);

    const deltaDistX = Math.abs(1 / rayDirX);
    const deltaDistY = Math.abs(1 / rayDirY);

    let stepX, sideDistX;
    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (player.x - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1 - player.x) * deltaDistX;
    }

    let stepY, sideDistY;
    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (player.y - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1 - player.y) * deltaDistY;
    }

    // DDA walk
    let side = 0;
    let hit = false;
    while (!hit) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }

      const tile = map.getTile(mapX, mapY);
      if (tile > 0) {
        hit = true;
        const perpDist = side === 0
          ? sideDistX - deltaDistX
          : sideDistY - deltaDistY;

        depthBuffer[col] = perpDist;

        // Wall X position for texture mapping later
        let wallX;
        if (side === 0) {
          wallX = player.y + perpDist * rayDirY;
        } else {
          wallX = player.x + perpDist * rayDirX;
        }
        wallX -= Math.floor(wallX);

        const height = map.getHeight(mapX, mapY);
        hits[col] = { perpDist, side, tile, wallX, mapX, mapY, height };
        break;
      }

      // Safety: max ray distance
      const dist = side === 0
        ? sideDistX - deltaDistX
        : sideDistY - deltaDistY;
      if (dist > CONFIG.maxRayDist) {
        depthBuffer[col] = CONFIG.maxRayDist;
        hits[col] = null;
        break;
      }
    }
  }

  return { hits, dirX, dirY, planeX, planeY };
}
