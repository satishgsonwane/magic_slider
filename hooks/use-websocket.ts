import { useEffect, useState } from 'react'
import { websocketService } from './websocket-service'
import type { MessagePayload } from '@/lib/types'

interface WebSocketState {
  isConnected: boolean
  lastMessage: MessagePayload | null
  error: Error | null
}

export function useWebSocketConnection() {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    lastMessage: null,
    error: null
  })

  useEffect(() => {
    const handleStatus = (status: string) => {
      if (status === 'WebSocket connected') {
        setState(prev => ({ ...prev, isConnected: true, error: null }))
      } else if (status === 'WebSocket disconnected') {
        setState(prev => ({ ...prev, isConnected: false }))
      } else if (status.includes('error')) {
        setState(prev => ({ ...prev, error: new Error(status) }))
      }
    }

    const handleMessage = (_topic: string, payload: MessagePayload) => {
      setState(prev => ({ ...prev, lastMessage: payload }))
    }

    websocketService.connect(handleStatus)
    websocketService.addMessageHandler(handleMessage)

    return () => {
      websocketService.removeMessageHandler(handleMessage)
      websocketService.disconnect()
    }
  }, [])

  return state
}
