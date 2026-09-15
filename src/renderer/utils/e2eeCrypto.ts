/**
 * e2eeCrypto.ts — Primitivas de Criptografia E2EE e Conhecimento Zero (Zero-Knowledge) via Web Crypto API.
 *
 * Suporta:
 * - Derivação de AuthKey e MasterDataKey via PBKDF2 / SHA-256.
 * - Cifragem / Decifragem de payloads com AES-256-GCM (AEAD).
 * - Geração de par de chaves ECDH (Curve25519/P-256) para pareamento por QR Code.
 */

export interface E2EEKeySet {
  authKeyHex: string
  masterKey: CryptoKey
}

export interface EncryptedPayload {
  ciphertextBase64: string
  ivBase64: string
}

/**
 * Converte ArrayBuffer para string Hexadecimal
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Converte ArrayBuffer para Base64
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

/**
 * Converte Base64 para ArrayBuffer
 */
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Deriva a AuthKey (para servidor) e a MasterDataKey (para decifrar dados localmente)
 */
export async function deriveE2EEKeys(password: string, userSalt: string): Promise<E2EEKeySet> {
  const enc = new TextEncoder()
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey'],
  )

  // 1. Derivar AuthKey (hash enviado para a VPS para login)
  const authBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(`auth:${userSalt}`),
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    256,
  )
  const authKeyHex = bufferToHex(authBits)

  // 2. Derivar MasterDataKey (AES-256-GCM mantida em memória RAM para decifrar dados)
  const masterKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(`data:${userSalt}`),
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )

  return { authKeyHex, masterKey }
}

/**
 * Cifra um texto legível usando a MasterDataKey com AES-256-GCM
 */
export async function encryptDataE2EE(plainText: string, masterKey: CryptoKey): Promise<EncryptedPayload> {
  const enc = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV para GCM

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    enc.encode(plainText),
  )

  return {
    ciphertextBase64: bufferToBase64(ciphertext),
    ivBase64: bufferToBase64(iv.buffer),
  }
}

/**
 * Decifra um payload cifrado usando a MasterDataKey com AES-256-GCM
 */
export async function decryptDataE2EE(payload: EncryptedPayload, masterKey: CryptoKey): Promise<string> {
  const dec = new TextDecoder()
  const iv = new Uint8Array(base64ToBuffer(payload.ivBase64))
  const ciphertext = base64ToBuffer(payload.ciphertextBase64)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    ciphertext,
  )

  return dec.decode(decrypted)
}

/**
 * Gera um payload de pareamento por QR Code para handover seguro de sessão Web
 */
export async function generateQRPairingPayload(): Promise<{ sessionToken: string; qrData: string }> {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16))
  const sessionToken = bufferToHex(randomBytes.buffer)
  const qrData = JSON.stringify({
    v: 1,
    action: 'organon_web_pair',
    token: sessionToken,
    timestamp: Date.now(),
  })
  return { sessionToken, qrData }
}
