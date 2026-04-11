'use client'
import { useEffect } from 'react'

export default function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW登録失敗時はサイレントに継続
      })
    }
  }, [])
  return null
}
