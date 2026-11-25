// state.js — the whole game state and its rules, no drawing, no DOM.
// A shift lasts SHIFT_SECONDS. Orders arrive on the board, the player
// stacks ingredients on the plate in recipe order, grills patties on the
// stove, and serves finished plates before customers lose patience.

import {
  INGREDIENT_BY_ID,
  ORDER_PATIENCE,
  RUSH_PATIENCE,
  pickRecipe,
  spawnInterval,
} from './recipes.js';

export const SHIFT_SECONDS = 150;
export const MAX_ORDERS = 3;
export const GRILL_SECONDS = 3;
export const BURN_SECONDS = 9;
export const COMBO_MAX = 5;

let nextOrderId = 1;

export function makeOrder(elapsedSeconds, random = Math.random) {
  const recipe = pickRecipe(elapsedSeconds, random);
  const patience = elapsedSeconds > 115 ? RUSH_PATIENCE : ORDER_PATIENCE;
  return {
    id: nextOrderId++,
    recipe,
    patience,
    patienceMax: patience,
    age: 0,
    flash: 0,
  };
}

export class GameState {
  constructor() {
    this.screen = 'title'; // title | playing | over
    this.timeLeft = SHIFT_SECONDS;
    this.elapsed = 0;
    this.score = 0;
    this.served = 0;
    this.lost = 0;
    this.trashed = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.plate = []; // ingredient ids, bottom-up
    this.orders = [];
    this.grill = [null, null]; // { progress, burnt } or null
    this.spawnTimer = 2;
    this.message = '';
    this.messageTimer = 0;
    this.messageKind = 'info';
    this.shake = 0;
    this.servedFlash = 0;
    this.rush = false;
    this.paused = false;
    this.muted = false;
    this.lastServeWasPerfect = false;
  }

  startShift() {
    this.screen = 'playing';
    this.timeLeft = SHIFT_SECONDS;
    this.elapsed = 0;
    this.score = 0;
    this.served = 0;
    this.lost = 0;
    this.trashed = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.plate = [];
    this.orders = [makeOrder(0), makeOrder(0)];
    this.grill = [null, null];
    this.spawnTimer = spawnInterval(0);
    this.rush = false;
    this.paused = false;
    this.setMessage('Shift started! Build the orders on the board.', 'info');
  }

  setMessage(text, kind = 'info') {
    this.message = text;
    this.messageKind = kind;
    this.messageTimer = 2.6;
  }

  // The next ingredient the plate needs, following the first order the
  // plate could still match — used for the "next up" hint on the pass.
  nextNeeded() {
    if (this.plate.length === 0) return 'bun';
    for (const order of this.orders) {
      const stack = order.recipe.stack;
      if (stack.length > this.plate.length &&
          stack.slice(0, this.plate.length).every((id, i) => id === this.plate[i])) {
        return stack[this.plate.length];
      }
    }
    return null;
  }

  // Add an ingredient to the plate. Patties must come off the grill cooked.
  addIngredient(id) {
    if (this.screen !== 'playing' || this.paused) return { ok: false };
    if (id === 'patty') return this.addGrilledPatty();
    if (!INGREDIENT_BY_ID[id]) return { ok: false };
    this.plate.push(id);
    return { ok: true, added: id };
  }

  addGrilledPatty() {
    const slot = this.grill.findIndex(
      (g) => g && g.progress >= GRILL_SECONDS && !g.burnt,
    );
    if (slot === -1) {
      this.setMessage('No cooked patty yet — start one on the grill!', 'warn');
      return { ok: false, needGrill: true };
    }
    this.grill[slot] = null;
    this.plate.push('patty');
    return { ok: true, added: 'patty' };
  }

  // Click the grill: empty slot starts a raw patty, a burnt one is binned.
  pressGrill(slot) {
    if (this.screen !== 'playing' || this.paused) return { ok: false };
    const g = this.grill[slot];
    if (!g) {
      this.grill[slot] = { progress: 0, burnt: false };
      return { ok: true, started: true };
    }
    if (g.burnt) {
      this.grill[slot] = null;
      this.setMessage('Burnt patty binned. Watch the grill!', 'warn');
      return { ok: true, binned: true };
    }
    return { ok: false, cooking: true };
  }

  trashPlate() {
    if (this.screen !== 'playing' || this.paused) return;
    if (this.plate.length === 0) return;
    this.plate = [];
    this.trashed += 1;
    this.combo = 0;
    this.setMessage('Plate trashed. Start the stack again!', 'warn');
  }

  // Serve the plate. It must match an order exactly, bottom-up.
  servePlate() {
    if (this.screen !== 'playing' || this.paused) return { ok: false };
    if (this.plate.length === 0) {
      this.setMessage('The plate is empty — stack a burger first!', 'warn');
      return { ok: false };
    }
    const match = this.orders.find(
      (o) => o.recipe.stack.length === this.plate.length &&
        o.recipe.stack.every((id, i) => id === this.plate[i]),
    );
    if (!match) {
      this.combo = 0;
      this.shake = 0.45;
      this.setMessage('No order matches this stack — check the board!', 'bad');
      return { ok: false, mismatch: true };
    }
    const patienceLeft = Math.max(0, match.patience - match.age);
    const speedBonus = Math.round((patienceLeft / match.patienceMax) * 50);
    this.combo = Math.min(this.combo + 1, COMBO_MAX);
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const earned = (match.recipe.price + speedBonus) * this.combo;
    this.score += earned;
    this.served += 1;
    this.lastServeWasPerfect = patienceLeft > match.patienceMax * 0.6;
    this.orders = this.orders.filter((o) => o.id !== match.id);
    this.plate = [];
    this.servedFlash = 0.9;
    this.setMessage(
      `Served ${match.recipe.name}! +${earned} points${this.combo > 1 ? ` (combo x${this.combo})` : ''}`,
      'good',
    );
    return { ok: true, earned, recipe: match.recipe };
  }

  update(dt) {
    if (this.screen !== 'playing' || this.paused) return;
    this.elapsed += dt;
    this.timeLeft = Math.max(0, SHIFT_SECONDS - this.elapsed);
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.servedFlash > 0) this.servedFlash -= dt;
    this.rush = this.timeLeft <= 30;

    // Grill patties cook, then burn if forgotten.
    for (const g of this.grill) {
      if (!g || g.burnt) continue;
      g.progress += dt;
      if (g.progress >= BURN_SECONDS) g.burnt = true;
    }

    // Orders age; a customer who waits too long walks out.
    for (const order of this.orders) {
      order.age += dt;
      if (order.flash > 0) order.flash -= dt;
    }
    const before = this.orders.length;
    this.orders = this.orders.filter((o) => o.age < o.patience);
    const walked = before - this.orders.length;
    if (walked > 0) {
      this.lost += walked;
      this.combo = 0;
      this.setMessage('A customer walked out — too slow!', 'bad');
    }

    // New orders arrive on a quickening schedule.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.orders.length < MAX_ORDERS) {
      this.orders.push(makeOrder(this.elapsed));
      this.spawnTimer = spawnInterval(this.elapsed);
    } else if (this.spawnTimer <= 0) {
      this.spawnTimer = 2;
    }

    if (this.timeLeft <= 0) {
      this.screen = 'over';
      this.setMessage('', 'info');
    }
  }

  // Friendly clock text, e.g. 2:30.
  clockText() {
    const total = Math.ceil(this.timeLeft);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }
}
