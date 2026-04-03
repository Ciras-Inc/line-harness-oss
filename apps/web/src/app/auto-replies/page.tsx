'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import Header from '@/components/layout/header'

interface AutoReply {
  id: string
  keyword: string
  matchType: string
  responseType: string
  responseContent: string
  lineAccountId: string | null
  isActive: boolean
  createdAt: string
}

interface CreateFormState {
  keyword: string
  matchType: 'exact' | 'contains'
  responseType: string
  responseContent: string
}

const initialForm: CreateFormState = {
  keyword: '',
  matchType: 'contains',
  responseType: 'text',
  responseContent: '',
}

export default function AutoRepliesPage() {
  const { selectedAccountId } = useAccount()
  const [replies, setReplies] = useState<AutoReply[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateFormState>({ ...initialForm })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const loadReplies = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await api.autoReplies.list(selectedAccountId || undefined)
      if (res.success) setReplies(res.data as AutoReply[])
    } catch {
      setError('自動返信ルールの読み込みに失敗しました')
    } finally { setLoading(false) }
  }, [selectedAccountId])

  useEffect(() => { loadReplies() }, [loadReplies])

  const handleCreate = async () => {
    if (!form.keyword.trim()) { setFormError('キーワードを入力してください'); return }
    if (!form.responseContent.trim()) { setFormError('返信内容を入力してください'); return }

    setSaving(true); setFormError('')
    try {
      const res = await api.autoReplies.create({
        keyword: form.keyword,
        matchType: form.matchType,
        responseType: form.responseType,
        responseContent: form.responseContent,
        lineAccountId: selectedAccountId || null,
      })
      if (res.success) { setShowCreate(false); setForm({ ...initialForm }); loadReplies() }
      else { setFormError((res as { error: string }).error) }
    } catch { setFormError('作成に失敗しました') } finally { setSaving(false) }
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    try { await api.autoReplies.update(id, { isActive: !current }); loadReplies() }
    catch { setError('ステータスの変更に失敗しました') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この自動返信ルールを削除してもよいですか？')) return
    try { await api.autoReplies.delete(id); loadReplies() }
    catch { setError('削除に失敗しました') }
  }

  return (
    <div>
      <Header
        title="自動返信"
        description="キーワードマッチによる自動返信ルール管理"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 min-h-[44px] text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#06C755' }}
          >
            + 新規ルール
          </button>
        }
      />

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {showCreate && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">新規自動返信ルールを作成</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">キーワード <span className="text-red-500">*</span></label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="例: 営業時間" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">マッチ方法</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" value={form.matchType} onChange={(e) => setForm({ ...form, matchType: e.target.value as 'exact' | 'contains' })}>
                <option value="contains">部分一致</option>
                <option value="exact">完全一致</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">返信タイプ</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" value={form.responseType} onChange={(e) => setForm({ ...form, responseType: e.target.value })}>
                <option value="text">テキスト</option>
                <option value="flex">Flex メッセージ</option>
                <option value="image">画像</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">返信内容 <span className="text-red-500">*</span></label>
              <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y" rows={4} placeholder={form.responseType === 'text' ? '返信メッセージを入力' : 'JSON形式で入力'} value={form.responseContent} onChange={(e) => setForm({ ...form, responseContent: e.target.value })} />
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
      ) : replies.length === 0 && !showCreate ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">自動返信ルールがありません。「新規ルール」から作成してください。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {replies.map((r) => (
            <div key={r.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 leading-tight">「{r.keyword}」</h3>
                <button
                  onClick={() => handleToggleActive(r.id, r.isActive)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${r.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${r.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.matchType === 'exact' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                  {r.matchType === 'exact' ? '完全一致' : '部分一致'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {r.responseType}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {r.isActive ? '有効' : '無効'}
                </span>
              </div>
              <p className="text-xs text-gray-600 bg-gray-50 rounded p-2 mb-3 line-clamp-3 whitespace-pre-wrap">{r.responseContent}</p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button onClick={() => handleDelete(r.id)} className="px-3 py-1 min-h-[44px] text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors">削除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
