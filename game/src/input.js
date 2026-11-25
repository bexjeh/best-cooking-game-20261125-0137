// input.js — mouse clicks and keyboard, translated into game actions.
// Hit zones come from layout.js, the same rectangles render.js draws.

import {
  MUTE_BUTTON,
  SERVE_BUTTON,
  START_BUTTON,
  TRASH_BUTTON,
  binRect,
  grillSlotRect,
  pointInRect,
} from './layout.js';
import { INGREDIENTS } from './recipes.js';

function canvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

export function attachInput(canvas, state, sounds, onAction) {
  canvas.addEventListener('click', (event) => {
    sounds.ensure();
    const p = canvasPoint(canvas, event);
    handleClick(p, state, sounds, onAction);
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    sounds.ensure();
    handleKey(event.key.toLowerCase(), state, sounds, onAction);
  });
}

function handleClick(p, state, sounds, onAction) {
  if (pointInRect(p.x, p.y, MUTE_BUTTON)) {
    state.muted = !state.muted;
    sounds.muted = state.muted;
    onAction('mute');
    return;
  }
  if (state.screen === 'title' || state.screen === 'over') {
    const button = {
      x: START_BUTTON.x,
      y: state.screen === 'over' ? START_BUTTON.y - 40 : START_BUTTON.y,
      w: START_BUTTON.w,
      h: START_BUTTON.h,
    };
    if (pointInRect(p.x, p.y, button)) {
      state.startShift();
      sounds.bell();
      onAction('start');
    }
    return;
  }
  if (state.screen !== 'playing') return;

  for (let slot = 0; slot < 2; slot++) {
    if (pointInRect(p.x, p.y, grillSlotRect(slot))) {
      const result = state.pressGrill(slot);
      if (result.ok) {
        if (result.started) sounds.sizzle();
        onAction('grill');
      }
      return;
    }
  }
  INGREDIENTS.forEach((ing, i) => {
    if (pointInRect(p.x, p.y, binRect(i))) {
      const result = state.addIngredient(ing.id);
      if (result.ok) {
        sounds.stack();
        onAction('add');
      } else if (result.needGrill) {
        sounds.error();
        onAction('need-grill');
      }
    }
  });
  if (pointInRect(p.x, p.y, SERVE_BUTTON)) {
    const result = state.servePlate();
    if (result.ok) {
      sounds.serve();
      onAction('serve');
    } else {
      sounds.error();
      onAction('serve-fail');
    }
    return;
  }
  if (pointInRect(p.x, p.y, TRASH_BUTTON)) {
    state.trashPlate();
    sounds.error();
    onAction('trash');
  }
}

function handleKey(key, state, sounds, onAction) {
  if (key === 'm') {
    state.muted = !state.muted;
    sounds.muted = state.muted;
    onAction('mute');
    return;
  }
  if (state.screen === 'title' || state.screen === 'over') {
    if (key === ' ' || key === 'enter' || key === 'r') {
      state.startShift();
      sounds.bell();
      onAction('start');
    }
    return;
  }
  if (state.screen !== 'playing') return;
  if (key === 'p' || key === 'escape') {
    state.paused = !state.paused;
    onAction('pause');
    return;
  }
  if (state.paused) return;
  if (key === ' ') {
    const result = state.servePlate();
    if (result.ok) {
      sounds.serve();
      onAction('serve');
    } else {
      sounds.error();
      onAction('serve-fail');
    }
    return;
  }
  if (key === 't') {
    state.trashPlate();
    sounds.error();
    onAction('trash');
    return;
  }
  const ing = INGREDIENTS.find((item) => item.key === key);
  if (ing) {
    const result = state.addIngredient(ing.id);
    if (result.ok) {
      sounds.stack();
      onAction('add');
    } else if (result.needGrill) {
      sounds.error();
      onAction('need-grill');
    }
  }
}
