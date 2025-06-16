/**
 * Camera settings and response types
 */
export interface CameraSettings {
  position?: number;
  iris: number;
  exposuregain: number;
  shutterspeed: number;
  brightness: number;
  exposuremode: string;
}

export interface CameraResponse {
  ExposureMode: string;
  ExposureIris: number;
  ExposureGain: number;
  ExposureExposureTime: number;
  DigitalBrightLevel: number;
}

export interface CameraInfo extends CameraResponse {
  ConnectionStatus: string;
  LastUpdated: string;
}

export interface CameraState {
  sliderPosition: number;
  selectedCamera: number | null;
  maxNatsMessages: string;
  status: string;
  venueNumber: string;
  maxSliderValue: number;
}

export interface CameraPreset {
  position: number;
  settings: CameraSettings;
}
