"use client"

import { CameraCard } from "./camera/camera-card"
import { useCameraStatus } from "./camera/use-camera-status"

interface CameraStatusProps {
  cameras: number[]
  venueNumber: string
}

export default function CameraStatus({ cameras, venueNumber }: CameraStatusProps) {
  const status = useCameraStatus(cameras, venueNumber)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cameras.map((cameraNumber) => (
        <CameraCard
          key={cameraNumber}
          cameraNumber={cameraNumber}
          status={status[cameraNumber]}
        />
      ))}
    </div>
  )
}

