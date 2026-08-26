import type { GameDifficulty, Player } from '../../app/types';

export const REVERSI_SIZE = 8;
export const REVERSI_CELL_COUNT = 64;

export type ReversiCell = Player | null;

const DIRECTIONS: readonly [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export function createReversiBoard(): ReversiCell[] {
  const board: ReversiCell[] = Array.from({ length: REVERSI_CELL_COUNT }, () => null);
  // Standard opening: Row 3 Col 3 = O, Row 3 Col 4 = X, Row 4 Col 3 = X, Row 4 Col 4 = O
  board[3 * REVERSI_SIZE + 3] = 'O';
  board[3 * REVERSI_SIZE + 4] = 'X';
  board[4 * REVERSI_SIZE + 3] = 'X';
  board[4 * REVERSI_SIZE + 4] = 'O';
  return board;
}

export function indexToCoord(index: number): [row: number, col: number] {
  return [Math.floor(index / REVERSI_SIZE), index % REVERSI_SIZE];
}

export function coordToIndex(row: number, col: number): number {
  return row * REVERSI_SIZE + col;
}

export function getFlipsForMove(board: readonly ReversiCell[], index: number, player: Player): number[] {
  if (index < 0 || index >= REVERSI_CELL_COUNT || board[index] !== null) {
    return [];
  }

  const [startRow, startCol] = indexToCoord(index);
  const opponent: Player = player === 'X' ? 'O' : 'X';
  const totalFlips: number[] = [];

  for (const [dr, dc] of DIRECTIONS) {
    let r = startRow + dr;
    let c = startCol + dc;
    const directionFlips: number[] = [];

    while (r >= 0 && r < REVERSI_SIZE && c >= 0 && c < REVERSI_SIZE) {
      const currentIndex = coordToIndex(r, c);
      const currentCell = board[currentIndex];

      if (currentCell === opponent) {
        directionFlips.push(currentIndex);
      } else if (currentCell === player) {
        if (directionFlips.length > 0) {
          totalFlips.push(...directionFlips);
        }
        break;
      } else {
        // Empty cell breaks the line
        break;
      }

      r += dr;
      c += dc;
    }
  }

  return totalFlips;
}

export function isValidMove(board: readonly ReversiCell[], index: number, player: Player): boolean {
  return getFlipsForMove(board, index, player).length > 0;
}

export function getValidMoves(board: readonly ReversiCell[], player: Player): number[] {
  const validMoves: number[] = [];
  for (let i = 0; i < REVERSI_CELL_COUNT; i++) {
    if (board[i] === null && isValidMove(board, i, player)) {
      validMoves.push(i);
    }
  }
  return validMoves;
}

export interface MoveResult {
  board: ReversiCell[];
  flippedIndices: number[];
}

export function makeMove(board: readonly ReversiCell[], index: number, player: Player): MoveResult | null {
  const flippedIndices = getFlipsForMove(board, index, player);
  if (flippedIndices.length === 0) return null;

  const nextBoard = [...board];
  nextBoard[index] = player;
  for (const flipped of flippedIndices) {
    nextBoard[flipped] = player;
  }

  return { board: nextBoard, flippedIndices };
}

export function countDiscs(board: readonly ReversiCell[]): Record<Player, number> {
  let x = 0;
  let o = 0;
  for (let i = 0; i < REVERSI_CELL_COUNT; i++) {
    if (board[i] === 'X') x++;
    else if (board[i] === 'O') o++;
  }
  return { X: x, O: o };
}

export function isBoardFull(board: readonly ReversiCell[]): boolean {
  return board.every((cell) => cell !== null);
}

export function getReversiResult(board: readonly ReversiCell[]): Player | 'draw' | null {
  const hasMovesX = getValidMoves(board, 'X').length > 0;
  const hasMovesO = getValidMoves(board, 'O').length > 0;

  if (hasMovesX || hasMovesO) {
    return null;
  }

  const { X, O } = countDiscs(board);
  if (X > O) return 'X';
  if (O > X) return 'O';
  return 'draw';
}

const POSITION_WEIGHTS: readonly number[] = [
  120, -25,  20,   5,   5,  20, -25, 120,
  -25, -45,  -5,  -5,  -5,  -5, -45, -25,
   20,  -5,  15,   3,   3,  15,  -5,  20,
    5,  -5,   3,   1,   1,   3,  -5,   5,
    5,  -5,   3,   1,   1,   3,  -5,   5,
   20,  -5,  15,   3,   3,  15,  -5,  20,
  -25, -45,  -5,  -5,  -5,  -5, -45, -25,
  120, -25,  20,   5,   5,  20, -25, 120,
];

const CORNERS: readonly number[] = [0, 7, 56, 63];

function evaluateBoard(board: readonly ReversiCell[]): number {
  let score = 0;
  const emptyCount = board.filter((c) => c === null).length;
  const isEndGame = emptyCount <= 10;

  if (isEndGame) {
    const { X, O } = countDiscs(board);
    return (O - X) * 100;
  }

  for (let i = 0; i < REVERSI_CELL_COUNT; i++) {
    const cell = board[i];
    if (cell === null) continue;

    let weight = POSITION_WEIGHTS[i];

    // If a corner is claimed, adjacent penalty squares become stable
    if (weight < 0) {
      const [r, c] = indexToCoord(i);
      const nearestCornerRow = r <= 1 ? 0 : 7;
      const nearestCornerCol = c <= 1 ? 0 : 7;
      const cornerIndex = coordToIndex(nearestCornerRow, nearestCornerCol);
      if (board[cornerIndex] === cell) {
        weight = 10;
      }
    }

    score += cell === 'O' ? weight : -weight;
  }

  // Mobility bonus: Having more move options than opponent
  const oMoves = getValidMoves(board, 'O').length;
  const xMoves = getValidMoves(board, 'X').length;
  score += (oMoves - xMoves) * 10;

  return score;
}

function minimax(
  board: readonly ReversiCell[],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
): number {
  const currentTurn: Player = isMaximizing ? 'O' : 'X';
  const validMoves = getValidMoves(board, currentTurn);

  if (depth === 0) {
    return evaluateBoard(board);
  }

  if (validMoves.length === 0) {
    const opponent: Player = isMaximizing ? 'X' : 'O';
    const opponentMoves = getValidMoves(board, opponent);
    if (opponentMoves.length === 0) {
      // Game over
      const { X, O } = countDiscs(board);
      return O > X ? 10000 + (O - X) : O < X ? -10000 + (O - X) : 0;
    }
    // Pass turn to opponent
    return minimax(board, depth - 1, alpha, beta, !isMaximizing);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of validMoves) {
      const next = makeMove(board, move, 'O');
      if (!next) continue;
      const evaluation = minimax(next.board, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of validMoves) {
      const next = makeMove(board, move, 'X');
      if (!next) continue;
      const evaluation = minimax(next.board, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function chooseReversiBotMove(board: readonly ReversiCell[], difficulty: GameDifficulty): number | null {
  const validMoves = getValidMoves(board, 'O');
  if (validMoves.length === 0) return null;

  if (difficulty === 'easy') {
    // Pick random valid move
    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return validMoves[randomIndex];
  }

  if (difficulty === 'normal') {
    // Greedy heuristic: prefer corners, high flips, avoid worst C/X squares unless safe
    let bestMove = validMoves[0];
    let bestScore = -Infinity;

    for (const move of validMoves) {
      const flips = getFlipsForMove(board, move, 'O');
      let score = flips.length * 2 + POSITION_WEIGHTS[move];

      if (CORNERS.includes(move)) {
        score += 150;
      }

      // Add a touch of variety
      score += Math.random() * 4;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  // Hard: Minimax depth 4 (or depth 6 if remaining empty spaces <= 8)
  const emptyCount = board.filter((c) => c === null).length;
  const searchDepth = emptyCount <= 8 ? 6 : 4;

  let bestMove = validMoves[0];
  let maxEval = -Infinity;

  for (const move of validMoves) {
    const next = makeMove(board, move, 'O');
    if (!next) continue;
    const evaluation = minimax(next.board, searchDepth - 1, -Infinity, Infinity, false);
    if (evaluation > maxEval) {
      maxEval = evaluation;
      bestMove = move;
    }
  }

  return bestMove;
}
