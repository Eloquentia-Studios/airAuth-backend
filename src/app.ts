import { writeDefaultConfig } from './services/config.js'
import { createServer } from './services/express.js'
import { loadKeys } from './services/jwt.js'
import { initSync } from './services/sync.js'

// Write the default configuration file.
const configPath = process.env.CONFIG_PATH || './config/config.json'
writeDefaultConfig(configPath)
loadKeys()

// Create a new Express server.
const app = createServer()
const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})

// Start the sync service.
initSync()
