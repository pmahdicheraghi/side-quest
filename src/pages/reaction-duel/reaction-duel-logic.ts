import type { GameDifficulty, Player } from '../../app/types';

export type ReactionPhase = 'idle' | 'waiting' | 'go' | 'result';
export type ReactionAttempt =
  | { kind: 'ignored' }
  | { kind: 'false-start'; falseStart: Player; winner: Player }
  | { kind: 'reaction'; reaction: number; winner: Player };

const BOT_REACTION_RANGES: Record<GameDifficulty, readonly [minimum: number, variance: number]> = {
  easy: [560, 360],
  normal: [320, 300],
  hard: [180, 170],
};

export function getReactionWaitDelay(random: () => number = Math.random): number {
  return 1200 + random() * 1800;
}

export function getBotReactionDelay(difficulty: GameDifficulty, random: () => number = Math.random): number {
  const [minimum, variance] = BOT_REACTION_RANGES[difficulty];
  return minimum + random() * variance;
}

export function resolveReactionAttempt(
  phase: ReactionPhase,
  player: Player,
  goAt: number,
  attemptedAt: number,
  hasReacted = false,
): ReactionAttempt {
  if (phase === 'waiting') {
    return { kind: 'false-start', falseStart: player, winner: otherPlayer(player) };
  }
  if (phase !== 'go' || hasReacted) return { kind: 'ignored' };
  return { kind: 'reaction', reaction: Math.max(1, Math.round(attemptedAt - goAt)), winner: player };
}

export function getReactionMatchWinner(scores: Record<Player, number>): Player | 'draw' {
  if (scores.X === scores.O) return 'draw';
  return scores.X > scores.O ? 'X' : 'O';
}

function otherPlayer(player: Player): Player {
  return player === 'X' ? 'O' : 'X';
}
