import serverConfig from '../global/configuration.js'

/**
 * Log a debug message to the console.
 *
 * @param message Message to log.
 */
const logDebug = (message?: any, ...optionalParams: any[]) => {
  if (serverConfig.debug) {
    console.debug(`[DEBUG][${formatTime()}] ${message}`, ...optionalParams)
  }
}

/**
 * Format the current date and time.
 *
 * @returns Formatted date and time.
 */
const formatTime = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()
  const milliseconds = date.getMilliseconds()

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`
}

export default logDebug
