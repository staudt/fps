const TEX_SIZE = 64;

// Tries to load image textures from assets/textures/wall_N.png.
// Falls back to procedural if the image doesn't exist.
// Format: place a 64x64 PNG at assets/textures/wall_1.png, wall_2.png, etc.
export async function loadTextures() {
  const procedural = {
    1: generateBrick(),
    2: generateStone(),
    3: generateMetal(),
  };

  const textures = {};
  for (const id of Object.keys(procedural)) {
    textures[id] = await tryLoadImage(id, procedural[id]);
  }

  // Floor/ceiling/sky textures — pixel data for scanline rendering
  textures.floor = generateFloor();
  textures.ceiling = generateCeiling();
  textures.sky = generateSky();

  return textures;
}

// Synchronous fallback — procedural only, no image loading
export function generateTextures() {
  return {
    1: generateBrick(),
    2: generateStone(),
    3: generateMetal(),
  };
}

async function tryLoadImage(id, fallback) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Got an image — draw onto canvas and generate dark variant
      const c = createTexCanvas();
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, TEX_SIZE, TEX_SIZE);
      resolve({ canvas: c, dark: generateDarkVariant(c) });
    };
    img.onerror = () => resolve(fallback);
    img.src = `assets/textures/wall_${id}.png`;
  });
}

function createTexCanvas() {
  const c = document.createElement('canvas');
  c.width = TEX_SIZE;
  c.height = TEX_SIZE;
  return c;
}

function generateBrick() {
  const c = createTexCanvas();
  const ctx = c.getContext('2d');
  const s = TEX_SIZE;

  // Base mortar color
  ctx.fillStyle = '#665544';
  ctx.fillRect(0, 0, s, s);

  // Brick rows
  const brickH = 8;
  const brickW = 16;
  const mortarW = 1;

  for (let row = 0; row < s / brickH; row++) {
    const offset = (row % 2 === 0) ? 0 : brickW / 2;
    for (let col = -1; col < s / brickW + 1; col++) {
      const bx = col * brickW + offset + mortarW;
      const by = row * brickH + mortarW;
      const bw = brickW - mortarW * 2;
      const bh = brickH - mortarW * 2;

      // Slight color variation per brick
      const r = 160 + Math.floor(Math.random() * 40);
      const g = 70 + Math.floor(Math.random() * 30);
      const b = 50 + Math.floor(Math.random() * 20);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(bx, by, bw, bh);

      // Subtle highlight on top edge
      ctx.fillStyle = `rgba(255,255,255,0.08)`;
      ctx.fillRect(bx, by, bw, 1);

      // Subtle shadow on bottom edge
      ctx.fillStyle = `rgba(0,0,0,0.15)`;
      ctx.fillRect(bx, by + bh - 1, bw, 1);
    }
  }

  // Add noise
  addNoise(ctx, s, 0.03);

  return { canvas: c, dark: generateDarkVariant(c) };
}

function generateStone() {
  const c = createTexCanvas();
  const ctx = c.getContext('2d');
  const s = TEX_SIZE;

  // Base
  ctx.fillStyle = '#778899';
  ctx.fillRect(0, 0, s, s);

  // Irregular stone blocks
  const blocks = [
    [0, 0, 30, 20], [30, 0, 34, 22],
    [0, 20, 18, 22], [18, 20, 28, 20], [46, 20, 18, 22],
    [0, 42, 32, 22], [32, 42, 32, 22],
  ];

  for (const [bx, by, bw, bh] of blocks) {
    const g = 100 + Math.floor(Math.random() * 50);
    ctx.fillStyle = `rgb(${g - 10},${g},${g + 15})`;
    ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2);

    // Top/left highlight
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(bx + 1, by + 1, bw - 2, 1);
    ctx.fillRect(bx + 1, by + 1, 1, bh - 2);

    // Bottom/right shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(bx + 1, by + bh - 2, bw - 2, 1);
    ctx.fillRect(bx + bw - 2, by + 1, 1, bh - 2);
  }

  addNoise(ctx, s, 0.04);

  return { canvas: c, dark: generateDarkVariant(c) };
}

