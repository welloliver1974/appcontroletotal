/**
 * Mobile Biometrics (WebAuthn / Passkeys / Fingerprint / Face ID).
 * Configured specifically for mobile devices (Android / iOS).
 */

const STORAGE_KEY = 'act.biometrics.credential'

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || ''
  const isTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)
  return isMobileUA && isTouch
}

export async function isBiometricsAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!window.PublicKeyCredential) return false
  if (!isMobileDevice()) return false

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    return !!available
  } catch {
    return false
  }
}

export function isBiometricsEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem(STORAGE_KEY)
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export async function registerBiometrics(
  email: string,
  userId = 'life-os-user',
): Promise<{ ok: boolean; error?: string }> {
  const available = await isBiometricsAvailable()
  if (!available) {
    return { ok: false, error: 'Biometria não disponível neste dispositivo.' }
  }

  try {
    const challenge = new Uint8Array(32)
    window.crypto.getRandomValues(challenge)

    const userBuffer = new TextEncoder().encode(userId)

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Life OS Hub',
          id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
        },
        user: {
          id: userBuffer,
          name: email,
          displayName: email.split('@')[0],
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null

    if (!credential) {
      return { ok: false, error: 'Falha ao registrar biometria.' }
    }

    const credId = bufferToBase64(credential.rawId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: credId, email }))

    return { ok: true }
  } catch (err) {
    console.error('Error registering biometrics:', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Operação biométrica cancelada ou não suportada.',
    }
  }
}

export async function authenticateWithBiometrics(): Promise<{ ok: boolean; error?: string; email?: string }> {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return { ok: false, error: 'Biometria não configurada neste dispositivo.' }
  }

  try {
    const { id, email } = JSON.parse(raw)
    const rawId = base64ToBuffer(id)

    const challenge = new Uint8Array(32)
    window.crypto.getRandomValues(challenge)

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            type: 'public-key',
            id: rawId,
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    })

    if (!assertion) {
      return { ok: false, error: 'Autenticação biométrica falhou.' }
    }

    return { ok: true, email }
  } catch (err) {
    console.error('Biometric authentication failed:', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro na leitura biométrica.',
    }
  }
}

export function disableBiometrics(): void {
  localStorage.removeItem(STORAGE_KEY)
}
