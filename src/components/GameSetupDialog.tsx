import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { GameDifficulty, GameRounds, GameSetup } from '../app/types';
import { Icon, ModeToggle } from './react-layout';
import { useI18n, type TranslationKey } from '../app/i18n';

const DIFFICULTIES: Array<{ value: GameDifficulty; label: TranslationKey; hint: TranslationKey }> = [
  { value: 'easy', label: 'easy', hint: 'easyHint' },
  { value: 'normal', label: 'normal', hint: 'normalHint' },
  { value: 'hard', label: 'hard', hint: 'hardHint' },
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
  const [mode, setMode] = useState(initialSetup.mode);
  const [difficulty, setDifficulty] = useState(initialSetup.difficulty);
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
          <ModeToggle mode={mode} onChange={setMode} />
        </fieldset>

        <fieldset className="setup-fieldset">
          <legend>{t('botDifficulty')}</legend>
          <div className="setup-options difficulty-options">
            {DIFFICULTIES.map((option) => (
              <button
                type="button"
                className={`setup-option ${difficulty === option.value ? 'is-selected' : ''}`}
                aria-pressed={difficulty === option.value}
                key={option.value}
                onClick={() => setDifficulty(option.value)}
              >
                <strong>{t(option.label)}</strong>
                <small>{t(option.hint)}</small>
              </button>
            ))}
          </div>
          <small className="setup-note">{t('difficultyNote')}</small>
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
          <button type="button" className="primary-btn" onClick={() => onStart({ mode, difficulty, rounds })} autoFocus>
            {t('startGame')} <Icon name="arrow" />
          </button>
        </div>
      </div>
    </dialog>
  );
}
