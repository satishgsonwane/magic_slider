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

export type MessagePayload = 
  | { type: 'cameraStatus'; cameraNumber: number; status: CameraResponse }
  | { type: 'error'; message: string }
  | { type: 'connectionStatus'; status: 'connected' | 'disconnected' }

export interface WebSocketMessage {
  topic: string
  payload: MessagePayload
}

export interface CameraControlState {
  isLoading: boolean
  error: Error | null
  sliderPosition: number
  selectedCamera: number | null
  maxNatsMessages: string
  status: string
  venueNumber: string
  maxSliderValue: number
} 