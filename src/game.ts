import type { Game, UpdateApi } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";
import { render } from "./render";
export const BACKGROUND = "#080e1b";
export interface Snapshot {
  version: number;
  screen: C.Screen;
  menuIndex: number;
  titleIndex: number;
  mode: typeof C.MODE;
  score: number;
  best: number;
  combo: number;
  comboWindow: number;
  muted: boolean;
  ticks: number;
  simTime: number;
  dir: C.Direction;
  turns: readonly C.Direction[];
  snake: readonly C.Cell[];
  pellet: C.Cell | null;
  obstacles: readonly C.Cell[];
  steering: boolean;
  travel: boolean;
  pelletRespawn: boolean;
  nextPellet: C.Cell | null;
}
export interface CoilState extends Snapshot {
  accumulator: number;
  biteAt: number;
  sprites: readonly ImageBitmap[];
  presses: Readonly<Record<number, { screen: C.Screen; index: number }>>;
}
type State = DeepReadonly<CoilState>;
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface CoilDebugApi {
  version: number;
  reset(s: State): CoilState;
  reconcile(s: State): CoilState;
  snapshot(s: State): Snapshot;
  menuItemRect(s: State, index: number): Rect | null;
  setScreen(s: State, screen: C.Screen): CoilState;
  setMenuIndex(s: State, index: number): CoilState;
  setScore(s: State, points: number): CoilState;
  setBest(s: State, points: number): CoilState;
  setCombo(s: State, multiplier: number): CoilState;
  setComboWindow(s: State, seconds: number): CoilState;
  setSnake(s: State, cells: readonly C.Cell[]): CoilState;
  setDirection(s: State, dir: C.Direction): CoilState;
  clearTurns(s: State): CoilState;
  setSnakeSteering(s: State, enabled: boolean): CoilState;
  setSnakeTravel(s: State, enabled: boolean): CoilState;
  setPellet(s: State, col: number, row: number): CoilState;
  clearPellet(s: State): CoilState;
  setPelletRespawn(s: State, enabled: boolean): CoilState;
  setNextPellet(s: State, col: number, row: number): CoilState;
  drawPelletCell(s: State): C.Cell | null;
}
export function items(screen: C.Screen): readonly string[] {
  return screen === "title"
    ? C.TITLE_ITEMS
    : screen === "paused"
      ? C.PAUSE_ITEMS
      : screen === "howto"
        ? ["BACK"]
        : screen === "playing"
          ? []
          : C.OVER_ITEMS;
}
export function menuItemRect(s: State, index: number): Rect | null {
  integer(index);
  if (index >= items(s.screen).length) return null;
  return {
    x: 440,
    y:
      (s.screen === "howto" ? 570 : s.screen === "title" ? 414 : 430) +
      index * 64,
    w: 400,
    h: 52,
  };
}
function integer(n: number, max = Infinity, min = 0) {
  if (!Number.isInteger(n) || n < min || n > max)
    throw new Error("Invalid integer");
}
function valid(ok: boolean) {
  if (!ok) throw new Error("Invalid pose");
}
const same = (a: C.Cell, b: C.Cell) => a.col === b.col && a.row === b.row;
const inside = (p: C.Cell) =>
  Number.isInteger(p.col) &&
  Number.isInteger(p.row) &&
  p.col >= C.INTERIOR_MIN_COL &&
  p.col <= C.INTERIOR_MAX_COL &&
  p.row >= C.INTERIOR_MIN_ROW &&
  p.row <= C.INTERIOR_MAX_ROW;
