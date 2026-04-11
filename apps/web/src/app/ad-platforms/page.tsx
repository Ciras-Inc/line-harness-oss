'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { MonitorDot } from 'lucide-react'

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

const inputClass =
  'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function AdPlatformsPage() {
  const [platforms, setPlatforms] = useState<AdPlatform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateFormState>({ ...initialForm })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [selectedLogs, setSelectedLogs] = useState<{ id: string; logs: ConversionLog[] } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

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
    <div className="py-6">
      <PageHeader
        title="広告プラットフォーム"
        description="Meta / Google / X / TikTok のCV連携管理"
        action={
          <Button onClick={() => setShowCreate(true)}>+ 新規プラットフォーム</Button>
        }
      />

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">{error}</div>
      )}

      {showCreate && (
        <div className="mb-6 bg-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">新規広告プラットフォームを追加</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">プラットフォーム <span className="text-destructive">*</span></label>
              <select className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}>
                {platformOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">表示名 (省略可)</label>
              <input type="text" className={inputClass} placeholder="例: メイン Meta ピクセル" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">設定 (JSON) <span className="text-destructive">*</span></label>
              <textarea className={`${inputClass} font-mono resize-y`} rows={6} value={form.configJson} onChange={(e) => setForm({ ...form, configJson: e.target.value })} />
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={saving}>{saving ? '追加中...' : '追加'}</Button>
              <Button variant="outline" onClick={() => { setShowCreate(false); setFormError('') }}>キャンセル</Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState rows={2} columns={3} />
      ) : platforms.length === 0 && !showCreate ? (
        <EmptyState
          icon={<MonitorDot size={32} />}
          title="広告プラットフォームが未設定です"
          description="「新規プラットフォーム」から追加してください"
          action={<Button onClick={() => setShowCreate(true)}>新規プラットフォーム</Button>}
        />
      ) : (
        <div className="space-y-4">
          {platforms.map((p) => (
            <div key={p.id} className="bg-card rounded-lg border border-border p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{p.displayName || platformOptions.find(o => o.value === p.name)?.label || p.name}</h3>
                </div>
                <button
                  onClick={() => handleToggleActive(p.id, p.isActive)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${p.isActive ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${p.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${platformBadgeColor[p.name] || 'bg-muted text-muted-foreground'}`}>
                  {p.name}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {p.isActive ? '有効' : '無効'}
                </span>
              </div>

              <div className="text-xs text-muted-foreground mb-3 font-mono bg-muted/50 rounded p-2 overflow-auto max-h-20">
                {Object.entries(p.config).map(([k, v]) => (
                  <div key={k}>{k}: {String(v)}</div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <button onClick={() => handleViewLogs(p.id)} className="text-xs text-primary hover:text-primary/80">
                  {selectedLogs?.id === p.id ? 'ログを閉じる' : 'CV送信ログ'}
                </button>
                <button onClick={() => setConfirmDelete(p.id)} className="px-3 py-1 min-h-[44px] text-xs font-medium text-destructive hover:text-destructive/80 bg-destructive/5 hover:bg-destructive/10 rounded-md transition-colors">削除</button>
              </div>

              {selectedLogs?.id === p.id && (
                <div className="mt-3 border-t border-border pt-3">
                  {selectedLogs.logs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">ログがありません</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-auto">
                      {selectedLogs.logs.map((log) => (
                        <div key={log.id} className="flex items-center gap-2 text-xs">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-muted-foreground">{log.eventName}</span>
                          <span className="text-muted-foreground/60">{new Date(log.createdAt).toLocaleString('ja-JP')}</span>
                          {log.errorMessage && <span className="text-destructive truncate">{log.errorMessage}</span>}
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

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}
        title="広告プラットフォームを削除しますか？"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </div>
  )
}
