import { Bill } from '../hooks/useCashbook'
import csvBuilder from './csvBuilder'

export default function save (fileName: string, data: Bill[]) {
  const aLink = document.createElement('a')
  const blob = new window.Blob([csvBuilder<Bill>(['type', 'time', 'category', 'amount'], data)])
  aLink.download = fileName
  aLink.href = URL.createObjectURL(blob)
  aLink.click()
}
