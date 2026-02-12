'use client'

import { useState } from 'react';
import { generateGame } from './actions';

export default function CreatePage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setError(null);
    setGameUrl(null);

    try {
      const result = await generateGame(prompt);
      if (result.success && result.url) {
        setGameUrl(result.url);
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
      <h1 className="text-2xl font-bold mb-4">Vibecoding Studio</h1>
      
      <div className="flex gap-2 mb-4">
        <input 
          type="text" 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your game (e.g., 'A platformer with a blue square jumping over red spikes')"
          className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-white"
          disabled={loading}
        />
        <button 
          onClick={handleGenerate}
          disabled={loading || !prompt}
          className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded font-bold disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Vibe Code'}
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
