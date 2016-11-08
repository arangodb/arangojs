export default function (str) {
  return new Buffer(str).toString('base64')
}
