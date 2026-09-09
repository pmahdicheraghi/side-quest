import type { GameDifficulty } from '../../app/types';

export const INITIAL_NIM_PILES: readonly number[] = [3, 4, 5];

export interface NimMove {
  row: number;
  count: number;
}

export function createNimBoard(): number[] {
  return [...INITIAL_NIM_PILES];
}

export function isValidNimMove(board: readonly number[], move: NimMove): boolean {
  if (move.row < 0 || move.row >= board.length) return false;
  if (move.count < 1 || move.count > board[move.row]) return false;
  return true;
}

export function applyNimMove(board: readonly number[], move: NimMove): number[] {
  if (!isValidNimMove(board, move)) return [...board];
  const next = [...board];
  next[move.row] -= move.count;
  return next;
}

export function isNimGameOver(board: readonly number[]): boolean {
  return board.every((count) => count === 0);
}

export function calculateNimSum(board: readonly number[]): number {
  return board.reduce((acc, count) => acc ^ count, 0);
}

export function getOptimalNimMove(board: readonly number[]): NimMove {
  const nimSum = calculateNimSum(board);

  if (nimSum !== 0) {
    // Find a pile where pile ^ nimSum < pile
    for (let i = 0; i < board.length; i++) {
      const target = board[i] ^ nimSum;
      if (target < board[i]) {
        return { row: i, count: board[i] - target };
      }
    }
  }

  // If already in losing state (nimSum === 0) or no optimal found: take 1 from largest pile
  let largestRow = 0;
  let maxCount = -1;
  for (let i = 0; i < board.length; i++) {
    if (board[i] > maxCount) {
      maxCount = board[i];
      largestRow = i;
    }
  }

  return { row: largestRow, count: 1 };
}

export function getRandomNimMove(board: readonly number[]): NimMove {
  const availableRows: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] > 0) availableRows.push(i);
  }

  if (availableRows.length === 0) return { row: 0, count: 0 };

  const row = availableRows[Math.floor(Math.random() * availableRows.length)];
  const maxTake = board[row];
  const count = Math.floor(Math.random() * maxTake) + 1;

  return { row, count };
}

export function chooseNimBotMove(board: readonly number[], difficulty: GameDifficulty): NimMove {
  if (difficulty === 'easy') {
    return getRandomNimMove(board);
  }

  if (difficulty === 'normal') {
    // 50% optimal, 50% random
    if (Math.random() < 0.5) {
      return getOptimalNimMove(board);
    }
    return getRandomNimMove(board);
  }

  // Hard: 100% optimal
  return getOptimalNimMove(board);
}
