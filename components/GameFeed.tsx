'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Mousewheel, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'

// Mock Data (will come from Supabase)
const DEMO_GAMES = [
  { id: 1, title: 'Flappy Clone', preview: '/preview1.gif', bundle: '/games/flappy/index.html' },
  { id: 2, title: 'Space Dodging', preview: '/preview2.gif', bundle: '/games/space/index.html' },
  { id: 3, title: 'Pixel Runner', preview: '/preview3.gif', bundle: '/games/runner/index.html' },
]

export default function GameFeed() {
  const [activeGameId, setActiveGameId] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [lastScore, setLastScore] = useState<number | null>(null)

  // Handle Focus (Start Playing)
  const handleFocus = (gameId: number) => {
    setActiveGameId(gameId)
    setIsPlaying(true)
    setLastScore(null)
  }

  // Handle Exit (Stop Playing)
  const handleExit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveGameId(null)
    setIsPlaying(false)
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin if needed, but for now allow same-origin or localhost
      
      const { type, amount, score } = event.data;

      if (type === 'GAME_INIT') {
        console.log('Game initialized via SDK');
      } else if (type === 'GAME_PAYMENT') {
        console.log(`Payment triggered: ${amount} SOL`);
        // Mock Wallet Signature
        alert(`Requesting signature for ${amount} SOL... (Mock Success)`);
        console.log('Payment Success: Signature 0xMOCKSIG123');
        // Notify game back? Maybe postMessage back 'PAYMENT_SUCCESS'
        // event.source.postMessage({ type: 'PAYMENT_SUCCESS' }, event.origin);
      } else if (type === 'GAME_OVER') {
        console.log(`Game Over. Score: ${score}`);
        setLastScore(score);
        // Maybe exit game?
        // setIsPlaying(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="h-screen w-full bg-black text-white overflow-hidden relative">
      {/* If playing, show EXIT button overlay */}
      {isPlaying && (
        <div className="absolute top-4 left-4 z-50 flex gap-4">
          <button 
            onClick={handleExit}
            className="bg-red-600 px-4 py-2 rounded-full font-bold shadow-lg hover:bg-red-700 transition"
          >
            EXIT GAME
          </button>
          {lastScore !== null && (
             <div className="bg-yellow-500 text-black px-4 py-2 rounded-full font-bold">
               Last Score: {lastScore}
             </div>
          )}
        </div>
      )}

      <Swiper
        direction={'vertical'}
        slidesPerView={1}
        spaceBetween={0}
        mousewheel={true}
        pagination={{ clickable: true }}
        modules={[Mousewheel, Pagination]}
        className="h-full w-full"
        onSlideChange={() => {
          setActiveGameId(null) // Reset active game when scrolling
          setIsPlaying(false)
        }}
        // Disable swiping if user is actively playing (locked mode)
        allowTouchMove={!isPlaying}
      >
        {DEMO_GAMES.map((game) => (
          <SwiperSlide key={game.id} className="relative flex items-center justify-center h-full w-full bg-gray-900">
            {/* Conditional Rendering: GIF vs GAME */}
            {activeGameId === game.id ? (
              // ACTIVE GAME IFRAME
              <iframe
                src={game.bundle}
                className="w-full h-full border-none"
                // Important Sandbox permissions
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            ) : (
              // PREVIEW MODE (Click to Play)
              <div 
                className="flex flex-col items-center justify-center w-full h-full cursor-pointer bg-cover bg-center"
                style={{ backgroundImage: `url(${game.preview})` }} // Placeholder BG
                onClick={() => handleFocus(game.id)}
              >
                <div className="bg-black/50 p-6 rounded-xl text-center backdrop-blur-sm hover:bg-black/60 transition">
                  <h2 className="text-3xl font-bold mb-2">{game.title}</h2>
                  <p className="text-sm text-gray-300">Tap to Play</p>
                </div>
              </div>
            )}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}
