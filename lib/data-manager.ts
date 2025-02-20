import { promises as fs } from "fs"

interface CameraSettings {
  sliderPosition: number
}

const SETTINGS_FILE = "camera_settings.json"

export async function loadCameraSettings(): Promise<CameraSettings> {
  try {
    const response = await fetch('/api/settings')
    return await response.json()
  } catch (error) {
    return { sliderPosition: 1 }
  }
}

export async function saveCameraSettings(settings: CameraSettings): Promise<void> {
  try {
    await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    })
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}

