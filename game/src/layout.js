// layout.js — the fixed stage geometry every other module shares.
// The canvas is 1280x800. All hit zones and draw positions derive from
// these rectangles, so input.js and render.js can never disagree about
// where a button or a bin is.

export const STAGE_WIDTH = 1280;
export const STAGE_HEIGHT = 800;

// Header strip: title, score, combo, served count and the shift timer.
export const HEADER = { x: 0, y: 0, w: 1280, h: 76 };

// Order board (chalkboard) on the left.
export const BOARD = { x: 24, y: 92, w: 300, h: 330 };

// Kitchen pass: the plate where the burger is assembled, centre stage.
export const PASS = { x: 348, y: 92, w: 600, h: 330 };
export const PLATE = { x: 648, y: 300, w: 260, h: 96 };

// Grill: two patty slots on the stove, right of the pass.
export const GRILL = { x: 972, y: 92, w: 284, h: 330 };

// Ingredient counter along the bottom: six bins, left to right.
export const COUNTER = { x: 24, y: 446, w: 1232, h: 220 };
export const BIN_WIDTH = 188;
export const BIN_GAP = 18;

export function binRect(index) {
  return {
    x: COUNTER.x + 8 + index * (BIN_WIDTH + BIN_GAP),
    y: COUNTER.y + 34,
    w: BIN_WIDTH,
    h: 150,
  };
}

// Serve and Trash sit under the pass, between counter and footer.
export const SERVE_BUTTON = { x: 560, y: 690, w: 200, h: 64 };
export const TRASH_BUTTON = { x: 780, y: 690, w: 200, h: 64 };
export const START_BUTTON = { x: 490, y: 560, w: 300, h: 70 };
export const MUTE_BUTTON = { x: 1212, y: 12, w: 52, h: 52 };

// Timer bar across the top of the header.
export function timerBarRect() {
  return { x: 24, y: 66, w: 1232, h: 8 };
}

// Order ticket rectangles inside the board, top to bottom.
export function ticketRect(slot) {
  return { x: BOARD.x + 14, y: BOARD.y + 52 + slot * 92, w: BOARD.w - 28, h: 82 };
}

// Grill slot rectangles inside the grill panel.
export function grillSlotRect(slot) {
  return { x: GRILL.x + 22 + slot * 128, y: GRILL.y + 96, w: 112, h: 112 };
}

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
