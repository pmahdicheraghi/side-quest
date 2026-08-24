import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import anime from 'animejs';
import { animateIn, motionEnabled } from '../../app/animation';
import { triggerHaptic } from '../../app/settings';
import { getRoundStarter, type GameSetup, type Player } from '../../app/types';
import { GameActions, GameHeader, MatchResultOverlay, ScoreStrip, Tip } from '../../components/react-layout';
import './tic-tac-toe.css';
import { useI18n } from '../../app/i18n';

type Cell = Player | '';
const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function TicTacToePage({ setup, onExit }: { setup: GameSetup; onExit: () => void }) {
  const { language, t } = useI18n();
  const mode = setup.mode;
  const [board, setBoard] = useState<Cell[]>(() => Array(9).fill(''));
  const [turn, setTurn] = useState<Player>('X');
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [scores, setScores] = useState<Record<Player, number>>({ X: 0, O: 0 });
  const [round, setRound] = useState(1);

  useEffect(() => animateIn('.score-strip, .tic-board-wrap, .game-actions, .tip'), []);
  useEffect(() => {
    if (!winningLine.length || !motionEnabled()) return;
    anime({ targets: '.tic-cell.is-winner', scale: [1, 0.96, 1], delay: anime.stagger(90), duration: 420, easing: 'easeOutCubic' });
  }, [winningLine]);

  useEffect(() => {
    if (winner || mode !== 'bot' || turn !== 'O') return;
    const timeout = window.setTimeout(() => {
      const open = board.map((value, index) => (value ? -1 : index)).filter((index) => index >= 0);
      if (!open.length) return;
      const choice = chooseBotMove(board, setup.difficulty, open);
      const next = [...board];
      next[choice] = 'O';
      setBoard(next);
      const result = getWinner(next);
      if (result) {
        setWinningLine(getWinningLine(next) ?? []);
        finishRound(result, false, setWinner, setScores);
      } else setTurn('X');
      if (motionEnabled()) anime({ targets: `.tic-cell[data-cell="${choice}"]`, scale: [0.88, 1], duration: 240, easing: 'easeOutBack' });
    }, 420);
    return () => window.clearTimeout(timeout);
  }, [board, mode, turn, winner]);

  const resetRound = (advanceRound = false) => {
    const nextRound = advanceRound ? round + 1 : round;
    if (advanceRound) setRound(nextRound);
    setBoard(Array(9).fill(''));
    setTurn(getRoundStarter(nextRound));
    setWinner(null);
    setWinningLine([]);
  };

  useEffect(() => {
    if (!winner || round >= setup.rounds) return;
    const timeout = window.setTimeout(() => resetRound(true), 1400);
    return () => window.clearTimeout(timeout);
  }, [winner, round, setup.rounds]);

  const play = (index: number) => {
    if (winner || board[index] || (mode === 'bot' && turn === 'O')) return;
    const next = [...board];
    next[index] = turn;
    setBoard(next);
    triggerHaptic();
    const result = getWinner(next);
    if (result) {
      setWinningLine(getWinningLine(next) ?? []);
      finishRound(result, !(mode === 'bot' && turn === 'O'), setWinner, setScores);
    } else setTurn(turn === 'X' ? 'O' : 'X');
    if (motionEnabled()) anime({ targets: `.tic-cell[data-cell="${index}"]`, scale: [0.88, 1], duration: 240, easing: 'easeOutBack' });
  };

  const matchComplete = Boolean(winner) && round >= setup.rounds;
  const playerName = (player: Player) => t(player === 'X' ? 'player1' : mode === 'bot' ? 'bot' : 'player2');
  const status = winner
    ? matchComplete
      ? scores.X === scores.O
        ? t('matchDraw')
        : t('winsMatch', { player: playerName(scores.X > scores.O ? 'X' : 'O') })
      : winner === 'draw'
        ? t('drawRound')
        : t('takesRound', { player: playerName(winner) })
    : t('playerTurn', { player: playerName(turn) });

  return (
    <main className="shell game-screen tic-screen">
      <GameHeader
        title={t('ticTacToe')}
        statIcon="grid"
        statLabel={t('roundLabel')}
        statValue={new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en').format(round)}
        statSuffix={<small>/ {new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en').format(setup.rounds)}</small>}
        onExit={onExit}
      />
      <ScoreStrip leftLabel={t('player1')} leftMark="×" rightLabel={t(mode === 'bot' ? 'bot' : 'player2')} rightMark="○" scores={scores} />
      <section className="tic-board-wrap">
        <div className="turn-label" role="status" aria-live="polite">
          {status}
        </div>
        <div className="tic-board" aria-label={t('ticBoard')}>
          {board.map((mark, index) => (
            <button
              type="button"
              className={`tic-cell ${mark.toLowerCase()} ${winningLine.includes(index) ? 'is-winner' : ''}`}
              data-cell={index}
              key={index}
              onClick={() => play(index)}
              disabled={Boolean(mark) || Boolean(winner) || (mode === 'bot' && turn === 'O')}
              aria-label={
                mark
                  ? t(winningLine.includes(index) ? 'cellWinning' : 'cellMarked', {
                      cell: new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en').format(index + 1),
                      player: playerName(mark),
                    })
                  : t('cellEmpty', { cell: new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en').format(index + 1) })
              }
            >
              {mark === 'X' ? '×' : mark === 'O' ? '○' : ''}
            </button>
          ))}
        </div>
      </section>
      <GameActions
        resetLabel={t(matchComplete ? 'matchComplete' : winner ? 'nextRoundStarting' : 'resetBoard')}
        onReset={() => resetRound(Boolean(winner))}
        onExit={onExit}
        resetDisabled={Boolean(winner)}
      />
      <Tip>{t('ticTip')}</Tip>
      {matchComplete && <MatchResultOverlay message={status} onComplete={onExit} />}
    </main>
  );
}

function finishRound(
  result: Player | 'draw',
  human: boolean,
  setWinner: (winner: Player | 'draw') => void,
  setScores: Dispatch<SetStateAction<Record<Player, number>>>,
) {
  setWinner(result);
  if (result !== 'draw') setScores((current) => ({ ...current, [result]: current[result] + 1 }));
  if (human) triggerHaptic([18, 35, 18]);
}

function findWinningMove(board: Cell[], player: Player) {
  const index = board.findIndex((cell, position) => {
    if (cell) return false;
    const test = [...board];
    test[position] = player;
    return getWinner(test) === player;
  });
  return index >= 0 ? index : undefined;
}
function randomChoice<T>(items: T[]) {
  return items.length ? items[Math.floor(Math.random() * items.length)] : undefined;
}

function chooseBotMove(board: Cell[], difficulty: GameSetup['difficulty'], open: number[]): number {
  if (difficulty === 'easy') return randomChoice(open)!;
  if (difficulty === 'hard') return findBestMove(board);
  return (
    findWinningMove(board, 'O') ??
    findWinningMove(board, 'X') ??
    (open.includes(4) ? 4 : undefined) ??
    randomChoice(open.filter((index) => [0, 2, 6, 8].includes(index))) ??
    randomChoice(open)!
  );
}

function findBestMove(board: Cell[]): number {
  let bestScore = -Infinity;
  let bestMoves: number[] = [];
  board.forEach((cell, index) => {
    if (cell) return;
    const next = [...board];
    next[index] = 'O';
    const score = minimax(next, false, 0);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [index];
    } else if (score === bestScore) bestMoves.push(index);
  });
  return randomChoice(bestMoves)!;
}

function minimax(board: Cell[], maximizing: boolean, depth: number): number {
  const result = getWinner(board);
  if (result === 'O') return 10 - depth;
  if (result === 'X') return depth - 10;
  if (result === 'draw') return 0;

  let bestScore = maximizing ? -Infinity : Infinity;
  board.forEach((cell, index) => {
    if (cell) return;
    const next = [...board];
    next[index] = maximizing ? 'O' : 'X';
    const score = minimax(next, !maximizing, depth + 1);
    bestScore = maximizing ? Math.max(bestScore, score) : Math.min(bestScore, score);
  });
  return bestScore;
}
function getWinner(board: Cell[]): Player | 'draw' | null {
  const line = getWinningLine(board);
  if (line) return board[line[0]] as Player;
  return board.every(Boolean) ? 'draw' : null;
}

function getWinningLine(board: Cell[]): number[] | null {
  return WINNING_LINES.find(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]) ?? null;
}
