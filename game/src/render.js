// All canvas drawing: the starfield, the gates, the ship, the wisps, the
// shards, the power-ups and the HUD. Nothing here changes game state.

import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  GATE_RADIUS,
  CARGO_CAPACITY,
  TARGET_SCORE,
  COMBO_WINDOW,
  KINDS,
  PALETTE,
} from './config.js';
import { clamp, randomRange } from './random.js';

// Fixed background dressing, rolled once so the sky is stable run to run.
const STARS = Array.from({ length: 170 }, () => ({
  x: Math.random() * WORLD_WIDTH,
  y: Math.random() * WORLD_HEIGHT,
  size: randomRange(0.6, 2.2),
  layer: Math.random() < 0.5 ? 0 : Math.random() < 0.7 ? 1 : 2,
  twinkle: randomRange(0, Math.PI * 2),
}));
const NEBULAE = [
  { x: 240, y: 170, radius: 260, color: 'rgba(88, 60, 180, 0.20)' },
  { x: 1020, y: 520, radius: 300, color: 'rgba(30, 120, 160, 0.16)' },
  { x: 760, y: 120, radius: 200, color: 'rgba(200, 60, 140, 0.12)' },
  { x: 120, y: 600, radius: 220, color: 'rgba(60, 90, 200, 0.14)' },
];

