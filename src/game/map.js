export async function loadMap(url) {
  const resp = await fetch(url);
  const data = await resp.json();
  const tiles = data.tiles;
  const height = tiles.length;
  const width = tiles[0].length;
  return {
    tiles,
    width,
    height,
    player: data.player,
    entities: data.entities || [],
    sky: data.sky !== undefined ? data.sky : true,
    isWall(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) return true;
      return tiles[y][x] > 0;
    },
    getTile(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) return 1;
      return tiles[y][x] % 10;
    },
    getHeight(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) return 1;
      const raw = tiles[y][x];
      if (raw === 0) return 0;
      const h = Math.floor(raw / 10);
      return h > 0 ? h : 1;
    },
  };
}
