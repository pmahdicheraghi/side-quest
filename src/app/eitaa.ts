export interface EitaaBackButton {
  isVisible: boolean;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
  show: () => void;
  hide: () => void;
}

export interface EitaaHapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

export interface EitaaWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  addToHomeScreen: () => void;
  checkHomeScreenStatus: (callback?: (status: string) => void) => void;
  requestFullscreen: () => void;
  disableVerticalSwipes: () => void;
  enableVerticalSwipes: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  BackButton: EitaaBackButton;
  HapticFeedback: EitaaHapticFeedback;
  isExpanded?: boolean;
  onEvent: (eventType: string, callback: (...args: unknown[]) => void) => void;
  offEvent: (eventType: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    Eitaa?: {
      WebApp?: EitaaWebApp;
    };
  }
}

export function getEitaaWebApp(): EitaaWebApp | null {
  return typeof window !== 'undefined' && window.Eitaa?.WebApp ? window.Eitaa.WebApp : null;
}

export function initEitaaSdk(): void {
  const webApp = getEitaaWebApp();
  if (!webApp) return;
  try {
    webApp.ready();
    webApp.expand();
    webApp.disableVerticalSwipes();
    webApp.setHeaderColor('#121a18');
    webApp.setBackgroundColor('#121a18');
    webApp.requestFullscreen();
  } catch {
    // Graceful fallback if running outside Eitaa client
  }
}

export function setEitaaBackButton(visible: boolean, onBack?: () => void): () => void {
  const webApp = getEitaaWebApp();
  if (!webApp?.BackButton) return () => {};

  const backButton = webApp.BackButton;

  if (visible) {
    backButton.show();
  } else {
    backButton.hide();
  }

  if (onBack) {
    backButton.onClick(onBack);
    return () => {
      backButton.offClick(onBack);
    };
  }

  return () => {};
}

export function triggerEitaaHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  try {
    getEitaaWebApp()?.HapticFeedback?.impactOccurred(style);
  } catch {
    // Ignore if not supported
  }
}

export function checkEitaaHomeScreen(onStatus: (canAdd: boolean) => void): () => void {
  const webApp = getEitaaWebApp();
  if (!webApp) {
    onStatus(false);
    return () => {};
  }

  if (typeof webApp.checkHomeScreenStatus === 'function') {
    try {
      webApp.checkHomeScreenStatus((status) => {
        // Status can be 'missed', 'added', 'unsupported', 'unknown'
        if (status === 'missed') {
          onStatus(true);
        } else if (status === 'added') {
          onStatus(false);
        } else if (typeof webApp.addToHomeScreen === 'function') {
          onStatus(true);
        }
      });
    } catch {
      if (typeof webApp.addToHomeScreen === 'function') {
        onStatus(true);
      }
    }
  } else if (typeof webApp.addToHomeScreen === 'function') {
    onStatus(true);
  }

  const handleAdded = () => {
    onStatus(false);
  };

  try {
    if (typeof webApp.onEvent === 'function') {
      webApp.onEvent('homeScreenAdded', handleAdded);
      return () => {
        if (typeof webApp.offEvent === 'function') {
          webApp.offEvent('homeScreenAdded', handleAdded);
        }
      };
    }
  } catch {
    // Ignore
  }

  return () => {};
}

export function addEitaaToHomeScreen(): boolean {
  const webApp = getEitaaWebApp();
  if (webApp && typeof webApp.addToHomeScreen === 'function') {
    try {
      webApp.addToHomeScreen();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
