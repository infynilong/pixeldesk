declare global {
  interface Window {
    setWorkstationBindingModal: (modalState: any) => void
    showWorkstationInfo: (workstationId: string, userId: string) => void
    onPlayerCollision: (playerData: any) => void
    onWorkstationBinding: (workstationData: any, userData: any) => void
    onPlayerClick: (playerData: any) => void
    gameScene: any
    workstationBindingManager: any
    saveGameScene: (scene: any) => void
  }
}

export { }