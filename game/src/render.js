// render.js — every pixel of the kitchen, drawn on one canvas.
// No images, no fonts from the network: shapes, gradients and system
// text only, so the game renders identically offline.

import {
  BOARD,
  COUNTER,
  GRILL,
  HEADER,
  MUTE_BUTTON,
  PASS,
  PLATE,
  SERVE_BUTTON,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  START_BUTTON,
  TRASH_BUTTON,
  binRect,
  grillSlotRect,
  ticketRect,
  timerBarRect,
} from './layout.js';
import { INGREDIENTS, INGREDIENT_BY_ID } from './recipes.js';
import { GRILL_SECONDS, SHIFT_SECONDS } from './state.js';

const CREAM = '#fff8ec';
const INK = '#3a2a1a';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight = 'bold', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Trebuchet MS", "Segoe UI", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

// One ingredient drawn as a readable little shape, used in bins, on
// tickets, and as a layer of the burger stack on the plate.
export function drawIngredientShape(ctx, id, x, y, w, h) {
  const ing = INGREDIENT_BY_ID[id];
  if (!ing) return;
  ctx.save();
  if (id === 'bun') {
    // Golden dome with sesame dots.
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.quadraticCurveTo(x + w / 2, y - h * 0.7, x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3cf';
    for (const [dx, dy] of [[0.3, 0.35], [0.5, 0.2], [0.7, 0.35]]) {
      ctx.beginPath();
      ctx.arc(x + w * dx, y + h * dy, Math.max(1.5, w * 0.04), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'patty') {
    ctx.fillStyle = ing.color;
    roundRect(ctx, x, y + h * 0.15, w, h * 0.7, h * 0.3);
    ctx.fill();
    ctx.fillStyle = ing.dark;
    for (const dx of [0.25, 0.5, 0.75]) {
      ctx.fillRect(x + w * dx - 1, y + h * 0.25, 2, h * 0.5);
    }
  } else if (id === 'cheese') {
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.2);
    ctx.lineTo(x + w, y + h * 0.2);
    ctx.lineTo(x + w * 0.82, y + h * 0.9);
    ctx.lineTo(x + w * 0.55, y + h * 0.45);
    ctx.lineTo(x + w * 0.3, y + h * 0.9);
    ctx.closePath();
    ctx.fill();
  } else if (id === 'lettuce') {
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.5);
    for (let i = 0; i <= 6; i++) {
      const px = x + (w / 6) * i;
      const py = y + h * (i % 2 === 0 ? 0.25 : 0.75);
      ctx.lineTo(px, py);
    }
    ctx.lineTo(x + w, y + h * 0.5);
    ctx.closePath();
    ctx.fill();
  } else if (id === 'tomato') {
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.3, y + h * 0.5, w * 0.26, h * 0.34, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w * 0.7, y + h * 0.5, w * 0.26, h * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb3ad';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.3, y + h * 0.5, w * 0.12, h * 0.16, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w * 0.7, y + h * 0.5, w * 0.12, h * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'sauce') {
    ctx.strokeStyle = ing.color;
    ctx.lineWidth = Math.max(3, h * 0.22);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.05, y + h * 0.5);
    ctx.bezierCurveTo(x + w * 0.3, y + h * 0.15, x + w * 0.45, y + h * 0.85, x + w * 0.65, y + h * 0.5);
    ctx.bezierCurveTo(x + w * 0.8, y + h * 0.25, x + w * 0.9, y + h * 0.6, x + w * 0.97, y + h * 0.45);
    ctx.stroke();
  }
  ctx.restore();
}

// The burger stack on the plate: layers bottom-up, plate first.
function drawBurgerStack(ctx, stack, cx, plateY, scale) {
  const layerH = 15 * scale;
  const layerW = 150 * scale;
  let y = plateY - 8;
  for (const id of stack) {
    y -= layerH;
    drawIngredientShape(ctx, id, cx - layerW / 2, y, layerW, layerH + 6);
  }
  return y;
}

