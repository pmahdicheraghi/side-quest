import assert from 'node:assert/strict';
import { playTapSound, playMoveSound, playPairSound, playWinSound, playErrorSound, unlockAudio } from './sfx.ts';

// Verify all SFX exports are callable in headless / non-browser environment without throwing
assert.doesNotThrow(() => {
  unlockAudio();
  playTapSound();
  playMoveSound(false);
  playMoveSound(true);
  playPairSound();
  playWinSound();
  playErrorSound();
});

console.log('sfx.check.ts: All SFX checks passed.');
