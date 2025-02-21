"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useToast } from "@/components/ui/use-toast"
import { verifyCameraResponse } from './utils'
import { updateCurrentSettings } from './state'

interface WebSocketContextType {
  status: string
  setStatus: (status: string) => void
  isConnected: boolean
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState("Waiting for camera response...")
  const [isConnected, setIsConnected] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:12553'
    console.log('Attempting WebSocket connection to:', wsUrl)
    
    let ws: WebSocket

    try {
      ws = new WebSocket(wsUrl)
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      setStatus('WebSocket connection failed')
      return
    }

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Send ping every 30 seconds

    ws.onopen = () => {
      console.log('WebSocket connection established')
      setIsConnected(true)
      setStatus('Connected')
      try {
        ws.send(JSON.stringify({ test: 'connection' }))
        console.log('Sent initial test connection message')
      } catch (error) {
        console.error('Error sending test message:', error)
      }
    }

    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason)
      setIsConnected(false)
      setStatus('Disconnected')
    }

    ws.onerror = (error) => {
      console.error('WebSocket error occurred:', error)
      setStatus('Error in connection')
    }

    ws.onmessage = (event) => {
      console.log('Raw WebSocket message received:', event.data)
      
      let data
      try {
        data = JSON.parse(event.data)
        console.log('Parsed WebSocket message:', data)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
        return
      }

      if (!data) {
        console.warn('Received empty or invalid message')
        return
      }

      if (data.topic?.startsWith('ptzcontrol.camera')) {
        console.log(`Processing camera message:`, data)
        const cameraNumber = parseInt(data.topic.replace('ptzcontrol.camera', ''))

        if (!data.payload) {
          console.warn('Received message without payload')
          return
        }

        try {
          updateCurrentSettings({
            ExposureMode: data.payload.ExposureMode,
            ExposureIris: Math.round(Number(data.payload.ExposureIris)),
            ExposureGain: Math.round(Number(data.payload.ExposureGain)),
            ExposureExposureTime: Math.round(Number(data.payload.ExposureExposureTime)),
            DigitalBrightLevel: Math.round(Number(data.payload.DigitalBrightLevel))
          })

          const desiredSettings = {
            position: cameraNumber,
            iris: data.payload.ExposureIris,
            exposuregain: data.payload.ExposureGain,
            shutterspeed: data.payload.ExposureExposureTime,
            brightness: data.payload.DigitalBrightLevel
          }

          const isVerified = verifyCameraResponse(cameraNumber, data.payload, desiredSettings)

          if (!isVerified) {
            console.warn(`Settings mismatch for camera ${cameraNumber}:`, {
              received: data.payload,
              desired: desiredSettings
            })
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
        } catch (error) {
          console.error('Error processing camera settings:', error)
        }
      }
    }

    return () => {
      console.log('Cleaning up WebSocket connection')
      clearInterval(pingInterval)
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [toast])

  return (
    <WebSocketContext.Provider value={{ status, setStatus, isConnected }}>
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

