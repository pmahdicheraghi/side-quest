import { useEffect } from 'react';

const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

type VersionResponse = {
  version?: unknown;
};

function serviceWorkerUrl(version: string): string {
  const url = new URL('./sw.js', document.baseURI);
  url.searchParams.set('v', version);
  return url.href;
}

export function usePwaUpdate(): void {
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

    let disposed = false;
    let registration: ServiceWorkerRegistration | null = null;
    let removeRegistrationListener: (() => void) | null = null;
    const watchedWorkers = new WeakSet<ServiceWorker>();

    const watchWorker = (worker: ServiceWorker | null) => {
      if (!worker || watchedWorkers.has(worker)) return;
      watchedWorkers.add(worker);

      const syncWorkerState = () => {
        if (disposed) return;
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          worker.postMessage({ type: 'SKIP_WAITING' });
        }
      };

      worker.addEventListener('statechange', syncWorkerState);
      syncWorkerState();
    };

    const trackRegistration = (nextRegistration: ServiceWorkerRegistration) => {
      if (registration !== nextRegistration) {
        removeRegistrationListener?.();
        registration = nextRegistration;

        const handleUpdateFound = () => watchWorker(nextRegistration.installing);
        nextRegistration.addEventListener('updatefound', handleUpdateFound);
        removeRegistrationListener = () => nextRegistration.removeEventListener('updatefound', handleUpdateFound);
      }

      if (nextRegistration.waiting && navigator.serviceWorker.controller) {
        nextRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      watchWorker(nextRegistration.installing);
    };

    const registerVersion = async (version: string) => {
      const nextRegistration = await navigator.serviceWorker.register(serviceWorkerUrl(version), {
        updateViaCache: 'none',
      });
      if (!disposed) trackRegistration(nextRegistration);
    };

    const checkForUpdate = async () => {
      if (disposed || !navigator.onLine) return;

      try {
        const versionUrl = new URL('./version.json', document.baseURI);
        // The cache-buster also reaches the network through older Side Quest
        // workers that cached every successful request.
        versionUrl.searchParams.set('check', Date.now().toString(36));
        const response = await fetch(versionUrl, { cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as VersionResponse;
        if (typeof data.version !== 'string' || !data.version) return;

        if (data.version !== __APP_VERSION__) await registerVersion(data.version);
        else await registration?.update();
      } catch {
        // Offline and transient network failures are retried on reconnect/focus.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkForUpdate();
    };
    const handleFocus = () => void checkForUpdate();
    const handleOnline = () => void checkForUpdate();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    void navigator.serviceWorker.getRegistration().then((existingRegistration) => {
      if (!disposed && existingRegistration) trackRegistration(existingRegistration);
    });
    void registerVersion(__APP_VERSION__)
      .then(checkForUpdate)
      .catch(() => {
        // An existing installed copy remains usable when registration is attempted offline.
      });

    const interval = window.setInterval(() => void checkForUpdate(), UPDATE_CHECK_INTERVAL_MS);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      removeRegistrationListener?.();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, []);
}
