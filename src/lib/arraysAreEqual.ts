export default (a: Array<any>, b: Array<any>, sameOrder = false) => {
  if (a === b) return true
  if (a == null || b == null) return false
  if (a.length !== b.length) return false

  a = sameOrder ? a : [...a].sort()
  b = sameOrder ? b : [...b].sort()

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false
  }
  return true
}
