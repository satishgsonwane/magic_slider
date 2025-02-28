import Papa from 'papaparse'
import type { CameraSettings, CameraResponse } from './types'
import { currentCameraSettings } from './state'
import { verifyCameraResponse } from './utils'

const INQUIRY_SLEEP = 150 // ms
let lastSentSettings: Record<string, CameraSettings> = {}
export let cameraResponses: Record<string, CameraResponse> = {}

export async function loadPresetSettings(position: number): Promise<CameraSettings | null> {
  //console.log(`Loading preset settings for position: ${position}`)
  try {
    const response = await fetch('/api/camera-settings')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const csvText = await response.text()
    //console.log('Received CSV data, first 100 chars:', csvText.substring(0, 100))
    
    return new Promise((resolve, reject) => {
      Papa.parse<CameraSettings>(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<CameraSettings>) => {
          // console.log('CSV Parse Results:', {
          //   rows: results.data.length,
          //   fields: results.meta.fields,
          //   sample: results.data[0]
          // })

          if (results.errors.length > 0) {
            console.error('CSV parsing errors:', results.errors)
          }

          const settings = results.data as CameraSettings[]
          const preset = settings.find(s => s.position === position)
          if (preset) {
            // Only include the fields from CSV
            const validatedPreset: CameraSettings = {
              position: Number(preset.position),
              iris: Number(preset.iris),
              exposuregain: Number(preset.exposuregain),
              shutterspeed: Number(preset.shutterspeed),
              brightness: Number(preset.brightness),
              exposuremode: preset.exposuremode
            }
            //console.log('Found and validated preset settings:', validatedPreset)
            resolve(validatedPreset)
          } else {
            console.warn(`No preset found for position ${position}`)
            resolve(null)
          }
        },
        error: (error: Error) => {
          console.error('CSV parsing error:', error)
          reject(error)
        }
      })
    })
  } catch (error) {
    console.error('Failed to load preset settings:', error)
    return null
  }
}

