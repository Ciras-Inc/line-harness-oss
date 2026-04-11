'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Layers } from 'lucide-react'

interface TrafficPool {
  id: string
  slug: string
  name: string
  activeAccountId: string
  accountName: string | null
  liffId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface LineAccount {
  id: string
  name: string
  channelId: string
  isActive: boolean
}

interface CreateFormState {
  slug: string
  name: string
  activeAccountId: string
}

const initialForm: CreateFormState = {
  slug: '',
  name: '',
  activeAccountId: '',
}

const inputClass =
  'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function TrafficPoolsPage() {
  const [pools, setPools] = useState<TrafficPool[]>([])
  const [accounts, setAccounts] = useState<LineAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateFormState>({ ...initialForm })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [poolsRes, accountsRes] = await Promise.allSettled([
        api.trafficPools.list(),
        api.lineAccounts.list(),
      ])
      if (poolsRes.status === 'fulfilled' && poolsRes.value.success) setPools(poolsRes.value.data as TrafficPool[])
      if (accountsRes.status === 'fulfilled' && accountsRes.value.success) {
        setAccounts(accountsRes.value.data as unknown as LineAccount[])
      }
    } catch {
      setError('データの読み込みに失敗しました')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async () => {
    if (!form.slug.trim()) { setFormError('スラッグを入力してください'); return }
    if (!form.name.trim()) { setFormError('プール名を入力してください'); return }
    if (!form.activeAccountId) { setFormError('アカウントを選択してください'); return }

    setSaving(true); setFormError('')
    try {
      const res = await api.trafficPools.create({
        slug: form.slug,
        name: form.name,
        activeAccountId: form.activeAccountId,
      })
      if (res.success) { setShowCreate(false); setForm({ ...initialForm }); loadData() }
      else { setFormError((res as { error: string }).error) }
    } catch { setFormError('作成に失敗しました') } finally { setSaving(false) }
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    try { await api.trafficPools.update(id, { isActive: !current }); loadData() }
    catch { setError('ステータスの変更に失敗しました') }
  }

  const handleSwitchAccount = async (id: string, accountId: string) => {
    try { await api.trafficPools.update(id, { activeAccountId: accountId }); loadData() }
    catch { setError('アカウント切替に失敗しました') }
  }

  const handleDelete = async (id: string) => {
    try { await api.trafficPools.delete(id); loadData() }
    catch { setError('削除に失敗しました') }
  }

  return (
    <div className="py-6">
      <PageHeader
        title="トラフィックプール"
        description="BAN対策用アカウント切替プール管理"
        action={
          <Button onClick={() => setShowCreate(true)}>+ 新規プール</Button>
        }
      />

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">{error}</div>
      )}

      {showCreate && (
        <div className="mb-6 bg-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">新規トラフィックプールを作成</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">スラッグ <span className="text-destructive">*</span></label>
              <input type="text" className={inputClass} placeholder="例: main (URLパス: /pool/main)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">プール名 <span className="text-destructive">*</span></label>
              <input type="text" className={inputClass} placeholder="例: メインプール" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">アクティブアカウント <span className="text-destructive">*</span></label>
              <select className={inputClass} value={form.activeAccountId} onChange={(e) => setForm({ ...form, activeAccountId: e.target.value })}>
                <option value="">選択してください</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={saving}>{saving ? '作成中...' : '作成'}</Button>
              <Button variant="outline" onClick={() => { setShowCreate(false); setFormError('') }}>キャンセル</Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState rows={2} columns={3} />
      ) : pools.length === 0 && !showCreate ? (
        <EmptyState
          icon={<Layers size={32} />}
          title="トラフィックプールがありません"
          description="「新規プール」から作成してください"
          action={<Button onClick={() => setShowCreate(true)}>新規プール</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pools.map((pool) => (
            <div key={pool.id} className="bg-card rounded-lg border border-border p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">{pool.name}</h3>
                <button
                  onClick={() => handleToggleActive(pool.id, pool.isActive)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${pool.isActive ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${pool.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                  /pool/{pool.slug}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${pool.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {pool.isActive ? '有効' : '無効'}
                </span>
              </div>

              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">アクティブアカウント</p>
                <div className="flex items-center gap-2">
                  <select
                    className="flex-1 border border-border rounded px-2 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    value={pool.activeAccountId}
                    onChange={(e) => handleSwitchAccount(pool.id, e.target.value)}
                  >
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                {pool.accountName && <p className="text-xs text-muted-foreground/60 mt-1">現在: {pool.accountName}</p>}
              </div>

              {pool.liffId && <p className="text-xs text-muted-foreground/60 mb-3 font-mono">LIFF: {pool.liffId}</p>}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => setConfirmDelete(pool.id)}
                  className="px-3 py-1 min-h-[44px] text-xs font-medium text-destructive hover:text-destructive/80 bg-destructive/5 hover:bg-destructive/10 rounded-md transition-colors"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}
        title="トラフィックプールを削除しますか？"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </div>
  )
}
