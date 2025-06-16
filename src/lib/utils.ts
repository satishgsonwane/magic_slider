import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CameraResponse, CameraSettings } from './types'

let lastSentSettings: Record<string, CameraSettings> = {}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function verifyCameraResponse(cameraNumber: number, response: CameraResponse, desiredSettings: CameraSettings): boolean {
  console.log(`\nVerifying response for camera ${cameraNumber}:`)
  console.log('Received response:', response)
  console.log('Desired settings:', desiredSettings)

  const toleranceCheck = (received: number, desired: number) => {
    const receivedInt = Math.round(received)
    const desiredInt = Math.round(desired)
    const diff = Math.abs(receivedInt - desiredInt)
    const passed = diff === 0
    return { passed, diff }
  }

  const results = {
    iris: toleranceCheck(response.ExposureIris, desiredSettings.iris),
    gain: toleranceCheck(response.ExposureGain, desiredSettings.exposuregain),
    shutterSpeed: toleranceCheck(response.ExposureExposureTime, desiredSettings.shutterspeed),
    brightness: toleranceCheck(response.DigitalBrightLevel, desiredSettings.brightness)
  }

  const mismatchedSettings = Object.entries(results)
    .filter(([_, result]) => !result.passed)
    .map(([key, result]) => ({ key, diff: result.diff }))

  if (mismatchedSettings.length > 0) {
    console.error('Mismatched settings:', mismatchedSettings)
  }

  const verified = mismatchedSettings.length === 0
  console.log(`Final verification result: ${verified ? 'PASSED' : 'FAILED'}`)

  return verified
}
