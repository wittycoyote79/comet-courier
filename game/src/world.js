// The world: the ship, shards, gates, wisps and power-ups, and the rules that
// bind them. Scoring, combos, waves, lives and the win/loss outcome all live
// here; rendering lives in render.js and the screens in ui.js.

import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  SHIP_START_X,
  SHIP_START_Y,
  SHIP_RADIUS,
  SHIP_ACCEL,
  SHIP_MAX_SPEED,
  SHIP_FRICTION,
  MOUSE_FOLLOW_STRENGTH,
  DASH_SPEED,
  DASH_TIME,
  DASH_COOLDOWN,
  DASH_KILL_SCORE,
  START_LIVES,
  MAX_LIVES,
  HIT_INVULN_TIME,
  TARGET_SCORE,
  CARGO_CAPACITY,
  SHARD_RADIUS,
  SHARD_SPAWN_INTERVAL,
  MAX_SHARDS,
  COLLECT_SCORE,
  DELIVER_SCORE,
  COMBO_WINDOW,
  COMBO_MAX,
  WAVE_TIME,
  WAVE_BONUS_SCORE,
  WISP_BASE_INTERVAL,
  WISP_MIN_INTERVAL,
  WISP_MAX_COUNT,
  POWERUP_INTERVAL,
  SLOW_TIME,
  MAGNET_TIME,
  MAGNET_RADIUS,
  KINDS,
  GATE_POSITIONS,
  GATE_RADIUS,
} from './config.js';
import { clamp, distance, randomAngle, randomChance, randomPick, randomPoint, randomRange } from './random.js';

const BEST_KEY = 'comet-courier-best';

function loadBest() {
  try {
    const saved = window.localStorage.getItem(BEST_KEY);
    const value = saved === null ? 0 : Number.parseInt(saved, 10);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  } catch {
    return 0;
  }
}

