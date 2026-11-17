// Every sound is synthesized with WebAudio: no audio files ship with the game.
// Oscillators and filtered noise, shaped with short gain envelopes.

const MUTE_KEY = 'comet-courier-muted';

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    muted = false;
  }

  function ensure() {
    if (context) {
      if (context.state === 'suspended') void context.resume();
      return true;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    context = new AudioContextClass();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(context.destination);
    return true;
  }

  function tone({ frequency, endFrequency, type = 'sine', duration = 0.12, volume = 0.5, delay = 0 }) {
    if (!ensure() || muted) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    }
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function noise({ duration = 0.2, volume = 0.4, filterFrequency = 800, delay = 0 }) {
    if (!ensure() || muted) return;
    const start = context.currentTime + delay;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter).connect(gain).connect(master);
    source.start(start);
  }

  return {
    // Call from a user gesture so the browser lets sound start.
    unlock() {
      ensure();
    },
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      try {
        window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
      } catch {
        /* storage unavailable: mute still applies this session */
      }
      return muted;
    },
    click() {
      tone({ frequency: 660, endFrequency: 880, type: 'triangle', duration: 0.07, volume: 0.3 });
    },
    collect(combo) {
      const base = 520 + Math.min(combo, 5) * 90;
      tone({ frequency: base, endFrequency: base * 1.5, type: 'sine', duration: 0.1, volume: 0.4 });
    },
    deliver(combo) {
      const base = 620 + Math.min(combo, 5) * 60;
      tone({ frequency: base, type: 'triangle', duration: 0.12, volume: 0.45 });
      tone({ frequency: base * 1.25, type: 'triangle', duration: 0.14, volume: 0.4, delay: 0.07 });
      tone({ frequency: base * 1.5, type: 'triangle', duration: 0.18, volume: 0.4, delay: 0.14 });
    },
    dash() {
      noise({ duration: 0.22, volume: 0.25, filterFrequency: 2400 });
      tone({ frequency: 220, endFrequency: 520, type: 'sawtooth', duration: 0.16, volume: 0.12 });
    },
    hit() {
      noise({ duration: 0.3, volume: 0.5, filterFrequency: 500 });
      tone({ frequency: 160, endFrequency: 50, type: 'sawtooth', duration: 0.28, volume: 0.35 });
    },
    wispDown() {
      tone({ frequency: 340, endFrequency: 120, type: 'square', duration: 0.14, volume: 0.2 });
      noise({ duration: 0.12, volume: 0.2, filterFrequency: 1600 });
    },
    powerup() {
      tone({ frequency: 740, type: 'sine', duration: 0.1, volume: 0.4 });
      tone({ frequency: 988, type: 'sine', duration: 0.12, volume: 0.4, delay: 0.08 });
      tone({ frequency: 1319, type: 'sine', duration: 0.2, volume: 0.35, delay: 0.16 });
    },
    wave() {
      tone({ frequency: 196, endFrequency: 392, type: 'triangle', duration: 0.5, volume: 0.35 });
      tone({ frequency: 294, endFrequency: 588, type: 'sine', duration: 0.5, volume: 0.25, delay: 0.1 });
    },
    victory() {
      [523, 659, 784, 1047].forEach((frequency, i) => {
        tone({ frequency, type: 'triangle', duration: 0.32, volume: 0.45, delay: i * 0.13 });
      });
      tone({ frequency: 1319, type: 'sine', duration: 0.6, volume: 0.4, delay: 0.55 });
    },
    gameOver() {
      [392, 330, 262, 196].forEach((frequency, i) => {
        tone({ frequency, type: 'triangle', duration: 0.3, volume: 0.4, delay: i * 0.16 });
      });
    },
  };
}
