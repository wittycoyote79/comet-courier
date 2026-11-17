// Comet Courier: boot, the fixed-step loop and the screen state machine.
// Screens: title -> playing <-> paused -> over / victory. The world runs an
// ambient drift behind the title so the first thing a player sees is alive.

import { WORLD_WIDTH, WORLD_HEIGHT } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createParticles } from './particles.js';
import { createWorld } from './world.js';
import { createRenderer } from './render.js';
import { createUi } from './ui.js';

const STEP = 1 / 60;

const canvas = document.getElementById('game');
canvas.width = WORLD_WIDTH;
canvas.height = WORLD_HEIGHT;

const input = createInput(canvas);
const audio = createAudio();
const particles = createParticles();
const world = createWorld({ audio, particles });
const renderer = createRenderer(canvas);

let screen = 'title';
let lastTime = 0;
let accumulator = 0;

function startGame() {
  audio.unlock();
  audio.click();
  world.reset();
  screen = 'playing';
  ui.hideScreens();
}

function resumeGame() {
  audio.unlock();
  audio.click();
  screen = 'playing';
  ui.hideScreens();
}

function endGame(won) {
  world.saveBest();
  screen = won ? 'victory' : 'over';
  if (won) {
    audio.victory();
    particles.ring(world.ship.x, world.ship.y, { color: '#ffd166', count: 60, speed: 420, size: 4, life: 0.9 });
  } else {
    audio.gameOver();
  }
  ui.showEnd({ won, world });
}

const ui = createUi({
  onStart: startGame,
  onResume: resumeGame,
  onRestart: startGame,
  onToggleMute: () => audio.toggleMute(),
});
ui.setMuted(audio.muted);
ui.showTitle(world.best);

function update(dt) {
  if (screen === 'title') {
    world.updateAmbient(dt);
    if (input.wasPressed('Enter')) startGame();
    return;
  }
  if (screen === 'playing') {
    if (input.wasPressed('Escape') || input.wasPressed('p')) {
      screen = 'paused';
      ui.showPause();
      return;
    }
    if (input.wasPressed('m')) ui.setMuted(audio.toggleMute());
    world.update(dt, input);
    ui.syncBanner(world);
    if (world.outcome === 'won') endGame(true);
    else if (world.outcome === 'lost') endGame(false);
    return;
  }
  if (screen === 'paused') {
    if (input.wasPressed('Escape') || input.wasPressed('p') || input.wasPressed('Enter')) {
      resumeGame();
    }
    return;
  }
  if (screen === 'over' || screen === 'victory') {
    particles.update(dt);
    if (input.wasPressed('Enter')) startGame();
  }
}

function frame(time) {
  requestAnimationFrame(frame);
  if (lastTime === 0) lastTime = time;
  let elapsed = Math.min(0.25, (time - lastTime) / 1000);
  lastTime = time;
  accumulator += elapsed;
  let steps = 0;
  while (accumulator >= STEP && steps < 4) {
    update(STEP);
    accumulator -= STEP;
    steps += 1;
  }
  if (steps === 4) accumulator = 0;
  renderer.draw(world, particles, screen);
  input.endFrame();
}

// Auto-pause when the tab loses focus mid-flight, so a run never dies
// while the player is looking away.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'playing') {
    screen = 'paused';
    ui.showPause();
  }
});

// A read-only window into the live game for play-testing automation. It
// exposes positions and scores only; it cannot change the game.
window.__cometCourier = {
  get screen() {
    return screen;
  },
  snapshot() {
    return {
      screen,
      score: world.score,
      best: world.best,
      lives: world.lives,
      combo: world.combo,
      wave: world.wave,
      cargo: [...world.cargo],
      elapsed: world.elapsed,
      outcome: world.outcome,
      ship: { x: world.ship.x, y: world.ship.y, dashCooldown: world.ship.dashCooldown },
      shards: world.shards.map((shard) => ({ x: shard.x, y: shard.y, kind: shard.kind })),
      gates: world.gates.map((gate) => ({ x: gate.x, y: gate.y, kind: gate.kind, cooldown: gate.cooldown })),
      wisps: world.wisps.map((wisp) => ({ x: wisp.x, y: wisp.y, kind: wisp.kind })),
      powerups: world.powerups.map((powerup) => ({ x: powerup.x, y: powerup.y, kind: powerup.kind })),
    };
  },
};

requestAnimationFrame(frame);
