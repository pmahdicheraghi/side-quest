import { loadSettings } from './settings';

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

export function unlockAudio(): void {
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume();
  }
}

function canPlay(): boolean {
  return loadSettings().music && typeof window !== 'undefined';
}

function tone(freq: number, type: OscillatorType, duration: number, gainVal = 0.12, startTimeOffset = 0): void {
  if (!canPlay()) return;
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime + startTimeOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(gainVal, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);
}

export function playTapSound(): void {
  tone(580, 'sine', 0.04, 0.08);
}

export function playMoveSound(isPlayerTwo = false): void {
  tone(isPlayerTwo ? 420 : 540, 'triangle', 0.07, 0.1);
}

export function playPairSound(): void {
  tone(523.25, 'triangle', 0.08, 0.1, 0);
  tone(659.25, 'triangle', 0.1, 0.1, 0.07);
}

export function playWinSound(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    tone(freq, 'triangle', 0.14, 0.12, idx * 0.08);
  });
}

export function playErrorSound(): void {
  tone(160, 'sawtooth', 0.09, 0.12, 0);
  tone(130, 'sawtooth', 0.12, 0.12, 0.08);
}
