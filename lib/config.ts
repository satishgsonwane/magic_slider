export const config = {
  websocket: {
    url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:12553',
    reconnectAttempts: 5,
    heartbeatInterval: 30000, // 30 seconds
  },
  camera: {
    defaultVenue: "15",
    availableCameras: [1, 2, 3, 4, 5, 6],
    maxRetryAttempts: 5,
    retryDelayBase: 100, // Base delay for exponential backoff
    maxRetryDelay: 2000, // Maximum delay between retries
  },
  csv: {
    url: "/data/camera_settings_60.csv",
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
} as const

export type Config = typeof config
