import createDummyData from './lib/createDummyData.js'
import logDebug from './lib/logDebug.js'
import { createServer } from './services/express.js'
import { loadKeys } from './services/jwt.js'
import { initSync } from './services/sync.js'

logDebug('Starting server...')

loadKeys()

// Create dummy data.
if (process.env.DUMMY_DATA === 'true') {
  console.log('Creating dummy data!')
  await createDummyData()
}

// Create a new Express server.
const app = createServer()
const port = process.env.PORT || 8080
app.listen(port, () => {
  logDebug('Server started.')
  console.log(`Server listening on port ${port}`)
})

// Start the sync service.
initSync()
