'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import Header from '@/components/layout/header'

interface RichMenu {
  richMenuId: string
  name: string
  size: { width: number; height: number }
  chatBarText: string
  selected: boolean
  areas: unknown[]
}

export default function RichMenusPage() {
  const { selectedAccountId } = useAccount()
  const [menus, setMenus] = useState<RichMenu[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createJson, setCreateJson] = useState(`{
  "size": { "width": 2500, "height": 1686 },
  "selected": true,
  "name": "メインメニュー",
  "chatBarText": "メニューを開く",
  "areas": [
    {
      "bounds": { "x": 0, "y": 0, "width": 833, "height": 843 },
      "action": { "type": "uri", "uri": "https://example.com" }
    }
  ]
}`)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const loadMenus = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await api.richMenus.list(selectedAccountId || undefined)
      if (res.success) setMenus(res.data as RichMenu[])
    } catch {
      setError('リッチメニューの読み込みに失敗しました')
    } finally { setLoading(false) }
  }, [selectedAccountId])

  useEffect(() => { loadMenus() }, [loadMenus])

  const handleCreate = async () => {
    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(createJson) } catch { setFormError('JSON形式が正しくありません'); return }

    setSaving(true); setFormError('')
    try {
      const res = await api.richMenus.create(parsed, selectedAccountId || undefined)
      if (res.success) { setShowCreate(false); loadMenus() }
      else { setFormError((res as { error: string }).error) }
    } catch { setFormError('作成に失敗しました') } finally { setSaving(false) }
  }

  const handleSetDefault = async (id: string) => {
    try { await api.richMenus.setDefault(id, selectedAccountId || undefined); setError(''); loadMenus() }
    catch { setError('デフォルト設定に失敗しました') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このリッチメニューを削除してもよいですか？')) return
    try { await api.richMenus.delete(id, selectedAccountId || undefined); loadMenus() }
    catch { setError('削除に失敗しました') }
  }

  return (
    <div>
      <Header
        title="リッチメニュー"
        description="LINE APIリッチメニューの管理"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 min-h-[44px] text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#06C755' }}
          >
            + 新規リッチメニュー
          </button>
        }
      />

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {showCreate && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">新規リッチメニューを作成</h2>
          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">リッチメニュー定義 (JSON)</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
                rows={14}
                value={createJson}
                onChange={(e) => setCreateJson(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">LINE Messaging API のリッチメニュー作成仕様に従ってください</p>
            </div>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 min-h-[44px] text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-opacity" style={{ backgroundColor: '#06C755' }}>{saving ? '作成中...' : '作成'}</button>
              <button onClick={() => { setShowCreate(false); setFormError('') }} className="px-4 py-2 min-h-[44px] text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : menus.length === 0 && !showCreate ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">リッチメニューがありません。「新規リッチメニュー」から作成してください。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {menus.map((menu) => (
            <div key={menu.richMenuId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{menu.name}</h3>
              <p className="text-xs text-gray-500 mb-3">{menu.chatBarText}</p>

              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {menu.size.width} x {menu.size.height}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${menu.selected ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {menu.selected ? 'デフォルト表示' : '非表示'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                  {menu.areas.length} エリア
                </span>
              </div>

              <p className="text-xs text-gray-400 mb-3 font-mono truncate">{menu.richMenuId}</p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button onClick={() => handleSetDefault(menu.richMenuId)} className="px-3 py-1 min-h-[44px] text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors">デフォルトに設定</button>
                <button onClick={() => handleDelete(menu.richMenuId)} className="px-3 py-1 min-h-[44px] text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors">削除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
