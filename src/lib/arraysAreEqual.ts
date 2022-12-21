/**
 * Checks if two arrays are equal (by value).
 *
 * @param a First array.
 * @param b Second array.
 * @param sameOrder If the order of the elements in the arrays should be the same.
 * @returns True if the arrays are equal, false otherwise.
 */
const arraysAreEqual = (a: Array<any>, b: Array<any>, sameOrder = false) => {
  if (a === b) return true
  if (a == null || b == null) return false
  if (a.length !== b.length) return false

  a = sameOrder ? a : [...a].sort()
  b = sameOrder ? b : [...b].sort()

  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export default arraysAreEqual
