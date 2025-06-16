import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { CameraInfo } from "./use-camera-status"

interface CameraCardProps {
  cameraNumber: number;
  status: CameraInfo | undefined;
}

export function CameraCard({ cameraNumber, status }: CameraCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Camera {cameraNumber}
          <Badge variant={status?.ConnectionStatus === "connected" ? "default" : "destructive"}>
            {status?.ConnectionStatus || "Unknown"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status ? (
          <div className="space-y-2">
            <div>
              <strong>Exposure Mode:</strong> {status.ExposureMode}
            </div>
            <div>
              <strong>Iris:</strong> {status.ExposureIris}
            </div>
            <div>
              <strong>Gain:</strong> {status.ExposureGain}
            </div>
            <div>
              <strong>Shutter Speed:</strong> {status.ExposureExposureTime}
            </div>
            <div>
              <strong>Brightness:</strong> {status.DigitalBrightLevel}
            </div>
            <div>
              <strong>Last Updated:</strong> {status.LastUpdated}
            </div>
          </div>
        ) : (
          <p>Loading status...</p>
        )}
      </CardContent>
    </Card>
  )
}