export async function sendCameraControl(
  cameraNumbers: number[],
  settings: CameraSettings,
  venue: number = 13,
  copies: number = 5,
  onStatus: (status: string) => void,
  onMessageSent?: (topic: string, message: any) => void
) {
  // Reset camera responses at the start of a new control sequence
  resetCameraResponses()
  
  // Add a status tracker for all cameras
  const cameraStatuses: Record<string, string> = {};
  
  // Create a function to update individual camera status and combine for all
  const updateStatus = (cameraNumber: number, message: string) => {
    cameraStatuses[cameraNumber.toString()] = message;
    
    // If we're controlling multiple cameras, show a combined status
    if (cameraNumbers.length > 1) {
      const statusMessages = Object.entries(cameraStatuses)
        .map(([cam, status]) => `Camera ${cam}: ${status}`)
        .join('\n');
      onStatus(statusMessages);
    } else {
      // For single camera, just show the message
      onStatus(message);
    }
  };

  // console.log('\n=== Starting Camera Control Sequence ===')
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/venue${venue}/engine/lut/nats`
  
  console.log('Constructed URL:', url)

  console.log('Current camera settings at start:', currentCameraSettings)

  // Add a function to store camera responses
  const storeCameraResponse = (cameraNumber: number, response: CameraResponse) => {
    cameraResponses[cameraNumber.toString()] = response;
    console.log(`Stored response for camera ${cameraNumber}:`, response);
  };
  
  // Pass this function to onMessageSent
  const handleMessageSent = (topic: string, message: any) => {
    console.log('handleMessageSent called with topic:', topic, 'message:', message);
    
    if (onMessageSent) {
      onMessageSent(topic, message);
    }
    
    // If this is a camera inquiry response, store it
    if (topic.startsWith('caminq.camera')) {
      console.log('Found camera inquiry response for topic:', topic);
      const cameraNumber = parseInt(topic.replace('caminq.camera', ''));
      console.log('Extracted camera number:', cameraNumber);
      storeCameraResponse(cameraNumber, message);
    } else {
      console.log('Topic does not match caminq.camera pattern:', topic);
    }
  };

  const cameraControlPromises = cameraNumbers.map(async (cameraNumber) => {
    console.log(`\n--- Processing Camera ${cameraNumber} ---`)
    let settingsApplied = false
    let retryCount = 0

    while (retryCount < copies && !settingsApplied) {
      try {
        // Send color control message
        const colorControlMessage = {
          eventName: `colour-control.camera${cameraNumber}`,
          eventData: {
            changeexposuremode: "1",
            exposuremode: "manual",
            iris: Math.round(settings.iris),
            exposuregain: Math.round(settings.exposuregain),
            shutterspeed: Math.round(settings.shutterspeed),
            brightness: Math.round(settings.brightness)
          }
        }

        console.log(`\nAttempt ${retryCount + 1}/${copies} for camera ${cameraNumber}`)
        console.log('Sending color control:', colorControlMessage)
        
        // Store the settings for later verification
        lastSentSettings[cameraNumber.toString()] = {
          position: cameraNumber,
          iris: Math.round(settings.iris),
          exposuregain: Math.round(settings.exposuregain),
          shutterspeed: Math.round(settings.shutterspeed),
          brightness: Math.round(settings.brightness),
          exposuremode: "manual"
        };
        console.log(`Stored settings for camera ${cameraNumber}:`, lastSentSettings[cameraNumber.toString()])

        await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(colorControlMessage)
        })

        handleMessageSent(`colour-control.camera${cameraNumber}`, colorControlMessage.eventData)

        // Send inquiry message
        const inquiryMessage = {
          eventName: `ptzcontrol.camera${cameraNumber}`,
          eventData: {
            inqcam: `${cameraNumber}`
          }
        }

        await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(inquiryMessage)
        })

        handleMessageSent(`ptzcontrol.camera${cameraNumber}`, inquiryMessage.eventData)

        // Wait for response with a longer timeout and polling for camera response
        console.log('Waiting for camera response...')
        let waitAttempts = 0
        const maxWaitAttempts = 10
        let cameraResponse = null;

        while (waitAttempts < maxWaitAttempts && !cameraResponse) {
          await new Promise(resolve => setTimeout(resolve, 300)) // 300ms per attempt
          cameraResponse = cameraResponses[cameraNumber.toString()];
          console.log(`Wait attempt ${waitAttempts + 1}/${maxWaitAttempts}, cameraResponse:`, cameraResponse)
          waitAttempts++
        }

        // Check if settings were applied using the local verification
        if (cameraResponse) {
          const localVerified = verifyLocalCameraResponse(cameraNumber, cameraResponse)
          if (localVerified) {
            console.log(`✓ Settings confirmed locally for camera ${cameraNumber}`)
            settingsApplied = true
            updateStatus(cameraNumber, `Settings applied successfully`);
          } else {
            console.log(`✗ Settings not confirmed for camera ${cameraNumber}`)
            updateStatus(cameraNumber, `Settings not confirmed (Attempt ${retryCount + 1}/${copies})`);
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        } else {
          console.warn(`No camera response received for camera ${cameraNumber} after ${maxWaitAttempts} attempts`)
          updateStatus(cameraNumber, `No response from Camera ${cameraNumber} (Attempt ${retryCount + 1}/${copies})`);
        }

        retryCount++
      } catch (error) {
        console.error(`Error in attempt ${retryCount + 1}:`, error)
        retryCount++
      }
    }

    // Final status update
    if (!settingsApplied) {
      updateStatus(cameraNumber, `Failed to apply settings after ${copies} attempts`);
    }
  })

  await Promise.all(cameraControlPromises)
  // console.log('=== Camera Control Sequence Completed ===')
}

async function checkCurrentSettings(cameraNumber: number, desiredSettings: CameraSettings): Promise<boolean> {
  if (!currentCameraSettings) return false;
  return verifyCameraResponse(cameraNumber, currentCameraSettings, desiredSettings);
}

export function verifyLocalCameraResponse(cameraNumber: number, response: CameraResponse): boolean {
  console.log(`\nVerifying response for camera ${cameraNumber}:`)
  console.log('Received response:', response)
  
  const lastSettings = lastSentSettings[cameraNumber.toString()]
  if (!lastSettings) {
    console.warn('No last settings found for comparison')
    return false
  }
  console.log('Comparing with last sent settings:', lastSettings)

  // Ensure we're comparing numbers, not strings
  const toleranceCheck = (received: number | string, sent: number | string) => {
    const receivedNum = typeof received === 'string' ? parseFloat(received) : received
    const sentNum = typeof sent === 'string' ? parseFloat(sent) : sent
    
    const receivedInt = Math.round(receivedNum)
    const sentInt = Math.round(sentNum)
    const diff = Math.abs(receivedInt - sentInt)
    const passed = diff === 0
    console.log(`Comparing ${sentInt} with ${receivedInt}: diff=${diff}, passed=${passed}`)
    return passed
  }

  const results = {
    iris: toleranceCheck(response.ExposureIris, lastSettings.iris),
    gain: toleranceCheck(response.ExposureGain, lastSettings.exposuregain),
    shutterSpeed: toleranceCheck(response.ExposureExposureTime, lastSettings.shutterspeed),
    brightness: toleranceCheck(response.DigitalBrightLevel, lastSettings.brightness),
    exposureMode: response.ExposureMode?.toLowerCase() === lastSettings.exposuremode?.toLowerCase()
  }

  console.log('Verification results:', results)
  const verified = Object.values(results).every(Boolean)
  console.log(`Final verification result: ${verified ? 'PASSED' : 'FAILED'}`)

  return verified
}

// Add this function to capture WebSocket responses
export function processCameraResponse(topic: string, data: any) {
  console.log('Processing camera response:', topic, data);
  
  if (topic.startsWith('caminq.camera')) {
    const cameraNumber = parseInt(topic.replace('caminq.camera', ''));
    console.log('Storing camera response for camera', cameraNumber);
    
    // First log the data structure to understand what we're working with
    console.log('Data structure:', JSON.stringify(data));
    
    // Convert the data to the expected CameraResponse format with null checks
    const response: CameraResponse = {
      ExposureMode: data?.ExposureMode || "manual",
      ExposureIris: Number(data?.ExposureIris || 0),
      ExposureGain: Number(data?.ExposureGain || 0),
      ExposureExposureTime: Number(data?.ExposureExposureTime || 0),
      DigitalBrightLevel: Number(data?.DigitalBrightLevel || 0)
    };
    
    // Store the response and log the entire cameraResponses object
    cameraResponses[cameraNumber.toString()] = response;
    console.log(`Stored camera response for camera ${cameraNumber}:`, response);
    console.log('All camera responses:', cameraResponses);
  }
}

// Add a function to reset the responses for a new control sequence
export function resetCameraResponses() {
  cameraResponses = {}
  console.log('Camera responses reset')
}