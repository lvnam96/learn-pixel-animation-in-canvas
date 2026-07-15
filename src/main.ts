// import './style.css';
import cwLogo from './assets/cw-logo.svg';

const image = document.getElementById('image1') as HTMLImageElement;
image.src = cwLogo;

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('canvas1') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  // canvas.width = window.innerWidth;
  // canvas.height = window.innerHeight;
  const padding = 50; // extra room so particles repelled by mouse aren't clipped
  canvas.width = image.width + padding * 2;
  canvas.height = image.height + padding * 2;

  class Particle {
    effect: Effect;

    // Particle current position:
    x: number;
    y: number;

    // Original position of the particle (where it should return to):
    originalX: number;
    originalY: number;

    velocityY = 0;
    velocityX = 0;

    size: number;
    color: string;
    ease = 0.9;
    friction = 0.8;

    constructor({ effect, x, y, color = 'black' }: { effect: Effect; x: number; y: number; color?: string }) {
      this.effect = effect;
      this.size = this.effect.gap;
      this.color = color;

      // Make sure the original position is an integer to avoid subpixel rendering perf issues by flooring the x and y values:
      this.originalX = Math.floor(x);
      this.originalY = Math.floor(y);

      this.x = Math.random() * this.effect.width;
      this.y = Math.random() * this.effect.height;
    }

    update = () => {
      const dx = this.effect.mouse.x! - this.x;
      const dy = this.effect.mouse.y! - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const force = -this.effect.mouse.radius / distance;

      if (distance < this.effect.mouse.radius) {
        const angle = Math.atan2(dy, dx);

        this.velocityX += force * Math.cos(angle);
        this.velocityY += force * Math.sin(angle);
      }

      this.x += (this.velocityX *= this.friction) + (this.originalX - this.x) * this.ease;
      this.y += (this.velocityY *= this.friction) + (this.originalY - this.y) * this.ease;
    };

    draw = (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.size, this.size);
    };
    warp = () => {
      this.x = Math.random() * this.effect.width;
      this.y = Math.random() * this.effect.height;
    };
  }

  class Effect {
    // Canvas dimensions:
    public width: number;
    public height: number;

    // Center position of the canvas:
    private centerX: number;
    private centerY: number;

    private particlesArray: Particle[] = [];

    public gap = 1;

    public mouse: {
      x: number | null;
      y: number | null;
      radius: number;
    } = {
      x: null,
      y: null,
      radius: 30,
    };

    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
      this.centerX = this.width / 2;
      this.centerY = this.height / 2;

      canvas.addEventListener('mousemove', (event) => {
        this.mouse.x = event.offsetX;
        this.mouse.y = event.offsetY;
      });

      canvas.addEventListener('mouseout', () => {
        this.mouse.x = null;
        this.mouse.y = null;
      });
    }

    init = (ctx: CanvasRenderingContext2D, image: HTMLImageElement) => {
      const imageX = this.centerX - image.width / 2;
      const imageY = this.centerY - image.height / 2;

      // Draw the image on the canvas to extract pixel data:
      ctx.drawImage(image, imageX, imageY, image.width, image.height);

      // Extract pixel data from the canvas (now containing the image):
      const pixels = ctx.getImageData(0, 0, this.width, this.height).data;

      // Loop through the pixel data and create particles for non-transparent pixels:
      for (let y = 0; y < this.height; y += this.gap) {
        for (let x = 0; x < this.width; x += this.gap) {
          const index = (y * this.width + x) * 4;
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];
          const alpha = pixels[index + 3];

          if (alpha > 0) {
            const color = `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
            this.particlesArray.push(
              new Particle({
                effect: this,
                x,
                y,
                color,
              })
            );
          }
        }
      }
    };

    draw = (ctx: CanvasRenderingContext2D) => {
      this.particlesArray.forEach((particle) => {
        particle.draw(ctx);
      });
    };

    update = () => {
      this.particlesArray.forEach((particle) => {
        particle.update();
      });
    };

    warp = () => {
      this.particlesArray.forEach((particle) => {
        particle.warp();
      });
    };
  }

  const effect = new Effect(canvas.width, canvas.height);

  image.addEventListener('load', () => {
    effect.init(ctx, image);

    (function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      effect.draw(ctx);
      effect.update();
      window.requestAnimationFrame(animate);
    })();
  });

  // const warpButton = document.getElementById('warpButton') as HTMLButtonElement;
  // warpButton.addEventListener('click', () => {
  //   effect.warp();
  // });
});
