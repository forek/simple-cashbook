export default function <T> (header: (keyof T)[], data: T[]) {
  const tmp = [header.join(',')]
  data.forEach(item => {
    tmp.push(header.reduce((pre, v) => {
      pre.push(item[v as never])
      return pre
    }, []).join(','))
  })
  return tmp.join('\n')
}
