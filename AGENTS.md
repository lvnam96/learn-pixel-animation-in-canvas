# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Install deps: `pnpm install` (pnpm is the package manager — `pnpm-lock.yaml` is the lockfile, no `package-lock.json`/`yarn.lock`)
- Dev server: `pnpm dev` (Vite, default port 5173)
- Build: `pnpm build` (runs `tsc` for type-checking, then `vite build`)
- Preview production build: `pnpm preview`
- No test suite exists in this repo (no test runner is configured).
- No lint script exists despite `eslint` being a devDependency — there is no ESLint config file, so `eslint` cannot currently be invoked. Don't assume a `pnpm lint` command works.

## Architecture

This is a Vite + vanilla TypeScript (no framework) canvas particle-animation experiment. `index.html` is the single HTML entry point; it loads exactly one `<script type="module" src="/src/main.ts">`.

**Three parallel implementations of the same effect exist side by side, only one active at a time:**
- `src/main.ts` — the file actually wired into `index.html`. Object-oriented version (`Particle` and `Effect` classes, array-of-objects).
- `src/main-fillRect-optimized.ts` — alternate implementation using struct-of-arrays typed arrays (`Float32Array` per field) instead of particle objects, with squared-distance math (no `sqrt`/`atan2`/trig) replacing the OOP version's force calculation. Still draws via one `ctx.fillRect()` call per particle per frame.
- `src/main-putImageData.ts` — same struct-of-arrays approach, but renders by writing packed RGBA pixels directly into a reused `ImageData` buffer and calling `ctx.putImageData()` once per frame, instead of per-particle `fillRect` calls.

These are not meant to run together — to try one of the alternates, swap the `<script src>` in `index.html` to point at it. They exist for performance comparison/experimentation between OOP+draw-calls vs. SoA+draw-calls vs. SoA+direct-pixel-buffer rendering strategies.

**Common effect logic across all three:** draw the logo image to the canvas, read its pixels via `getImageData`, spawn one particle per non-transparent pixel anchored to that pixel's coordinate as its "origin," start particles at randomized positions, ease them back toward their origin every frame, and repel them from the mouse cursor within a fixed radius. Driven by a single `requestAnimationFrame` loop per file.

**Known gotcha:** `src/main.ts` attaches its image `load` listener (`image.addEventListener('load', ...)`) well after `image.src` is set — two full class definitions execute synchronously in between. Under slow/throttled JS execution (heavy page load, low-end device, background tab), the image can finish decoding and fire its one-shot `load` event *before* the listener is attached, so the particle system silently never initializes (canvas stays empty, no errors thrown). The two alternate files attach the `load` listener immediately after setting `src` and don't have this exposure.

**Dead/unused code:** `src/counter.ts` (unused Vite-starter leftover, not imported anywhere) and `public/cw-logo.svg` (duplicate of `src/assets/cw-logo.svg`; the app imports the one under `src/assets` via Vite's asset pipeline). `src/style.css` is empty and its import is commented out in `main.ts`.
