// main.js — bootstrap and the animation loop.
// Loads the state, wires input and sound, then draws every frame.
// With ?shot=cover|assembly|serve|rush the game opens in a staged
// state (see shots.js) and the clock is frozen for the screenshot.

import { GameState } from './state.js';
import { SoundBank } from './audio.js';
import { drawGame } from './render.js';
import { attachInput } from './input.js';
import { applyShot } from './shots.js';
import { STAGE_HEIGHT, STAGE_WIDTH } from './layout.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const frozen = Boolean(shot);

let state = new GameState();
state = applyShot(state, shot);

const sounds = new SoundBank();
sounds.muted = state.muted;

function announce() {
  if (!statusLine) return;
  if (state.screen === 'playing') {
    statusLine.textContent =
      `Score ${state.score}. ${state.served} served. ` +
      `${state.timeLeft} seconds left. ` +
      `${state.orders.length} orders waiting. ` +
      `${state.plate.length} layers on the plate.`;
  } else if (state.screen === 'over') {
    statusLine.textContent =
      `Shift over. Final score ${state.score}, ${state.served} burgers served.`;
  } else {
    statusLine.textContent =
      'Sizzle and Serve. A burger cooking game. Press start to begin your shift.';
  }
}

attachInput(canvas, state, sounds, () => announce());

// High-DPI crispness: keep the canvas backing store at the stage size
// times the device pixel ratio, and scale the context to match.
function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = STAGE_WIDTH * dpr;
  canvas.height = STAGE_HEIGHT * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  if (!frozen) {
    const before = state.screen;
    state.update(dt);
    if (state.screen !== before) announce();
  }
  drawGame(ctx, state);
  requestAnimationFrame(frame);
}

announce();
requestAnimationFrame(frame);
