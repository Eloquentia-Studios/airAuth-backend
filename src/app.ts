import { createServer } from './services/express.js'
import { initSync } from './services/sync.js'

// Create a new Express server.
const app = createServer()
const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})

// Start the sync service.
initSync()
