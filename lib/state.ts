import type { CameraResponse } from './types'

export let currentCameraSettings: CameraResponse | null = null
export const updateCurrentSettings = (settings: CameraResponse) => {
  currentCameraSettings = settings
} 