function drawPlate(ctx, x, y, w, h, glow) {
  if (glow) {
    ctx.save();
    ctx.shadowColor = '#ffd94d';
    ctx.shadowBlur = 26;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#d9c8a8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 8, h / 2 - 6, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawHeader(ctx, state) {
  const g = ctx.createLinearGradient(0, 0, 0, HEADER.h);
  g.addColorStop(0, '#5b3423');
  g.addColorStop(1, '#402416');
  ctx.fillStyle = g;
  ctx.fillRect(HEADER.x, HEADER.y, HEADER.w, HEADER.h);
  text(ctx, '🍔 SIZZLE & SERVE', 24, 30, 30, '#ffd94d');
  text(ctx, 'Burger Barn', 24, 56, 14, '#f3d9a4', 'normal');
  text(ctx, `SCORE  ${state.score}`, 430, 30, 26, CREAM);
  text(ctx, `SERVED  ${state.served}`, 640, 30, 20, '#bfe8a8');
  text(ctx, `LOST  ${state.lost}`, 790, 30, 20, '#ff9a8a');
  if (state.combo > 1) {
    text(ctx, `COMBO x${state.combo}`, 900, 30, 22, '#ffd94d');
  }
  // The shift timer: big clock text plus a draining bar.
  const urgent = state.timeLeft <= 30 && state.screen === 'playing';
  text(ctx, `⏱ ${state.clockText()}`, 1030, 30, 30, urgent ? '#ff6b5e' : CREAM, 'bold', 'left');
  const bar = timerBarRect();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, bar.x, bar.y, bar.w, bar.h, 4);
  ctx.fill();
  const frac = state.screen === 'playing' ? state.timeLeft / SHIFT_SECONDS : 1;
  ctx.fillStyle = urgent ? '#ff6b5e' : '#ffd94d';
  roundRect(ctx, bar.x, bar.y, bar.w * frac, bar.h, 4);
  ctx.fill();
  // Mute toggle.
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, MUTE_BUTTON.x, MUTE_BUTTON.y, MUTE_BUTTON.w, MUTE_BUTTON.h, 10);
  ctx.fill();
  text(ctx, state.muted ? '🔇' : '🔊', MUTE_BUTTON.x + 26, MUTE_BUTTON.y + 27, 24, CREAM, 'normal', 'center');
}

function drawKitchenWall(ctx) {
  // Warm tiled wall behind the board, pass and grill.
  ctx.fillStyle = '#f7e3c2';
  ctx.fillRect(0, HEADER.h, STAGE_WIDTH, 350);
  ctx.strokeStyle = 'rgba(180,140,90,0.35)';
  ctx.lineWidth = 1;
  for (let y = HEADER.h + 28; y < 430; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(STAGE_WIDTH, y);
    ctx.stroke();
  }
  for (let x = 28; x < STAGE_WIDTH; x += 56) {
    ctx.beginPath();
    ctx.moveTo(x, HEADER.h);
    ctx.lineTo(x, 430);
    ctx.stroke();
  }
  // (The pass, board and grill panels sit on this wall.)
}

function drawOrderBoard(ctx, state) {
  ctx.fillStyle = '#3d2f23';
  roundRect(ctx, BOARD.x, BOARD.y, BOARD.w, BOARD.h, 14);
  ctx.fill();
  ctx.strokeStyle = '#c9a15e';
  ctx.lineWidth = 4;
  ctx.stroke();
  text(ctx, '📋 ORDER BOARD', BOARD.x + 16, BOARD.y + 26, 20, '#ffe9a8');
  if (state.orders.length === 0) {
    text(ctx, 'No orders — take a breath!', BOARD.x + 20, BOARD.y + 120, 16, '#e8d9b8', 'normal');
  }
  state.orders.forEach((order, slot) => {
    const r = ticketRect(slot);
    const frac = Math.max(0, 1 - order.age / order.patience);
    const urgent = frac < 0.35;
    ctx.fillStyle = urgent ? '#ffe3de' : '#fff8ec';
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fill();
    if (order.flash > 0) {
      ctx.strokeStyle = '#ff6b5e';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    text(ctx, `#${order.id}  ${order.recipe.name}`, r.x + 12, r.y + 18, 17, INK);
    text(ctx, `$${order.recipe.price}  ·  ${order.recipe.tip}`, r.x + 12, r.y + 38, 12, '#7a5a35', 'normal');
    // The recipe as a row of ingredient shapes.
    order.recipe.stack.forEach((id, i) => {
      drawIngredientShape(ctx, id, r.x + 12 + i * 34, r.y + 50, 30, 18);
    });
    // Patience bar.
    ctx.fillStyle = '#e5d5b8';
    roundRect(ctx, r.x + 12, r.y + 70, r.w - 24, 7, 3);
    ctx.fill();
    ctx.fillStyle = urgent ? '#ff6b5e' : '#58b368';
    roundRect(ctx, r.x + 12, r.y + 70, (r.w - 24) * frac, 7, 3);
    ctx.fill();
  });
}

function drawPass(ctx, state) {
  // Stainless pass counter.
  const g = ctx.createLinearGradient(0, PASS.y, 0, PASS.y + PASS.h);
  g.addColorStop(0, '#c9ced6');
  g.addColorStop(1, '#9aa1ad');
  ctx.fillStyle = g;
  roundRect(ctx, PASS.x, PASS.y, PASS.w, PASS.h, 14);
  ctx.fill();
  ctx.strokeStyle = '#7c828d';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, '— THE PASS —', PASS.x + PASS.w / 2, PASS.y + 24, 15, '#4a4f57', 'bold', 'center');

  const complete = state.plate.length > 0 &&
    state.orders.some((o) => o.recipe.stack.length === state.plate.length &&
      o.recipe.stack.every((id, i) => id === state.plate[i]));
  const glow = complete || state.servedFlash > 0;
  const shakeX = state.shake > 0 ? Math.sin(state.shake * 40) * 5 : 0;
  drawPlate(ctx, PLATE.x + shakeX, PLATE.y, PLATE.w, PLATE.h, glow);
  if (state.plate.length === 0) {
    text(ctx, 'Empty plate — stack a burger!', PLATE.x + PLATE.w / 2, PLATE.y - 34, 15, '#5a5148', 'normal', 'center');
  } else {
    const topY = drawBurgerStack(ctx, state.plate, PLATE.x + PLATE.w / 2 + shakeX, PLATE.y + PLATE.h / 2 + 22, 1);
    if (complete) {
      text(ctx, '✓ READY TO SERVE!', PLATE.x + PLATE.w / 2, topY - 26, 20, '#1e7a34', 'bold', 'center');
    } else {
      const next = state.nextNeeded();
      if (next) {
        text(ctx, `Next: ${INGREDIENT_BY_ID[next].name}`, PLATE.x + PLATE.w / 2, topY - 24, 15, '#5a5148', 'normal', 'center');
      } else {
        text(ctx, 'Stack does not match any order', PLATE.x + PLATE.w / 2, topY - 24, 15, '#b03a2a', 'normal', 'center');
      }
    }
  }
  // Little chef waiting at the pass, clear of the plate.
  drawChef(ctx, PASS.x + 64, PASS.y + 190);
}

