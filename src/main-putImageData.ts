import cwLogo from './assets/cw-logo.svg';

const canvas = document.getElementById('canvas1') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

const width = (canvas.width = window.innerWidth);
const height = (canvas.height = window.innerHeight);

// Physics constants — hoisted for JIT inlining
const gap = 1;
const ease = 0.9;
const friction = 0.8;
const mouseRadius = 30;
const mouseRadiusSq = mouseRadius * mouseRadius;

// Mouse state — sentinel values instead of null checks
let mouseX = -1e6;
let mouseY = -1e6;

window.addEventListener('mousemove', (e: MouseEvent) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});
window.addEventListener('mouseout', () => {
  mouseX = mouseY = -1e6;
});

// Structure-of-Arrays: flat typed arrays for cache-friendly iteration & zero GC pressure
let particleCount = 0;
let posX: Float32Array;
let posY: Float32Array;
let origX: Float32Array;
let origY: Float32Array;
let velX: Float32Array;
let velY: Float32Array;
let colorPacked: Uint32Array;
let frameBuffer: ImageData;
let buf32: Uint32Array;

const image = document.getElementById('image1') as HTMLImageElement;
image.src = cwLogo;

image.addEventListener('load', () => {
  const centerX = width >> 1;
  const centerY = height >> 1;
  const imgW = image.width;
  const imgH = image.height;
  const imgX = centerX - (imgW >> 1);
  const imgY = centerY - (imgH >> 1);

  // Draw image to extract pixel data — read only the image region, not the full canvas
  ctx.drawImage(image, imgX, imgY, imgW, imgH);
  const pixels = ctx.getImageData(imgX, imgY, imgW, imgH).data;

  // First pass: count visible pixels to pre-allocate exact-size typed arrays
  let count = 0;
  for (let y = 0; y < imgH; y += gap) {
    for (let x = 0; x < imgW; x += gap) {
      if (pixels[((y * imgW + x) << 2) + 3] > 0) count++;
    }
  }

  particleCount = count;

  // Allocate contiguous typed arrays — no per-particle object overhead
  posX = new Float32Array(count);
  posY = new Float32Array(count);
  origX = new Float32Array(count);
  origY = new Float32Array(count);
  velX = new Float32Array(count);
  velY = new Float32Array(count);
  colorPacked = new Uint32Array(count);
  frameBuffer = ctx.createImageData(width, height);
  buf32 = new Uint32Array(frameBuffer.data.buffer);

  // Second pass: populate arrays
  let i = 0;
  for (let y = 0; y < imgH; y += gap) {
    for (let x = 0; x < imgW; x += gap) {
      const idx = (y * imgW + x) << 2;
      const a = pixels[idx + 3];
      if (a > 0) {
        origX[i] = imgX + x;
        origY[i] = imgY + y;
        posX[i] = Math.random() * width;
        posY[i] = Math.random() * height;
        // Pack as ABGR for little-endian Uint32 ImageData view
        colorPacked[i] = (a << 24) | (pixels[idx + 2] << 16) | (pixels[idx + 1] << 8) | pixels[idx];
        i++;
      }
    }
  }

  ctx.clearRect(0, 0, width, height);

  // Animation loop — zero allocations per frame
  const animate = () => {
    buf32.fill(0);

    // Hoist to locals for JIT to keep in registers
    const mx = mouseX;
    const my = mouseY;
    const mrSq = mouseRadiusSq;
    const mr = mouseRadius;
    const w = width;
    const h = height;
    const n = particleCount;

    for (let i = 0; i < n; i++) {
      let px = posX[i];
      let py = posY[i];
      let vx = velX[i];
      let vy = velY[i];

      const dx = mx - px;
      const dy = my - py;
      const distSq = dx * dx + dy * dy;

      if (distSq < mrSq && distSq > 0) {
        const factor = -mr / distSq;
        vx += factor * dx;
        vy += factor * dy;
      }

      const ox = origX[i];
      const oy = origY[i];
      vx *= friction;
      vy *= friction;
      px += vx + (ox - px) * ease;
      py += vy + (oy - py) * ease;

      // Snap to origin when sub-pixel close — prevents oscillation stall near rest position
      if (px !== ox && Math.abs(px - ox) < 0.5 && Math.abs(vx) < 0.1) {
        px = ox;
        vx = 0;
      }
      if (py !== oy && Math.abs(py - oy) < 0.5 && Math.abs(vy) < 0.1) {
        py = oy;
        vy = 0;
      }

      velX[i] = vx;
      velY[i] = vy;
      posX[i] = px;
      posY[i] = py;

      // Math.floor: 0.5px max quantization error, better perceptual accuracy than | 0
      const ix = Math.floor(px);
      const iy = Math.floor(py);
      if (ix >= 0 && ix < w && iy >= 0 && iy < h) {
        buf32[iy * w + ix] = colorPacked[i];
      }
    }

    ctx.putImageData(frameBuffer, 0, 0);
    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
});
