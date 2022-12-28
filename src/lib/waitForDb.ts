import { dbWritesPaused } from './../global/pauseTraffic.js'
import logDebug from './logDebug.js'

/**
 * Wait until the database is ready to be written to.
 *
 * @param name The name of the function that is waiting.
 * @param timeBetweenChecks The time to wait between checks in milliseconds. Defaults to 2500.
 * @param timeout The maximum time to wait in milliseconds. 0 means no timeout. Defaults to 0.
 * @returns A promise that resolves when the database is ready.
 * @throws An error if the timeout is reached.
 */
const waitForDb = (name: string, timeBetweenChecks = 2500, timeout = 0) => {
  logDebug(`'${name}' is waiting for database to be ready.`)
  const start = Date.now()
  return new Promise<void>((resolve, reject) => {
    const interval: NodeJS.Timer = setInterval(
      () => completeOrTimeout(timeout, name, interval, start, resolve, reject),
      timeBetweenChecks
    )
  })
}

/**
 * Complete the wait if the database is ready or handle the timeout.
 *
 * @param timeout The maximum time to wait in milliseconds. 0 means no timeout.
 * @param name The name of the function that is waiting.
 * @param interval The interval that is checking the database.
 * @param start The time the wait started.
 * @param resolve The function to call when the wait is complete.
 * @param reject The function to call to reject the promise.
 */
const completeOrTimeout = (
  timeout: number,
  name: string,
  interval: NodeJS.Timer,
  start: number,
  resolve: (value: void) => void,
  reject: (reason?: any) => void
): void => {
  completeWait(name, interval, resolve)
  handleTimeout(timeout, name, interval, start, reject)
}

/**
 * Complete the wait if the database is ready.
 *
 * @param name The name of the function that is waiting.
 * @param interval The interval that is checking the database.
 * @param resolve The function to call when the wait is complete.
 */
const completeWait = (
  name: string,
  interval: NodeJS.Timer,
  resolve: (value: void) => void
) => {
  if (dbWritesPaused()) return
  logDebug(`${name} is done waiting for database to be ready.`)
  clearInterval(interval)
  resolve()
}

/**
 * If the timeout is reached, stop waiting and reject the promise.
 *
 * @param timeout Maximum time to wait in milliseconds.
 * @param name The name of the function that is waiting.
 * @param interval The interval that is checking the database.
 * @param start The time the wait started.
 * @param reject The function to call to reject the promise.
 */
const handleTimeout = (
  timeout: number,
  name: string,
  interval: NodeJS.Timer,
  start: number,
  reject: (reason?: any) => void
) => {
  if (timeout === 0) return
  if (Date.now() - start < timeout) return
  logDebug(`${name} timed out waiting for database to be ready.`)
  clearInterval(interval)
  reject(new Error(`Timeout waiting for database to be ready.`))
}

export default waitForDb
