'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import Header from '@/components/layout/header'

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

export default function TrafficPoolsPage() {
  const [pools, setPools] = useState<TrafficPool[]>([])
  const [accounts, setAccounts] = useState<LineAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateFormState>({ ...initialForm })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

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
    if (!confirm('このトラフィックプールを削除してもよいですか？')) return
    try { await api.trafficPools.delete(id); loadData() }
    catch { setError('削除に失敗しました') }
  }

  return (
    <div>
      <Header
        title="トラフィックプール"
        description="BAN対策用アカウント切替プール管理"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 min-h-[44px] text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#06C755' }}
          >
            + 新規プール
          </button>
        }
      />

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {showCreate && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">新規トラフィックプールを作成</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">スラッグ <span className="text-red-500">*</span></label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="例: main (URLパス: /pool/main)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">プール名 <span className="text-red-500">*</span></label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="例: メインプール" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">アクティブアカウント <span className="text-red-500">*</span></label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" value={form.activeAccountId} onChange={(e) => setForm({ ...form, activeAccountId: e.target.value })}>
                <option value="">選択してください</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
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
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : pools.length === 0 && !showCreate ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">トラフィックプールがありません。「新規プール」から作成してください。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pools.map((pool) => (
            <div key={pool.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{pool.name}</h3>
                <button
                  onClick={() => handleToggleActive(pool.id, pool.isActive)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${pool.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${pool.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                  /pool/{pool.slug}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${pool.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {pool.isActive ? '有効' : '無効'}
                </span>
              </div>

              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">アクティブアカウント</p>
                <div className="flex items-center gap-2">
                  <select
                    className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                    value={pool.activeAccountId}
                    onChange={(e) => handleSwitchAccount(pool.id, e.target.value)}
                  >
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                {pool.accountName && <p className="text-xs text-gray-400 mt-1">現在: {pool.accountName}</p>}
              </div>

              {pool.liffId && <p className="text-xs text-gray-400 mb-3 font-mono">LIFF: {pool.liffId}</p>}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button onClick={() => handleDelete(pool.id)} className="px-3 py-1 min-h-[44px] text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors">削除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
