import Decimal from 'decimal.js'

interface Cache {
  [key: string]: string
}

interface DecimalCache {
  [key: string]: Decimal
}

interface BillIdsCache {
  [key: string]: true
}

export default {
  transformTime: {} as Cache,
  decimalSet: {} as DecimalCache,
  billIds: {} as BillIdsCache
}
