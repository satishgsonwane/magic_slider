import Papa from 'papaparse'
import type { CameraSettings } from '../types'

export async function loadPresetSettings(position: number): Promise<CameraSettings | null> {
  try {
    const response = await fetch('/api/camera-settings')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const csvText = await response.text()
    
    return new Promise((resolve, reject) => {
      Papa.parse<CameraSettings>(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<CameraSettings>) => {
          if (results.errors.length > 0) {
            console.error('CSV parsing errors:', results.errors)
          }

          const settings = results.data as CameraSettings[]
          const preset = settings.find(s => s.position === position)
          if (preset) {
            const validatedPreset: CameraSettings = {
              position: Number(preset.position),
              iris: Number(preset.iris),
              exposuregain: Number(preset.exposuregain),
              shutterspeed: Number(preset.shutterspeed),
              brightness: Number(preset.brightness),
              exposuremode: preset.exposuremode
            }
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
