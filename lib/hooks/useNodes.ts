import { useState, useEffect } from 'react'

export interface PostNode {
    id: string
    name: string
    slug: string
}

let cachedNodes: PostNode[] | null = null
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useNodes() {
    const [nodes, setNodes] = useState<PostNode[]>(cachedNodes || [])
    const [isLoading, setIsLoading] = useState(!cachedNodes)

    useEffect(() => {
        const fetchNodes = async () => {
            const now = Date.now()
            if (cachedNodes && (now - lastFetchTime < CACHE_DURATION)) {
                setNodes(cachedNodes)
                setIsLoading(false)
                return
            }

            try {
                const response = await fetch('/api/nodes')
                const data = await response.json()
                if (data.success) {
                    cachedNodes = data.data
                    lastFetchTime = now
                    setNodes(data.data)
                }
            } catch (error) {
                console.error('Failed to fetch nodes:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchNodes()
    }, [])

    return { nodes, isLoading }
}
