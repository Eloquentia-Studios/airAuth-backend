import fs from 'fs'
import { z } from 'zod'
import { connectToServers, startWebsocket } from './websocket.js'
import type { SyncConfiguration } from '../types/SyncConfiguration'
import { syncConfiguration } from '../types/SyncConfiguration.js'

let configuration: SyncConfiguration

/**
 * Initialize the sync service.
 */
export const initSync = () => {
  const configPath = process.env.CONFIG_PATH || './config/config.json'
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  configuration = config.sync as SyncConfiguration

  // Check configuration validity.
  const result = syncConfiguration.safeParse(configuration)
  if (!result.success) {
    console.error(result.error)
    throw new Error('Sync configuration is invalid')
  }

  // Check if the sync service is enabled.
  if (!configuration.enabled) {
    console.log('Sync service is disabled.')
    return
  } else {
    console.log('Sync service is enabled.')
    console.log('Server name: ' + configuration.server.name)
  }

  // Start the websocket server.
  startWebsocket(configuration.server.port)

  // Connect to remote servers.
  connectToServers(configuration.servers)
}
