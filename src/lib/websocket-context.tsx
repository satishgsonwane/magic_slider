"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { websocketService } from './websocket-service'

interface WebSocketContextType {
  status: string
  sendMessage: (topic: string, message: any) => void
}

const WebSocketContext = createContext<WebSocketContextType>({
  status: 'Initializing...',
  sendMessage: () => {},
})

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState("Waiting for camera response...")

  useEffect(() => {
    // Connect to WebSocket and set up status handler
    websocketService.connect(setStatus)
    
    // Clean up on unmount
    return () => {
      websocketService.disconnect()
    }
  }, [])

  const sendMessage = (topic: string, message: any) => {
    // Implementation would depend on your WebSocket service's capabilities
    console.log('Would send message to topic:', topic, message)
  }

  const contextValue = {
    status,
    sendMessage,
  }

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  return useContext(WebSocketContext)
}

