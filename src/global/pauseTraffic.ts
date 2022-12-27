import type { WebSocket } from 'ws'

let writesPaused = false
let pausedBy: WebSocket

/**
 * Check if writes to the database are paused.
 *
 * @returns True if traffic is paused, false if not.
 */
export const dbWritesPaused = () => writesPaused

/**
 * Set traffic paused state.
 *
 * @param state True to pause traffic, false to resume.
 * @returns True if the state was changed, false if not.
 */
export const setDbWritesPaused = (state: boolean) => {
  if (state !== writesPaused) {
    console.log(`${state ? 'Pausing' : 'Resuming'} database writes.`)
    writesPaused = state
    return true
  }
  return false
}

/**
 * Set traffic paused state and paused by.
 *
 * @param state True to pause traffic, false to resume.
 * @param ws WebSocket connection.
 * @returns True if the state was changed, false if not.
 */
export const setDbWritesPausedBy = (state: boolean, ws: WebSocket) => {
  if (writesPaused && ws !== pausedBy) return false

  if (setDbWritesPaused(state)) {
    pausedBy = ws
    return true
  }
  return false
}
