'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { MessageSquare } from 'lucide-react'

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

const inputClass =
  'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function AutoRepliesPage() {
  const { selectedAccountId } = useAccount()
  const [replies, setReplies] = useState<AutoReply[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateFormState>({ ...initialForm })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const loadReplies = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.autoReplies.list(selectedAccountId || undefined)
      if (res.success) setReplies(res.data as AutoReply[])
    } catch {
      setError('自動返信ルールの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => {
    loadReplies()
  }, [loadReplies])

  const handleCreate = async () => {
    if (!form.keyword.trim()) {
      setFormError('キーワードを入力してください')
      return
    }
    if (!form.responseContent.trim()) {
      setFormError('返信内容を入力してください')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      const res = await api.autoReplies.create({
        keyword: form.keyword,
        matchType: form.matchType,
        responseType: form.responseType,
        responseContent: form.responseContent,
        lineAccountId: selectedAccountId || null,
      })
      if (res.success) {
        setShowCreate(false)
        setForm({ ...initialForm })
        loadReplies()
      } else {
        setFormError((res as { error: string }).error)
      }
    } catch {
      setFormError('作成に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await api.autoReplies.update(id, { isActive: !current })
      loadReplies()
    } catch {
      setError('ステータスの変更に失敗しました')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.autoReplies.delete(id)
      loadReplies()
    } catch {
      setError('削除に失敗しました')
    }
  }

  return (
    <div className="py-6">
      <PageHeader
        title="自動返信"
        description="キーワードマッチによる自動返信ルール管理"
        action={<Button onClick={() => setShowCreate(true)}>+ 新規ルール</Button>}
      />

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error}
        </div>
      )}

      {showCreate && (
        <div className="mb-6 rounded-md border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">新規自動返信ルールを作成</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                キーワード <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="例: 営業時間"
                value={form.keyword}
                onChange={(e) => setForm({ ...form, keyword: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">マッチ方法</label>
              <select
                className={inputClass}
                value={form.matchType}
                onChange={(e) =>
                  setForm({ ...form, matchType: e.target.value as 'exact' | 'contains' })
                }
              >
                <option value="contains">部分一致</option>
                <option value="exact">完全一致</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">返信タイプ</label>
              <select
                className={inputClass}
                value={form.responseType}
                onChange={(e) => setForm({ ...form, responseType: e.target.value })}
              >
                <option value="text">テキスト</option>
                <option value="flex">Flex メッセージ</option>
                <option value="image">画像</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                返信内容 <span className="text-destructive">*</span>
              </label>
              <textarea
                className={`${inputClass} resize-y`}
                rows={4}
                placeholder={
                  form.responseType === 'text' ? '返信メッセージを入力' : 'JSON形式で入力'
                }
                value={form.responseContent}
                onChange={(e) => setForm({ ...form, responseContent: e.target.value })}
              />
            </div>

            {formError && <p className="text-xs text-destructive">{formError}</p>}

            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? '作成中...' : '作成'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreate(false)
                  setFormError('')
                }}
              >
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState rows={3} columns={3} />
      ) : replies.length === 0 && !showCreate ? (
        <EmptyState
          icon={<MessageSquare size={32} />}
          title="自動返信ルールがありません"
          description="「新規ルール」から最初の自動返信ルールを作成してください"
          action={<Button onClick={() => setShowCreate(true)}>新規ルール</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {replies.map((r) => (
            <div
              key={r.id}
              className="bg-card rounded-lg border border-border p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground leading-tight">
                  「{r.keyword}」
                </h3>
                <Badge variant={r.isActive ? 'default' : 'secondary'}>
                  {r.isActive ? '有効' : '無効'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {r.matchType === 'exact' ? '完全一致' : '部分一致'}
                </Badge>
                <Badge variant="secondary">{r.responseType}</Badge>
              </div>

              <p className="text-xs text-muted-foreground bg-muted rounded p-2 line-clamp-3 whitespace-pre-wrap">
                {r.responseContent}
              </p>

              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <button
                  onClick={() => handleToggleActive(r.id, r.isActive)}
                  className="flex-1 text-xs font-medium text-muted-foreground py-1 min-h-[44px] flex items-center justify-center rounded-md hover:bg-accent transition-colors"
                >
                  {r.isActive ? '無効にする' : '有効にする'}
                </button>
                <button
                  onClick={() => setConfirmDelete(r.id)}
                  className="flex-1 text-xs font-medium text-destructive py-1 min-h-[44px] flex items-center justify-center rounded-md hover:bg-destructive/10 transition-colors"
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
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null)
        }}
        title="自動返信ルールを削除しますか？"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </div>
  )
}
