/**
 * API route types
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export interface CameraSettingsResponse extends ApiResponse<{
  sliderPosition: number;
}> {}

export interface CameraStatusResponse extends ApiResponse<{
  [cameraNumber: string]: {
    ExposureMode: string;
    ExposureIris: string;
    ExposureGain: string;
    ExposureExposureTime: string;
    DigitalBrightLevel: string;
    ConnectionStatus: string;
    LastUpdated: string;
  };
}> {}

export interface ApiErrorResponse {
  error: string;
  status: number;
}
