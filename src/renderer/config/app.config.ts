import appMetadata from '../../../app.json'

// Application config
// VERSAO APP
export const APP_VERSION = appMetadata.version

export const APP_CONFIG = {
  version: APP_VERSION,
  name: appMetadata.name,
} as const