function drawChef(ctx, x, y) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y - 52, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 20, y - 58, 16, 0, Math.PI * 2);
  ctx.arc(x + 20, y - 58, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f6c89f';
  ctx.beginPath();
  ctx.arc(x, y - 22, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath();
  ctx.arc(x - 8, y - 26, 2.5, 0, Math.PI * 2);
  ctx.arc(x + 8, y - 26, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - 16, 8, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x - 30, y, 60, 52, 12);
  ctx.fill();
  ctx.fillStyle = '#e2574c';
  ctx.fillRect(x - 30, y + 18, 60, 8);
}

function drawGrill(ctx, state) {
  ctx.fillStyle = '#4a4f57';
  roundRect(ctx, GRILL.x, GRILL.y, GRILL.w, GRILL.h, 14);
  ctx.fill();
  ctx.strokeStyle = '#2f333a';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, '🔥 GRILL', GRILL.x + 16, GRILL.y + 26, 20, '#ffd94d');
  text(ctx, 'Click a slot to start a patty.', GRILL.x + 16, GRILL.y + 50, 13, '#d7dce2', 'normal');
  state.grill.forEach((slotState, slot) => {
    const r = grillSlotRect(slot);
    ctx.fillStyle = '#2f333a';
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fill();
    // Flame ticks along the very bottom of the slot.
    ctx.fillStyle = '#ff9f43';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(r.x + 18 + i * 32, r.y + r.h - 2);
      ctx.lineTo(r.x + 28 + i * 32, r.y + r.h - 14);
      ctx.lineTo(r.x + 38 + i * 32, r.y + r.h - 2);
      ctx.closePath();
      ctx.fill();
    }
    if (!slotState) {
      text(ctx, '+ START', r.x + r.w / 2, r.y + 46, 15, '#9aa1ad', 'bold', 'center');
      text(ctx, 'patty', r.x + r.w / 2, r.y + 68, 13, '#9aa1ad', 'normal', 'center');
    } else if (slotState.burnt) {
      drawIngredientShape(ctx, 'patty', r.x + 16, r.y + 22, r.w - 32, 34);
      text(ctx, 'BURNT!', r.x + r.w / 2, r.y + 72, 15, '#ff6b5e');
      text(ctx, 'click to bin it', r.x + r.w / 2, r.y + 92, 12, '#ffb3ad', 'normal', 'center');
    } else {
      const frac = Math.min(1, slotState.progress / GRILL_SECONDS);
      drawIngredientShape(ctx, 'patty', r.x + 16, r.y + 22, r.w - 32, 34);
      ctx.fillStyle = '#e5d5b8';
      roundRect(ctx, r.x + 12, r.y + 70, r.w - 24, 10, 5);
      ctx.fill();
      ctx.fillStyle = frac >= 1 ? '#58b368' : '#ff9f43';
      roundRect(ctx, r.x + 12, r.y + 70, (r.w - 24) * frac, 10, 5);
      ctx.fill();
      text(ctx, frac >= 1 ? 'READY — click Patty!' : 'Grilling…', r.x + r.w / 2, r.y + 90, 13, frac >= 1 ? '#bfe8a8' : '#ffd9a0', 'bold', 'center');
    }
  });
  text(ctx, 'Patties burn if left too long!', GRILL.x + 16, GRILL.y + GRILL.h - 16, 12, '#d7dce2', 'normal');
}

