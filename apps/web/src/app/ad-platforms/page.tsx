'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import Header from '@/components/layout/header'

interface AdPlatform {
  id: string
  name: string
  displayName: string | null
  config: Record<string, unknown>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ConversionLog {
  id: string
  adPlatformId: string
  friendId: string | null
  eventName: string
  clickId: string | null
  status: string
  errorMessage: string | null
  createdAt: string
}

const platformOptions = [
  { value: 'meta', label: 'Meta (Facebook/Instagram)' },
  { value: 'google', label: 'Google Ads' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'tiktok', label: 'TikTok' },
]

const platformBadgeColor: Record<string, string> = {
  meta: 'bg-blue-100 text-blue-700',
  google: 'bg-red-100 text-red-700',
  x: 'bg-gray-800 text-white',
  tiktok: 'bg-pink-100 text-pink-700',
}

interface CreateFormState {
  name: string
  displayName: string
  configJson: string
}

const initialForm: CreateFormState = {
  name: 'meta',
  displayName: '',
  configJson: '{\n  "pixelId": "",\n  "accessToken": ""\n}',
}

export default function AdPlatformsPage() {
  const [platforms, setPlatforms] = useState<AdPlatform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateFormState>({ ...initialForm })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [selectedLogs, setSelectedLogs] = useState<{ id: string; logs: ConversionLog[] } | null>(null)

  const loadPlatforms = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await api.adPlatforms.list()
      if (res.success) setPlatforms(res.data as AdPlatform[])
    } catch {
      setError('広告プラットフォームの読み込みに失敗しました')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadPlatforms() }, [loadPlatforms])

  const handleCreate = async () => {
    let parsedConfig: Record<string, unknown>
    try { parsedConfig = JSON.parse(form.configJson) } catch { setFormError('設定のJSON形式が正しくありません'); return }

    setSaving(true); setFormError('')
    try {
      const res = await api.adPlatforms.create({
        name: form.name,
        displayName: form.displayName || undefined,
        config: parsedConfig,
      })
      if (res.success) { setShowCreate(false); setForm({ ...initialForm }); loadPlatforms() }
      else { setFormError((res as { error: string }).error) }
    } catch { setFormError('作成に失敗しました') } finally { setSaving(false) }
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    try { await api.adPlatforms.update(id, { isActive: !current }); loadPlatforms() }
    catch { setError('ステータスの変更に失敗しました') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この広告プラットフォームを削除してもよいですか？')) return
    try { await api.adPlatforms.delete(id); loadPlatforms() }
    catch { setError('削除に失敗しました') }
  }

  const handleViewLogs = async (id: string) => {
    if (selectedLogs?.id === id) { setSelectedLogs(null); return }
    try {
      const res = await api.adPlatforms.logs(id, 20)
      if (res.success) setSelectedLogs({ id, logs: res.data as ConversionLog[] })
    } catch { setError('ログの読み込みに失敗しました') }
  }

  return (
    <div>
      <Header
        title="広告プラットフォーム"
        description="Meta / Google / X / TikTok のCV連携管理"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 min-h-[44px] text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#06C755' }}
          >
            + 新規プラットフォーム
          </button>
        }
      />

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {showCreate && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">新規広告プラットフォームを追加</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">プラットフォーム <span className="text-red-500">*</span></label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}>
                {platformOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">表示名 (省略可)</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="例: メイン Meta ピクセル" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">設定 (JSON) <span className="text-red-500">*</span></label>
              <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 resize-y" rows={6} value={form.configJson} onChange={(e) => setForm({ ...form, configJson: e.target.value })} />
            </div>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 min-h-[44px] text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-opacity" style={{ backgroundColor: '#06C755' }}>{saving ? '追加中...' : '追加'}</button>
              <button onClick={() => { setShowCreate(false); setFormError('') }} className="px-4 py-2 min-h-[44px] text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : platforms.length === 0 && !showCreate ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">広告プラットフォームが未設定です。「新規プラットフォーム」から追加してください。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {platforms.map((p) => (
            <div key={p.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{p.displayName || platformOptions.find(o => o.value === p.name)?.label || p.name}</h3>
                </div>
                <button
                  onClick={() => handleToggleActive(p.id, p.isActive)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${p.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${p.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${platformBadgeColor[p.name] || 'bg-gray-100 text-gray-600'}`}>
                  {p.name}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.isActive ? '有効' : '無効'}
                </span>
              </div>

              <div className="text-xs text-gray-400 mb-3 font-mono bg-gray-50 rounded p-2 overflow-auto max-h-20">
                {Object.entries(p.config).map(([k, v]) => (
                  <div key={k}>{k}: {String(v)}</div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button onClick={() => handleViewLogs(p.id)} className="text-xs text-green-600 hover:text-green-700">
                  {selectedLogs?.id === p.id ? 'ログを閉じる' : 'CV送信ログ'}
                </button>
                <button onClick={() => handleDelete(p.id)} className="px-3 py-1 min-h-[44px] text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors">削除</button>
              </div>

              {selectedLogs?.id === p.id && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  {selectedLogs.logs.length === 0 ? (
                    <p className="text-xs text-gray-400">ログがありません</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-auto">
                      {selectedLogs.logs.map((log) => (
                        <div key={log.id} className="flex items-center gap-2 text-xs">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-gray-600">{log.eventName}</span>
                          <span className="text-gray-400">{new Date(log.createdAt).toLocaleString('ja-JP')}</span>
                          {log.errorMessage && <span className="text-red-500 truncate">{log.errorMessage}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
