import cwLogo from './assets/cw-logo.svg';

const image = document.getElementById('image1') as HTMLImageElement;
image.src = cwLogo;

const canvas = document.getElementById('canvas1') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

// const width = (canvas.width = window.innerWidth);
// const height = (canvas.height = window.innerHeight);
const padding = 50; // extra room so particles repelled by mouse aren't clipped
const width = (canvas.width = image.width + padding * 2);
const height = (canvas.height = image.height + padding * 2);

// Physics constants — hoisted for JIT inlining
const gap = 1;
const ease = 0.9;
const friction = 0.8;
const mouseRadius = 30;
const mouseRadiusSq = mouseRadius * mouseRadius;

// Mouse state — sentinel values instead of null checks
let mouseX = -1e6;
let mouseY = -1e6;

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  mouseX = e.offsetX;
  mouseY = e.offsetY;
});
canvas.addEventListener('mouseout', () => {
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
let colors: string[];

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
  colors = new Array<string>(count);

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
        // Pre-allocate color string once — zero per-frame string allocations
        colors[i] = `rgba(${pixels[idx]},${pixels[idx + 1]},${pixels[idx + 2]},${a / 255})`;
        i++;
      }
    }
  }

  ctx.clearRect(0, 0, width, height);

  // Animation loop — zero allocations per frame
  const animate = () => {
    ctx.clearRect(0, 0, width, height);

    // Hoist to locals for JIT to keep in registers
    const mx = mouseX;
    const my = mouseY;
    const mrSq = mouseRadiusSq;
    const mr = mouseRadius;
    const n = particleCount;

    for (let i = 0; i < n; i++) {
      let px = posX[i];
      let py = posY[i];
      let vx = velX[i];
      let vy = velY[i];

      const dx = mx - px;
      const dy = my - py;
      const distSq = dx * dx + dy * dy;

      // Compare squared distances — eliminates Math.sqrt entirely
      // Vector math replaces atan2 + cos + sin: factor = -radius / distSq
      if (distSq < mrSq && distSq > 0) {
        const factor = -mr / distSq;
        vx += factor * dx;
        vy += factor * dy;
      }

      px += (vx *= friction) + (origX[i] - px) * ease;
      py += (vy *= friction) + (origY[i] - py) * ease;

      velX[i] = vx;
      velY[i] = vy;
      posX[i] = px;
      posY[i] = py;

      ctx.fillStyle = colors[i];
      ctx.fillRect(px, py, gap, gap);
    }

    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
});