function drawCounter(ctx, state) {
  ctx.fillStyle = '#8a5a33';
  roundRect(ctx, COUNTER.x, COUNTER.y, COUNTER.w, COUNTER.h, 14);
  ctx.fill();
  ctx.fillStyle = '#6e4525';
  ctx.fillRect(COUNTER.x, COUNTER.y, COUNTER.w, 26);
  text(ctx, 'INGREDIENT COUNTER — click a bin or press its key', COUNTER.x + 16, COUNTER.y + 13, 14, '#ffe9a8');
  INGREDIENTS.forEach((ing, i) => {
    const r = binRect(i);
    const isNext = state.screen === 'playing' && state.nextNeeded() === ing.id;
    const isPatty = ing.id === 'patty';
    const cookedReady = isPatty && state.grill.some((g) => g && g.progress >= GRILL_SECONDS && !g.burnt);
    ctx.fillStyle = isNext ? '#fff3cf' : '#fff8ec';
    roundRect(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.fill();
    if (isNext) {
      ctx.strokeStyle = '#ffd94d';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    drawIngredientShape(ctx, ing.id, r.x + 34, r.y + 18, r.w - 68, 46);
    text(ctx, ing.name, r.x + r.w / 2, r.y + 88, 19, INK, 'bold', 'center');
    text(ctx, ing.blurb, r.x + r.w / 2, r.y + 110, 12, '#7a5a35', 'normal', 'center');
    if (isPatty) {
      text(ctx, cookedReady ? '✓ cooked — click!' : 'needs the grill ↑', r.x + r.w / 2, r.y + 130, 12, cookedReady ? '#1e7a34' : '#b03a2a', 'bold', 'center');
    } else {
      text(ctx, `key ${ing.key}`, r.x + r.w / 2, r.y + 130, 12, '#7a5a35', 'normal', 'center');
    }
  });
}

function drawActionButtons(ctx, state) {
  const complete = state.plate.length > 0 &&
    state.orders.some((o) => o.recipe.stack.length === state.plate.length &&
      o.recipe.stack.every((id, i) => id === state.plate[i]));
  ctx.fillStyle = complete ? '#2e9e4f' : '#7fb98a';
  roundRect(ctx, SERVE_BUTTON.x, SERVE_BUTTON.y, SERVE_BUTTON.w, SERVE_BUTTON.h, 12);
  ctx.fill();
  ctx.strokeStyle = '#1e7a34';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, '🍽  SERVE  (Space)', SERVE_BUTTON.x + SERVE_BUTTON.w / 2, SERVE_BUTTON.y + 33, 20, '#ffffff', 'bold', 'center');
  ctx.fillStyle = '#c0392b';
  roundRect(ctx, TRASH_BUTTON.x, TRASH_BUTTON.y, TRASH_BUTTON.w, TRASH_BUTTON.h, 12);
  ctx.fill();
  ctx.strokeStyle = '#922b21';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, '🗑  TRASH  (T)', TRASH_BUTTON.x + TRASH_BUTTON.w / 2, TRASH_BUTTON.y + 33, 20, '#ffffff', 'bold', 'center');
  if (state.message && state.messageTimer > 0) {
    const colors = { good: '#1e7a34', bad: '#b03a2a', warn: '#9a6a00', info: '#4a4f57' };
    text(ctx, state.message, STAGE_WIDTH / 2, 772, 17, colors[state.messageKind] || INK, 'bold', 'center');
  }
  if (state.rush && state.screen === 'playing') {
    ctx.save();
    ctx.globalAlpha = 0.85 + 0.15 * Math.sin(Date.now() / 200);
    text(ctx, '⚡ RUSH HOUR — orders are flying in! ⚡', STAGE_WIDTH / 2, 436, 22, '#ff6b5e', 'bold', 'center');
    ctx.restore();
  }
}

