import { Platform } from 'react-native';

let deferredPrompt: any = null;
let installListeners: Array<(canInstall: boolean) => void> = [];

export class PwaService {
  public static init() {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[PWA] ServiceWorker registered with scope: ', registration.scope);
          })
          .catch((err) => {
            console.warn('[PWA] ServiceWorker registration failed: ', err);
          });
      });
    }

    // 2. Listen for BeforeInstallPrompt event (Android Chrome / Edge / Desktop)
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      deferredPrompt = e;
      this.notifyListeners(true);
      console.log('[PWA] beforeinstallprompt captured, ready to install');
    });

    // 3. Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App successfully installed');
      deferredPrompt = null;
      this.notifyListeners(false);
    });
  }

  public static isStandalone(): boolean {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  public static addInstallListener(listener: (canInstall: boolean) => void): () => void {
    installListeners.push(listener);
    listener(Boolean(deferredPrompt));
    return () => {
      installListeners = installListeners.filter((l) => l !== listener);
    };
  }

  private static notifyListeners(canInstall: boolean) {
    installListeners.forEach((l) => l(canInstall));
  }

  public static async promptInstall(): Promise<boolean> {
    if (!deferredPrompt) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        alert(
          'Чтобы установить приложение на телефон:\n1. Нажмите меню браузера (три точки или «Поделиться»).\n2. Выберите «Добавить на главный экран».'
        );
      }
      return false;
    }

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    deferredPrompt = null;
    this.notifyListeners(false);
    return choiceResult.outcome === 'accepted';
  }
}