function free(s: State, p: C.Cell) {
  return (
    inside(p) &&
    !s.snake.some((c) => same(c, p)) &&
    !s.obstacles.some((c) => same(c, p)) &&
    !(s.pellet && same(s.pellet, p))
  );
}
function candidates(s: State) {
  const cells: C.Cell[] = [];
  for (let row = C.INTERIOR_MIN_ROW; row <= C.INTERIOR_MAX_ROW; row++)
    for (let col = C.INTERIOR_MIN_COL; col <= C.INTERIOR_MAX_COL; col++) {
      const p = { col, row };
      if (free(s, p)) cells.push(p);
    }
  return cells;
}
function drawPelletCell(s: State) {
  const cells = candidates(s);
  return cells.length ? cells[Math.floor(Math.random() * cells.length)] : null;
}
function spawn(s: CoilState): CoilState {
  return {
    ...s,
    pellet:
      s.nextPellet && free(s, s.nextPellet) ? s.nextPellet : drawPelletCell(s),
    nextPellet: null,
  };
}
function opening(sprites: readonly ImageBitmap[], muted = false): CoilState {
  return {
    version: C.COIL_DEBUG_VERSION,
    screen: "title",
    menuIndex: 0,
    titleIndex: 0,
    mode: C.MODE,
    score: 0,
    best: 0,
    combo: 1,
    comboWindow: 0,
    muted,
    ticks: 0,
    simTime: 0,
    dir: C.START_DIR,
    turns: [],
    snake: C.START_CELLS.map((p) => ({ ...p })),
    pellet: null,
    obstacles: C.OBSTACLE_CELLS,
    steering: true,
    travel: true,
    pelletRespawn: true,
    nextPellet: null,
    accumulator: 0,
    biteAt: -Infinity,
    sprites,
    presses: {},
  };
}
function snapshot(s: State): Snapshot {
  const {
    version,
    screen,
    menuIndex,
    titleIndex,
    mode,
    score,
    best,
    combo,
    comboWindow,
    muted,
    ticks,
    simTime,
    dir,
    turns,
    snake,
    pellet,
    obstacles,
    steering,
    travel,
    pelletRespawn,
    nextPellet,
  } = s;
  return {
    version,
    screen,
    menuIndex,
    titleIndex,
    mode,
    score,
    best,
    combo,
    comboWindow,
    muted,
    ticks,
    simTime,
    dir,
    turns: [...turns],
    snake: snake.map((p) => ({ ...p })),
    pellet: pellet && { ...pellet },
    obstacles: obstacles.map((p) => ({ ...p })),
    steering,
    travel,
    pelletRespawn,
    nextPellet: nextPellet && { ...nextPellet },
  };
}
const debug: CoilDebugApi = {
  version: C.COIL_DEBUG_VERSION,
  reset: (s) => opening(s.sprites, s.muted),
  reconcile: (s) => ({ ...s }),
  snapshot,
  menuItemRect,
  setScreen: (s, screen) => {
    valid(C.SCREENS.includes(screen));
    return { ...s, screen };
  },
  setMenuIndex: (s, menuIndex) => {
    integer(menuIndex, Math.max(0, items(s.screen).length - 1));
    return { ...s, menuIndex };
  },
  setScore: (s, score) => {
    integer(score);
    return { ...s, score };
  },
  setBest: (s, best) => {
    integer(best);
    return { ...s, best };
  },
  setCombo: (s, combo) => {
    integer(combo, C.COMBO_MAX, 1);
    return { ...s, combo };
  },
  setComboWindow: (s, comboWindow) => {
    valid(
      Number.isFinite(comboWindow) &&
        comboWindow >= 0 &&
        comboWindow <= C.COMBO_WINDOW,
    );
    return { ...s, comboWindow };
  },
  setSnake: (s, cells) => {
    valid(cells.length > 0);
    cells.forEach((p, i) =>
      valid(
        inside(p) &&
          !s.obstacles.some((c) => same(c, p)) &&
          !cells.slice(0, i).some((c) => same(c, p)) &&
          (i === 0 ||
            Math.abs(p.col - cells[i - 1].col) +
              Math.abs(p.row - cells[i - 1].row) ===
              1),
      ),
    );
    return { ...s, snake: cells.map((p) => ({ ...p })) };
  },
  setDirection: (s, dir) => {
    valid(C.DIRECTIONS.includes(dir));
    return { ...s, dir };
  },
  clearTurns: (s) => ({ ...s, turns: [] }),
  setSnakeSteering: (s, steering) => {
    valid(typeof steering === "boolean");
    return { ...s, steering, turns: steering ? s.turns : [] };
  },
  setSnakeTravel: (s, travel) => {
    valid(typeof travel === "boolean");
    return { ...s, travel };
  },
  setPellet: (s, col, row) => {
    const pellet = { col, row };
    valid(
      inside(pellet) &&
        !s.snake.some((c) => same(c, pellet)) &&
        !s.obstacles.some((c) => same(c, pellet)),
    );
    return { ...s, pellet };
  },
  clearPellet: (s) => ({ ...s, pellet: null }),
  setPelletRespawn: (s, pelletRespawn) => {
    valid(typeof pelletRespawn === "boolean");
    return { ...s, pelletRespawn };
  },
  setNextPellet: (s, col, row) => {
    integer(col, C.GRID_COLS - 1);
    integer(row, C.GRID_ROWS - 1);
    return { ...s, nextPellet: { col, row } };
  },
  drawPelletCell,
};
function go(s: CoilState, screen: C.Screen): CoilState {
  return {
    ...s,
    screen,
    menuIndex: screen === "title" ? s.titleIndex : 0,
    presses: {},
  };
}
function start(s: CoilState, api: UpdateApi) {
  api.audio.loop(C.CUES.music);
  return spawn({
    ...s,
    screen: "playing",
    menuIndex: 0,
    score: 0,
    combo: 1,
    comboWindow: 0,
    snake: C.START_CELLS.map((p) => ({ ...p })),
    dir: C.START_DIR,
    turns: [],
    pellet: null,
    obstacles: C.OBSTACLE_CELLS,
    accumulator: 0,
    biteAt: -Infinity,
    presses: {},
  });
}
function accept(s: CoilState, api: UpdateApi): CoilState {
  if (s.screen === "title") {
    s = { ...s, titleIndex: s.menuIndex };
    return s.menuIndex === 0 ? start(s, api) : go(s, "howto");
  }
  if (s.screen === "howto") return go(s, "title");
  if (s.screen === "paused") {
    if (s.menuIndex === 0) return go(s, "playing");
    if (s.menuIndex === 1) return start(s, api);
  } else if (s.menuIndex === 0) return start(s, api);
  return go(s, "title");
}
const vector: Record<C.Direction, C.Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};
function tick(s: CoilState, api: UpdateApi): CoilState {
  s = { ...s, ticks: s.ticks + 1 };
  if (s.steering && s.turns.length) {
    const dir = s.turns[0];
    s = {
      ...s,
      dir: (vector[dir].col !== 0) !== (vector[s.dir].col !== 0) ? dir : s.dir,
      turns: s.turns.slice(1),
    };
  }
  if (s.travel) {
    const v = vector[s.dir],
      head = { col: s.snake[0].col + v.col, row: s.snake[0].row + v.row };
    const ate = !!s.pellet && same(head, s.pellet);
    if (
      !inside(head) ||
      s.obstacles.some((c) => same(c, head)) ||
      s.snake.slice(0, ate ? s.snake.length : -1).some((c) => same(c, head))
    ) {
      api.audio.play(C.CUES.death);
      return { ...go(s, "gameover"), accumulator: 0 };
    }
    s = { ...s, snake: [head, ...(ate ? s.snake : s.snake.slice(0, -1))] };
    if (ate) {
      const combo = s.comboWindow > 0 ? Math.min(C.COMBO_MAX, s.combo + 1) : 1;
      api.audio.play(C.CUES.eat);
      if (combo > s.combo) api.audio.play(C.CUES.comboUp);
      s = {
        ...s,
        combo,
        comboWindow: C.COMBO_WINDOW,
        score: s.score + C.PELLET_POINTS * combo,
        biteAt: s.simTime - s.accumulator,
      };
      if (s.pelletRespawn) {
        s = spawn(s);
        if (!s.pellet) return { ...go(s, "cleared"), accumulator: 0 };
      } else s = { ...s, pellet: null };
    }
  }
  const comboWindow = Math.max(0, s.comboWindow - C.TICK_SECONDS);
  return { ...s, comboWindow, combo: comboWindow === 0 ? 1 : s.combo };
}
export const game: Game<CoilState, CoilDebugApi> = {
  async initialize(api) {
    for (const action of C.ACTIONS)
      api.input.register(action, { keys: [...C.BINDINGS[action]] });
    const paths = [
      ...C.SPRITE_PATHS.head,
      C.SPRITE_PATHS.body,
      C.SPRITE_PATHS.corner,
      C.SPRITE_PATHS.tail,
    ];
    const [sprites] = await Promise.all([
      Promise.all(paths.map((p) => api.assets.loadImage(p))),
      Promise.all(
        Object.values(C.CUES).map((c) => api.audio.load(c, C.CUE_PATHS[c])),
      ),
    ]);
    for (const name of [
      "screen",
      "score",
      "best",
      "combo",
      "comboWindow",
      "dir",
    ] as const)
      api.diagnostics.register(name, (s) => s[name]);
    api.diagnostics.register("length", (s) => s.snake.length);
    api.diagnostics.register(
      "head",
      (s) => `${s.snake[0].col},${s.snake[0].row}`,
    );
    api.diagnostics.register("pellet", (s) =>
      s.pellet ? `${s.pellet.col},${s.pellet.row}` : "none",
    );
    return [opening(sprites), debug];
  },
  update(state, api, dt) {
    let s: CoilState = { ...state };
    const edges = Object.fromEntries(
      C.ACTIONS.map((a) => [a, api.input.pressed(a)]),
    );
    const samples = api.input.pointerSamples();
    if (edges.mute) api.audio.setMuted(!api.audio.muted());
    s = { ...s, muted: api.audio.muted() };
    if (s.screen === "playing") {
      if (edges.back || edges.pause) s = go(s, "paused");
      else if (s.steering)
        for (const dir of C.DIRECTIONS)
          if (edges[dir] && s.turns.length < C.TURN_QUEUE_MAX)
            s = { ...s, turns: [...s.turns, dir] };
    } else {
      if (edges.up)
        s = {
          ...s,
          menuIndex:
            (s.menuIndex + items(s.screen).length - 1) % items(s.screen).length,
        };
      if (edges.down)
        s = { ...s, menuIndex: (s.menuIndex + 1) % items(s.screen).length };
      if (edges.back)
        s =
          s.screen === "paused"
            ? go(s, "playing")
            : s.screen === "title"
              ? s
              : go(s, "title");
      else if (edges.pause && s.screen === "paused") s = go(s, "playing");
      else if (edges.confirm) s = accept(s, api);
    }
    if (s.screen !== "playing")
      for (const sample of samples) {
        const index = items(s.screen).findIndex((_, i) => {
          const r = menuItemRect(s, i)!;
          return (
            sample.x >= r.x &&
            sample.x <= r.x + r.w &&
            sample.y >= r.y &&
            sample.y <= r.y + r.h
          );
        });
        if (index >= 0) s = { ...s, menuIndex: index };
        if (sample.type === "down")
          s = {
            ...s,
            presses: { ...s.presses, [sample.id]: { screen: s.screen, index } },
          };
        if (sample.type === "up") {
          const press = s.presses[sample.id];
          const presses = { ...s.presses };
          delete presses[sample.id];
          s = { ...s, presses };
          if (index >= 0 && press?.index === index && press.screen === s.screen)
            s = accept(s, api);
        }
      }
    if (s.screen === "playing") {
      s = { ...s, simTime: s.simTime + dt, accumulator: s.accumulator + dt };
      while (
        s.accumulator + 1e-10 >= C.TICK_SECONDS &&
        s.screen === "playing"
      ) {
        s = { ...s, accumulator: Math.max(0, s.accumulator - C.TICK_SECONDS) };
        s = tick(s, api);
      }
    }
    if (
      s.screen === "title" ||
      s.screen === "howto" ||
      s.screen === "gameover" ||
      s.screen === "cleared"
    )
      api.audio.stop(C.CUES.music);
    return { ...s, best: Math.max(s.best, s.score) };
  },
  render,
};