function drawTitleOverlay(ctx, state) {
  ctx.fillStyle = 'rgba(30,18,10,0.72)';
  ctx.fillRect(0, HEADER.h, STAGE_WIDTH, STAGE_HEIGHT - HEADER.h);
  ctx.fillStyle = '#fff8ec';
  roundRect(ctx, 290, 150, 700, 400, 18);
  ctx.fill();
  ctx.strokeStyle = '#c9a15e';
  ctx.lineWidth = 4;
  ctx.stroke();
  text(ctx, '🍔 SIZZLE & SERVE', 640, 205, 44, '#b03a2a', 'bold', 'center');
  text(ctx, 'Burger Barn — the lunch rush is on!', 640, 250, 20, INK, 'normal', 'center');
  text(ctx, 'Read the order board, stack each burger in recipe', 640, 300, 17, '#5a5148', 'normal', 'center');
  text(ctx, 'order, grill your patties, and serve before the', 640, 326, 17, '#5a5148', 'normal', 'center');
  text(ctx, 'timer runs out. Fast serves earn tips — combos pay more!', 640, 352, 17, '#5a5148', 'normal', 'center');
  text(ctx, 'Click a bin or press 1–6 · Space serves · T trashes', 640, 400, 15, '#7a5a35', 'normal', 'center');
  ctx.fillStyle = '#2e9e4f';
  roundRect(ctx, START_BUTTON.x, START_BUTTON.y, START_BUTTON.w, START_BUTTON.h, 12);
  ctx.fill();
  text(ctx, '▶  START SHIFT  (150s)', START_BUTTON.x + START_BUTTON.w / 2, START_BUTTON.y + 36, 22, '#ffffff', 'bold', 'center');
  text(ctx, 'A complete cooking game — kitchen, orders, grill, timer, serve.', 640, 520, 13, '#7a5a35', 'normal', 'center');
}

function drawGameOverOverlay(ctx, state) {
  ctx.fillStyle = 'rgba(30,18,10,0.72)';
  ctx.fillRect(0, HEADER.h, STAGE_WIDTH, STAGE_HEIGHT - HEADER.h);
  ctx.fillStyle = '#fff8ec';
  roundRect(ctx, 340, 170, 600, 380, 18);
  ctx.fill();
  ctx.strokeStyle = '#c9a15e';
  ctx.lineWidth = 4;
  ctx.stroke();
  text(ctx, '⏰ SHIFT OVER!', 640, 220, 40, '#b03a2a', 'bold', 'center');
  text(ctx, `Final score: ${state.score}`, 640, 285, 30, INK, 'bold', 'center');
  text(ctx, `Burgers served: ${state.served}    Walked out: ${state.lost}`, 640, 335, 18, '#5a5148', 'normal', 'center');
  text(ctx, `Best combo: x${state.bestCombo}    Plates trashed: ${state.trashed}`, 640, 365, 18, '#5a5148', 'normal', 'center');
  const verdict = state.served >= 8 ? 'Head Chef material! 🏆'
    : state.served >= 5 ? 'Solid line cook — the barn is proud.'
    : state.served >= 2 ? 'A decent first shift. Faster hands next time!'
    : 'The lunch rush won today. Try again!';
  text(ctx, verdict, 640, 410, 18, '#1e7a34', 'bold', 'center');
  ctx.fillStyle = '#2e9e4f';
  roundRect(ctx, START_BUTTON.x, START_BUTTON.y - 40, START_BUTTON.w, START_BUTTON.h, 12);
  ctx.fill();
  text(ctx, '↻  PLAY AGAIN  (R)', START_BUTTON.x + START_BUTTON.w / 2, START_BUTTON.y - 4, 22, '#ffffff', 'bold', 'center');
}

function drawPausedOverlay(ctx) {
  ctx.fillStyle = 'rgba(30,18,10,0.6)';
  ctx.fillRect(0, HEADER.h, STAGE_WIDTH, STAGE_HEIGHT - HEADER.h);
  text(ctx, '⏸ PAUSED — press P to keep cooking', STAGE_WIDTH / 2, 400, 30, '#ffffff', 'bold', 'center');
}

// The one entry point main.js calls every animation frame.
export function drawGame(ctx, state) {
  ctx.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
  drawKitchenWall(ctx);
  drawHeader(ctx, state);
  drawOrderBoard(ctx, state);
  drawPass(ctx, state);
  drawGrill(ctx, state);
  drawCounter(ctx, state);
  drawActionButtons(ctx, state);
  if (state.screen === 'title') drawTitleOverlay(ctx, state);
  if (state.screen === 'over') drawGameOverOverlay(ctx, state);
  if (state.screen === 'playing' && state.paused) drawPausedOverlay(ctx);
}
