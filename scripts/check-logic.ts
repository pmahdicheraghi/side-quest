import assert from 'node:assert';
import {
  createNimBoard,
  isValidNimMove,
  applyNimMove,
  isNimGameOver,
  calculateNimSum,
  getOptimalNimMove,
} from '../src/pages/nim/nim-logic.ts';
import {
  clampPosition,
  checkTugWinner,
  PULL_THRESHOLD,
} from '../src/pages/tug-of-war/tug-of-war-logic.ts';

// 1. Nim Logic Checks
const board = createNimBoard();
assert.deepStrictEqual(board, [3, 4, 5], 'Nim initial board should be [3, 4, 5]');

// 3 ^ 4 ^ 5 = 2 != 0
const initialNimSum = calculateNimSum(board);
assert.strictEqual(initialNimSum, 2, 'Initial Nim sum should be 2');

// Optimal move should leave Nim sum = 0
const optMove = getOptimalNimMove(board);
assert(isValidNimMove(board, optMove), 'Optimal move must be valid');
const nextBoard = applyNimMove(board, optMove);
assert.strictEqual(calculateNimSum(nextBoard), 0, 'Applying optimal move must reduce Nim sum to 0');

// Terminal state
assert.strictEqual(isNimGameOver([0, 0, 0]), true, 'All zero board is game over');
assert.strictEqual(isNimGameOver([0, 1, 0]), false, 'Non-zero board is not game over');

// 2. Tug of War Logic Checks
assert.strictEqual(clampPosition(0), 0);
assert.strictEqual(clampPosition(PULL_THRESHOLD + 20), PULL_THRESHOLD);
assert.strictEqual(clampPosition(-PULL_THRESHOLD - 20), -PULL_THRESHOLD);
assert.strictEqual(checkTugWinner(0), null);
assert.strictEqual(checkTugWinner(-PULL_THRESHOLD), 'X');
assert.strictEqual(checkTugWinner(PULL_THRESHOLD), 'O');

console.log('✓ All logic assertions passed successfully!');
