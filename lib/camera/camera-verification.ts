import type { CameraSettings, CameraResponse } from '../types'
import { currentCameraSettings } from '../state'
import { verifyCameraResponse } from '../utils'

let lastSentSettings: Record<string, CameraSettings> = {}

export function storeSettingsForVerification(cameraNumber: number, settings: CameraSettings) {
  lastSentSettings[cameraNumber.toString()] = {
    position: cameraNumber,
    iris: Math.round(settings.iris),
    exposuregain: Math.round(settings.exposuregain),
    shutterspeed: Math.round(settings.shutterspeed),
    brightness: Math.round(settings.brightness),
    exposuremode: "manual"
  };
}

export function verifyLocalCameraResponse(cameraNumber: number, response: CameraResponse): boolean {
  const lastSettings = lastSentSettings[cameraNumber.toString()]
  if (!lastSettings) {
    return false
  }

  const toleranceCheck = (received: number | string, sent: number | string) => {
    const receivedNum = typeof received === 'string' ? parseFloat(received) : received
    const sentNum = typeof sent === 'string' ? parseFloat(sent) : sent
    
    const receivedInt = Math.round(receivedNum)
    const sentInt = Math.round(sentNum)
    return Math.abs(receivedInt - sentInt) === 0
  }

  const results = {
    iris: toleranceCheck(response.ExposureIris, lastSettings.iris),
    gain: toleranceCheck(response.ExposureGain, lastSettings.exposuregain),
    shutterSpeed: toleranceCheck(response.ExposureExposureTime, lastSettings.shutterspeed),
    brightness: toleranceCheck(response.DigitalBrightLevel, lastSettings.brightness),
    exposureMode: response.ExposureMode?.toLowerCase() === lastSettings.exposuremode?.toLowerCase()
  }

  return Object.values(results).every(Boolean)
}

export async function checkCurrentSettings(cameraNumber: number, desiredSettings: CameraSettings): Promise<boolean> {
  if (!currentCameraSettings) return false;
  return verifyCameraResponse(cameraNumber, currentCameraSettings, desiredSettings);
}
