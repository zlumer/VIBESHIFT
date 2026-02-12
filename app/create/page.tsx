'use client'

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { generateGame, remix, publishGame } from './actions';
import { useWallet } from '@/lib/wallet';
import { WalletButton } from '@/components/WalletButton';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

function CreateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const remixId = searchParams.get('remixId');
  const { publicKey } = useWallet();

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [generatedGameId, setGeneratedGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [originalCode, setOriginalCode] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (remixId) {
      // Fetch the original game code
      // Try to find it in Supabase first if it's a UUID
      // For now, demo games are 1, 2, 3
      let url = '';
      if (remixId === '1') url = '/games/flappy/index.html';
      else if (remixId === '2') url = '/games/space/index.html';
      else if (remixId === '3') url = '/games/runner/index.html';
      else if (remixId.startsWith('game-')) url = `/games/generated/${remixId}.html`;
      else if (remixId.startsWith('remix-')) url = `/games/remixed/${remixId}.html`;
      else url = `/games/generated/${remixId}.html`; // Default fallback

      if (url) {
        fetch(url)
          .then(res => res.text())
          .then(text => {
            setOriginalCode(text);
            setGameUrl(url);
          })
          .catch(err => console.error('Failed to load original game:', err));
      }
    }
  }, [remixId]);

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setError(null);
    setGameUrl(null);

    try {
      let result;
      if (originalCode && remixId) {
         result = await remix(originalCode, prompt);
      } else {
         result = await generateGame(prompt);
      }

      if (result.success && result.url) {
        setGameUrl(result.url);
        setGeneratedGameId(result.gameId);
        if (result.code) {
            setOriginalCode(result.code);
        }
      } else {
        setError(result.error || 'Failed to generate game.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!gameUrl || !publicKey || !generatedGameId) return;
    setPublishing(true);
    setError(null);

    try {
      // SPEC.md Requirement: $1 SOL fee for publishing
      const feeInSol = 0.005; // Approx $1 at $200 SOL
      
      const { solana } = window as any;
      if (!solana) throw new Error('Wallet not found');

      // BYPASS payment in test mode if needed
      const skipPayment = process.env.NEXT_PUBLIC_SKIP_PAYMENT === 'true' || 
                         (typeof window !== 'undefined' && localStorage.getItem('NEXT_PUBLIC_SKIP_PAYMENT') === 'true');

      if (skipPayment) {
          console.log('Skipping payment check for dev/test');
      } else {
        const connection = new Connection('https://api.devnet.solana.com');
        const transaction = new Transaction().add(
            SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey('VibeShiftTreasury111111111111111111111111'), // Placeholder Treasury
            lamports: feeInSol * LAMPORTS_PER_SOL,
            })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        alert(`Please sign the $1.00 (0.005 SOL) publishing fee transaction.`);
        const signed = await solana.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature);
        
        console.log('Publish fee paid:', signature);
      }

      const result = await publishGame({
        title: title || 'Untitled Vibe',
        bundleUrl: gameUrl,
        creatorWallet: publicKey.toBase58(),
        parentGameId: remixId || undefined,
        gameId: generatedGameId
      });

      if (result.success) {
        alert('Published Successfully!');
        router.push('/');
      } else {
        setError(result.error || 'Failed to publish.');
      }
    } catch (err: any) {
      console.error('Publish error:', err);
      setError(`Publish failed: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          {remixId ? 'Remix Studio' : 'Vibecoding Studio'}
        </h1>
        <div className="flex gap-4 items-center">
            <button onClick={() => router.push('/')} className="text-sm text-gray-400 hover:text-white">Cancel</button>
            <WalletButton />
        </div>
      </div>
      
      <div className="flex gap-2 mb-4">
        <input 
          type="text" 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={remixId ? "How should we change this game?" : "Describe your game..."}
          className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-white"
          disabled={loading || publishing}
        />
        <button 
          onClick={handleGenerate}
          disabled={loading || publishing || !prompt}
          className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded font-bold disabled:opacity-50"
        >
          {loading ? 'Cooking...' : (remixId ? 'Remix It' : 'Vibe Code')}
        </button>
      </div>

      {gameUrl && (
        <div id="publish-controls" className="flex gap-2 mb-4 items-center animate-in fade-in slide-in-from-top-2">
            <input 
                id="game-title-input"
                type="text"
                placeholder="Game Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
            />
            <button 
                id="publish-button"
                onClick={handlePublish}
                disabled={publishing || !publicKey}
                className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-bold text-sm disabled:opacity-50"
            >
                {publishing ? 'Publishing...' : 'Publish ($1)'}
            </button>
            {!publicKey && <p id="no-wallet-msg" className="text-xs text-yellow-500">Connect wallet to publish</p>}
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 text-red-200 p-2 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 bg-gray-900 rounded overflow-hidden border border-gray-800 relative shadow-2xl">
        {gameUrl ? (
          <iframe 
            src={gameUrl} 
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
            {loading ? (
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-12 h-12 bg-purple-600 rounded-full mb-4"></div>
                    <p>Writing your vibe into code...</p>
                </div>
            ) : (
                <p>Enter a prompt to generate a game.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateContent />
    </Suspense>
  );
}
