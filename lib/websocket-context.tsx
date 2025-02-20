"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useToast } from "@/components/ui/use-toast"
import { verifyCameraResponse } from './camera-control'

interface WebSocketContextType {
  status: string
  setStatus: (status: string) => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState("Waiting for camera response...")
  const { toast } = useToast()
  
  useEffect(() => {
    console.log('Initializing WebSocket connection...')
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:12555')
    
    ws.onopen = () => {
      console.log('WebSocket connection established')
    }

    ws.onclose = () => {
      console.log('WebSocket connection closed')
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    ws.onmessage = (event) => {
      console.log('\nReceived WebSocket message:', event.data)
      const data = JSON.parse(event.data)
      
      if (data.topic?.startsWith('caminq.camera')) {
        const cameraNumber = parseInt(data.topic.replace('caminq.camera', ''))
        console.log(`Processing camera inquiry response for camera ${cameraNumber}:`, data.payload)
        
        // Parse all values as integers
        currentCameraSettings = {
          ExposureMode: data.payload.ExposureMode,
          ExposureIris: Math.round(Number(data.payload.ExposureIris)),
          ExposureGain: Math.round(Number(data.payload.ExposureGain)),
          ExposureExposureTime: Math.round(Number(data.payload.ExposureExposureTime)),
          DigitalBrightLevel: Math.round(Number(data.payload.DigitalBrightLevel))
        }
        console.log('Parsed camera settings:', currentCameraSettings)
        
        const isVerified = verifyCameraResponse(cameraNumber, currentCameraSettings)
        
        if (!isVerified) {
          console.warn(`Settings mismatch detected for camera ${cameraNumber}`)
          toast({
            title: `Camera ${cameraNumber} Settings Mismatch`,
            description: "Received settings do not match sent values",
            variant: "destructive",
          })
          setStatus(`Settings mismatch detected for Camera ${cameraNumber}`)
        } else {
          console.log(`Settings verified for camera ${cameraNumber}`)
          setStatus(`Settings verified for Camera ${cameraNumber}`)
        }
      }
    }

    return () => {
      console.log('Cleaning up WebSocket connection')
      ws.close()
    }
  }, [toast])

  return (
    <WebSocketContext.Provider value={{ status, setStatus }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

