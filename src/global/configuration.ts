import { readConfig, type ServerConfiguration } from '../services/config.js'

const serverConfig: ServerConfiguration = readConfig()
export default serverConfig
