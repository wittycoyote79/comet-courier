// Particles, floating score text and screen shake: the feedback layer that
// makes every action feel answered.

import { randomAngle, randomRange } from './random.js';

export function createParticles() {
  const sparks = [];
  const floaters = [];
  let shakeTime = 0;
  let shakeStrength = 0;

  function burst(x, y, { color, count = 14, speed = 220, size = 3.2, life = 0.6 }) {
    for (let i = 0; i < count; i++) {
      const angle = randomAngle();
      const velocity = randomRange(speed * 0.3, speed);
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: randomRange(life * 0.5, life),
        maxLife: life,
        size: randomRange(size * 0.5, size * 1.4),
        color,
        drag: 3.2,
      });
    }
    if (sparks.length > 600) sparks.splice(0, sparks.length - 600);
  }

  function ring(x, y, { color, count = 26, speed = 300, size = 3.6, life = 0.5 }) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size,
        color,
        drag: 4.5,
      });
    }
  }

  function trail(x, y, color) {
    sparks.push({
      x: x + randomRange(-3, 3),
      y: y + randomRange(-3, 3),
      vx: randomRange(-30, 30),
      vy: randomRange(-30, 30),
      life: randomRange(0.18, 0.34),
      maxLife: 0.34,
      size: randomRange(1.5, 3),
      color,
      drag: 2,
    });
  }

  return {
    burst,
    ring,
    trail,
    floatText(x, y, text, color, size = 22) {
      floaters.push({ x, y, text, color, size, life: 1.1, maxLife: 1.1 });
    },
    shake(strength, time = 0.35) {
      shakeStrength = Math.max(shakeStrength, strength);
      shakeTime = Math.max(shakeTime, time);
    },
    update(dt) {
      for (let i = sparks.length - 1; i >= 0; i--) {
        const spark = sparks[i];
        spark.life -= dt;
        if (spark.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        const drag = Math.max(0, 1 - spark.drag * dt);
        spark.vx *= drag;
        spark.vy *= drag;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
      }
      for (let i = floaters.length - 1; i >= 0; i--) {
        const floater = floaters[i];
        floater.life -= dt;
        floater.y -= 42 * dt;
        if (floater.life <= 0) floaters.splice(i, 1);
      }
      if (shakeTime > 0) {
        shakeTime -= dt;
        if (shakeTime <= 0) shakeStrength = 0;
      }
    },
    // The current shake offset, applied by the renderer around the world.
    shakeOffset() {
      if (shakeTime <= 0) return { x: 0, y: 0 };
      const fade = shakeTime / 0.35;
      return {
        x: randomRange(-1, 1) * shakeStrength * fade,
        y: randomRange(-1, 1) * shakeStrength * fade,
      };
    },
    draw(ctx) {
      for (const spark of sparks) {
        const alpha = Math.max(0, spark.life / spark.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = spark.color;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size * alpha + 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const floater of floaters) {
        const alpha = Math.min(1, floater.life / (floater.maxLife * 0.6));
        ctx.globalAlpha = alpha;
        ctx.font = `800 ${floater.size}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(5, 8, 20, 0.85)';
        ctx.strokeText(floater.text, floater.x, floater.y);
        ctx.fillStyle = floater.color;
        ctx.fillText(floater.text, floater.x, floater.y);
      }
      ctx.globalAlpha = 1;
    },
    clear() {
      sparks.length = 0;
      floaters.length = 0;
      shakeTime = 0;
      shakeStrength = 0;
    },
  };
}
