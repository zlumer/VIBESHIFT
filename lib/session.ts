import { Keypair } from '@solana/web3.js';

/**
 * Manages a temporary session keypair in localStorage.
 * Used for signing transactions without recurring wallet popups.
 */
export function getOrCreateSessionKey() {
  if (typeof window === 'undefined') return null;

  const existing = localStorage.getItem('vibeshift_session_key');
  if (existing) {
    try {
      return Keypair.fromSecretKey(Buffer.from(existing, 'base64'));
    } catch (e) {
      console.error('Failed to parse existing session key:', e);
    }
  }
  
  const newKey = Keypair.generate();
  localStorage.setItem('vibeshift_session_key', Buffer.from(newKey.secretKey).toString('base64'));
  return newKey;
}

/**
 * Clears the session key from local storage.
 */
export function clearSessionKey() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('vibeshift_session_key');
  }
}
