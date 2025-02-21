import Papa from 'papaparse'
import type { CameraSettings, CameraResponse } from './types'
import { currentCameraSettings } from './state'
import { verifyCameraResponse } from './utils'

const INQUIRY_SLEEP = 150 // ms
let lastSentSettings: Record<string, CameraSettings> = {}

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
            const validatedPreset = {
              position: Number(preset.position),
              iris: Number(preset.iris),
              exposuregain: Number(preset.exposuregain),
              shutterspeed: Number(preset.shutterspeed),
              brightness: Number(preset.brightness)
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
  onStatus: (status: string) => void
) {
  console.log('\n=== Starting Camera Control Sequence ===')
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/venue${venue}/engine/lut/nats`

  for (const cameraNumber of cameraNumbers) {
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
        
        await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(colorControlMessage)
        })

        // Send inquiry message
        const inquiryMessage = {
          eventName: `ptzcontrol.camera${cameraNumber}`,
          eventData: {
            inqcam: `camera${cameraNumber}`
          }
        }

        await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(inquiryMessage)
        })

        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 500))

        // Check if settings were applied
        if (currentCameraSettings) {
          const isVerified = await checkCurrentSettings(cameraNumber, settings)
          if (isVerified) {
            console.log(`✓ Settings confirmed for camera ${cameraNumber}`)
            settingsApplied = true
            onStatus(`Settings applied successfully for Camera ${cameraNumber}`)
            break
          }
        }

        retryCount++
        if (!settingsApplied) {
          console.log(`✗ Settings not confirmed for camera ${cameraNumber}`)
          onStatus(`Settings not confirmed (Attempt ${retryCount}/${copies}) for Camera ${cameraNumber}`)
          await new Promise(resolve => setTimeout(resolve, 100))
        }

      } catch (error) {
        console.error(`Error in attempt ${retryCount + 1}:`, error)
        retryCount++
      }
    }

    // Final status update
    if (!settingsApplied) {
      onStatus(`Failed to apply settings for Camera ${cameraNumber} after ${copies} attempts`)
    }
  }
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

  const toleranceCheck = (sent: number, received: number) => {
    const sentInt = Math.round(sent)
    const receivedInt = Math.round(received)
    const diff = Math.abs(sentInt - receivedInt)
    const passed = diff === 0
    console.log(`Comparing ${sentInt} with ${receivedInt}: diff=${diff}, passed=${passed}`)
    return passed
  }

  const results = {
    iris: toleranceCheck(response.ExposureIris, lastSettings.iris),
    gain: toleranceCheck(response.ExposureGain, lastSettings.exposuregain),
    shutterSpeed: toleranceCheck(response.ExposureExposureTime, lastSettings.shutterspeed),
    brightness: toleranceCheck(response.DigitalBrightLevel, lastSettings.brightness)
  }

  console.log('Verification results:', results)
  const verified = Object.values(results).every(Boolean)
  console.log(`Final verification result: ${verified ? 'PASSED' : 'FAILED'}`)

  return verified
}