import { dbWritesPaused } from './../global/pauseTraffic.js'

/**
 * Wait until the database is ready to write and then call the callback.
 *
 * @param callback Function to call when the database is ready.
 * @param args Arguments to pass to the callback.
 * @returns True if the callback was called, false if it was not.
 */
const waitForDb = (callback: (...a: any[]) => void, ...args: any[]) => {
  if (dbWritesPaused()) {
    setTimeout(() => callback(...args), 2500)
    return true
  }
  return false
}

export default waitForDb
