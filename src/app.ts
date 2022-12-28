import createDummyData from './lib/createDummyData.js'
import logDebug from './lib/logDebug.js'
import { initBackup, restoreBackup } from './services/backup.js'
import { createServer } from './services/express.js'
import { loadKeys } from './services/jwt.js'
import { initSync } from './services/sync.js'

logDebug('Starting server...')

loadKeys()

await createDummyData()

if (await restoreBackup()) process.exit(0)

const app = createServer()
const port = process.env.PORT || 8080
app.listen(port, () => {
  logDebug('Server started.')
  console.log(`Server listening on port ${port}`)
})

initBackup()
initSync()
