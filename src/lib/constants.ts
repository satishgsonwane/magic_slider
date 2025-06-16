/**
 * Constants used throughout the application
 */

export const SOCKET = {
  URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:12553',
  RECONNECT: {
    MAX_ATTEMPTS: 5,
    BASE_DELAY: 1000,
    MAX_DELAY: 30000,
  },
} as const;

export const CAMERA = {
  CSV_URL: '/data/camera_settings_60.csv',
  MAX_MESSAGES: 5,
  DEFAULT_VENUE: '15',
  NUMBERS: [1, 2, 3, 4, 5, 6] as const,
} as const;

export const API = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  ROUTES: {
    CAMERA_SETTINGS: '/api/camera-settings',
    CAMERA_STATUS: '/api/camera-status',
  },
} as const;

export const THEME = {
  COOKIE_NAME: 'theme',
  DEFAULT: 'dark',
} as const;
