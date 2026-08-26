import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { applySettings, loadSettings, saveSettings, type SettingKey, type Settings } from './settings';
import type { GameSetup, View } from './types';
import { MusicController } from './music';
import { unlockAudio, playTapSound } from './sfx';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { TicTacToePage } from '../pages/tic-tac-toe/TicTacToePage';
import { MemoryMatchPage } from '../pages/memory-match/MemoryMatchPage';
import { ReactionDuelPage } from '../pages/reaction-duel/ReactionDuelPage';
import { ConnectFourPage } from '../pages/connect-four/ConnectFourPage';
import { DotsBoxesPage } from '../pages/dots-boxes/DotsBoxesPage';
import { ReversiPage } from '../pages/reversi/ReversiPage';
import { GameSetupDialog } from '../components/GameSetupDialog';
import { translate, useI18n, type Language } from './i18n';
import { animateIn } from './animation';
import { Icon } from '../components/react-layout';
import { usePwaUpdate } from './usePwaUpdate';

type InstallOutcome = 'accepted' | 'dismissed';
const HISTORY_VIEW_KEY = 'sideQuestView';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
}

function isStandaloneDisplayMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function ReactApp(): ReactElement {
  const { language } = useI18n();
  const [view, setView] = useState<View>('menu');
  const [pendingGame, setPendingGame] = useState<Exclude<View, 'menu' | 'settings'> | null>(null);
  const [gameSetup, setGameSetup] = useState<GameSetup>({ mode: 'bot', difficulty: 'normal', rounds: 3 });
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isStandaloneDisplayMode);
  const [dismissedUpdate, setDismissedUpdate] = useState<string | null>(null);
  const musicRef = useRef<MusicController | null>(null);
  const pwaUpdate = usePwaUpdate();

  if (!musicRef.current) musicRef.current = new MusicController(settings.music);

  useEffect(() => {
    applySettings(settings);
    musicRef.current?.setEnabled(settings.music);
  }, [settings]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    window.history.replaceState(historyStateFor('menu'), '');
    const handlePopState = (event: PopStateEvent) => {
      setPendingGame(null);
      setView(viewFromHistory(event.state) ?? 'menu');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const updateSetting = (key: SettingKey) => {
    setSettings((current) => {
      const next = { ...current, [key]: !current[key] };
      saveSettings(next);
      return next;
    });
  };
  const navigate = (nextView: View) => {
    musicRef.current?.handleGesture();
    unlockAudio();
    if (
      nextView === 'tic' ||
      nextView === 'memory' ||
      nextView === 'reaction' ||
      nextView === 'connect' ||
      nextView === 'dots' ||
      nextView === 'reversi'
    ) {
      setPendingGame(nextView);
      return;
    }
    if (nextView === 'menu') {
      returnToMenu();
      return;
    }
    window.history.pushState(historyStateFor(nextView), '');
    setView(nextView);
  };

  const returnToMenu = () => {
    setPendingGame(null);
    if (viewFromHistory(window.history.state) !== 'menu') {
      window.history.back();
      return;
    }
    setView('menu');
  };

  const startGame = (setup: GameSetup) => {
    if (!pendingGame) return;
    setGameSetup(setup);
    window.history.pushState(historyStateFor(pendingGame), '');
    setView(pendingGame);
    setPendingGame(null);
  };

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (outcome === 'accepted') setIsInstalled(true);
  };

  return (
    <div
      className="react-content"
      onClick={() => {
        musicRef.current?.handleGesture();
        unlockAudio();
      }}
      onPointerDown={() => {
        musicRef.current?.handleGesture();
        unlockAudio();
      }}
    >
      {view === 'menu' && (
        <MenuPage
          onNavigate={navigate}
          canInstall={Boolean(installPrompt && !isInstalled)}
          onInstall={installApp}
          updateVersion={pwaUpdate.availableVersion}
          isUpdating={pwaUpdate.status === 'applying'}
          showUpdate={(pwaUpdate.status === 'ready' || pwaUpdate.status === 'applying') && dismissedUpdate !== pwaUpdate.availableVersion}
          onUpdate={pwaUpdate.applyUpdate}
          onDismissUpdate={() => setDismissedUpdate(pwaUpdate.availableVersion)}
        />
      )}
      {view === 'settings' && <SettingsPage settings={settings} onChange={updateSetting} onBack={returnToMenu} />}
      {view === 'tic' && <TicTacToePage setup={gameSetup} onExit={returnToMenu} />}
      {view === 'memory' && <MemoryMatchPage setup={gameSetup} onExit={returnToMenu} />}
      {view === 'reaction' && <ReactionDuelPage setup={gameSetup} onExit={returnToMenu} />}
      {view === 'connect' && <ConnectFourPage setup={gameSetup} onExit={returnToMenu} />}
      {view === 'dots' && <DotsBoxesPage setup={gameSetup} onExit={returnToMenu} />}
      {view === 'reversi' && <ReversiPage setup={gameSetup} onExit={returnToMenu} />}
      {pendingGame && (
        <GameSetupDialog
          gameTitle={gameTitle(pendingGame, language)}
          initialSetup={gameSetup}
          themeClass={`theme-${pendingGame}`}
          onCancel={() => setPendingGame(null)}
          onStart={startGame}
        />
      )}
    </div>
  );
}

