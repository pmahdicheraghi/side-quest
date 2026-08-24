import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { GameDifficulty, GameRounds, GameSetup } from '../app/types';
import { Icon } from './react-layout';
import { useI18n, type TranslationKey } from '../app/i18n';

type PlayOption = GameDifficulty | 'two';

const PLAY_OPTIONS: Array<{ value: PlayOption; label: TranslationKey }> = [
  { value: 'two', label: 'twoPlayers' },
  { value: 'easy', label: 'easyBot' },
  { value: 'normal', label: 'normalBot' },
  { value: 'hard', label: 'hardBot' },
];
const ROUND_OPTIONS: GameRounds[] = [1, 3, 5];

export function GameSetupDialog({
  gameTitle,
  initialSetup,
  onCancel,
  onStart,
}: {
  gameTitle: string;
  initialSetup: GameSetup;
  onCancel: () => void;
  onStart: (setup: GameSetup) => void;
}): ReactElement {
  const { language, t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [playOption, setPlayOption] = useState<PlayOption>(initialSetup.mode === 'two' ? 'two' : initialSetup.difficulty);
  const [rounds, setRounds] = useState(initialSetup.rounds);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="setup-dialog"
      aria-labelledby="setup-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="setup-dialog-card">
        <button type="button" className="setup-close" onClick={onCancel} aria-label={t('closeSetup')}>
          ×
        </button>
        <div className="setup-eyebrow">{t('newQuest')}</div>
        <h2 id="setup-title">{t('setupGame', { game: gameTitle })}</h2>
        <p>{t('setupIntro')}</p>

        <fieldset className="setup-fieldset">
          <legend>{t('gameMode')}</legend>
          <div className="setup-options play-options">
            {PLAY_OPTIONS.map((option) => (
              <button
                type="button"
                className={`setup-option play-option play-option-${option.value === 'two' ? 'two' : 'bot'} ${playOption === option.value ? 'is-selected' : ''}`}
                aria-pressed={playOption === option.value}
                key={option.value}
                onClick={() => setPlayOption(option.value)}
              >
                <Icon name={option.value === 'two' ? 'users' : 'bot'} />
                <span>
                  <strong>{t(option.label)}</strong>
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="setup-fieldset">
          <legend>{t('numberOfRounds')}</legend>
          <div className="setup-options round-options">
            {ROUND_OPTIONS.map((option) => (
              <button
                type="button"
                className={`setup-option ${rounds === option ? 'is-selected' : ''}`}
                aria-pressed={rounds === option}
                key={option}
                onClick={() => setRounds(option)}
              >
                <strong>{new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en').format(option)}</strong>
                <small>{t(option === 1 ? 'round' : 'rounds')}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="setup-actions">
          <button type="button" className="text-btn" onClick={onCancel}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={() =>
              onStart({
                mode: playOption === 'two' ? 'two' : 'bot',
                difficulty: playOption === 'two' ? initialSetup.difficulty : playOption,
                rounds,
              })
            }
            autoFocus
          >
            {t('startGame')} <Icon name="arrow" />
          </button>
        </div>
      </div>
    </dialog>
  );
}
