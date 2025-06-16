import type { CameraResponse } from '../types'

export let cameraResponses: Record<string, CameraResponse> = {}

export function processCameraResponse(topic: string, data: any) {
  if (topic.startsWith('caminq.camera')) {
    const cameraNumber = parseInt(topic.replace('caminq.camera', ''));
    
    const response: CameraResponse = {
      ExposureMode: data?.ExposureMode || "manual",
      ExposureIris: Number(data?.ExposureIris || 0),
      ExposureGain: Number(data?.ExposureGain || 0),
      ExposureExposureTime: Number(data?.ExposureExposureTime || 0),
      DigitalBrightLevel: Number(data?.DigitalBrightLevel || 0)
    };
    
    cameraResponses[cameraNumber.toString()] = response;
  }
}

export function resetCameraResponses() {
  cameraResponses = {}
}

export async function waitForCameraResponse(cameraNumber: number) {
  let waitAttempts = 0
  const maxWaitAttempts = 5
  let cameraResponse = null;

  while (waitAttempts < maxWaitAttempts && !cameraResponse) {
    await new Promise(resolve => setTimeout(resolve, 300))
    cameraResponse = cameraResponses[cameraNumber.toString()];
    waitAttempts++
  }
  
  return cameraResponse;
}