function historyStateFor(view: View): Record<string, unknown> {
  const current = window.history.state;
  const base = current && typeof current === 'object' ? current : {};
  return { ...base, [HISTORY_VIEW_KEY]: view };
}

function viewFromHistory(state: unknown): View | null {
  if (!state || typeof state !== 'object') return null;
  const value = (state as Record<string, unknown>)[HISTORY_VIEW_KEY];
  return value === 'menu' ||
    value === 'settings' ||
    value === 'tic' ||
    value === 'memory' ||
    value === 'reaction' ||
    value === 'connect' ||
    value === 'dots' ||
    value === 'reversi'
    ? value
    : null;
}

function gameTitle(view: Exclude<View, 'menu' | 'settings'>, language: Language): string {
  if (view === 'tic') return translate(language, 'ticTacToe');
  if (view === 'memory') return translate(language, 'memoryMatch');
  if (view === 'reaction') return translate(language, 'reactionDuel');
  if (view === 'connect') return translate(language, 'connectFour');
  if (view === 'dots') return translate(language, 'dotsBoxes');
  return translate(language, 'reversi');
}

function MenuPage({
  onNavigate,
  canInstall,
  onInstall,
  updateVersion,
  isUpdating,
  showUpdate,
  onUpdate,
  onDismissUpdate,
}: {
  onNavigate: (view: View) => void;
  canInstall: boolean;
  onInstall: () => void;
  updateVersion: string | null;
  isUpdating: boolean;
  showUpdate: boolean;
  onUpdate: () => void;
  onDismissUpdate: () => void;
}) {
  const { language, t } = useI18n();
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    animateIn('.welcome > *, .game-card, .menu-footer');
  }, [language]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <main className="shell menu-screen">
      <header className="topbar menu-topbar">
        <button type="button" className="brand" onClick={() => onNavigate('menu')} aria-label={t('backToMenu')}>
          <span className="brand-mark">✦</span>
          <span>{t('appName')}</span>
        </button>
        <div className="menu-topbar-actions">
          {canInstall && (
            <button type="button" className="header-install-btn" onClick={onInstall}>
              <Icon name="download" />
              <span>{t('installApp')}</span>
            </button>
          )}
          {!canInstall && (
            <span className={`topbar-meta connection-status ${isOnline ? 'is-online' : 'is-offline'}`} role="status" aria-live="polite">
              <span className="online-dot" aria-hidden="true" />
              {t(isOnline ? 'online' : 'offline')}
            </span>
          )}
          <button type="button" className="icon-btn" onClick={() => onNavigate('settings')} aria-label={t('openSettings')}>
            <Icon name="settings" />
          </button>
        </div>
      </header>

      {showUpdate && updateVersion && (
        <section className="update-banner" role="status" aria-live="polite">
          <div className="update-copy">
            <strong>{t('updateReady', { version: updateVersion })}</strong>
            <span>{t('updateDescription')}</span>
          </div>
          <div className="update-actions">
            <button type="button" className="update-primary" onClick={onUpdate} disabled={isUpdating}>
              {t(isUpdating ? 'updating' : 'updateNow')}
            </button>
            <button type="button" className="update-later" onClick={onDismissUpdate} disabled={isUpdating}>
              {t('updateLater')}
            </button>
          </div>
        </section>
      )}

      <section className="welcome">
        <div className="eyebrow">
          <span className="eyebrow-line" /> {t('pocketArcade')} <span className="eyebrow-line" />
        </div>
        <h1>
          {t('heroSmallGames')}
          <br />
          <em>{t('heroBigEnergy')}</em>
        </h1>
        <p className="intro">{t('heroIntro')}</p>
      </section>

      <section className="game-list" aria-label={t('chooseGame')}>
        <GameCard
          view="tic"
          number={t('logic')}
          title={t('ticTacToe')}
          description={t('ticDescription')}
          cardClass="tic-card"
          visual={
            <>
              <span>×</span>
              <span>○</span>
              <span>×</span>
              <span>○</span>
              <span>×</span>
            </>
          }
          firstMeta={
            <>
              <Icon name="users" /> {t('twoPlayers')}
            </>
          }
          secondMeta={
            <>
              <Icon name="bot" /> {t('vsBot')}
            </>
          }
          onSelect={onNavigate}
        />
        <GameCard
          view="memory"
          number={t('memory')}
          title={t('memoryMatch')}
          description={t('memoryDescription')}
          cardClass="memory-card"
          visual={
            <>
              <span>✦</span>
              <span>●</span>
              <span>◆</span>
              <span>✚</span>
              <span>✦</span>
              <span>●</span>
            </>
          }
          firstMeta={
            <>
              <Icon name="spark" /> {t('eightPairs')}
            </>
          }
          secondMeta={
            <>
              <Icon name="users" /> {t('passAndPlay')}
            </>
          }
          onSelect={onNavigate}
        />
        <GameCard
          view="reaction"
          number={t('reflex')}
          title={t('reactionDuel')}
          description={t('reactionDescription')}
          cardClass="reaction-card"
          visual={
            <>
              <span className="reaction-dot" />
              <span className="reaction-wave" />
              <span className="reaction-wave two" />
            </>
          }
          firstMeta={
            <>
              <Icon name="spark" /> {t('splitSeconds')}
            </>
          }
          secondMeta={
            <>
              <Icon name="users" /> {t('headToHead')}
            </>
          }
          onSelect={onNavigate}
        />
        <GameCard
          view="connect"
          number={t('alignment')}
          title={t('connectFour')}
          description={t('connectDescription')}
          cardClass="connect-card"
          visual={Array.from({ length: 28 }, (_, index) => (
            <span
              className={
                [3, 9, 15, 21].includes(index) ? 'connect-dot-one' : [10, 16, 17, 22, 23, 24].includes(index) ? 'connect-dot-two' : ''
              }
              key={index}
            />
          ))}
          firstMeta={
            <>
              <Icon name="grid" /> {t('fourToWin')}
            </>
          }
          secondMeta={
            <>
              <Icon name="bot" /> {t('vsBot')}
            </>
          }
          onSelect={onNavigate}
        />
        <GameCard
          view="dots"
          number={t('tactics')}
          title={t('dotsBoxes')}
          description={t('dotsDescription')}
          cardClass="dots-card"
          visual={Array.from({ length: 16 }, (_, index) => (
            <span className={`dots-preview-dot dot-${index}`} key={index}>
              <i />
            </span>
          ))}
          firstMeta={
            <>
              <Icon name="grid" /> {t('nineBoxes')}
            </>
          }
          secondMeta={
            <>
              <Icon name="bot" /> {t('chainTactics')}
            </>
          }
          onSelect={onNavigate}
        />
        <GameCard
          view="reversi"
          number={t('territory')}
          title={t('reversi')}
          description={t('reversiDescription')}
          cardClass="reversi-card"
          visual={Array.from({ length: 24 }, (_, index) => (
            <span
              className={[7, 8, 14].includes(index) ? 'reversi-dot-dark' : [9, 15, 16].includes(index) ? 'reversi-dot-light' : ''}
              key={index}
            />
          ))}
          firstMeta={
            <>
              <Icon name="grid" /> {t('sixtyFourTiles')}
            </>
          }
          secondMeta={
            <>
              <Icon name="bot" /> {t('vsBot')}
            </>
          }
          onSelect={onNavigate}
        />
      </section>

      <footer className="menu-footer">
        <span>
          <Icon name="spark" /> {t('footerTagline')}
        </span>
        <span>
          {t('version', { version: __APP_RELEASE__ })} / {t('byMahdi')}
        </span>
      </footer>
    </main>
  );
}

