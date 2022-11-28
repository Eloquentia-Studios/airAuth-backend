let writesPaused = false

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
