import type { GameDifficulty, Player } from '../../app/types';

export type TicCell = Player | '';
export type TicResult = Player | 'draw' | null;

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

export function createTicBoard(): TicCell[] {
  return Array<TicCell>(9).fill('');
}

export function playTicMove(board: TicCell[], index: number, player: Player): TicCell[] | null {
  if (index < 0 || index >= board.length || board[index]) return null;
  const next = [...board];
  next[index] = player;
  return next;
}

export function getTicWinningLine(board: TicCell[]): number[] | null {
  const line = WINNING_LINES.find(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]);
  return line ? [...line] : null;
}

export function getTicResult(board: TicCell[]): TicResult {
  const line = getTicWinningLine(board);
  if (line) return board[line[0]] as Player;
  return board.every(Boolean) ? 'draw' : null;
}

export function chooseTicBotMove(board: TicCell[], difficulty: GameDifficulty, random: () => number = Math.random): number {
  const open = getOpenCells(board);
  if (!open.length) throw new Error('Cannot choose a move on a completed board.');
  if (difficulty === 'easy') return randomChoice(open, random);
  if (difficulty === 'hard') return findBestMove(board, random);

  return (
    findWinningMove(board, 'O') ??
    findWinningMove(board, 'X') ??
    (open.includes(4) ? 4 : undefined) ??
    randomChoiceOrUndefined(
      open.filter((index) => [0, 2, 6, 8].includes(index)),
      random,
    ) ??
    randomChoice(open, random)
  );
}

function getOpenCells(board: TicCell[]): number[] {
  return board.flatMap((cell, index) => (cell ? [] : [index]));
}

function findWinningMove(board: TicCell[], player: Player): number | undefined {
  return getOpenCells(board).find((index) => {
    const next = playTicMove(board, index, player);
    return next !== null && getTicResult(next) === player;
  });
}

function findBestMove(board: TicCell[], random: () => number): number {
  let bestScore = -Infinity;
  let bestMoves: number[] = [];

  getOpenCells(board).forEach((index) => {
    const next = playTicMove(board, index, 'O');
    if (!next) return;
    const score = minimax(next, false, 0);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [index];
    } else if (score === bestScore) bestMoves.push(index);
  });
  return randomChoice(bestMoves, random);
}

function minimax(board: TicCell[], maximizing: boolean, depth: number): number {
  const result = getTicResult(board);
  if (result === 'O') return 10 - depth;
  if (result === 'X') return depth - 10;
  if (result === 'draw') return 0;

  let bestScore = maximizing ? -Infinity : Infinity;
  getOpenCells(board).forEach((index) => {
    const next = playTicMove(board, index, maximizing ? 'O' : 'X');
    if (!next) return;
    const score = minimax(next, !maximizing, depth + 1);
    bestScore = maximizing ? Math.max(bestScore, score) : Math.min(bestScore, score);
  });
  return bestScore;
}

function randomChoiceOrUndefined<T>(items: T[], random: () => number): T | undefined {
  return items.length ? randomChoice(items, random) : undefined;
}

function randomChoice<T>(items: T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}