export function createWorld({ audio, particles }) {
  const world = {
    ship: null,
    shards: [],
    gates: [],
    wisps: [],
    powerups: [],
    score: 0,
    best: loadBest(),
    lives: START_LIVES,
    combo: 1,
    comboTimer: 0,
    cargo: [],
    wave: 1,
    waveTimer: WAVE_TIME,
    elapsed: 0,
    slowTimer: 0,
    magnetTimer: 0,
    outcome: 'none',
    banner: null,
    deliveries: 0,
    collected: 0,
    wispsDashed: 0,
    maxCombo: 1,
    shardTimer: 0,
    wispTimer: 2.2,
    powerupTimer: POWERUP_INTERVAL * 0.6,
    cargoFullTimer: 0,
    time: 0,
  };

  function makeShip() {
    return {
      x: SHIP_START_X,
      y: SHIP_START_Y,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      radius: SHIP_RADIUS,
      dashTime: 0,
      dashCooldown: 0,
      dashDirX: 0,
      dashDirY: -1,
      invulnTimer: 0,
      shield: false,
    };
  }

  function makeGates() {
    return GATE_POSITIONS.map((gate) => ({
      x: gate.x,
      y: gate.y,
      kind: gate.kind,
      radius: GATE_RADIUS,
      cooldown: 0,
      pulse: randomRange(0, Math.PI * 2),
    }));
  }

  function spawnShard(awayFromShip = true) {
    for (let tries = 0; tries < 12; tries++) {
      const point = randomPoint(70, WORLD_WIDTH, WORLD_HEIGHT);
      const nearGate = world.gates.some((gate) => distance(point.x, point.y, gate.x, gate.y) < 120);
      const nearShip = awayFromShip && distance(point.x, point.y, world.ship.x, world.ship.y) < 150;
      if (nearGate || nearShip) continue;
      const angle = randomAngle();
      const speed = randomRange(8, 26);
      world.shards.push({
        x: point.x,
        y: point.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        kind: Math.floor(Math.random() * KINDS.length),
        radius: SHARD_RADIUS,
        phase: randomRange(0, Math.PI * 2),
      });
      return;
    }
  }

  function spawnWisp() {
    const wave = world.wave;
    const roll = Math.random();
    const kind = wave < 2 ? 'drifter' : roll < 0.45 ? 'drifter' : roll < 0.8 ? 'chaser' : 'weaver';
    const edge = Math.floor(Math.random() * 4);
    let x;
    let y;
    if (edge === 0) {
      x = randomRange(0, WORLD_WIDTH);
      y = -30;
    } else if (edge === 1) {
      x = WORLD_WIDTH + 30;
      y = randomRange(0, WORLD_HEIGHT);
    } else if (edge === 2) {
      x = randomRange(0, WORLD_WIDTH);
      y = WORLD_HEIGHT + 30;
    } else {
      x = -30;
      y = randomRange(0, WORLD_HEIGHT);
    }
    if (distance(x, y, world.ship.x, world.ship.y) < 240) return;
    const heading = Math.atan2(world.ship.y - y, world.ship.x - x) + randomRange(-0.5, 0.5);
    world.wisps.push({
      x,
      y,
      vx: Math.cos(heading) * 40,
      vy: Math.sin(heading) * 40,
      kind,
      radius: kind === 'chaser' ? 15 : 13,
      heading,
      wobble: randomRange(0, Math.PI * 2),
      speed: (kind === 'chaser' ? 88 : kind === 'weaver' ? 72 : 55) + wave * 5,
    });
  }

  function spawnPowerup() {
    const point = randomPoint(90, WORLD_WIDTH, WORLD_HEIGHT);
    if (distance(point.x, point.y, world.ship.x, world.ship.y) < 140) return;
    world.powerups.push({
      x: point.x,
      y: point.y,
      kind: randomPick(['shield', 'slow', 'magnet']),
      ttl: 11,
      phase: randomRange(0, Math.PI * 2),
    });
  }

  function startDash() {
    const ship = world.ship;
    if (ship.dashCooldown > 0 || ship.dashTime > 0) return;
    let dirX = ship.vx;
    let dirY = ship.vy;
    const speed = Math.hypot(dirX, dirY);
    if (speed < 40) {
      dirX = Math.cos(ship.angle);
      dirY = Math.sin(ship.angle);
    } else {
      dirX /= speed;
      dirY /= speed;
    }
    ship.dashDirX = dirX;
    ship.dashDirY = dirY;
    ship.dashTime = DASH_TIME;
    ship.dashCooldown = DASH_TIME + DASH_COOLDOWN;
    audio.dash();
    particles.burst(ship.x, ship.y, { color: '#9fd8ff', count: 10, speed: 160, size: 2.6, life: 0.35 });
  }

  function deliverAt(gate) {
    const matching = world.cargo.filter((kind) => kind === gate.kind);
    if (matching.length === 0) return;
    world.cargo = world.cargo.filter((kind) => kind !== gate.kind);
    const points = DELIVER_SCORE * world.combo * matching.length;
    world.score += points;
    world.deliveries += matching.length;
    world.combo = Math.min(COMBO_MAX, world.combo + 1);
    world.maxCombo = Math.max(world.maxCombo, world.combo);
    world.comboTimer = COMBO_WINDOW;
    gate.cooldown = 0.8;
    const kind = KINDS[gate.kind];
    particles.ring(gate.x, gate.y, { color: kind.color, count: 30, speed: 340 });
    particles.floatText(gate.x, gate.y - 66, `+${points}`, kind.color, 26);
    if (world.combo >= 3) {
      particles.floatText(world.ship.x, world.ship.y - 34, `COMBO x${world.combo}`, '#ffd166', 20);
    }
    audio.deliver(world.combo);
    checkWin();
  }

  function hitShip(wispIndex) {
    const ship = world.ship;
    const wisp = world.wisps[wispIndex];
    world.wisps.splice(wispIndex, 1);
    if (ship.shield) {
      ship.shield = false;
      ship.invulnTimer = 1.0;
      particles.burst(ship.x, ship.y, { color: '#8ef1ff', count: 26, speed: 320, size: 3.4, life: 0.6 });
      particles.floatText(ship.x, ship.y - 34, 'SHIELD SAVED YOU', '#8ef1ff', 20);
      audio.wispDown();
      return;
    }
    world.lives -= 1;
    world.combo = 1;
    world.comboTimer = 0;
    ship.invulnTimer = HIT_INVULN_TIME;
    particles.burst(ship.x, ship.y, { color: '#ff5d6c', count: 34, speed: 380, size: 4, life: 0.7 });
    particles.burst(wisp.x, wisp.y, { color: '#b388ff', count: 18, speed: 260, size: 3.4, life: 0.6 });
    particles.shake(9, 0.4);
    particles.floatText(ship.x, ship.y - 34, 'HULL HIT!', '#ff5d6c', 24);
    audio.hit();
    if (world.lives <= 0) {
      world.outcome = 'lost';
    }
  }

  function dashThrough(wispIndex) {
    const wisp = world.wisps[wispIndex];
    world.wisps.splice(wispIndex, 1);
    world.score += DASH_KILL_SCORE;
    world.wispsDashed += 1;
    particles.burst(wisp.x, wisp.y, { color: '#b388ff', count: 24, speed: 340, size: 3.6, life: 0.55 });
    particles.floatText(wisp.x, wisp.y - 20, `+${DASH_KILL_SCORE}`, '#d9c8ff', 20);
    audio.wispDown();
    checkWin();
  }

  function checkWin() {
    if (world.outcome === 'none' && world.score >= TARGET_SCORE) {
      world.outcome = 'won';
    }
  }

  function applyPowerup(powerup) {
    const ship = world.ship;
    if (powerup.kind === 'shield') {
      ship.shield = true;
      particles.floatText(ship.x, ship.y - 34, 'SHIELD UP', '#8ef1ff', 22);
    } else if (powerup.kind === 'slow') {
      world.slowTimer = SLOW_TIME;
      particles.floatText(ship.x, ship.y - 34, 'WISPS SLOWED', '#a8ffcb', 22);
    } else {
      world.magnetTimer = MAGNET_TIME;
      particles.floatText(ship.x, ship.y - 34, 'STAR MAGNET', '#ffd166', 22);
    }
    particles.ring(powerup.x, powerup.y, { color: '#ffffff', count: 20, speed: 240, size: 2.8, life: 0.45 });
    audio.powerup();
  }

  function updateShip(dt, input) {
    const ship = world.ship;
    ship.dashCooldown = Math.max(0, ship.dashCooldown - dt);
    ship.invulnTimer = Math.max(0, ship.invulnTimer - dt);

    const dashPressed = input.wasPressed(' ') || input.wasPressed('Shift') || input.mouse.clicked;
    if (dashPressed) startDash();

    if (ship.dashTime > 0) {
      ship.dashTime -= dt;
      ship.vx = ship.dashDirX * DASH_SPEED;
      ship.vy = ship.dashDirY * DASH_SPEED;
      particles.trail(ship.x - ship.dashDirX * 18, ship.y - ship.dashDirY * 18, '#9fd8ff');
    } else {
      const axis = input.moveAxis();
      if (axis.x !== 0 || axis.y !== 0) {
        ship.vx += axis.x * SHIP_ACCEL * dt;
        ship.vy += axis.y * SHIP_ACCEL * dt;
      } else if (input.usingMouse) {
        const dx = input.mouse.x - ship.x;
        const dy = input.mouse.y - ship.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 6) {
          const desired = Math.min(SHIP_MAX_SPEED, dist * MOUSE_FOLLOW_STRENGTH);
          const targetVx = (dx / dist) * desired;
          const targetVy = (dy / dist) * desired;
          const blend = Math.min(1, 8 * dt);
          ship.vx += (targetVx - ship.vx) * blend;
          ship.vy += (targetVy - ship.vy) * blend;
        } else {
          ship.vx *= Math.max(0, 1 - SHIP_FRICTION * dt);
          ship.vy *= Math.max(0, 1 - SHIP_FRICTION * dt);
        }
      } else {
        ship.vx *= Math.max(0, 1 - SHIP_FRICTION * dt);
        ship.vy *= Math.max(0, 1 - SHIP_FRICTION * dt);
      }
      const speed = Math.hypot(ship.vx, ship.vy);
      if (speed > SHIP_MAX_SPEED && ship.dashTime <= 0) {
        ship.vx = (ship.vx / speed) * SHIP_MAX_SPEED;
        ship.vy = (ship.vy / speed) * SHIP_MAX_SPEED;
      }
    }

    ship.x = clamp(ship.x + ship.vx * dt, ship.radius, WORLD_WIDTH - ship.radius);
    ship.y = clamp(ship.y + ship.vy * dt, ship.radius, WORLD_HEIGHT - ship.radius);
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > 30) {
      ship.angle = Math.atan2(ship.vy, ship.vx);
    }
    if (speed > 60 && Math.random() < 0.6) {
      particles.trail(
        ship.x - Math.cos(ship.angle) * 18,
        ship.y - Math.sin(ship.angle) * 18,
        ship.dashTime > 0 ? '#9fd8ff' : '#ffb35c',
      );
    }
  }

  function updateShards(dt) {
    world.shardTimer -= dt;
    if (world.shardTimer <= 0 && world.shards.length < MAX_SHARDS) {
      spawnShard();
      world.shardTimer = SHARD_SPAWN_INTERVAL * randomRange(0.7, 1.3);
    }
    const magnetOn = world.magnetTimer > 0;
    for (let i = world.shards.length - 1; i >= 0; i--) {
      const shard = world.shards[i];
      shard.phase += dt * 3;
      if (magnetOn) {
        const dist = distance(shard.x, shard.y, world.ship.x, world.ship.y);
        if (dist < MAGNET_RADIUS && dist > 1) {
          const pull = 620 * (1 - dist / MAGNET_RADIUS) + 120;
          shard.vx += ((world.ship.x - shard.x) / dist) * pull * dt;
          shard.vy += ((world.ship.y - shard.y) / dist) * pull * dt;
        }
      }
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      if (shard.x < shard.radius || shard.x > WORLD_WIDTH - shard.radius) shard.vx *= -1;
      if (shard.y < shard.radius || shard.y > WORLD_HEIGHT - shard.radius) shard.vy *= -1;
      shard.x = clamp(shard.x, shard.radius, WORLD_WIDTH - shard.radius);
      shard.y = clamp(shard.y, shard.radius, WORLD_HEIGHT - shard.radius);

      if (distance(shard.x, shard.y, world.ship.x, world.ship.y) < shard.radius + world.ship.radius + 4) {
        if (world.cargo.length < CARGO_CAPACITY) {
          world.cargo.push(shard.kind);
          world.collected += 1;
          world.score += COLLECT_SCORE;
          const kind = KINDS[shard.kind];
          particles.burst(shard.x, shard.y, { color: kind.color, count: 12, speed: 200, size: 2.8, life: 0.45 });
          audio.collect(world.combo);
          world.shards.splice(i, 1);
          checkWin();
        } else if (world.cargoFullTimer <= 0) {
          particles.floatText(world.ship.x, world.ship.y - 34, 'CARGO FULL — DELIVER!', '#ffd166', 18);
          world.cargoFullTimer = 1.6;
        }
      }
    }
    world.cargoFullTimer = Math.max(0, world.cargoFullTimer - dt);
  }

  function updateGates(dt) {
    for (const gate of world.gates) {
      gate.pulse += dt * 2;
      gate.cooldown = Math.max(0, gate.cooldown - dt);
      if (gate.cooldown <= 0 && distance(world.ship.x, world.ship.y, gate.x, gate.y) < gate.radius * 0.82) {
        deliverAt(gate);
      }
    }
  }

  function updateWisps(dt) {
    const slowFactor = world.slowTimer > 0 ? 0.45 : 1;
    world.wispTimer -= dt;
    const interval = Math.max(WISP_MIN_INTERVAL, WISP_BASE_INTERVAL - world.wave * 0.18);
    if (world.wispTimer <= 0 && world.wisps.length < Math.min(WISP_MAX_COUNT, 4 + world.wave * 2)) {
      spawnWisp();
      world.wispTimer = interval * randomRange(0.7, 1.25);
    }
    const ship = world.ship;
    for (let i = world.wisps.length - 1; i >= 0; i--) {
      const wisp = world.wisps[i];
      wisp.wobble += dt * 2.4;
      const toShip = Math.atan2(ship.y - wisp.y, ship.x - wisp.x);
      if (wisp.kind === 'chaser') {
        wisp.heading = toShip;
      } else if (wisp.kind === 'weaver') {
        wisp.heading = toShip + Math.sin(wisp.wobble) * 0.7;
      } else if (randomChance(dt * 0.7)) {
        wisp.heading += randomRange(-1.1, 1.1);
      }
      const speed = wisp.speed * slowFactor;
      wisp.vx += (Math.cos(wisp.heading) * speed - wisp.vx) * Math.min(1, 2.2 * dt);
      wisp.vy += (Math.sin(wisp.heading) * speed - wisp.vy) * Math.min(1, 2.2 * dt);
      wisp.x += wisp.vx * dt;
      wisp.y += wisp.vy * dt;
      if (wisp.x < -60 || wisp.x > WORLD_WIDTH + 60 || wisp.y < -60 || wisp.y > WORLD_HEIGHT + 60) {
        world.wisps.splice(i, 1);
        continue;
      }
      const touching = distance(wisp.x, wisp.y, ship.x, ship.y) < wisp.radius + ship.radius - 2;
      if (!touching) continue;
      if (ship.dashTime > 0) {
        dashThrough(i);
      } else if (ship.invulnTimer <= 0) {
        hitShip(i);
        if (world.outcome === 'lost') return;
      }
    }
  }

  function updatePowerups(dt) {
    world.powerupTimer -= dt;
    if (world.powerupTimer <= 0) {
      if (world.powerups.length < 2) spawnPowerup();
      world.powerupTimer = POWERUP_INTERVAL * randomRange(0.8, 1.2);
    }
    for (let i = world.powerups.length - 1; i >= 0; i--) {
      const powerup = world.powerups[i];
      powerup.phase += dt * 2.5;
      powerup.ttl -= dt;
      if (powerup.ttl <= 0) {
        world.powerups.splice(i, 1);
        continue;
      }
      if (distance(powerup.x, powerup.y, world.ship.x, world.ship.y) < 26 + world.ship.radius) {
        applyPowerup(powerup);
        world.powerups.splice(i, 1);
      }
    }
  }

  function updateWaves(dt) {
    world.waveTimer -= dt;
    if (world.waveTimer > 0) return;
    world.wave += 1;
    world.waveTimer = WAVE_TIME;
    world.score += WAVE_BONUS_SCORE;
    let sub = `Wave bonus +${WAVE_BONUS_SCORE}`;
    if (world.wave % 3 === 0 && world.lives < MAX_LIVES) {
      world.lives += 1;
      sub += '  ·  +1 hull';
    }
    world.banner = { title: `WAVE ${world.wave}`, sub, at: world.elapsed };
    particles.floatText(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 120, `WAVE ${world.wave}`, '#eaf2ff', 34);
    audio.wave();
    checkWin();
  }

  world.reset = function reset() {
    world.ship = makeShip();
    world.gates = makeGates();
    world.shards = [];
    world.wisps = [];
    world.powerups = [];
    world.score = 0;
    world.lives = START_LIVES;
    world.combo = 1;
    world.comboTimer = 0;
    world.cargo = [];
    world.wave = 1;
    world.waveTimer = WAVE_TIME;
    world.elapsed = 0;
    world.slowTimer = 0;
    world.magnetTimer = 0;
    world.outcome = 'none';
    world.banner = null;
    world.deliveries = 0;
    world.collected = 0;
    world.wispsDashed = 0;
    world.maxCombo = 1;
    world.shardTimer = 0;
    world.wispTimer = 3.0;
    world.powerupTimer = POWERUP_INTERVAL * 0.6;
    world.cargoFullTimer = 0;
    particles.clear();
    for (let i = 0; i < 8; i++) spawnShard(false);
  };

  world.update = function update(dt, input) {
    world.time += dt;
    world.elapsed += dt;
    world.slowTimer = Math.max(0, world.slowTimer - dt);
    world.magnetTimer = Math.max(0, world.magnetTimer - dt);
    if (world.comboTimer > 0) {
      world.comboTimer -= dt;
      if (world.comboTimer <= 0) world.combo = 1;
    }
    updateShip(dt, input);
    updateShards(dt);
    updateGates(dt);
    updateWisps(dt);
    if (world.outcome === 'lost') {
      particles.update(dt);
      return;
    }
    updatePowerups(dt);
    updateWaves(dt);
    particles.update(dt);
  };

  // The title screen's living backdrop: shards drift, gates glow, no danger.
  world.updateAmbient = function updateAmbient(dt) {
    world.time += dt;
    if (!world.ship) world.reset();
    const ship = world.ship;
    ship.x = WORLD_WIDTH / 2 + Math.sin(world.time * 0.35) * 130;
    ship.y = WORLD_HEIGHT / 2 + 130 + Math.sin(world.time * 0.6) * 22;
    ship.angle = -Math.PI / 2 + Math.sin(world.time * 0.5) * 0.16;
    if (Math.random() < 0.3) {
      particles.trail(ship.x - Math.cos(ship.angle) * 18, ship.y - Math.sin(ship.angle) * 18, '#ffb35c');
    }
    for (const gate of world.gates) gate.pulse += dt * 2;
    for (const shard of world.shards) {
      shard.phase += dt * 3;
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      if (shard.x < shard.radius || shard.x > WORLD_WIDTH - shard.radius) shard.vx *= -1;
      if (shard.y < shard.radius || shard.y > WORLD_HEIGHT - shard.radius) shard.vy *= -1;
      shard.x = clamp(shard.x, shard.radius, WORLD_WIDTH - shard.radius);
      shard.y = clamp(shard.y, shard.radius, WORLD_HEIGHT - shard.radius);
    }
    if (world.shards.length < 8) spawnShard(false);
    particles.update(dt);
  };

  world.saveBest = function saveBest() {
    if (world.score > world.best) {
      world.best = world.score;
      try {
        window.localStorage.setItem(BEST_KEY, String(world.best));
      } catch {
        /* storage unavailable: best still shows this session */
      }
    }
  };

  world.reset();
  return world;
}
