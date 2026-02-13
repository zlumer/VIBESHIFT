'use client'

import { useState, useEffect } from 'react';
import { useWallet } from '@/lib/wallet';
import { Connection, PublicKey } from '@solana/web3.js';
import { sessionKeyService } from '@/lib/session-keys';

/**
 * Session Key Manager Component
 * Allows users to create a session key for 1-click in-game purchases.
 */
export function SessionKeyManager() {
  const { publicKey } = useWallet();
  const [activeSession, setActiveSession] = useState<{ publicKey: string; expiry: Date } | null>(null);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(0.5);

  useEffect(() => {
    // In a real app, we would check local storage for an existing session key
    const saved = localStorage.getItem('vibe_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (new Date(parsed.expiry) > new Date()) {
          setActiveSession({
            publicKey: parsed.sessionPublicKey,
            expiry: new Date(parsed.expiry)
          });
        }
      } catch (e) {
        localStorage.removeItem('vibe_session');
      }
    }
  }, []);

  const handleCreateSession = async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      // In a real implementation with Gum, the user would sign a delegation transaction here.
      // For the MVP, we simulate the delegation and store the temporary key.
      const result = await sessionKeyService.createSession(
        publicKey.toBase58(),
        limit,
        24 // 24 hours
      );

      localStorage.setItem('vibe_session', JSON.stringify(result));
      setActiveSession({
        publicKey: result.sessionPublicKey,
        expiry: result.expiry
      });
      // Use a custom event or simpler notification for better UX
      console.log('Session Key Created Successfully');
    } catch (err) {
      console.error('Failed to create session:', err);
      alert('Failed to create session key');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = () => {
    localStorage.removeItem('vibe_session');
    setActiveSession(null);
  };

  if (!publicKey) return null;

  return (
    <div className="bg-gray-900 border border-purple-500/30 p-4 rounded-xl shadow-lg mt-4 max-w-sm mx-auto">
      <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
        <span className="text-xl">⚡</span> Session Keys
      </h3>
      
      {activeSession ? (
        <div className="text-sm">
          <p className="text-green-400 mb-1">✓ Active Session Enabled</p>
          <p className="text-gray-400 text-xs truncate mb-2">Key: {activeSession.publicKey}</p>
          <p className="text-gray-400 text-xs mb-3">Expires: {activeSession.expiry.toLocaleString()}</p>
          <button 
            onClick={handleRevoke}
            className="w-full bg-red-900/40 hover:bg-red-900/60 text-red-200 py-2 rounded font-bold text-xs transition-colors"
          >
            Revoke Session
          </button>
        </div>
      ) : (
        <div className="text-sm">
          <p className="text-gray-300 mb-3">Enable 1-click purchases for 24 hours.</p>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-400">Limit (SOL):</span>
            <input 
              type="number" 
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white w-20"
              step="0.1"
            />
          </div>
          <button 
            onClick={handleCreateSession}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded font-bold text-xs transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Enable 1-Click Play'}
          </button>
        </div>
      )}
    </div>
  );
}
