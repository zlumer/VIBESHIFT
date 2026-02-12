'use client'

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { generateGame, remix } from './actions';

function CreateContent() {
  const searchParams = useSearchParams();
  const remixId = searchParams.get('remixId');

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [originalCode, setOriginalCode] = useState<string | null>(null);

  useEffect(() => {
    if (remixId) {
      // Fetch the original game code
      // We assume games are served from /games/generated/GAME_ID.html or /games/remixed/GAME_ID.html
      // But we don't know the exact path. For now let's try generated.
      // Wait, DEMO_GAMES uses /games/flappy/index.html etc.
      // If remixId is a number (1, 2, 3), it's a demo game.
      // If it starts with "game-" or "remix-", it's generated.
      
      let url = '';
      if (remixId === '1') url = '/games/flappy/index.html';
      else if (remixId === '2') url = '/games/space/index.html';
      else if (remixId === '3') url = '/games/runner/index.html';
      else if (remixId.startsWith('game-')) url = `/games/generated/${remixId}.html`;
      else if (remixId.startsWith('remix-')) url = `/games/remixed/${remixId}.html`;

      if (url) {
        fetch(url)
          .then(res => res.text())
          .then(text => {
            setOriginalCode(text);
            setGameUrl(url); // Show the original game initially
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
        // If it was a remix, update originalCode for further remixing
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

  return (
    <div className="flex flex-col h-screen bg-black text-white p-4">
      <h1 className="text-2xl font-bold mb-4">
        {remixId ? 'Remix Studio' : 'Vibecoding Studio'}
      </h1>
      
      <div className="hidden" data-testid="debug-state">
        {JSON.stringify({ loading, promptLength: prompt.length, hasPrompt: !!prompt })}
      </div>

      <div className="flex gap-2 mb-4">
        <input 
          type="text" 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={remixId ? "How should we change this game?" : "Describe your game..."}
          className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-white"
          disabled={loading}
        />
        <button 
          onClick={handleGenerate}
          disabled={loading || !prompt}
          className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded font-bold disabled:opacity-50"
        >
          {loading ? 'Cooking...' : (remixId ? 'Remix It' : 'Vibe Code')}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-200 p-2 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex-1 bg-gray-900 rounded overflow-hidden border border-gray-800 relative">
        {gameUrl ? (
          <iframe 
            src={gameUrl} 
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            {loading ? 'Writing code...' : 'Enter a prompt to generate a game.'}
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
