"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useToast } from "@/components/ui/use-toast"
import { verifyCameraResponse } from './camera-control'
import { updateCurrentSettings } from './state'

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
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:12553')
    
    ws.onopen = () => {
      console.log('WebSocket connection established')
      ws.send(JSON.stringify({ test: 'connection' }))
    }

    ws.onclose = () => {
      console.log('WebSocket connection closed')
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    ws.onmessage = (event) => {
      console.log('Received WebSocket message:', event.data);
      const data = JSON.parse(event.data);
      console.log('Parsed message data:', data); // Log the parsed data
      
      if (data.topic?.startsWith('ptzcontrol.camera')) {
        console.log(`Processing inquiry response for camera: ${data.topic}`);
        const cameraNumber = parseInt(data.topic.replace('ptzcontrol.camera', ''));
        
        // Log the received payload
        console.log('Received payload:', data.payload);
        
        // Update current settings with parsed integers
        updateCurrentSettings({
          ExposureMode: data.payload.ExposureMode,
          ExposureIris: Math.round(Number(data.payload.ExposureIris)),
          ExposureGain: Math.round(Number(data.payload.ExposureGain)),
          ExposureExposureTime: Math.round(Number(data.payload.ExposureExposureTime)),
          DigitalBrightLevel: Math.round(Number(data.payload.DigitalBrightLevel))
        });
        
        console.log('Parsed camera settings:', data.payload);
        
        // Call verifyCameraResponse
        const isVerified = verifyCameraResponse(cameraNumber, data.payload);
        
        if (!isVerified) {
          console.warn(`Settings mismatch detected for camera ${cameraNumber}`);
          toast({
            title: `Camera ${cameraNumber} Settings Mismatch`,
            description: "Received settings do not match sent values",
            variant: "destructive",
          });
          setStatus(`Settings mismatch detected for Camera ${cameraNumber}`);
        } else {
          console.log(`Settings verified for camera ${cameraNumber}`);
          setStatus(`Settings verified for Camera ${cameraNumber}`);
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

