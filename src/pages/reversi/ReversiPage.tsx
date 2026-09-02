import { useEffect, useMemo, useRef, useState } from 'react';
import anime from 'animejs';
import { animateIn, motionEnabled } from '../../app/animation';
import { useI18n } from '../../app/i18n';
import { triggerHaptic } from '../../app/settings';
import { getRoundStarter, type GameSetup, type Player } from '../../app/types';
import { GameHeader, MatchResultToast, ScoreStrip, Tip } from '../../components/react-layout';
import { playMoveSound, playPairSound } from '../../app/sfx';
import { recordMatchResult } from '../../app/stats';
import { chooseReversiBotMove, countDiscs, createReversiBoard, getValidMoves, makeMove, type ReversiCell } from './reversi-logic';
import './reversi.css';

const FLIP_SETTLE_MS = 380;

export function ReversiPage({ setup, onExit }: { setup: GameSetup; onExit: () => void }) {
  const { language, t } = useI18n();
  const mode = setup.mode;
  const [board, setBoard] = useState<ReversiCell[]>(createReversiBoard);
  const [turn, setTurn] = useState<Player>('X');
  const [roundWinner, setRoundWinner] = useState<Player | 'draw' | null>(null);
  const [flippedDiscs, setFlippedDiscs] = useState<number[]>([]);
  const [passMessage, setPassMessage] = useState<string | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [matchScores, setMatchScores] = useState<Record<Player, number>>({ X: 0, O: 0 });
  const [round, setRound] = useState(1);
  const settleTimeoutRef = useRef<number | null>(null);
  const passTimeoutRef = useRef<number | null>(null);
  const numberFormatter = new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en');

  const validMoves = useMemo(() => {
    if (roundWinner || isSettling) return [];
    if (mode === 'bot' && turn === 'O') return [];
    return getValidMoves(board, turn);
  }, [board, isSettling, mode, roundWinner, turn]);

  const discCounts = useMemo(() => countDiscs(board), [board]);

  useEffect(() => animateIn('.score-strip, .reversi-board-wrap, .tip'), []);

  // Animate flipped discs
  useEffect(() => {
    if (!flippedDiscs.length || !motionEnabled()) return;
    anime({
      targets: flippedDiscs.map((idx) => `.reversi-cell[data-index="${idx}"] .reversi-disc`).join(', '),
      scale: [0.65, 1],
      opacity: [0.4, 1],
      delay: anime.stagger(50),
      duration: 320,
      easing: 'easeOutCubic',
    });
  }, [flippedDiscs]);

  // Cleanup timers on unmount
  useEffect(
    () => () => {
      if (settleTimeoutRef.current !== null) window.clearTimeout(settleTimeoutRef.current);
      if (passTimeoutRef.current !== null) window.clearTimeout(passTimeoutRef.current);
    },
    [],
  );

  // Auto-advance to next round
  useEffect(() => {
    if (!roundWinner || round >= setup.rounds) return;
    const timeout = window.setTimeout(() => resetRound(true), 1550);
    return () => window.clearTimeout(timeout);
  }, [round, roundWinner, setup.rounds]);

  const clearTimers = () => {
    if (settleTimeoutRef.current !== null) {
      window.clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = null;
    }
    if (passTimeoutRef.current !== null) {
      window.clearTimeout(passTimeoutRef.current);
      passTimeoutRef.current = null;
    }
  };

  const finishRound = (finalBoard: ReversiCell[]) => {
    const counts = countDiscs(finalBoard);
    const result: Player | 'draw' = counts.X === counts.O ? 'draw' : counts.X > counts.O ? 'X' : 'O';
    setRoundWinner(result);
    setIsSettling(false);
    const nextScores = {
      ...matchScores,
      ...(result !== 'draw' ? { [result]: matchScores[result] + 1 } : {}),
    };
    if (result !== 'draw') {
      playPairSound();
      setMatchScores(nextScores);
    }
    if (round >= setup.rounds) {
      const outcome = nextScores.X === nextScores.O ? 'draw' : nextScores.X > nextScores.O ? 'win' : 'loss';
      recordMatchResult('reversi', outcome);
    }
  };

  const handleTurnAfterMove = (nextBoard: ReversiCell[], player: Player) => {
    const opponent: Player = player === 'X' ? 'O' : 'X';
    const opponentValidMoves = getValidMoves(nextBoard, opponent);
    const playerValidMoves = getValidMoves(nextBoard, player);

    if (opponentValidMoves.length > 0) {
      setPassMessage(null);
      setTurn(opponent);
    } else if (playerValidMoves.length > 0) {
      // Opponent must pass
      const opponentName = playerName(opponent);
      setPassMessage(t('reversiPassed', { player: opponentName }));
      if (passTimeoutRef.current !== null) window.clearTimeout(passTimeoutRef.current);
      passTimeoutRef.current = window.setTimeout(() => {
        passTimeoutRef.current = null;
        setPassMessage(null);
      }, 2200);
      // Current player continues
      setTurn(player);
    } else {
      // Neither player has legal moves — round is over
      setPassMessage(null);
      setIsSettling(true);
      clearTimers();
      settleTimeoutRef.current = window.setTimeout(
        () => {
          settleTimeoutRef.current = null;
          finishRound(nextBoard);
        },
        motionEnabled() ? FLIP_SETTLE_MS : 0,
      );
    }
  };

  const playCell = (index: number, player: Player = turn, human = true) => {
    if (roundWinner || isSettling || (mode === 'bot' && human && turn === 'O')) return;

    const moveResult = makeMove(board, index, player);
    if (!moveResult) return;

    setBoard(moveResult.board);
    setFlippedDiscs(moveResult.flippedIndices);
    playMoveSound(player === 'O');

    if (human) {
      triggerHaptic(moveResult.flippedIndices.length > 2 ? [14, 28, 14] : 8);
    }

    handleTurnAfterMove(moveResult.board, player);
  };

  // Bot turn effect
  useEffect(() => {
    if (roundWinner || isSettling || mode !== 'bot' || turn !== 'O') return;

    const botTimer = window.setTimeout(() => {
      const botMove = chooseReversiBotMove(board, setup.difficulty);
      if (botMove !== null) {
        playCell(botMove, 'O', false);
      } else {
        // Bot has no moves
        const humanMoves = getValidMoves(board, 'X');
        if (humanMoves.length > 0) {
          setPassMessage(t('reversiPassed', { player: playerName('O') }));
          if (passTimeoutRef.current !== null) window.clearTimeout(passTimeoutRef.current);
          passTimeoutRef.current = window.setTimeout(() => {
            passTimeoutRef.current = null;
            setPassMessage(null);
          }, 2200);
          setTurn('X');
        } else {
          // Game over
          setIsSettling(true);
          clearTimers();
          settleTimeoutRef.current = window.setTimeout(
            () => {
              settleTimeoutRef.current = null;
              finishRound(board);
            },
            motionEnabled() ? FLIP_SETTLE_MS : 0,
          );
        }
      }
    }, 480);

    return () => window.clearTimeout(botTimer);
  }, [board, isSettling, mode, roundWinner, setup.difficulty, turn]);

  const resetRound = (advanceRound = false) => {
    clearTimers();
    const nextRound = advanceRound ? round + 1 : round;
    if (advanceRound) setRound(nextRound);
    setBoard(createReversiBoard());
    setTurn(getRoundStarter(nextRound));
    setRoundWinner(null);
    setFlippedDiscs([]);
    setPassMessage(null);
    setIsSettling(false);
  };

  const playerName = (player: Player) => t(player === 'X' ? 'player1' : mode === 'bot' ? 'bot' : 'player2');
  const matchComplete = Boolean(roundWinner) && round >= setup.rounds;
  const status = isSettling
    ? t('dotsCounting')
    : roundWinner
      ? matchComplete
        ? matchScores.X === matchScores.O
          ? t('matchDraw')
          : t('winsMatch', { player: playerName(matchScores.X > matchScores.O ? 'X' : 'O') })
        : roundWinner === 'draw'
          ? t('drawRound')
          : t('takesRound', { player: playerName(roundWinner) })
      : (passMessage ?? t('playerTurn', { player: playerName(turn) }));

  return (
    <main className="shell game-screen reversi-screen theme-reversi">
      <GameHeader
        title={t('reversi')}
        statIcon="grid"
        statLabel={t('roundLabel')}
        statValue={numberFormatter.format(round)}
        statSuffix={<small>/ {numberFormatter.format(setup.rounds)}</small>}
        onExit={onExit}
      />
      <ScoreStrip
        leftLabel={t('player1')}
        leftMark="●"
        rightLabel={t(mode === 'bot' ? `${setup.difficulty}Bot` : 'player2')}
        rightMark="●"
        scores={matchScores}
        inGameScores={discCounts}
        inGameUnit={t('discsUnit')}
        turn={turn}
      />
      <section className="reversi-board-wrap">
        <div className="turn-label" role="status" aria-live="polite">
          {status}
        </div>
        <div className="reversi-board" role="group" aria-label={t('reversiBoard')}>
          {board.map((cell, index) => {
            const isValid = validMoves.includes(index);
            const ariaLabel = cell
              ? t('reversiCellMarked', {
                  cell: numberFormatter.format(index + 1),
                  player: playerName(cell),
                })
              : isValid
                ? t('reversiCellValid', {
                    cell: numberFormatter.format(index + 1),
                    player: playerName(turn),
                  })
                : t('reversiCellEmpty', { cell: numberFormatter.format(index + 1) });

            return (
              <button
                key={index}
                type="button"
                className={`reversi-cell ${cell ? (cell === 'X' ? 'x' : 'o') : ''} ${isValid ? 'is-valid' : ''}`}
                data-index={index}
                disabled={!isValid || Boolean(roundWinner) || isSettling}
                onClick={() => playCell(index)}
                aria-label={ariaLabel}
              >
                {cell && <span className="reversi-disc" />}
                {!cell && isValid && <span className="reversi-valid-dot" />}
              </button>
            );
          })}
        </div>
      </section>
      <Tip>{t('reversiTip')}</Tip>
      {matchComplete && <MatchResultToast message={status} gameTitle={t('reversi')} onExit={onExit} />}
    </main>
  );
}
