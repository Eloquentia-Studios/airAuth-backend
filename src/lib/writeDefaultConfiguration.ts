import { existsSync, writeFileSync } from 'fs'
import type ServerConfiguration from '../types/ServerConfiguration'

// Define the default configuration.
const defaultConfig: ServerConfiguration = {
  sync: {
    enabled: false,
    server: {
      name: 'SERVER-NAME',
      port: 7070
    },
    servers: [
      {
        name: 'SECOND-SERVER-NAME',
        address: 'http://server.two:7070'
      }
    ],
    fullSyncInterval: 30,
    secret: 'THIS-SHOULD-BE-RANDOMLY-GENERATED',
    startDelay: 0,
    connectOnStart: true
  }
}

/**
 * Write the default configuration file.
 *
 * @param path Path to write the file to.
 */
const writeDefaultConfig = (path: string) => {
  // Check if the file already exists.
  if (existsSync(path)) return

  // Write the file.
  writeFileSync(path, JSON.stringify(defaultConfig, null, 2))
}

export default writeDefaultConfig
