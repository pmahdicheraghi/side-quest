import { useEffect, useState } from 'react';
import anime from 'animejs';
import { animateIn, motionEnabled } from '../../app/animation';
import { triggerHaptic } from '../../app/settings';
import { getRoundStarter, type GameSetup, type Player } from '../../app/types';
import { GameActions, GameHeader, MatchResultOverlay, ScoreStrip, Tip } from '../../components/react-layout';
import './tic-tac-toe.css';
import { useI18n } from '../../app/i18n';
import {
  chooseTicBotMove,
  createTicState,
  getExpiringTicCell,
  getTicResult,
  getTicWinningLine,
  playTicMove,
  type TicResult,
  type TicState,
} from './tic-tac-toe-logic';

export function TicTacToePage({ setup, onExit }: { setup: GameSetup; onExit: () => void }) {
  const { language, t } = useI18n();
  const mode = setup.mode;
  const [game, setGame] = useState<TicState>(createTicState);
  const [turn, setTurn] = useState<Player>('X');
  const [winner, setWinner] = useState<TicResult>(null);
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [scores, setScores] = useState<Record<Player, number>>({ X: 0, O: 0 });
  const [round, setRound] = useState(1);

  const board = game.board;

  const finishRound = (result: Exclude<TicResult, null>, finalGame: TicState, human: boolean) => {
    setWinner(result);
    setWinningLine(getTicWinningLine(finalGame.board) ?? []);
    setScores((current) => ({ ...current, [result]: current[result] + 1 }));
    if (human) triggerHaptic([18, 35, 18]);
  };

  useEffect(() => animateIn('.score-strip, .tic-board-wrap, .game-actions, .tip'), []);
  useEffect(() => {
    if (!winningLine.length || !motionEnabled()) return;
    anime({ targets: '.tic-cell.is-winner', scale: [1, 0.96, 1], delay: anime.stagger(90), duration: 420, easing: 'easeOutCubic' });
  }, [winningLine]);

  useEffect(() => {
    if (winner || mode !== 'bot' || turn !== 'O') return;
    const timeout = window.setTimeout(() => {
      const choice = chooseTicBotMove(game, setup.difficulty);
      const next = playTicMove(game, choice, 'O');
      if (!next) return;
      setGame(next);
      const result = getTicResult(next);
      if (result) {
        finishRound(result, next, false);
      } else setTurn('X');
      if (motionEnabled()) anime({ targets: `.tic-cell[data-cell="${choice}"]`, scale: [0.88, 1], duration: 240, easing: 'easeOutBack' });
    }, 420);
    return () => window.clearTimeout(timeout);
  }, [game, mode, setup.difficulty, turn, winner]);

  const resetRound = (advanceRound = false) => {
    const nextRound = advanceRound ? round + 1 : round;
    if (advanceRound) setRound(nextRound);
    setGame(createTicState());
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
    const next = playTicMove(game, index, turn);
    if (!next) return;
    setGame(next);
    triggerHaptic();
    const result = getTicResult(next);
    if (result) {
      finishRound(result, next, !(mode === 'bot' && turn === 'O'));
    } else setTurn(turn === 'X' ? 'O' : 'X');
    if (motionEnabled()) anime({ targets: `.tic-cell[data-cell="${index}"]`, scale: [0.88, 1], duration: 240, easing: 'easeOutBack' });
  };

  const matchComplete = Boolean(winner) && round >= setup.rounds;
  const expiringCells = [getExpiringTicCell(game, 'X'), getExpiringTicCell(game, 'O')];
  const playerName = (player: Player) => t(player === 'X' ? 'player1' : mode === 'bot' ? 'bot' : 'player2');
  const status = winner
    ? matchComplete
      ? scores.X === scores.O
        ? t('matchDraw')
        : t('winsMatch', { player: playerName(scores.X > scores.O ? 'X' : 'O') })
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
              className={`tic-cell ${mark.toLowerCase()} ${winningLine.includes(index) ? 'is-winner' : ''} ${expiringCells.includes(index) ? 'is-expiring' : ''}`}
              data-cell={index}
              key={index}
              onClick={() => play(index)}
              disabled={Boolean(mark) || Boolean(winner) || (mode === 'bot' && turn === 'O')}
              aria-label={
                mark
                  ? t(winningLine.includes(index) ? 'cellWinning' : expiringCells.includes(index) ? 'cellExpiring' : 'cellMarked', {
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
