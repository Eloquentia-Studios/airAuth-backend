import fs from 'fs'
import type { SyncConfiguration } from '../types/SyncConfiguration'

let configuration: SyncConfiguration | null = null

/**
 * Initialize the sync service
 */
export const initSync = () => {
  const configPath = process.env.CONFIG_PATH || './config/config.json'
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  configuration = config.sync as SyncConfiguration

  // TODO: Check if the configuration is valid.

  // Check if the sync service is enabled.
  if (!configuration.enabled) {
    console.log('Sync service is disabled.')
    return
  } else console.log('Sync service is enabled.')
}