function generateMetal() {
  const c = createTexCanvas();
  const ctx = c.getContext('2d');
  const s = TEX_SIZE;

  // Base metal
  ctx.fillStyle = '#667766';
  ctx.fillRect(0, 0, s, s);

  // Horizontal panel lines
  for (let y = 0; y < s; y += 16) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, y, s, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, y + 1, s, 1);
  }

  // Vertical panel lines
  for (let x = 0; x < s; x += 32) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x, 0, 1, s);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x + 1, 0, 1, s);
  }

  // Rivets
  const rivetPositions = [
    [4, 4], [28, 4], [36, 4], [60, 4],
    [4, 20], [28, 20], [36, 20], [60, 20],
    [4, 36], [28, 36], [36, 36], [60, 36],
    [4, 52], [28, 52], [36, 52], [60, 52],
  ];
  for (const [rx, ry] of rivetPositions) {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(rx, ry, 2, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(rx + 1, ry + 1, 1, 1);
  }

  addNoise(ctx, s, 0.02);

  return { canvas: c, dark: generateDarkVariant(c) };
}

function generateFloor() {
  const s = TEX_SIZE;
  const c = createTexCanvas();
  const ctx = c.getContext('2d');

  // Concrete tile base
  ctx.fillStyle = '#666';
  ctx.fillRect(0, 0, s, s);

  // Grid lines every 32px
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 0, s, 1);
  ctx.fillRect(0, 32, s, 1);
  ctx.fillRect(0, 0, 1, s);
  ctx.fillRect(32, 0, 1, s);

  // Highlight edge
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(1, 1, s - 1, 1);
  ctx.fillRect(1, 33, s - 1, 1);
  ctx.fillRect(1, 1, 1, s - 1);
  ctx.fillRect(33, 1, 1, s - 1);

  addNoise(ctx, s, 0.06);

  const data = ctx.getImageData(0, 0, s, s).data;
  return { data, size: s };
}

function generateCeiling() {
  const s = TEX_SIZE;
  const c = createTexCanvas();
  const ctx = c.getContext('2d');

  // Light gray panel base
  ctx.fillStyle = '#888';
  ctx.fillRect(0, 0, s, s);

  // Panel lines every 16px
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let y = 0; y < s; y += 16) {
    ctx.fillRect(0, y, s, 1);
  }
  for (let x = 0; x < s; x += 16) {
    ctx.fillRect(x, 0, 1, s);
  }

  // Highlight edges
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  for (let y = 1; y < s; y += 16) {
    ctx.fillRect(0, y, s, 1);
  }
  for (let x = 1; x < s; x += 16) {
    ctx.fillRect(x, 0, 1, s);
  }

  addNoise(ctx, s, 0.04);

  const data = ctx.getImageData(0, 0, s, s).data;
  return { data, size: s };
}

function generateSky() {
  const w = 512;
  const h = 200;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Gradient: dark blue top → lighter blue-gray at horizon
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const r = Math.floor(20 + t * 60);
    const g = Math.floor(20 + t * 50);
    const b = Math.floor(60 + t * 100);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, y, w, 1);
  }

  // Stars in upper 60%
  for (let i = 0; i < 120; i++) {
    const sx = Math.floor(Math.random() * w);
    const sy = Math.floor(Math.random() * h * 0.6);
    const brightness = 150 + Math.floor(Math.random() * 105);
    const size = Math.random() < 0.15 ? 2 : 1;
    ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
    ctx.fillRect(sx, sy, size, size);
  }

  const data = ctx.getImageData(0, 0, w, h).data;
  return { data, width: w, height: h };
}

function addNoise(ctx, size, intensity) {
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * intensity;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  ctx.putImageData(imageData, 0, 0);
}

function generateDarkVariant(sourceCanvas) {
  const c = createTexCanvas();
  const ctx = c.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0);

  // Darken by 35%
  const imageData = ctx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.floor(data[i] * 0.65);
    data[i + 1] = Math.floor(data[i + 1] * 0.65);
    data[i + 2] = Math.floor(data[i + 2] * 0.65);
  }
  ctx.putImageData(imageData, 0, 0);

  return c;
}

export { TEX_SIZE };
