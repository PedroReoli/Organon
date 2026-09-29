import appMetadata from '../../../app.json'

// Application config
export const APP_VERSION = __APP_VERSION__

export const APP_CONFIG = {
  version: APP_VERSION,
  name: appMetadata.name,
} as const
