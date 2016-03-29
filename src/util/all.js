export default function all (arr, callback) {
  const result = []
  let pending = arr.length
  let called = false

  if (arr.length === 0) return callback(null, result)

  const step = (i) => (err, res) => {
    pending -= 1
    if (!err) result[i] = res
    if (!called) {
      if (err) callback(err)
      else if (pending === 0) {
        if (result.every((r) => r === undefined)) callback(null)
        else callback(null, result)
      } else return
      called = true
    }
  }

  arr.forEach((fn, i) => fn(step(i)))
}
