# Coil

A neon grid serpent with a ticking combo. Thread the mint coil through the enclosed board, collect pink cores, and plan the next route before the multiplier expires. Every core grows the snake; a wall or body collision ends the run. Classic plays at eight cells per second, with combos up to x5 and a session best score.

## Play and build

Install dependencies with `npm ci`, then run `npm run dev` and open the displayed URL. Run `npm run build` for the complete static site in `dist/`; `npm run preview` serves that build. Serve `dist/` at any static host root or sub-path. No backend is required.

The committed pixel sprites and WAV soundtrack are bundled through `public/assets`, a link to the repository's `assets/` directory. Building never invokes asset generators. The sprites were authored with `draw` and `draw-sheet`; the original effects with `sfx-synth`, and the eight-second musical loop with `music`. The generation recipe is retained in `assets/production.md`.

## Controls

- Arrow keys or WASD: steer; up/down also select menu items.
- Enter or Space: accept the selected menu item.
- Escape: pause or go back.
- P: pause/resume.
- M: mute/unmute.
- Backtick: engine diagnostics.

Menus also support pointer and touch. Touch play uses the engine's four-way pad. Only perpendicular turns take effect; two turns may be queued. Pausing freezes movement, the bite animation, and the combo window. Sound and session best reset when the page is reloaded.

## Verification

`npm run typecheck`, `npm run lint`, `npm run format`, and `npm test` verify the source. Unit tests run the actual engine with a scripted clock and native canvas, loading the shipped sprites. The debug surface is returned by `engine.debug`; it is not exposed on the page. Its poses and snapshot follow `specs/instrumentation.md`.

The `showcase/` directory includes screenshots and an engine-recorded replay of a combo run.
