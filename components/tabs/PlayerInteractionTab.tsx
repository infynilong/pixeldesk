'use client'

import PlayerProfileTab from './PlayerProfileTab'
import AiChatTab from './AiChatTab'

interface PlayerInteractionTabProps {
  collisionPlayer?: any
  isActive?: boolean
  isMobile?: boolean
  isTablet?: boolean
}

export default function PlayerInteractionTab({
  collisionPlayer,
  isActive = false,
  isMobile = false,
  isTablet = false
}: PlayerInteractionTabProps) {
  // 检查是否为 AI NPC
  const isNpc = collisionPlayer?.id?.toString().startsWith('npc_') ||
    collisionPlayer?.id?.toString().startsWith('dynamic_')

  console.log('🔄 [PlayerInteractionTab] Rendering:', {
    id: collisionPlayer?.id,
    name: collisionPlayer?.name,
    isNpc
  })

  if (isNpc) {
    return (
      <AiChatTab
        npcId={collisionPlayer.id}
        npcName={collisionPlayer.name}
        npcData={collisionPlayer}
        isActive={isActive}
      />
    )
  }

  // 默认显示玩家档案
  return (
    <PlayerProfileTab
      collisionPlayer={collisionPlayer}
      isActive={isActive}
      isMobile={isMobile}
      isTablet={isTablet}
    />
  )
}