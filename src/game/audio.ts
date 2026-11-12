// Synthesised sound with Web Audio: no audio files. Starts only after a user gesture (autoplay policy).
import { store } from './storage';

let ctx: AudioContext | null = null;
let enabled = store.get('sound', true);
let ambientNode: AudioBufferSourceNode | null = null;

export const soundEnabled = (): boolean => enabled;
export function setSound(on: boolean): void {
  enabled = on;
  store.set('sound', on);
  if (!on) stopAmbientWind();
  else startAmbientWind();
}

export function startAmbientWind(): void {
  if (!enabled) return;
  const a = ac();
  if (!a || ambientNode) return;
  try {
    const dur = 4;
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // brownian motion for deep planetary wind
      d[i] = last * 3.5;
    }
    const src = a.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = a.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    const g = a.createGain();
    g.gain.setValueAtTime(0.018, a.currentTime);
    src.connect(filter).connect(g).connect(a.destination);
    src.start();
    ambientNode = src;
  } catch {
    // Web Audio blocked or not ready
  }
}

export function stopAmbientWind(): void {
  if (ambientNode) {
    try {
      ambientNode.stop();
    } catch {
      // ignore stop errors
    }
    ambientNode = null;
  }
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.08, when = 0): void {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur: number, gain = 0.05): void {
  const a = ac();
  if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  let x = 1;
  for (let i = 0; i < d.length; i++) {
    x = (x * 16807) % 2147483647; // deterministic noise, no Math.random needed
    d[i] = ((x / 2147483647) * 2 - 1) * (1 - i / d.length);
  }
  const src = a.createBufferSource();
  const g = a.createGain();
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1800;
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

export const sfx = {
  click: (): void => { startAmbientWind(); tone(660, 0.06, 'triangle', 0.05); },
  toggle: (): void => { startAmbientWind(); tone(780, 0.04, 'sine', 0.04); tone(1175, 0.04, 'triangle', 0.03, 0.03); },
  vent: (): void => { noise(0.22, 0.025); tone(440, 0.12, 'sine', 0.02); },
  relay: (): void => { tone(988, 0.05, 'triangle', 0.04); tone(1480, 0.08, 'sine', 0.04, 0.04); },
  radar: (): void => { tone(1760, 0.07, 'sine', 0.05); tone(2200, 0.05, 'sine', 0.03, 0.03); },
  shield: (): void => { tone(196, 0.2, 'triangle', 0.07); tone(130, 0.28, 'sine', 0.07, 0.06); },
  step: (): void => { noise(0.08, 0.02); tone(320, 0.04, 'sine', 0.02); },
  endSol: (): void => { tone(392, 0.12, 'sine', 0.07); tone(523, 0.18, 'sine', 0.07, 0.1); },
  radio: (): void => { noise(0.35, 0.04); tone(880, 0.08, 'square', 0.03, 0.3); tone(1175, 0.08, 'square', 0.03, 0.42); },
  alarm: (): void => { for (let i = 0; i < 3; i++) tone(740, 0.14, 'sawtooth', 0.05, i * 0.22); },
  fail: (): void => { tone(330, 0.3, 'sawtooth', 0.06); tone(220, 0.5, 'sawtooth', 0.06, 0.25); },
  win: (): void => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.06, i * 0.12)); },
};
