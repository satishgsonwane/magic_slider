import type { CameraSettings } from './types'
import * as CameraResponseHandler from './camera/camera-response-handler'
import * as CameraVerification from './camera/camera-verification'
import * as CameraMessaging from './camera/camera-messaging'
import { loadPresetSettings } from './camera/camera-settings-loader'

export { loadPresetSettings } from './camera/camera-settings-loader'
export { processCameraResponse, resetCameraResponses } from './camera/camera-response-handler'
export { verifyLocalCameraResponse } from './camera/camera-verification'

export async function sendCameraControl(
  cameraNumbers: number[],
  settings: CameraSettings,
  venue: number = 13,
  copies: number = 5,
  onStatus: (status: string) => void,
  onMessageSent?: (topic: string, message: any) => void
) {
  CameraResponseHandler.resetCameraResponses()
  
  const cameraStatuses: Record<string, string> = {};
  const updateStatus = createStatusUpdater(cameraNumbers, cameraStatuses, onStatus);
  
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/venue${venue}/engine/lut/nats`
  const cameraControlPromises = cameraNumbers.map(cameraNumber => 
    processSingleCamera(cameraNumber, settings, url, copies, updateStatus, onMessageSent)
  );

  await Promise.all(cameraControlPromises)
}

function createStatusUpdater(
  cameraNumbers: number[], 
  cameraStatuses: Record<string, string>,
  onStatus: (status: string) => void
) {
  return (cameraNumber: number, message: string) => {
    cameraStatuses[cameraNumber.toString()] = message;
    
    if (cameraNumbers.length > 1) {
      const statusMessages = Object.entries(cameraStatuses)
        .map(([cam, status]) => `Camera ${cam}: ${status}`)
        .join('\n');
      onStatus(statusMessages);
    } else {
      onStatus(message);
    }
  };
}

async function processSingleCamera(
  cameraNumber: number,
  settings: CameraSettings,
  url: string,
  copies: number,
  updateStatus: (cameraNumber: number, message: string) => void,
  onMessageSent?: (topic: string, message: any) => void
) {
  let settingsApplied = false
  let retryCount = 0
  const headers = new Headers({ 'Content-Type': 'application/json' })

  while (retryCount < copies && !settingsApplied) {
    try {
      CameraVerification.storeSettingsForVerification(cameraNumber, settings);
      
      await CameraMessaging.sendColorControlMessage(cameraNumber, settings, url, headers, onMessageSent);
      await CameraMessaging.sendInquiryMessage(cameraNumber, url, headers, onMessageSent);
      
      const cameraResponse = await CameraResponseHandler.waitForCameraResponse(cameraNumber);
      
      if (cameraResponse) {
        const localVerified = CameraVerification.verifyLocalCameraResponse(cameraNumber, cameraResponse)
        if (localVerified) {
          settingsApplied = true
          updateStatus(cameraNumber, `Settings applied successfully`);
        } else {
          updateStatus(cameraNumber, `Settings not confirmed (Attempt ${retryCount + 1}/${copies})`);
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } else {
        updateStatus(cameraNumber, `No response from Camera ${cameraNumber} (Attempt ${retryCount + 1}/${copies})`);
      }
      
      retryCount++
    } catch (error) {
      console.error(`Error in attempt ${retryCount + 1}:`, error)
      retryCount++
    }
  }

  if (!settingsApplied) {
    updateStatus(cameraNumber, `Failed to apply settings after ${copies} attempts`);
  }
}
