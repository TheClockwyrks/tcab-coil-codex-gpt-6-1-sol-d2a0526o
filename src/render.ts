import type { RenderApi } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import type { CoilState } from "./game";
import { items, menuItemRect, BACKGROUND } from "./game";
import * as C from "./constants";
const mint = "#9cffe0",
  pink = "#ff6399",
  white = "#e9f3fa",
  dim = "#718499";
export function render(s: DeepReadonly<CoilState>, api: RenderApi) {
  const ctx = api.ctx;
  ctx.imageSmoothingEnabled = false;
  const text = (
    str: string,
    x: number,
    y: number,
    size = 16,
    color = dim,
    align: CanvasTextAlign = "left",
  ) => {
    ctx.fillStyle = color;
    ctx.font = `${size >= 30 ? "bold " : ""}${size}px monospace`;
    ctx.textAlign = align;
    ctx.fillText(str, x, y);
  };
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  rect(0, 0, C.STAGE_W, C.STAGE_H, BACKGROUND);
  // Quiet circuit tracks anchor the board within the stage.
  ctx.strokeStyle = "#142239";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const x of [48, 80, 1200, 1232]) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 180);
    ctx.lineTo(x + 16, 196);
    ctx.lineTo(x + 16, 600);
  }
  ctx.stroke();
  text("C / 01", 48, 666, 13);
  text("8 Hz", 1190, 666, 13);
  const bw = C.GRID_COLS * C.CELL,
    bh = C.GRID_ROWS * C.CELL;
  ctx.shadowColor = "#20ba98";
  ctx.shadowBlur = 18;
  rect(C.BOARD_X, C.BOARD_Y, bw, bh, "#163b43");
  ctx.shadowBlur = 0;
  rect(
    C.BOARD_X + C.CELL,
    C.BOARD_Y + C.CELL,
    bw - 2 * C.CELL,
    bh - 2 * C.CELL,
    "#0b1624",
  );
  for (let row = 0; row < C.GRID_ROWS; row++)
    for (let col = 0; col < C.GRID_COLS; col++) {
      const x = C.BOARD_X + col * C.CELL,
        y = C.BOARD_Y + row * C.CELL;
      if (
        row === 0 ||
        row === C.GRID_ROWS - 1 ||
        col === 0 ||
        col === C.GRID_COLS - 1
      ) {
        rect(x + 2, y + 2, C.CELL - 4, C.CELL - 4, "#1d4650");
        rect(x + 5, y + 5, C.CELL - 10, 2, "#326974");
        rect(x + 5, y + 23, 5, 3, "#2b6872");
      } else {
        ctx.strokeStyle = "#172738";
        ctx.strokeRect(x + 0.5, y + 0.5, C.CELL, C.CELL);
        rect(x + 15, y + 15, 1, 1, "#203245");
      }
    }
  ctx.strokeStyle = "#499589";
  ctx.strokeRect(C.BOARD_X + 0.5, C.BOARD_Y + 0.5, bw - 1, bh - 1);
  for (const p of s.obstacles)
    rect(
      C.BOARD_X + p.col * C.CELL + 2,
      C.BOARD_Y + p.row * C.CELL + 2,
      C.CELL - 4,
      C.CELL - 4,
      "#924467",
    );
  if (s.pellet) {
    const x = C.BOARD_X + (s.pellet.col + 0.5) * C.CELL,
      y = C.BOARD_Y + (s.pellet.row + 0.5) * C.CELL;
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = pink;
    ctx.shadowBlur = 18;
    ctx.fillStyle = pink;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    rect(-3, -4, 5, 5, "#ffe2f0");
    ctx.strokeStyle = "#823b61";
    ctx.strokeRect(-14, -14, 28, 28);
    ctx.restore();
  }
  const angle = (a: C.Cell, b: C.Cell) =>
    Math.atan2(b.row - a.row, b.col - a.col);
  s.snake.forEach((p, i) => {
    let sprite: ImageBitmap, rotation: number;
    if (i === 0) {
      const age = s.simTime - s.biteAt;
      const frame =
        age >= 0 && age < C.BITE_SECONDS
          ? Math.min(
              C.HEAD_FRAMES - 1,
              1 + Math.floor(age / (C.BITE_SECONDS / (C.HEAD_FRAMES - 1))),
            )
          : 0;
      sprite = s.sprites[frame];
      rotation = {
        right: 0,
        down: Math.PI / 2,
        left: Math.PI,
        up: -Math.PI / 2,
      }[s.dir];
    } else if (i === s.snake.length - 1) {
      sprite = s.sprites[6];
      rotation = angle(p, s.snake[i - 1]);
    } else {
      const a = s.snake[i - 1],
        b = s.snake[i + 1];
      if (a.row === b.row || a.col === b.col) {
        sprite = s.sprites[4];
        rotation = a.row === b.row ? 0 : Math.PI / 2;
      } else {
        sprite = s.sprites[5];
        const dirs = [angle(p, a), angle(p, b)].map(
          (r) => (Math.round(r / (Math.PI / 2)) + 4) % 4,
        );
        rotation =
          (([0, 1, 2, 3].find(
            (r) => dirs.includes(r) && dirs.includes((r + 1) % 4),
          ) ?? 0) *
            Math.PI) /
          2;
      }
    }
    ctx.save();
    ctx.translate(
      C.BOARD_X + (p.col + 0.5) * C.CELL,
      C.BOARD_Y + (p.row + 0.5) * C.CELL,
    );
    ctx.rotate(rotation);
    ctx.drawImage(sprite, -C.CELL / 2, -C.CELL / 2, C.CELL, C.CELL);
    ctx.restore();
  });
  text(C.TITLE_TEXT, 160, 64, 32, mint);
  text(C.MODE_LABEL, 161, 91, 12);
  text(C.SCORE_LABEL, 350, 40, 13);
  text(String(s.score).padStart(5, "0"), 350, 80, 34, white);
  text(C.BEST_LABEL, 555, 40, 13);
  text(String(s.best).padStart(5, "0"), 555, 80, 34, white);
  if (s.combo >= 2) {
    text(`x${s.combo}`, 790, 73, 36, pink);
    rect(790, 87, 140, 4, "#342238");
    rect(790, 87, (140 * s.comboWindow) / C.COMBO_WINDOW, 4, pink);
  }
  text(
    s.muted ? "M / SOUND OFF" : "M / SOUND ON",
    1120,
    47,
    13,
    s.muted ? pink : mint,
    "right",
  );
  text("P / PAUSE", 1120, 79, 13, dim, "right");
  if (s.screen === "playing") return;
  rect(
    C.BOARD_X + C.CELL,
    C.BOARD_Y + C.CELL,
    bw - 2 * C.CELL,
    bh - 2 * C.CELL,
    "#080e1bce",
  );
  const how = s.screen === "howto";
  const panelY = how ? 170 : 205,
    panelH = how ? 464 : 390;
  rect(384, panelY, 512, panelH, "#0c1727");
  ctx.strokeStyle = "#2e4c60";
  ctx.strokeRect(384.5, panelY + 0.5, 511, panelH);
  rect(384, panelY, 512, 3, mint);
  text(
    "●   SYSTEM / " + (s.screen === "title" ? "READY" : s.screen.toUpperCase()),
    410,
    panelY + 28,
    12,
    mint,
  );
  if (s.screen === "title") {
    ctx.shadowColor = "#37bd97";
    ctx.shadowBlur = 22;
    text(C.TITLE_TEXT, C.STAGE_CX, 345, 100, mint, "center");
    ctx.shadowBlur = 0;
    text(C.TAGLINE_TEXT, C.STAGE_CX, 377, 18, white, "center");
    text(
      `${C.BEST_LABEL}  ${String(s.best).padStart(5, "0")}`,
      C.STAGE_CX,
      550,
      14,
      dim,
      "center",
    );
  } else if (how) {
    text("HOW TO PLAY", 410, 247, 30, white);
    const lines = [
      "Always moving. Your next tick takes the turn.",
      "Turn across your path; never double back.",
      "Eat a pink core to grow one cell longer.",
      "Walls and your own body end the run.",
      "",
      "Chain cores within 3.5 seconds to build x5.",
      "Let the window expire and return to x1.",
      "",
      "ARROWS / WASD   steer   •   ENTER / SPACE select",
      "ESC   back / pause   •   P pause   •   M sound",
    ];
    lines.forEach((line, i) =>
      text(line, 410, 282 + i * 25, 14, i === 5 ? pink : dim),
    );
  } else {
    const heading =
      s.screen === "paused"
        ? "PAUSED"
        : s.screen === "cleared"
          ? C.CLEARED_TEXT
          : C.GAMEOVER_TEXT;
    text(
      heading,
      C.STAGE_CX,
      310,
      s.screen === "cleared" ? 36 : 44,
      s.screen === "gameover" ? pink : white,
      "center",
    );
    if (s.screen === "paused")
      text(
        "TAKE A BREATH. KEEP THE THREAD.",
        C.STAGE_CX,
        362,
        14,
        dim,
        "center",
      );
    else {
      text(C.SCORE_LABEL, 510, 352, 12);
      text(String(s.score), 510, 394, 32, white);
      text(C.BEST_LABEL, 700, 352, 12);
      text(String(s.best), 700, 394, 32, mint);
    }
  }
  items(s.screen).forEach((item, i) => {
    const r = menuItemRect(s, i)!;
    const selected = s.menuIndex === i;
    rect(r.x, r.y, r.w, r.h, selected ? "#214c48" : "#121f30");
    ctx.strokeStyle = selected ? mint : "#293c50";
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    text(selected ? "↳" : "·", r.x + 20, r.y + 33, 23, selected ? mint : dim);
    text(item, r.x + 60, r.y + 33, 19, selected ? white : dim);
    text(
      String(i + 1).padStart(2, "0"),
      r.x + r.w - 20,
      r.y + 32,
      12,
      selected ? mint : dim,
      "right",
    );
  });
  text(
    "↑ ↓  CHOOSE     ENTER  SELECT",
    C.STAGE_CX,
    how ? 658 : 639,
    12,
    dim,
    "center",
  );
}
