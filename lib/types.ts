export interface CameraSettings {
  position?: number
  iris: number
  exposuregain: number
  shutterspeed: number
  brightness: number
  exposuremode: string
}

export interface CameraResponse {
  ExposureMode: string
  ExposureIris: number
  ExposureGain: number
  ExposureExposureTime: number
  DigitalBrightLevel: number
}

export interface ToastProps {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: "default" | "destructive"
  open?: boolean
}

export type ToastActionElement = React.ReactElement<{
  altText: string
  onClick: () => void
}>

export interface WebSocketMessage {
  topic: string
  payload: any
} 