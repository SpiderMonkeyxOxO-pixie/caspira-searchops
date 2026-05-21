import { useState } from 'react'

export function fmtDate(iso: string) {
  const d     = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString())
    return `Today ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function useHistory<T extends { id: string }>(storageKey: string, maxItems = 20) {
  const [records, setRecords] = useState<T[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? '[]') as T[] }
    catch { return [] }
  })

  function save(record: T) {
    setRecords(prev => {
      const updated = [record, ...prev.filter(r => r.id !== record.id)].slice(0, maxItems)
      localStorage.setItem(storageKey, JSON.stringify(updated))
      return updated
    })
  }

  function remove(id: string) {
    setRecords(prev => {
      const updated = prev.filter(r => r.id !== id)
      localStorage.setItem(storageKey, JSON.stringify(updated))
      return updated
    })
  }

  function clear() {
    setRecords([])
    localStorage.removeItem(storageKey)
  }

  return { records, save, remove, clear }
}
