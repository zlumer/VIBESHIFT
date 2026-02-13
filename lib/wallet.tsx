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

  useEffect(() => {
    // Check if we are in MOCK mode first
    if (typeof window !== 'undefined' && (window as any).MOCK_DATA) {
        console.log('wallet.tsx: MOCK_DATA detected, bypassing real wallet checks');
        const mockPk = '2u3VfD9N2nQG6xS6V7p3uN3G6xS6V7p3uN3G6xS6V7p3';
        try {
          setPublicKey(new PublicKey(mockPk));
        } catch (e) {
          console.error('wallet.tsx: failed to set mock public key', e);
        }
        return;
    }

    // Auto-connect if already authorized
    if (typeof window !== 'undefined' && localStorage.getItem('NEXT_PUBLIC_SKIP_PAYMENT') === 'true') {
        const mockPk = '2u3VfD9N2nQG6xS6V7p3uN3G6xS6V7p3uN3G6xS6V7p3';
        try {
          setPublicKey(new PublicKey(mockPk));
        } catch (e) {
          console.error('wallet.tsx: failed to set mock public key (legacy)', e);
        }
        return;
    }

    const { solana } = window as any
    if (solana?.isPhantom && solana.isConnected) {
      if (solana.publicKey) {
        setPublicKey(new PublicKey(solana.publicKey.toString()))
      }
    }
  }, [])

  const connect = async () => {
    console.log('wallet.tsx: connect() called');
    
    // Check if we are in MOCK mode
    if (typeof window !== 'undefined' && (window as any).MOCK_DATA) {
        console.log('wallet.tsx: MOCK_DATA detected in connect()');
        const mockPk = '2u3VfD9N2nQG6xS6V7p3uN3G6xS6V7p3uN3G6xS6V7p3';
        try {
          setPublicKey(new PublicKey(mockPk));
        } catch (e) {
          console.error('wallet.tsx: failed to set mock public key in connect()', e);
        }
        return;
    }

    // Check for MOCK mode (legacy check)
    if (typeof window !== 'undefined' && localStorage.getItem('NEXT_PUBLIC_SKIP_PAYMENT') === 'true') {
        const mockPk = '2u3VfD9N2nQG6xS6V7p3uN3G6xS6V7p3uN3G6xS6V7p3';
        try {
          setPublicKey(new PublicKey(mockPk));
        } catch (e) {
          console.error('wallet.tsx: failed to set mock public key in connect() (legacy)', e);
        }
        return;
    }

    const { solana } = window as any
    if (solana?.isPhantom) {
      console.log('wallet.tsx: Phantom detected');
      try {
        const response = await solana.connect()
        console.log('wallet.tsx: connected result', response);
        setPublicKey(new PublicKey(response.publicKey.toString()))
      } catch (err) {
        console.error('Connection failed', err)
      }
    } else {
      console.log('wallet.tsx: Phantom NOT detected');
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