function shapePath(ctx, shape, x, y, radius, rotation) {
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  } else {
    // Triangle: squares are drawn by drawShape's rotated-rect path instead.
    for (let i = 0; i < 3; i++) {
      const angle = rotation + (i / 3) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
}

function drawShape(ctx, shape, x, y, radius, rotation, fill, stroke) {
  if (shape === 'square') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = fill;
    ctx.fillRect(-radius * 0.85, -radius * 0.85, radius * 1.7, radius * 1.7);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(-radius * 0.85, -radius * 0.85, radius * 1.7, radius * 1.7);
    }
    ctx.restore();
    return;
  }
  shapePath(ctx, shape, x, y, radius, rotation);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawBackground(ctx, time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
  gradient.addColorStop(0, PALETTE.spaceTop);
  gradient.addColorStop(1, PALETTE.spaceBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  for (const nebula of NEBULAE) {
    const glow = ctx.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.radius);
    glow.addColorStop(0, nebula.color);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(nebula.x - nebula.radius, nebula.y - nebula.radius, nebula.radius * 2, nebula.radius * 2);
  }
  for (const star of STARS) {
    const drift = time * (2 + star.layer * 4);
    const x = (star.x + drift) % WORLD_WIDTH;
    const alpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(time * (1 + star.layer) + star.twinkle));
    ctx.globalAlpha = alpha * (0.55 + star.layer * 0.22);
    ctx.fillStyle = '#dfe9ff';
    ctx.fillRect(x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;
}

function drawGate(ctx, gate, time) {
  const kind = KINDS[gate.kind];
  const breathe = 1 + Math.sin(gate.pulse) * 0.05;
  const radius = gate.radius * breathe;
  ctx.save();
  ctx.shadowColor = kind.color;
  ctx.shadowBlur = 26;
  ctx.strokeStyle = kind.color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(gate.x, gate.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const start = time * 0.7 + (i / 3) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(gate.x, gate.y, radius - 9, start, start + 0.7);
    ctx.stroke();
  }
  const inner = ctx.createRadialGradient(gate.x, gate.y, 0, gate.x, gate.y, radius - 12);
  inner.addColorStop(0, kind.glow);
  inner.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.arc(gate.x, gate.y, radius - 12, 0, Math.PI * 2);
  ctx.fill();
  drawShape(ctx, kind.shape, gate.x, gate.y, 15, time * 0.6, kind.color, '#ffffff');
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(234, 242, 255, 0.9)';
  ctx.fillText('DELIVER', gate.x, gate.y + radius + 20);
}

function drawShard(ctx, shard) {
  const kind = KINDS[shard.kind];
  const pulse = 1 + Math.sin(shard.phase) * 0.18;
  ctx.save();
  ctx.shadowColor = kind.color;
  ctx.shadowBlur = 16;
  drawShape(ctx, kind.shape, shard.x, shard.y, shard.radius * pulse, shard.phase * 0.4, kind.color, '#ffffff');
  ctx.restore();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(shard.x - 3, shard.y - 3, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawShip(ctx, ship, time, cargoKinds) {
  const blink = ship.invulnTimer > 0 && Math.floor(time * 14) % 2 === 0;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle + Math.PI / 2);
  if (blink) ctx.globalAlpha = 0.35;
  const flame = 14 + Math.sin(time * 34) * 4 + (ship.dashTime > 0 ? 12 : 0);
  const flameGradient = ctx.createLinearGradient(0, 10, 0, 10 + flame + 12);
  flameGradient.addColorStop(0, '#ffe08a');
  flameGradient.addColorStop(0.5, '#ff9a3d');
  flameGradient.addColorStop(1, 'rgba(255, 90, 60, 0)');
  ctx.fillStyle = flameGradient;
  ctx.beginPath();
  ctx.moveTo(-6, 10);
  ctx.lineTo(0, 10 + flame + 10);
  ctx.lineTo(6, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8f1ff';
  ctx.strokeStyle = '#5d7ba6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(11, 10);
  ctx.lineTo(5, 14);
  ctx.lineTo(-5, 14);
  ctx.lineTo(-11, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7ee7ff';
  ctx.beginPath();
  ctx.ellipse(0, -6, 4.5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff6e7a';
  ctx.beginPath();
  ctx.moveTo(-11, 10);
  ctx.lineTo(-18, 16);
  ctx.lineTo(-9, 15);
  ctx.closePath();
  ctx.moveTo(11, 10);
  ctx.lineTo(18, 16);
  ctx.lineTo(9, 15);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (ship.shield) {
    ctx.save();
    ctx.strokeStyle = 'rgba(142, 241, 255, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -time * 30;
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.radius + 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  cargoKinds.forEach((kind, i) => {
    const angle = time * 2.2 + (i / Math.max(1, cargoKinds.length)) * Math.PI * 2;
    const orbitX = ship.x + Math.cos(angle) * (ship.radius + 14);
    const orbitY = ship.y + Math.sin(angle) * (ship.radius + 14);
    drawShape(ctx, KINDS[kind].shape, orbitX, orbitY, 6, angle, KINDS[kind].color, '#ffffff');
  });
}

function drawWisp(ctx, wisp, time) {
  const squash = 1 + Math.sin(wisp.wobble * 1.7) * 0.12;
  ctx.save();
  ctx.translate(wisp.x, wisp.y);
  ctx.scale(1, squash);
  ctx.shadowColor = '#a86bff';
  ctx.shadowBlur = 18;
  ctx.fillStyle = 'rgba(140, 90, 230, 0.85)';
  ctx.beginPath();
  ctx.arc(0, 0, wisp.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(60, 20, 110, 0.9)';
  const eyeOffset = 5;
  const lookX = Math.cos(wisp.heading) * 2;
  const lookY = Math.sin(wisp.heading) * 2;
  ctx.beginPath();
  ctx.arc(wisp.x - eyeOffset + lookX, wisp.y - 3 + lookY, 3.2, 0, Math.PI * 2);
  ctx.arc(wisp.x + eyeOffset + lookX, wisp.y - 3 + lookY, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2e9ff';
  ctx.beginPath();
  ctx.arc(wisp.x - eyeOffset + lookX, wisp.y - 3.5 + lookY, 1.3, 0, Math.PI * 2);
  ctx.arc(wisp.x + eyeOffset + lookX, wisp.y - 3.5 + lookY, 1.3, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const trail = 1 - i * 0.22;
    ctx.globalAlpha = 0.25 * trail;
    ctx.fillStyle = '#8f5ce8';
    ctx.beginPath();
    ctx.arc(
      wisp.x - Math.cos(wisp.heading) * (14 + i * 9),
      wisp.y - Math.sin(wisp.heading) * (14 + i * 9) + Math.sin(time * 6 + i) * 3,
      wisp.radius * 0.55 * trail,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPowerup(ctx, powerup) {
  const blink = powerup.ttl < 3 && Math.floor(powerup.ttl * 6) % 2 === 0;
  if (blink) return;
  const bob = Math.sin(powerup.phase) * 4;
  const y = powerup.y + bob;
  const colors = { shield: '#8ef1ff', slow: '#a8ffcb', magnet: '#ffd166' };
  const color = colors[powerup.kind];
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.fillStyle = 'rgba(10, 16, 34, 0.9)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(powerup.x, y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = color;
  ctx.font = '800 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyph = powerup.kind === 'shield' ? 'S' : powerup.kind === 'slow' ? '◷' : 'U';
  ctx.fillText(glyph, powerup.x, y + 1);
  ctx.textBaseline = 'alphabetic';
}

function drawHud(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 10, 24, 0.62)';
  ctx.beginPath();
  ctx.roundRect(14, 12, WORLD_WIDTH - 28, 64, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(159, 178, 216, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText('SCORE', 30, 34);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillText(String(world.score), 30, 64);
  const barX = 170;
  const barWidth = 240;
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText(`ROUTE TARGET ${TARGET_SCORE}`, barX, 34);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.beginPath();
  ctx.roundRect(barX, 42, barWidth, 14, 7);
  ctx.fill();
  const progress = clamp(world.score / TARGET_SCORE, 0, 1);
  const barGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
  barGradient.addColorStop(0, '#4de8e0');
  barGradient.addColorStop(1, '#ffc857');
  ctx.fillStyle = barGradient;
  if (progress > 0) {
    ctx.beginPath();
    ctx.roundRect(barX, 42, Math.max(14, barWidth * progress), 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText('WAVE', 440, 34);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '800 26px system-ui, sans-serif';
  ctx.fillText(String(world.wave), 440, 63);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText('BEST', 520, 34);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '800 26px system-ui, sans-serif';
  ctx.fillText(String(Math.max(world.best, world.score)), 520, 63);

  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText('HULL', WORLD_WIDTH - 30, 34);
  for (let i = 0; i < world.lives; i++) {
    const x = WORLD_WIDTH - 42 - i * 26;
    ctx.fillStyle = '#ff6e7a';
    ctx.beginPath();
    ctx.moveTo(x, 44);
    ctx.lineTo(x + 9, 58);
    ctx.lineTo(x, 54);
    ctx.lineTo(x - 9, 58);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText('CARGO', WORLD_WIDTH - 190, 34);
  for (let i = 0; i < CARGO_CAPACITY; i++) {
    const x = WORLD_WIDTH - 262 + i * 24;
    ctx.beginPath();
    ctx.arc(x + 10, 52, 8, 0, Math.PI * 2);
    if (i < world.cargo.length) {
      ctx.fillStyle = KINDS[world.cargo[i]].color;
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  if (world.combo >= 2) {
    ctx.textAlign = 'center';
    const comboAlpha = world.comboTimer > 0 ? clamp(world.comboTimer / COMBO_WINDOW, 0.25, 1) : 0.25;
    ctx.globalAlpha = comboAlpha;
    ctx.fillStyle = '#ffd166';
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.fillText(`COMBO x${world.combo}`, WORLD_WIDTH / 2 + 130, 60);
    ctx.globalAlpha = 1;
  }
  const timers = [];
  if (world.slowTimer > 0) timers.push(`SLOW ${world.slowTimer.toFixed(1)}s`);
  if (world.magnetTimer > 0) timers.push(`MAGNET ${world.magnetTimer.toFixed(1)}s`);
  if (world.ship.shield) timers.push('SHIELD READY');
  if (timers.length > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a8ffcb';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.fillText(timers.join('   ·   '), WORLD_WIDTH / 2, 96);
  }
  const dashReady = world.ship.dashCooldown <= 0;
  ctx.textAlign = 'left';
  ctx.fillStyle = dashReady ? '#9fd8ff' : 'rgba(159, 216, 255, 0.45)';
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.fillText(dashReady ? 'DASH READY  [SPACE / CLICK]' : 'DASH …', 30, 96);
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  return {
    draw(world, particles, screen) {
      ctx.save();
      const shake = particles.shakeOffset();
      ctx.translate(shake.x, shake.y);
      drawBackground(ctx, world.time);
      // Behind the title the gates sit dimmer, so the title text stays crisp.
      if (screen === 'title') ctx.globalAlpha = 0.5;
      for (const gate of world.gates) drawGate(ctx, gate, world.time);
      ctx.globalAlpha = 1;
      for (const shard of world.shards) drawShard(ctx, shard);
      for (const powerup of world.powerups) drawPowerup(ctx, powerup);
      for (const wisp of world.wisps) drawWisp(ctx, wisp, world.time);
      drawShip(ctx, world.ship, world.time, world.cargo);
      particles.draw(ctx);
      ctx.restore();
      if (screen === 'playing' || screen === 'paused') {
        drawHud(ctx, world);
      }
    },
  };
}
