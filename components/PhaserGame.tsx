'use client'

import { useRef } from 'react'

interface PhaserGameProps {
  onPlayerCollision: (playerData: any) => void
  onWorkstationBinding: (workstationData: any, userData: any) => void
  onPlayerClick: (playerData: any) => void
}

export default function PhaserGame({ onPlayerCollision, onWorkstationBinding, onPlayerClick }: PhaserGameProps) {
  const gameContainerRef = useRef<HTMLDivElement>(null)

  // Phaser game completely disabled for performance debugging
  // All game logic has been temporarily removed

  return (
    <div
      ref={gameContainerRef}
      className="w-full h-full flex items-center justify-center bg-gray-900 text-white"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">🧪 Phaser Game Disabled</h2>
        <p className="text-gray-400">Game engine temporarily disabled for performance optimization</p>
        <p className="text-sm text-gray-500 mt-2">This should significantly reduce CPU usage</p>
      </div>
    </div>
  )
}