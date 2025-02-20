export interface CameraSettings {
  position: number
  iris: number
  exposuregain: number
  shutterspeed: number
  brightness: number
}

export interface CameraResponse {
  ExposureMode: string
  ExposureIris: number
  ExposureGain: number
  ExposureExposureTime: number
  DigitalBrightLevel: number
} 