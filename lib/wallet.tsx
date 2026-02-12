'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Connection, PublicKey } from '@solana/web3.js'

interface WalletContextType {
  publicKey: PublicKey | null
  connected: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null)

  const connect = async () => {
    const { solana } = window as any
    if (solana?.isPhantom) {
      try {
        const response = await solana.connect()
        setPublicKey(new PublicKey(response.publicKey.toString()))
      } catch (err) {
        console.error('Connection failed', err)
      }
    } else {
      alert('Please install Phantom wallet')
    }
  }

  const disconnect = async () => {
    const { solana } = window as any
    if (solana) {
      await solana.disconnect()
      setPublicKey(null)
    }
  }

  return (
    <WalletContext.Provider value={{ publicKey, connected: !!publicKey, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) throw new Error('useWallet must be used within WalletProvider')
  return context
}
