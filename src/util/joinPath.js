export default function joinPath (a = '', b = '') {
  return require('path').join.apply(null, arguments).replace(/\\/g, '/')
}
