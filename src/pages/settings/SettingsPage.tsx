import { useEffect } from 'react';
import { animateIn } from '../../app/animation';
import { Settings, SettingKey } from '../../app/settings';
import { Icon } from '../../components/react-layout';
import { useI18n, type TranslationKey } from '../../app/i18n';
import { LanguageSelect } from '../../components/LanguageSelect';
import { playTapSound } from '../../app/sfx';
import './settings.css';

type SettingOption = { key: SettingKey; label: TranslationKey; description: TranslationKey };

const OPTIONS: SettingOption[] = [
  { key: 'animations', label: 'animations', description: 'animationsDescription' },
  { key: 'music', label: 'musicSetting', description: 'musicDescription' },
  { key: 'sfx', label: 'sfxSetting', description: 'sfxDescription' },
  { key: 'haptics', label: 'haptics', description: 'hapticsDescription' },
  { key: 'highContrast', label: 'highContrast', description: 'highContrastDescription' },
];

export function SettingsPage({
  settings,
  onChange,
  onBack,
}: {
  settings: Settings;
  onChange: (key: SettingKey) => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => animateIn('.settings-intro > *, .settings-row, .settings-note, .settings-version, .settings-back'), []);

  return (
    <main className="shell settings-screen">
      <header className="topbar settings-topbar">
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            playTapSound();
            onBack();
          }}
          aria-label={t('backToMenu')}
        >
          <Icon name="back" />
        </button>
        <span className="topbar-title">{t('settings')}</span>
        <span className="topbar-spacer" aria-hidden="true" />
      </header>
      <section className="settings-intro">
        <div className="eyebrow align-left">
          <span className="eyebrow-line" /> {t('yourArcade')}
        </div>
        <h1>
          {t('makeIt')}
          <br />
          <em>{t('yours')}</em>
        </h1>
        <p>{t('settingsIntro')}</p>
      </section>
      <section className="settings-list" aria-label={t('gamePreferences')}>
        <div className="settings-row settings-language-row">
          <div className="settings-copy">
            <strong>{t('language')}</strong>
            <span>{t('languageDescription')}</span>
          </div>
          <LanguageSelect />
        </div>
        {OPTIONS.map((option) => (
          <div className="settings-row" key={option.key}>
            <div className="settings-copy">
              <strong>{t(option.label)}</strong>
              <span>{t(option.description)}</span>
            </div>
            <button
              type="button"
              className={`settings-switch ${settings[option.key] ? 'is-on' : ''}`}
              role="switch"
              aria-checked={settings[option.key]}
              aria-label={t(option.label)}
              onClick={() => {
                playTapSound();
                onChange(option.key);
              }}
            >
              <span className="switch-thumb" />
              <span className="sr-only">{t(settings[option.key] ? 'on' : 'off')}</span>
            </button>
          </div>
        ))}
      </section>
      <p className="settings-note">{t('settingsNote')}</p>
      <p className="settings-version">
        {t('version', { version: __APP_RELEASE__ })} · {t('build', { build: __APP_COMMIT__ })}
      </p>
      <button
        type="button"
        className="text-btn settings-back"
        onClick={() => {
          playTapSound();
          onBack();
        }}
      >
        {t('backToMenuAction')} <Icon name="arrow" />
      </button>
    </main>
  );
}
