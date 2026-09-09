import type { GameDifficulty, Player } from '../../app/types';

export const PULL_THRESHOLD = 60;
export const TAP_POWER = 3.2;

export function clampPosition(pos: number): number {
  return Math.max(-PULL_THRESHOLD, Math.min(PULL_THRESHOLD, pos));
}

export function checkTugWinner(position: number): Player | null {
  if (position <= -PULL_THRESHOLD) return 'X';
  if (position >= PULL_THRESHOLD) return 'O';
  return null;
}

export function getBotTapDelay(difficulty: GameDifficulty, currentPos: number): number {
  // Easy: ~3.8 - 4.5 taps per second, occasional pause
  if (difficulty === 'easy') {
    if (Math.random() < 0.12) return 400 + Math.random() * 250;
    return 220 + Math.random() * 90;
  }

  // Normal: ~5.5 - 6.5 taps per second
  if (difficulty === 'normal') {
    if (Math.random() < 0.08) return 300 + Math.random() * 120;
    return 145 + Math.random() * 50;
  }

  // Hard: ~8 - 9.5 taps per second, clutch surge if player is winning
  const clutch = currentPos < -15 ? -25 : 0;
  return Math.max(90, 115 + clutch + Math.random() * 35);
}
