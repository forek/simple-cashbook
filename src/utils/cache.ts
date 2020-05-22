import Decimal from 'decimal.js'

interface Cache {
  [key: string]: string
}

interface DecimalCache {
  [key: string]: Decimal
}

export default {
  transformTime: {} as Cache,
  decimalSet: {} as DecimalCache
}
