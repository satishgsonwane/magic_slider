"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useWebSocket } from "@/lib/websocket-context"
import { Badge } from "@/components/ui/badge"

interface CameraStatusProps {
  cameras: number[]
  venueNumber: string
}

interface CameraInfo {
  ExposureMode: string
  ExposureIris: string
  ExposureGain: string
  ExposureExposureTime: string
  DigitalBrightLevel: string
  ConnectionStatus: string
  LastUpdated: string
}

export default function CameraStatus({ cameras, venueNumber }: CameraStatusProps) {
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
      const intervalId = setInterval(fetchStatus, 5000) // Fetch status every 5 seconds
      return () => clearInterval(intervalId)
    }
  }, [socket, cameras, venueNumber])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cameras.map((cameraNumber) => (
        <Card key={cameraNumber}>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              Camera {cameraNumber}
              <Badge variant={status[cameraNumber]?.ConnectionStatus === "connected" ? "default" : "destructive"}>
                {status[cameraNumber]?.ConnectionStatus || "Unknown"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status[cameraNumber] ? (
              <div className="space-y-2">
                <div>
                  <strong>Exposure Mode:</strong> {status[cameraNumber].ExposureMode}
                </div>
                <div>
                  <strong>Iris:</strong> {status[cameraNumber].ExposureIris}
                </div>
                <div>
                  <strong>Gain:</strong> {status[cameraNumber].ExposureGain}
                </div>
                <div>
                  <strong>Shutter Speed:</strong> {status[cameraNumber].ExposureExposureTime}
                </div>
                <div>
                  <strong>Brightness:</strong> {status[cameraNumber].DigitalBrightLevel}
                </div>
                <div>
                  <strong>Last Updated:</strong> {status[cameraNumber].LastUpdated}
                </div>
              </div>
            ) : (
              <p>Loading status...</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

