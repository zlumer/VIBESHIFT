import { 
  PublicKey, 
  Keypair, 
  Transaction, 
  Connection, 
  clusterApiUrl, 
  SystemProgram, 
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { supabase } from './supabase';

/**
 * Session Key Service for VIBESHIFT.
 * Allows 1-click in-game spending by delegating limited authority to a temporary key.
 */
export class SessionKeyService {
  private connection: Connection;
  
  constructor() {
    this.connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  }

  /**
   * Create a new Session Key (Keypair) and store its delegation info.
   * In a real implementation with Gum, this would involve a program call.
   * Here we implement a foundation using local delegation metadata.
   */
  async createSession(userWallet: string, limitSol: number, durationHours: number) {
    const sessionKeypair = Keypair.generate();
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + durationHours);

    // In VIBESHIFT, we store this in Supabase for the backend to recognize it.
    // Note: session_keys table needs to be created in Supabase.
    const { data, error } = await supabase
      .from('session_keys')
      .insert({
        user_wallet: userWallet,
        session_public_key: sessionKeypair.publicKey.toBase58(),
        limit_lamports: limitSol * LAMPORTS_PER_SOL,
        remaining_lamports: limitSol * LAMPORTS_PER_SOL,
        expires_at: expiry.toISOString(),
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return {
      sessionPublicKey: sessionKeypair.publicKey.toBase58(),
      sessionSecretKey: Buffer.from(sessionKeypair.secretKey).toString('base64'),
      expiry
    };
  }

  /**
   * Validates if a session key is authorized to spend a certain amount.
   */
  async validateSpend(sessionPublicKey: string, amountSol: number) {
    const { data: session, error } = await supabase
      .from('session_keys')
      .select('*')
      .eq('session_public_key', sessionPublicKey)
      .eq('is_active', true)
      .single();

    if (error || !session) return { valid: false, error: 'Session not found or inactive' };

    const now = new Date();
    if (new Date(session.expires_at) < now) {
      await this.revokeSession(sessionPublicKey);
      return { valid: false, error: 'Session expired' };
    }

    if (session.remaining_lamports < amountSol * LAMPORTS_PER_SOL) {
      return { valid: false, error: 'Session limit exceeded' };
    }

    return { valid: true, session };
  }

  /**
   * Revoke a session key.
   */
  async revokeSession(sessionPublicKey: string) {
    await supabase
      .from('session_keys')
      .update({ is_active: false })
      .eq('session_public_key', sessionPublicKey);
  }

  /**
   * Deduct from session limit.
   */
  async deductLimit(sessionPublicKey: string, amountSol: number) {
     const { data: session } = await supabase
      .from('session_keys')
      .select('remaining_lamports')
      .eq('session_public_key', sessionPublicKey)
      .single();

     if (session) {
         await supabase
            .from('session_keys')
            .update({ remaining_lamports: session.remaining_lamports - (amountSol * LAMPORTS_PER_SOL) })
            .eq('session_public_key', sessionPublicKey);
     }
  }
}

export const sessionKeyService = new SessionKeyService();