function GameCard({
  view,
  number,
  title,
  description,
  cardClass,
  visual,
  firstMeta,
  secondMeta,
  onSelect,
}: {
  view: Exclude<View, 'menu' | 'settings'>;
  number: string;
  title: string;
  description: string;
  cardClass: string;
  visual: ReactNode;
  firstMeta: ReactNode;
  secondMeta: ReactNode;
  onSelect: (view: View) => void;
}) {
  const visualClass =
    view === 'tic'
      ? 'tic-visual'
      : view === 'memory'
        ? 'memory-visual'
        : view === 'reaction'
          ? 'reaction-visual'
          : view === 'connect'
            ? 'connect-visual'
            : view === 'dots'
              ? 'dots-visual'
              : 'reversi-visual';

  return (
    <button
      type="button"
      className={`game-card ${cardClass}`}
      onClick={() => {
        playTapSound();
        onSelect(view);
      }}
    >
      <div className="card-top">
        <span className="game-number">{number}</span>
        <span className="card-arrow">
          <Icon name="arrow" />
        </span>
      </div>
      <div className={`card-visual ${visualClass}`} aria-hidden="true">
        {visual}
      </div>
      <div className="card-copy">
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="card-footer">
          <span>{firstMeta}</span>
          <span>{secondMeta}</span>
        </div>
      </div>
    </button>
  );
}
