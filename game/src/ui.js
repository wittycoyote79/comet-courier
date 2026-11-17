// The DOM screens: title, pause, victory and game over, plus the wave banner
// and the mute button. The canvas keeps drawing behind them.

export function createUi({ onStart, onResume, onRestart, onToggleMute }) {
  const screens = {
    title: document.getElementById('title-screen'),
    pause: document.getElementById('pause-screen'),
    end: document.getElementById('end-screen'),
  };
  const endTitle = document.getElementById('end-title');
  const endSubtitle = document.getElementById('end-subtitle');
  const endStats = document.getElementById('end-stats');
  const bestLine = document.getElementById('best-line');
  const banner = document.getElementById('banner');
  const bannerTitle = document.getElementById('banner-title');
  const bannerSub = document.getElementById('banner-sub');
  const muteButton = document.getElementById('mute-button');
  let bannerUntil = 0;
  let lastBannerAt = -1;

  document.getElementById('start-button').addEventListener('click', onStart);
  document.getElementById('resume-button').addEventListener('click', onResume);
  document.getElementById('pause-restart-button').addEventListener('click', onRestart);
  document.getElementById('again-button').addEventListener('click', onRestart);
  muteButton.addEventListener('click', () => {
    const muted = onToggleMute();
    muteButton.textContent = muted ? '🔇 muted' : '🔊 sound';
    muteButton.setAttribute('aria-pressed', String(muted));
  });

  function show(name) {
    for (const [key, element] of Object.entries(screens)) {
      element.classList.toggle('visible', key === name);
    }
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const rest = Math.floor(seconds % 60);
    return `${minutes}:${String(rest).padStart(2, '0')}`;
  }

  return {
    showTitle(best) {
      bestLine.textContent = best > 0 ? `Best route: ${best} points` : 'No routes flown yet — the sky is waiting.';
      show('title');
    },
    showPause() {
      show('pause');
    },
    hideScreens() {
      show(null);
    },
    showEnd({ won, world }) {
      endTitle.textContent = won ? 'ROUTE COMPLETE!' : 'SHIP LOST';
      endTitle.classList.toggle('victory', won);
      endSubtitle.textContent = won
        ? 'Every shard delivered. The constellations shine a little brighter tonight.'
        : 'The void claims another courier. The route remembers your run, though.';
      const stats = [
        ['Score', String(world.score)],
        ['Best', String(world.best)],
        ['Deliveries', String(world.deliveries)],
        ['Shards gathered', String(world.collected)],
        ['Wisps dashed', String(world.wispsDashed)],
        ['Best combo', `x${world.maxCombo}`],
        ['Wave reached', String(world.wave)],
        ['Flight time', formatTime(world.elapsed)],
      ];
      endStats.innerHTML = '';
      for (const [label, value] of stats) {
        const row = document.createElement('div');
        row.className = 'stat-row';
        const labelElement = document.createElement('span');
        labelElement.textContent = label;
        const valueElement = document.createElement('strong');
        valueElement.textContent = value;
        row.append(labelElement, valueElement);
        endStats.append(row);
      }
      show('end');
    },
    // The wave banner follows the world's latest banner, once per wave.
    syncBanner(world) {
      const current = world.banner;
      if (current && current.at !== lastBannerAt) {
        lastBannerAt = current.at;
        bannerTitle.textContent = current.title;
        bannerSub.textContent = current.sub;
        banner.classList.add('visible');
        bannerUntil = world.elapsed + 2.6;
      } else if (banner.classList.contains('visible') && world.elapsed > bannerUntil) {
        banner.classList.remove('visible');
      }
    },
    setMuted(muted) {
      muteButton.textContent = muted ? '🔇 muted' : '🔊 sound';
      muteButton.setAttribute('aria-pressed', String(muted));
    },
  };
}
