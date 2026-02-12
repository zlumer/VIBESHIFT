'use client'

import { useWallet } from '@/lib/wallet'

export function WalletButton() {
  const { publicKey, connect, disconnect } = useWallet()

  return (
    <button
      onClick={publicKey ? disconnect : connect}
      className="bg-white text-black px-4 py-2 rounded-full font-bold hover:bg-gray-200 transition text-sm"
    >
      {publicKey 
        ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` 
        : 'Connect Wallet'}
    </button>
  )
}
