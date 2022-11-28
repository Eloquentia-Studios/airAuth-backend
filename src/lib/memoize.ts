/**
 * Memoize a function.
 *
 * @param fn Function to memoize.
 * @param args Arguments to pass to the function.
 * @returns Memoized function.
 */
const memoize = <T>(fn: (...args: any[]) => T): ((...args: any[]) => T) => {
  const cache = new Map()
  return (...args: any[]) => {
    const key = JSON.stringify(args)
    if (cache.has(key)) {
      return cache.get(key)
    }
    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

export default memoize
