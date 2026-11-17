// Keyboard, mouse and touch input, mapped into world coordinates.
// The ship follows the pointer; the keys drive it too. Either one alone is
// enough to play the whole game.

import { WORLD_WIDTH, WORLD_HEIGHT } from './config.js';

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, down: false, clicked: false };
  let usingMouse = false;

  function toWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * WORLD_WIDTH,
      y: ((clientY - rect.top) / rect.height) * WORLD_HEIGHT,
    };
  }

  function onKeyDown(event) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(key);
    keys.add(key);
  }

  function onKeyUp(event) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    keys.delete(key);
  }

  function onPointerMove(event) {
    const point = toWorld(event.clientX, event.clientY);
    mouse.x = point.x;
    mouse.y = point.y;
    usingMouse = true;
  }

  function onPointerDown(event) {
    const point = toWorld(event.clientX, event.clientY);
    mouse.x = point.x;
    mouse.y = point.y;
    mouse.down = true;
    mouse.clicked = true;
    usingMouse = true;
  }

  function onPointerUp() {
    mouse.down = false;
  }

  function onTouchMove(event) {
    if (event.touches.length === 0) return;
    event.preventDefault();
    const point = toWorld(event.touches[0].clientX, event.touches[0].clientY);
    mouse.x = point.x;
    mouse.y = point.y;
    usingMouse = true;
  }

  function onBlur() {
    keys.clear();
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });

  return {
    keys,
    mouse,
    get usingMouse() {
      return usingMouse;
    },
    // True on the single frame the key went down.
    wasPressed(key) {
      return pressed.has(key);
    },
    // Like wasPressed, but consumed: true only on the first step that asks
    // in a frame, so a key never toggles a screen twice in one frame when
    // the loop runs several fixed steps before the next paint.
    takePressed(key) {
      if (!pressed.has(key)) return false;
      pressed.delete(key);
      return true;
    },
    // True while any of the given keys is held.
    held(...names) {
      return names.some((name) => keys.has(name));
    },
    // The steering vector from the movement keys, normalized.
    moveAxis() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) x += 1;
      if (keys.has('w') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('s') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        x *= Math.SQRT1_2;
        y *= Math.SQRT1_2;
      }
      return { x, y };
    },
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
  };
}
