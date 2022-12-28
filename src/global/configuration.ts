import {
  readConfig,
  writeDefaultConfig,
  type ServerConfiguration
} from '../services/config.js'

/**
 * Get the server configuration.
 * If the configuration file does not exist, it will be created.
 *
 * @returns Server configuration.
 */
const getConfig = () => {
  const configPath = process.env.CONFIG_PATH || './config/config.json'
  writeDefaultConfig(configPath)
  return readConfig()
}

const serverConfig: ServerConfiguration = getConfig()
export default serverConfig
