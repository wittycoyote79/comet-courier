// Small randomness helpers. Gameplay randomness is unseeded on purpose: every
// run deals a fresh sky. (Only the entry program's own runs must match byte
// for byte; the game itself is meant to surprise.)

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}

export function randomPick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function randomChance(p) {
  return Math.random() < p;
}

export function randomAngle() {
  return Math.random() * Math.PI * 2;
}

// A point inside the world with a margin from the edges.
export function randomPoint(margin, width, height) {
  return {
    x: randomRange(margin, width - margin),
    y: randomRange(margin, height - margin),
  };
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}
