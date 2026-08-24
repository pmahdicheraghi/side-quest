import { useCallback, useEffect, useRef, useState } from 'react';

const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

type VersionResponse = {
  release?: unknown;
  build?: unknown;
  // Kept temporarily so clients can upgrade from the previous version.json shape.
  version?: unknown;
};

export type PwaUpdateState = {
  status: 'idle' | 'downloading' | 'ready' | 'applying';
  availableVersion: string | null;
  applyUpdate: () => void;
};

function serviceWorkerUrl(version: string): string {
  const url = new URL('./sw.js', document.baseURI);
  url.searchParams.set('v', version);
  return url.href;
}

export function usePwaUpdate(): PwaUpdateState {
  const [status, setStatus] = useState<PwaUpdateState['status']>('idle');
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadRequestedRef = useRef(false);

  const applyUpdate = useCallback(() => {
    const waitingWorker = registrationRef.current?.waiting;
    setStatus('applying');
    reloadRequestedRef.current = true;

    if (waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    else window.location.reload();
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

    let disposed = false;
    let registration: ServiceWorkerRegistration | null = null;
    let pendingRelease: string | null = null;
    let removeRegistrationListener: (() => void) | null = null;
    const watchedWorkers = new WeakSet<ServiceWorker>();

    const watchWorker = (worker: ServiceWorker | null) => {
      if (!worker || watchedWorkers.has(worker)) return;
      watchedWorkers.add(worker);

      const syncWorkerState = () => {
        if (disposed) return;
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          setAvailableVersion(pendingRelease);
          setStatus('ready');
        }
      };

      worker.addEventListener('statechange', syncWorkerState);
      syncWorkerState();
    };

    const trackRegistration = (nextRegistration: ServiceWorkerRegistration) => {
      if (registration !== nextRegistration) {
        removeRegistrationListener?.();
        registration = nextRegistration;
        registrationRef.current = nextRegistration;

        const handleUpdateFound = () => watchWorker(nextRegistration.installing);
        nextRegistration.addEventListener('updatefound', handleUpdateFound);
        removeRegistrationListener = () => nextRegistration.removeEventListener('updatefound', handleUpdateFound);
      }

      if (nextRegistration.waiting && navigator.serviceWorker.controller) {
        setAvailableVersion(pendingRelease);
        setStatus('ready');
      }
      watchWorker(nextRegistration.installing);
    };

    const registerVersion = async (build: string, release: string | null) => {
      pendingRelease = release;
      if (build !== __APP_BUILD__) setStatus('downloading');

      const nextRegistration = await navigator.serviceWorker.register(serviceWorkerUrl(build), {
        updateViaCache: 'none',
      });
      if (!disposed) trackRegistration(nextRegistration);

      const controllerBuild = navigator.serviceWorker.controller
        ? new URL(navigator.serviceWorker.controller.scriptURL).searchParams.get('v')
        : null;
      if (!disposed && build !== __APP_BUILD__ && controllerBuild === build) {
        setAvailableVersion(release);
        setStatus('ready');
      }
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
        const build = typeof data.build === 'string' ? data.build : typeof data.version === 'string' ? data.version : null;
        if (!build) return;
        const release = typeof data.release === 'string' && data.release ? data.release : build.split(/[+-]/, 1)[0];

        if (build !== __APP_BUILD__) await registerVersion(build, release);
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
    const handleControllerChange = () => {
      if (reloadRequestedRef.current) window.location.reload();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    void navigator.serviceWorker.getRegistration().then((existingRegistration) => {
      if (!disposed && existingRegistration) trackRegistration(existingRegistration);
    });
    void registerVersion(__APP_BUILD__, __APP_RELEASE__)
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
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      if (registrationRef.current === registration) registrationRef.current = null;
    };
  }, []);

  return { status, availableVersion, applyUpdate };
}
