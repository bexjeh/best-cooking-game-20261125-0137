// recipes.js — the ingredients, the recipes, and how new orders are born.
// Every recipe is a bottom-up stack of ingredient ids: index 0 is the
// bottom bun, the last is the top bun. The player must stack in this order.

export const INGREDIENTS = [
  { id: 'bun',     name: 'Bun',     key: '1', color: '#e8a94e', dark: '#b97a26', emoji: '🍞', blurb: 'Toasted bun' },
  { id: 'patty',   name: 'Patty',   key: '2', color: '#7a4a2b', dark: '#54301a', emoji: '🥩', blurb: 'Grilled beef' },
  { id: 'cheese',  name: 'Cheese',  key: '3', color: '#ffc93c', dark: '#d99e12', emoji: '🧀', blurb: 'Melty cheddar' },
  { id: 'lettuce', name: 'Lettuce', key: '4', color: '#7ed957', dark: '#4da32e', emoji: '🥬', blurb: 'Crisp leaves' },
  { id: 'tomato',  name: 'Tomato',  key: '5', color: '#ff5a4e', dark: '#c93327', emoji: '🍅', blurb: 'Fresh slices' },
  { id: 'sauce',   name: 'Sauce',   key: '6', color: '#ff9f43', dark: '#d97a1e', emoji: '🥫', blurb: 'Secret sauce' },
];

export const INGREDIENT_BY_ID = Object.fromEntries(
  INGREDIENTS.map((ing) => [ing.id, ing]),
);

export const RECIPES = [
  {
    id: 'classic',
    name: 'Classic Burger',
    price: 100,
    stack: ['bun', 'patty', 'cheese', 'lettuce', 'tomato', 'bun'],
    tip: 'The house favourite',
  },
  {
    id: 'melt',
    name: 'Cheese Melt',
    price: 90,
    stack: ['bun', 'patty', 'cheese', 'cheese', 'bun'],
    tip: 'Double cheese, no fuss',
  },
  {
    id: 'garden',
    name: 'Garden Stack',
    price: 80,
    stack: ['bun', 'lettuce', 'tomato', 'lettuce', 'tomato', 'bun'],
    tip: 'No patty, all crunch',
  },
  {
    id: 'double',
    name: 'Double Trouble',
    price: 140,
    stack: ['bun', 'patty', 'patty', 'cheese', 'tomato', 'bun'],
    tip: 'Two patties, big appetite',
  },
  {
    id: 'saucy',
    name: 'Saucy Stack',
    price: 120,
    stack: ['bun', 'patty', 'sauce', 'cheese', 'lettuce', 'bun'],
    tip: 'Extra secret sauce',
  },
];

export const RECIPE_BY_ID = Object.fromEntries(
  RECIPES.map((recipe) => [recipe.id, recipe]),
);

// Patience (seconds) an order waits before the customer walks out.
export const ORDER_PATIENCE = 42;
export const RUSH_PATIENCE = 30;

// Pick a recipe for a new order. Early on the easy recipes dominate;
// the double and the saucy stack show up once the shift warms up.
export function pickRecipe(elapsedSeconds, random = Math.random) {
  const pool = ['classic', 'classic', 'melt', 'garden'];
  if (elapsedSeconds > 25) pool.push('saucy', 'classic');
  if (elapsedSeconds > 55) pool.push('double', 'melt');
  if (elapsedSeconds > 90) pool.push('double', 'saucy');
  return RECIPE_BY_ID[pool[Math.floor(random() * pool.length)]];
}

// How often a new order arrives (seconds between spawns).
export function spawnInterval(elapsedSeconds) {
  if (elapsedSeconds > 120) return 7;
  if (elapsedSeconds > 90) return 9;
  if (elapsedSeconds > 45) return 11;
  return 14;
}
