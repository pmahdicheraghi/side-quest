import type { GameDifficulty, Player } from '../../app/types';

export type TicCell = Player | '';
export type TicResult = Player | null;
export type TicState = {
  board: TicCell[];
  moveHistory: Record<Player, number[]>;
};

const MAX_MARKS_PER_PLAYER = 3;
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

export function createTicState(): TicState {
  return {
    board: Array<TicCell>(9).fill(''),
    moveHistory: { X: [], O: [] },
  };
}

export function playTicMove(state: TicState, index: number, player: Player): TicState | null {
  if (index < 0 || index >= state.board.length || state.board[index]) return null;

  const board = [...state.board];
  const playerHistory = [...state.moveHistory[player], index];
  if (playerHistory.length > MAX_MARKS_PER_PLAYER) {
    const removed = playerHistory.shift();
    if (removed !== undefined) board[removed] = '';
  }
  board[index] = player;

  return {
    board,
    moveHistory: {
      X: player === 'X' ? playerHistory : [...state.moveHistory.X],
      O: player === 'O' ? playerHistory : [...state.moveHistory.O],
    },
  };
}

export function getExpiringTicCell(state: TicState, player: Player): number | null {
  return state.moveHistory[player].length === MAX_MARKS_PER_PLAYER ? state.moveHistory[player][0] : null;
}

export function getTicWinningLine(board: TicCell[]): number[] | null {
  const line = WINNING_LINES.find(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]);
  return line ? [...line] : null;
}

export function getTicResult(state: TicState): TicResult {
  const line = getTicWinningLine(state.board);
  return line ? (state.board[line[0]] as Player) : null;
}

export function chooseTicBotMove(state: TicState, difficulty: GameDifficulty, random: () => number = Math.random): number {
  const open = getOpenCells(state.board);
  if (!open.length) throw new Error('Cannot choose a move on a completed board.');
  if (difficulty === 'easy') return randomChoice(open, random);
  if (difficulty === 'hard') return findBestMove(state, random);

  return (
    findWinningMove(state, 'O') ??
    findWinningMove(state, 'X') ??
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

function findWinningMove(state: TicState, player: Player): number | undefined {
  return getOpenCells(state.board).find((index) => {
    const next = playTicMove(state, index, player);
    return next !== null && getTicResult(next) === player;
  });
}

function findBestMove(state: TicState, random: () => number): number {
  const immediateWin = findWinningMove(state, 'O');
  if (immediateWin !== undefined) return immediateWin;

  let bestScore = -Infinity;
  let bestMoves: number[] = [];
  for (const index of orderedOpenCells(state.board)) {
    const next = playTicMove(state, index, 'O');
    if (!next) continue;
    const score = minimax(next, false, 8, -Infinity, Infinity, new Set());
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [index];
    } else if (score === bestScore) bestMoves.push(index);
  }
  return randomChoice(bestMoves, random);
}

function minimax(state: TicState, maximizing: boolean, depth: number, alpha: number, beta: number, path: Set<string>): number {
  const result = getTicResult(state);
  if (result === 'O') return 1_000 + depth;
  if (result === 'X') return -1_000 - depth;
  if (depth === 0) return evaluateState(state);

  const key = stateKey(state, maximizing);
  if (path.has(key)) return 0;
  const nextPath = new Set(path);
  nextPath.add(key);

  if (maximizing) {
    let score = -Infinity;
    for (const index of orderedOpenCells(state.board)) {
      const next = playTicMove(state, index, 'O');
      if (!next) continue;
      score = Math.max(score, minimax(next, false, depth - 1, alpha, beta, nextPath));
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return score;
  }

  let score = Infinity;
  for (const index of orderedOpenCells(state.board)) {
    const next = playTicMove(state, index, 'X');
    if (!next) continue;
    score = Math.min(score, minimax(next, true, depth - 1, alpha, beta, nextPath));
    beta = Math.min(beta, score);
    if (alpha >= beta) break;
  }
  return score;
}

function evaluateState(state: TicState): number {
  let score = 0;
  for (const line of WINNING_LINES) {
    const bot = line.filter((index) => state.board[index] === 'O').length;
    const human = line.filter((index) => state.board[index] === 'X').length;
    if (bot && human) continue;
    if (bot === 2) score += 18;
    else if (bot === 1) score += 3;
    if (human === 2) score -= 20;
    else if (human === 1) score -= 3;
  }
  if (state.board[4] === 'O') score += 4;
  if (state.board[4] === 'X') score -= 4;
  return score;
}

function orderedOpenCells(board: TicCell[]): number[] {
  const preference = [4, 0, 2, 6, 8, 1, 3, 5, 7];
  return preference.filter((index) => !board[index]);
}

function stateKey(state: TicState, maximizing: boolean): string {
  return `${state.board.map((cell) => cell || '-').join('')}:${state.moveHistory.X.join('')}:${state.moveHistory.O.join('')}:${maximizing ? 'O' : 'X'}`;
}

function randomChoiceOrUndefined<T>(items: T[], random: () => number): T | undefined {
  return items.length ? randomChoice(items, random) : undefined;
}

function randomChoice<T>(items: T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}
