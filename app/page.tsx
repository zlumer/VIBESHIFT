'use client'

import dynamic from 'next/dynamic'

// Dynamically import Swiper component to disable SSR for hydration errors
const GameFeed = dynamic(() => import('@/components/GameFeed'), {
  ssr: false,
  loading: () => <p className="text-center text-white p-10">Loading Feed...</p>,
})

export default function Home() {
  return (
    <main className="flex h-screen w-full flex-col bg-black overflow-hidden">
      <GameFeed />
    </main>
  )
}
