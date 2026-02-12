
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
  
  // Handle Focus (Start Playing)
  const handleFocus = (gameId: number) => {
    setActiveGameId(gameId)
    setIsPlaying(true)
  }

  // Handle Exit (Stop Playing)
  const handleExit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveGameId(null)
    setIsPlaying(false)
  }

  return (
    <div className="h-screen w-full bg-black text-white overflow-hidden">
      {/* If playing, show EXIT button overlay */}
      {isPlaying && (
        <button 
          onClick={handleExit}
          className="absolute top-4 left-4 z-50 bg-red-600 px-4 py-2 rounded-full font-bold shadow-lg"
        >
          EXIT GAME
        </button>
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
                sandbox="allow-scripts allow-same-origin allow-popups"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            ) : (
              // PREVIEW MODE (Click to Play)
              <div 
                className="flex flex-col items-center justify-center w-full h-full cursor-pointer bg-cover bg-center"
                style={{ backgroundImage: `url(${game.preview})` }} // Placeholder BG
                onClick={() => handleFocus(game.id)}
              >
                <div className="bg-black/50 p-6 rounded-xl text-center backdrop-blur-sm">
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
