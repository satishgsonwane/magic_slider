import type { CameraResponse } from './types'

export let currentCameraSettings: CameraResponse | null = null
export const updateCurrentSettings = (settings: CameraResponse) => {
  console.log('Updating currentCameraSettings to:', settings)
  currentCameraSettings = settings
  console.log('currentCameraSettings is now:', currentCameraSettings)
} 