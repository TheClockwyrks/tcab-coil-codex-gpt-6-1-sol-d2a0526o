/// <reference types="node" />
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFile } from "node:fs/promises";
import { createEngine, ConstantClock } from "@clockwyrks/simple-2d";
import { game, BACKGROUND } from "./game";
import * as C from "./constants";
let engine: ReturnType<
  typeof createEngine<import("./game").CoilState, import("./game").CoilDebugApi>
>;
let target: EventTarget;
function key(code: string) {
  for (const type of ["keydown", "keyup"]) {
    const e = new Event(type);
    Object.assign(e, { code, repeat: false });
    target.dispatchEvent(e);
  }
}
beforeEach(async () => {
  vi.stubGlobal(
    "fetch",
    async (path: string) => new Response(await readFile(path)),
  );
  vi.stubGlobal("createImageBitmap", async (blob: Blob) =>
    loadImage(Buffer.from(await blob.arrayBuffer())),
  );
  vi.stubGlobal(
    "AudioContext",
    class {
      decodeAudioData() {
        return Promise.resolve({});
      }
    },
  );
  target = new EventTarget();
  const canvas = createCanvas(C.STAGE_W, C.STAGE_H);
  engine = createEngine({
    canvas: canvas as unknown as HTMLCanvasElement,
    width: C.STAGE_W,
    height: C.STAGE_H,
    background: BACKGROUND,
    game,
    clock: new ConstantClock(C.TICK_SECONDS * 1000),
    surface: {
      cssWidth: () => C.STAGE_W,
      cssHeight: () => C.STAGE_H,
      dpr: () => 1,
      events: () => target,
    },
  });
  await engine.initialize();
});
afterEach(() => {
  engine.destroy();
  vi.unstubAllGlobals();
});
const pose = (
  f: (
    s: Parameters<typeof engine.debug.setScore>[0],
  ) => import("./game").CoilState,
) => engine.apply(f);
const snap = () => engine.debug.snapshot(engine.state);
describe("Coil engine-driven simulation", () => {
  it("opens fresh, loads art, exposes pure diagnostics and menu regions", async () => {
    expect(snap()).toMatchObject({
      screen: "title",
      score: 0,
      best: 0,
      pellet: null,
      dir: "right",
    });
    expect(engine.diagnostics().length).toBe(9);
    expect(engine.debug.menuItemRect(engine.state, 9)).toBeNull();
    key("Enter");
    await engine.advance(1);
    expect(snap().screen).toBe("playing");
    expect(snap().snake[0]).toEqual({ col: 16, row: 8 });
  });
  it("scores, grows, climbs combo, consumes a posed spawn, and updates best", async () => {
    pose((s) => engine.debug.setScreen(s, "playing"));
    pose((s) => engine.debug.setPellet(s, 16, 8));
    pose((s) => engine.debug.setNextPellet(s, 17, 8));
    await engine.advance(1);
    expect(snap()).toMatchObject({
      score: 10,
      best: 10,
      combo: 1,
      comboWindow: 3.375,
      pellet: { col: 17, row: 8 },
      nextPellet: null,
    });
    await engine.advance(1);
    expect(snap()).toMatchObject({ score: 30, combo: 2 });
    expect(snap().snake).toHaveLength(5);
  });
  it("buffers two turns, discards reversals and applies one turn each tick", async () => {
    pose((s) => engine.debug.setScreen(s, "playing"));
    engine.setClock(new ConstantClock(40));
    key("ArrowDown");
    await engine.advance(1);
    key("ArrowLeft");
    await engine.advance(1);
    key("ArrowUp");
    await engine.advance(1);
    expect(snap().turns).toEqual(["down", "left"]);
    await engine.advance(1);
    expect(snap().dir).toBe("down");
    await engine.advance(3);
    expect(snap().dir).toBe("left");
  });
  it("freezes pause and drains combo even when travel is disabled", async () => {
    pose((s) => engine.debug.setScreen(s, "playing"));
    pose((s) => engine.debug.setSnakeTravel(s, false));
    pose((s) => engine.debug.setCombo(s, 5));
    pose((s) => engine.debug.setComboWindow(s, C.COMBO_WINDOW));
    key("KeyP");
    await engine.advance(20);
    expect(snap().comboWindow).toBe(C.COMBO_WINDOW);
    key("KeyP");
    await engine.advance(28);
    expect(snap().combo).toBe(1);
    expect(snap().snake).toEqual(C.START_CELLS);
  });
  it("ends on a wall without moving the chain and spends accumulated time", async () => {
    pose((s) => engine.debug.setSnake(s, [{ col: 28, row: 8 }]));
    pose((s) => engine.debug.setScreen(s, "playing"));
    engine.setClock(new ConstantClock(1000));
    await engine.advance(1);
    expect(snap()).toMatchObject({ screen: "gameover", ticks: 1 });
    expect(engine.state.accumulator).toBe(0);
    expect(snap().snake[0].col).toBe(28);
  });
  it("allows entering a vacating tail but kills a body collision", async () => {
    pose((s) =>
      engine.debug.setSnake(s, [
        { col: 5, row: 5 },
        { col: 5, row: 6 },
        { col: 6, row: 6 },
        { col: 6, row: 5 },
      ]),
    );
    pose((s) => engine.debug.setScreen(s, "playing"));
    await engine.advance(1);
    expect(snap().screen).toBe("playing");
    pose((s) => engine.debug.setDirection(s, "left"));
    await engine.advance(1);
    expect(snap().screen).toBe("gameover");
  });
  it("supports independent driver switches and reset preserving mute", async () => {
    pose((s) => engine.debug.setScreen(s, "playing"));
    pose((s) => engine.debug.setPelletRespawn(s, false));
    pose((s) => engine.debug.setNextPellet(s, 20, 10));
    pose((s) => engine.debug.setPellet(s, 16, 8));
    await engine.advance(1);
    expect(snap().pellet).toBeNull();
    expect(snap().nextPellet).toEqual({ col: 20, row: 10 });
    key("KeyM");
    await engine.advance(1);
    pose((s) => engine.debug.reset(s));
    expect(snap()).toMatchObject({
      screen: "title",
      best: 0,
      ticks: 0,
      muted: true,
      steering: true,
      travel: true,
      pelletRespawn: true,
    });
  });
  it("clears a full board and consumes the final spawn pose", async () => {
    const cells: C.Cell[] = [];
    for (let row = 1; row <= C.INTERIOR_MAX_ROW; row++) {
      const columns = Array.from(
        { length: C.INTERIOR_MAX_COL },
        (_, i) => i + 1,
      );
      if (row % 2 === 0) columns.reverse();
      for (const col of columns)
        if (row !== 1 || col !== 1) cells.push({ col, row });
    }
    pose((s) => engine.debug.setSnake(s, cells));
    pose((s) => engine.debug.setDirection(s, "left"));
    pose((s) => engine.debug.setScreen(s, "playing"));
    pose((s) => engine.debug.setPellet(s, 1, 1));
    pose((s) => engine.debug.setNextPellet(s, 0, 0));
    await engine.advance(1);
    expect(snap()).toMatchObject({
      screen: "cleared",
      pellet: null,
      nextPellet: null,
      score: 10,
    });
    expect(snap().snake).toHaveLength(C.INTERIOR_MAX_COL * C.INTERIOR_MAX_ROW);
  });
  it("carries fractional ticks without tying travel to frame count", async () => {
    pose((s) => engine.debug.setScreen(s, "playing"));
    engine.setClock(new ConstantClock(25));
    await engine.advance(4);
    expect(snap().ticks).toBe(0);
    await engine.advance(1);
    expect(snap().ticks).toBe(1);
    expect(snap().snake[0]).toEqual({ col: 16, row: 8 });
  });
  it("validates poses, leaves reconcile inert and keeps draws in free cells", () => {
    expect(() => pose((s) => engine.debug.setScore(s, -1))).toThrow();
    expect(() => pose((s) => engine.debug.setSnake(s, []))).toThrow();
    expect(() => pose((s) => engine.debug.setPellet(s, 15, 8))).toThrow();
    expect(() => pose((s) => engine.debug.setCombo(s, 6))).toThrow();
    const before = snap();
    pose((s) => engine.debug.reconcile(s));
    expect(snap()).toEqual(before);
    for (let i = 0; i < 200; i++) {
      const p = engine.debug.drawPelletCell(engine.state)!;
      expect(p.col).toBeGreaterThan(0);
      expect(p.row).toBeGreaterThan(0);
      expect(C.START_CELLS).not.toContainEqual(p);
    }
  });
  it("remembers how-to selection and navigates end and pause menus", async () => {
    key("ArrowDown");
    await engine.advance(1);
    key("Enter");
    await engine.advance(1);
    expect(snap().screen).toBe("howto");
    key("Escape");
    await engine.advance(1);
    expect(snap()).toMatchObject({
      screen: "title",
      menuIndex: 1,
      titleIndex: 1,
    });
    key("ArrowUp");
    await engine.advance(1);
    key("Enter");
    await engine.advance(1);
    key("Escape");
    await engine.advance(1);
    key("ArrowDown");
    await engine.advance(1);
    key("Enter");
    await engine.advance(1);
    expect(snap().score).toBe(0);
    expect(snap().screen).toBe("playing");
  });
});
