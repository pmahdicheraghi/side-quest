import type { GameDifficulty, Player } from '../../app/types';

export type ConnectCell = Player | '';

export const CONNECT_ROWS = 6;
export const CONNECT_COLUMNS = 7;
const CENTER_ORDER = [3, 2, 4, 1, 5, 0, 6];
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

export function createConnectBoard(): ConnectCell[] {
  return Array<ConnectCell>(CONNECT_ROWS * CONNECT_COLUMNS).fill('');
}

export function getConnectIndex(row: number, column: number): number {
  return row * CONNECT_COLUMNS + column;
}

export function getDropRow(board: ConnectCell[], column: number): number | null {
  for (let row = CONNECT_ROWS - 1; row >= 0; row -= 1) {
    if (!board[getConnectIndex(row, column)]) return row;
  }
  return null;
}

export function dropDisc(board: ConnectCell[], column: number, player: Player): { board: ConnectCell[]; index: number } | null {
  const row = getDropRow(board, column);
  if (row === null) return null;
  const index = getConnectIndex(row, column);
  const next = [...board];
  next[index] = player;
  return { board: next, index };
}

export function getConnectWinningLine(board: ConnectCell[]): number[] | null {
  for (let row = 0; row < CONNECT_ROWS; row += 1) {
    for (let column = 0; column < CONNECT_COLUMNS; column += 1) {
      const player = board[getConnectIndex(row, column)];
      if (!player) continue;

      for (const [rowStep, columnStep] of DIRECTIONS) {
        const endRow = row + rowStep * 3;
        const endColumn = column + columnStep * 3;
        if (endRow < 0 || endRow >= CONNECT_ROWS || endColumn < 0 || endColumn >= CONNECT_COLUMNS) continue;

        const line = Array.from({ length: 4 }, (_, offset) => getConnectIndex(row + rowStep * offset, column + columnStep * offset));
        if (line.every((index) => board[index] === player)) return line;
      }
    }
  }
  return null;
}

export function getConnectResult(board: ConnectCell[]): Player | 'draw' | null {
  const line = getConnectWinningLine(board);
  if (line) return board[line[0]] as Player;
  return board.every(Boolean) ? 'draw' : null;
}

export function chooseConnectBotColumn(board: ConnectCell[], difficulty: GameDifficulty): number {
  const legalColumns = getLegalColumns(board);
  if (!legalColumns.length) return 0;
  if (difficulty === 'easy') return randomChoice(legalColumns);

  const winningMove = findImmediateMove(board, 'O');
  if (winningMove !== null) return winningMove;
  const blockingMove = findImmediateMove(board, 'X');
  if (blockingMove !== null) return blockingMove;

  if (difficulty === 'normal') return weightedRandomColumn(legalColumns);
  return findBestColumn(board);
}

function getLegalColumns(board: ConnectCell[]): number[] {
  return CENTER_ORDER.filter((column) => getDropRow(board, column) !== null);
}

function findImmediateMove(board: ConnectCell[], player: Player): number | null {
  for (const column of getLegalColumns(board)) {
    const move = dropDisc(board, column, player);
    if (move && getConnectResult(move.board) === player) return column;
  }
  return null;
}

function weightedRandomColumn(legalColumns: number[]): number {
  const weights = [1, 2, 3, 4, 3, 2, 1];
  const choices = legalColumns.flatMap((column) => Array<number>(weights[column]).fill(column));
  return randomChoice(choices);
}

function findBestColumn(board: ConnectCell[]): number {
  let bestScore = -Infinity;
  let bestColumns: number[] = [];

  for (const column of getLegalColumns(board)) {
    const move = dropDisc(board, column, 'O');
    if (!move) continue;
    const score = minimax(move.board, 5, false, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestColumns = [column];
    } else if (score === bestScore) bestColumns.push(column);
  }

  return randomChoice(bestColumns);
}

function minimax(board: ConnectCell[], depth: number, maximizing: boolean, alpha: number, beta: number): number {
  const result = getConnectResult(board);
  if (result === 'O') return 1_000_000 + depth;
  if (result === 'X') return -1_000_000 - depth;
  if (result === 'draw') return 0;
  if (depth === 0) return evaluateBoard(board);

  if (maximizing) {
    let score = -Infinity;
    for (const column of getLegalColumns(board)) {
      const move = dropDisc(board, column, 'O');
      if (!move) continue;
      score = Math.max(score, minimax(move.board, depth - 1, false, alpha, beta));
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return score;
  }

  let score = Infinity;
  for (const column of getLegalColumns(board)) {
    const move = dropDisc(board, column, 'X');
    if (!move) continue;
    score = Math.min(score, minimax(move.board, depth - 1, true, alpha, beta));
    beta = Math.min(beta, score);
    if (alpha >= beta) break;
  }
  return score;
}

function evaluateBoard(board: ConnectCell[]): number {
  let score = 0;
  for (let row = 0; row < CONNECT_ROWS; row += 1) {
    const center = board[getConnectIndex(row, 3)];
    if (center === 'O') score += 7;
    if (center === 'X') score -= 7;
  }

  for (let row = 0; row < CONNECT_ROWS; row += 1) {
    for (let column = 0; column < CONNECT_COLUMNS; column += 1) {
      for (const [rowStep, columnStep] of DIRECTIONS) {
        const endRow = row + rowStep * 3;
        const endColumn = column + columnStep * 3;
        if (endRow < 0 || endRow >= CONNECT_ROWS || endColumn < 0 || endColumn >= CONNECT_COLUMNS) continue;
        const window = Array.from(
          { length: 4 },
          (_, offset) => board[getConnectIndex(row + rowStep * offset, column + columnStep * offset)],
        );
        score += scoreWindow(window);
      }
    }
  }
  return score;
}

function scoreWindow(window: ConnectCell[]): number {
  const bot = window.filter((cell) => cell === 'O').length;
  const human = window.filter((cell) => cell === 'X').length;
  const empty = 4 - bot - human;
  if (bot && human) return 0;
  if (bot === 3 && empty === 1) return 130;
  if (bot === 2 && empty === 2) return 16;
  if (human === 3 && empty === 1) return -160;
  if (human === 2 && empty === 2) return -18;
  return 0;
}

function randomChoice<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
