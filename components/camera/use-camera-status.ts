import { useState, useEffect } from "react"
import { useWebSocket } from "@/lib/websocket-context"

export interface CameraInfo {
  ExposureMode: string
  ExposureIris: string
  ExposureGain: string
  ExposureExposureTime: string
  DigitalBrightLevel: string
  ConnectionStatus: string
  LastUpdated: string
}

export function useCameraStatus(cameras: number[], venueNumber: string) {
  const [status, setStatus] = useState<Record<number, CameraInfo>>({})
  const socket = useWebSocket()

  useEffect(() => {
    if (socket) {
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === "cameraStatus") {
          setStatus((prevStatus) => ({
            ...prevStatus,
            [data.cameraNumber]: {
              ...prevStatus[data.cameraNumber],
              ...data.status,
              LastUpdated: new Date().toLocaleTimeString(),
            },
          }))
        }
      }
    }

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/camera-status?cameras=${cameras.join(",")}&venue=${venueNumber}`)
        const data = await response.json()
        setStatus(data)
      } catch (error) {
        console.error("Error fetching camera status:", error)
      }
    }

    if (cameras.length > 0) {
      fetchStatus()
      const intervalId = setInterval(fetchStatus, 5000)
      return () => clearInterval(intervalId)
    }
  }, [socket, cameras, venueNumber])

  return status
}
