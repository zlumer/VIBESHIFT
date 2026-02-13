'use client'

import { useWallet } from '@/lib/wallet'
import { getOrCreateSessionKey } from '@/lib/session'
import { useEffect } from 'react'

export function WalletButton() {
  const { publicKey, connect, disconnect } = useWallet()

  useEffect(() => {
    if (publicKey) {
      // Ensure a session key exists when wallet is connected
      getOrCreateSessionKey();
    }
  }, [publicKey])

  return (
    <div className="flex flex-col items-center">
      <button
        id="wallet-button"
        onClick={publicKey ? disconnect : connect}
        className="bg-white text-black px-4 py-2 rounded-full font-bold hover:bg-gray-200 transition text-sm shadow-[0_0_10px_rgba(255,255,255,0.3)]"
      >
        {publicKey 
          ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` 
          : 'Connect Wallet'}
      </button>
      {!publicKey && (
        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter opacity-60">
          Play free • Connect to pay
        </p>
      )}
    </div>
  )
}
