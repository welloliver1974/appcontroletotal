/** PWA utilities for managing Service Worker lifecycle and online status. */

export interface PWASize {
  isStandalone: boolean
  isOnline: boolean
  swRegistration: ServiceWorkerRegistration | null
  updateAvailable: boolean
  deferredPrompt: BeforeInstallPromptEvent | null
}

/**
 * Check if the app is running in standalone mode (PWA installed).
 */
export function checkStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/**
 * Register an online/offline status listener.
 */
export function useOnlineStatus(): boolean {
  if (typeof window !== 'undefined') {
    return navigator.onLine
  }
  return true
}

/**
 * Register the Service Worker (called from main.tsx in production).
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    console.log('[PWA] Service Worker registered:', reg.scope)
    return reg
  } catch (err) {
    console.error('[PWA] Service Worker registration failed:', err)
    return null
  }
}

/**
 * Check for SW updates and handle them.
 */
export function checkForUpdates(reg: ServiceWorkerRegistration | null): void {
  if (!reg) return
  if (reg.waiting) {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' })
  }
}

// Augment WindowEventMap to include beforeinstallprompt
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }

  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[]
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
    prompt: () => Promise<void>
  }
}