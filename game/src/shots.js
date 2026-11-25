// shots.js — staged states for the maker's screenshots.
// Each shot drives the real game state through the same functions a
// player uses (startShift, addIngredient, pressGrill, servePlate), so
// every screenshot is a genuine render of the game's own code, just
// with the table already set: ?shot=cover | assembly | serve | rush

import { GameState, makeOrder } from './state.js';
import { RECIPE_BY_ID } from './recipes.js';

function basePlayingState() {
  const state = new GameState();
  state.startShift();
  state.orders = [];
  return state;
}

function setClock(state, secondsLeft) {
  state.elapsed = 150 - secondsLeft;
  state.timeLeft = secondsLeft;
}

function forceOrder(state, recipeId, ageSeconds, patienceSeconds) {
  const order = makeOrder(state.elapsed);
  order.id = state.orders.length + 1;
  order.recipe = RECIPE_BY_ID[recipeId];
  order.age = ageSeconds;
  order.patience = patienceSeconds;
  order.patienceMax = patienceSeconds;
  state.orders.push(order);
  return order;
}

export function applyShot(state, shot) {
  if (!shot) return state;
  if (shot === 'cover') {
    // Opening moment of a shift, fully in play: orders waiting, a
    // burger half-built on the pass, a patty on the grill, timer 2:30.
    // The game's title already sits in the header, so the whole kitchen
    // stays visible for the cover.
    const s = basePlayingState();
    setClock(s, 150);
    forceOrder(s, 'classic', 4, 42);
    forceOrder(s, 'double', 9, 42);
    forceOrder(s, 'garden', 2, 42);
    s.plate = ['bun', 'patty', 'cheese'];
    s.grill = [{ progress: 2.1, burnt: false }, null];
    s.score = 0;
    s.setMessage('Welcome to the Burger Barn — stack, grill, serve!', 'info');
    return s;
  }
  if (shot === 'assembly') {
    // Mid-assembly: three layers stacked, grill patty nearly done,
    // three orders on the board, timer at 1:47, score ticking.
    const s = basePlayingState();
    setClock(s, 107);
    forceOrder(s, 'classic', 12, 42);
    forceOrder(s, 'saucy', 6, 42);
    forceOrder(s, 'melt', 20, 42);
    s.plate = ['bun', 'patty', 'cheese'];
    s.grill = [{ progress: 2.6, burnt: false }, { progress: 0.8, burnt: false }];
    s.score = 340;
    s.served = 2;
    s.combo = 2;
    s.setMessage('Nice stacking! Next: lettuce.', 'info');
    return s;
  }
  if (shot === 'serve') {
    // A finished Classic Burger on the plate, its order glowing,
    // READY TO SERVE — the serve moment, timer at 1:12.
    const s = basePlayingState();
    setClock(s, 72);
    forceOrder(s, 'classic', 18, 42);
    forceOrder(s, 'garden', 5, 42);
    s.plate = ['bun', 'patty', 'cheese', 'lettuce', 'tomato', 'bun'];
    s.score = 620;
    s.served = 4;
    s.combo = 3;
    s.setMessage('Classic Burger complete — serve it!', 'good');
    return s;
  }
  if (shot === 'rush') {
    // Rush hour: 24 seconds left, three impatient orders, a burnt
    // patty to bin, combo x3, score 1250.
    const s = basePlayingState();
    setClock(s, 24);
    s.rush = true;
    forceOrder(s, 'double', 26, 30);
    forceOrder(s, 'saucy', 20, 30);
    forceOrder(s, 'classic', 12, 30);
    s.plate = ['bun', 'patty'];
    s.grill = [{ progress: 9.5, burnt: true }, { progress: 2.9, burnt: false }];
    s.score = 1250;
    s.served = 9;
    s.combo = 3;
    s.bestCombo = 4;
    s.setMessage('Rush hour! Keep the line moving!', 'warn');
    return s;
  }
  return state;
}
