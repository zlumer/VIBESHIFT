'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Mousewheel, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import { supabase } from '@/lib/supabase'
import { WalletButton } from './WalletButton'

export default function GameFeed() {
  const [games, setGames] = useState<any[]>([])
  const [activeGameId, setActiveGameId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingGameId, setLoadingGameId] = useState<string | null>(null)
  const countdownTimer = useRef<NodeJS.Timeout | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    async function fetchGames() {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
      
      if (data && data.length > 0) {
        setGames(data)
        // Pre-fetch the first 3 game bundles
        data.slice(0, 3).forEach(game => {
          if (game.s3_bundle_url) {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = game.s3_bundle_url;
            link.as = 'document';
            document.head.appendChild(link);
          }
        });
      }
      setLoading(false)
    }
    fetchGames()
  }, [])

  // Handle Focus (Start Playing)
  const handleFocus = (gameId: string) => {
    if (countdownTimer.current) {
        clearTimeout(countdownTimer.current);
        countdownTimer.current = null;
    }
    setCountdown(null);
    setLoadingGameId(null);
    setActiveGameId(gameId)
    setIframeLoaded(false)
    setIsPlaying(true)
    setLastScore(null)

    // Stop feed background audio when game starts
    if (audioRef.current) {
        audioRef.current.pause();
    }
  }

  // Handle Slide Change
  const handleSlideChange = (swiper: any) => {
    const game = games[swiper.activeIndex];
    
    // Clear previous
    if (countdownTimer.current) {
        clearTimeout(countdownTimer.current);
    }
    setCountdown(null);
    setActiveGameId(null);
    setIframeLoaded(false);
    setIsPlaying(false);
    setLoadingGameId(null);

    // Audio management: Feed scroll should have a "background vibe" if possible
    if (audioRef.current) {
        audioRef.current.play().catch(() => {
            console.log('Autoplay blocked, waiting for interaction');
        });
    }

    if (game) {
        setLoadingGameId(game.id);
        setCountdown(5);

        // Pre-fetch NEXT game
        const nextGame = games[swiper.activeIndex + 1];
        if (nextGame && nextGame.s3_bundle_url) {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = nextGame.s3_bundle_url;
            link.as = 'document';
            document.head.appendChild(link);
        }
        
        let timeLeft = 5;
        const interval = setInterval(() => {
            timeLeft -= 1;
            setCountdown(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(interval);
                setActiveGameId(game.id);
                setIframeLoaded(false);
                setCountdown(null);
            }
        }, 1000);
        
        countdownTimer.current = interval;
    }
  };

  // Handle Exit (Stop Playing)
  const handleExit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveGameId(null)
    setIsPlaying(false)
  }

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate origin if needed, but for now allow same-origin or localhost
      
      const { type, amount, score } = event.data;

      if (type === 'GAME_INIT') {
        console.log('Game initialized via SDK');
      } else if (type === 'GAME_PAYMENT') {
        console.log(`Payment triggered: ${amount} SOL`);
        
        try {
            // In a real session key flow, this would be auto-signed.
            // For now, we mock the split logic call.
            const result = await fetch('/api/payment/split', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    gameId: activeGameId,
                    senderWallet: 'MOCK_WALLET' 
                })
            }).then(res => res.json());

            console.log('Split payment processed:', result);
            
            // Notify game back
            if (event.source) {
              (event.source as Window).postMessage({ type: 'PAYMENT_SUCCESS' }, { targetOrigin: '*' });
            }
        } catch (err) {
            console.error('Payment processing failed', err);
        }

      } else if (type === 'GAME_OVER') {
        console.log(`Game Over. Score: ${score}`);
        setLastScore(score);
        // Maybe exit game?
        // setIsPlaying(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeGameId]);

  return (
    <div className="h-screen w-full bg-black text-white overflow-hidden relative font-sans">
      <audio 
        ref={audioRef}
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" 
        loop 
        autoPlay 
      />
      {/* Wallet Button */}
      {!isPlaying && (
        <div className="absolute top-4 right-4 z-50">
          <WalletButton />
        </div>
      )}

      {/* If playing, show EXIT button overlay */}
      {isPlaying && (
        <div className="absolute top-4 left-4 z-50 flex flex-wrap gap-2 md:gap-4 items-center">
          <button 
            onClick={handleExit}
            className="bg-red-600 px-4 py-2 rounded-full font-bold shadow-lg hover:bg-red-700 transition text-xs md:text-sm uppercase tracking-wider"
          >
            EXIT GAME
          </button>
          
          <button 
            onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/create?remixId=${activeGameId}`;
            }}
            className="bg-purple-600 px-4 py-2 rounded-full font-bold shadow-lg hover:bg-purple-700 transition flex items-center gap-2 text-xs md:text-sm uppercase tracking-wider"
          >
            <span>⚡ REMIX</span>
          </button>

          {lastScore !== null && (
             <div className="bg-yellow-500 text-black px-4 py-2 rounded-full font-bold text-xs md:text-sm animate-bounce">
               SCORE: {lastScore}
             </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="h-full w-full flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-purple-400 font-medium animate-pulse uppercase tracking-widest text-xs">Vibing the feed...</p>
        </div>
      ) : (
        <Swiper
          direction={'vertical'}
          slidesPerView={1}
          spaceBetween={0}
          mousewheel={true}
          pagination={{ clickable: true }}
          modules={[Mousewheel, Pagination]}
          className="h-full w-full"
          onSlideChange={handleSlideChange}
          onInit={(swiper) => handleSlideChange(swiper)}
          allowTouchMove={!isPlaying}
          touchStartPreventDefault={false}
          noSwiping={isPlaying}
        >
          {games.map((game) => (
            <SwiperSlide key={game.id} className="relative flex items-center justify-center h-full w-full bg-black">
              <div 
                className="flex flex-col items-center justify-center w-full h-full cursor-pointer bg-cover bg-center group relative overflow-hidden"
                style={{ backgroundImage: `url(${game.gif_preview_url || 'https://placehold.co/600x400?text=Vibeshift'})` }}
                onClick={() => handleFocus(game.id)}
              >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500" />
                
                {countdown !== null && loadingGameId === game.id && (
                  <div className="absolute top-1/4 left-1/2 -translate-x-1/2 bg-purple-600/80 px-6 py-2 rounded-full backdrop-blur-md border border-white/20 animate-bounce z-10">
                      <p className="text-white font-black text-xl">Starting in {countdown}...</p>
                  </div>
                )}

                <div className="relative bg-black/60 p-8 rounded-2xl text-center backdrop-blur-md border border-white/10 group-hover:border-purple-500/50 transition-all transform group-hover:scale-105 duration-500 shadow-2xl z-10">
                  <h2 className="text-4xl font-black mb-3 tracking-tighter italic uppercase text-white drop-shadow-lg">{game.title}</h2>
                  <div className="flex flex-col items-center">
                      <div className="h-1 w-12 bg-purple-500 mb-4 rounded-full group-hover:w-24 transition-all duration-500" />
                      <p className="text-xs text-purple-300 font-bold uppercase tracking-[0.3em] animate-pulse">Tap to Play</p>
                  </div>
                </div>

                {activeGameId === game.id && (
                  <div className={`absolute inset-0 z-20 transition-opacity duration-1000 ${iframeLoaded ? 'opacity-100' : 'opacity-0'}`}>
                    <iframe
                      src={game.s3_bundle_url}
                      className="w-full h-full border-none"
                      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      onLoad={() => setIframeLoaded(true)}
                    />
                  </div>
                )}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </div>
  )
}
