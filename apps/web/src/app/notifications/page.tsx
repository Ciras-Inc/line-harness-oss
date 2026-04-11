'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import CcPromptButton from '@/components/cc-prompt-button'
import { Bell } from 'lucide-react'

interface NotificationRule {
  id: string
  name: string
  eventType: string
  conditions: Record<string, unknown>
  channels: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface Notification {
  id: string
  ruleId: string | null
  eventType: string
  title: string
  body: string
  channel: string
  status: 'pending' | 'sent' | 'failed'
  metadata: string | null
  createdAt: string
}

interface CreateFormState {
  name: string
  eventType: string
  channels: string
  conditions: string
}

const statusConfig: Record<
  Notification['status'],
  { label: string; className: string }
> = {
  pending: { label: '保留中', className: 'bg-gray-100 text-gray-600' },
  sent: { label: '送信済み', className: 'bg-green-100 text-green-700' },
  failed: { label: '失敗', className: 'bg-red-100 text-red-700' },
}

const statusFilterOptions: { value: string; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'pending', label: '保留中' },
  { value: 'sent', label: '送信済み' },
  { value: 'failed', label: '失敗' },
]

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const ccPrompts = [
  {
    title: '通知ルール設定',
    prompt: `通知ルールの設定をサポートしてください。
1. 利用可能なイベントタイプと通知条件の説明
2. 効果的な通知ルールの設計パターンを提案
3. 通知の優先度と頻度のベストプラクティス
手順を示してください。`,
  },
  {
    title: '通知チャネル追加',
    prompt: `新しい通知チャネルの追加手順をガイドしてください。
1. 利用可能な通知チャネル（email、Slack、Webhook）の設定方法
2. 各チャネルの接続テストと動作確認手順
3. チャネル別の通知内容カスタマイズ方法
手順を示してください。`,
  },
]

const inputClass =
  'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function NotificationsPage() {
  const [rules, setRules] = useState<NotificationRule[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateFormState>({
    name: '',
    eventType: '',
    channels: '',
    conditions: '{}',
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const loadRules = useCallback(async () => {
    try {
      const res = await api.notifications.rules.list()
      if (res.success) {
        setRules((res.data as unknown as NotificationRule[]).map((r: NotificationRule) => ({
          ...r,
          channels: typeof r.channels === 'string' ? JSON.parse(r.channels) : r.channels,
          conditions: typeof r.conditions === 'string' ? JSON.parse(r.conditions) : r.conditions,
        })))
      } else setError(res.error)
    } catch {
      setError('通知ルールの読み込みに失敗しました。もう一度お試しください。')
    }
  }, [])

  const loadNotifications = useCallback(async (status?: string) => {
    try {
      const params: { status?: string; limit?: string } = { limit: '50' }
      if (status) params.status = status
      const res = await api.notifications.list(params)
      if (res.success) setNotifications(res.data)
      else setError(res.error)
    } catch {
      setError('通知履歴の読み込みに失敗しました。もう一度お試しください。')
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      await Promise.all([loadRules(), loadNotifications(statusFilter || undefined)])
    } finally {
      setLoading(false)
    }
  }, [loadRules, loadNotifications, statusFilter])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setFormError('ルール名を入力してください')
      return
    }
    if (!form.eventType.trim()) {
      setFormError('イベントタイプを入力してください')
      return
    }

    let conditions: Record<string, unknown> = {}
    try {
      conditions = JSON.parse(form.conditions)
    } catch {
      setFormError('条件のJSONが不正です')
      return
    }

    const channels = form.channels
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)

    setSaving(true)
    setFormError('')
    try {
      const res = await api.notifications.rules.create({
        name: form.name,
        eventType: form.eventType,
        conditions,
        channels,
      })
      if (res.success) {
        setShowCreate(false)
        setForm({ name: '', eventType: '', channels: '', conditions: '{}' })
        loadRules()
      } else {
        setFormError(res.error)
      }
    } catch {
      setFormError('作成に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await api.notifications.rules.update(id, { isActive: !current })
      loadRules()
    } catch {
      setError('ステータスの変更に失敗しました')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.notifications.rules.delete(id)
      loadRules()
    } catch {
      setError('削除に失敗しました')
    }
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    loadNotifications(value || undefined)
  }

  return (
    <div className="py-6">
      <PageHeader
        title="通知ルール設定"
        description="イベント発生時の通知チャネル管理"
        action={<Button onClick={() => setShowCreate(true)}>+ 新規ルール</Button>}
      />

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error}
        </div>
      )}

      {showCreate && (
        <div className="mb-6 rounded-md border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">新規ルールを作成</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                ルール名 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="例: 新規友だち追加通知"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                イベントタイプ <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="例: friend_add, message_received, tag_added"
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">通知チャンネル</label>
              <input
                type="text"
                className={inputClass}
                placeholder="email,slack,webhook (カンマ区切り)"
                value={form.channels}
                onChange={(e) => setForm({ ...form, channels: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">条件 (JSON)</label>
              <textarea
                className={`${inputClass} font-mono resize-none`}
                rows={3}
                placeholder='{"tagId": "xxx"}'
                value={form.conditions}
                onChange={(e) => setForm({ ...form, conditions: e.target.value })}
              />
            </div>

            {formError && <p className="text-xs text-destructive">{formError}</p>}

            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? '作成中...' : '作成'}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowCreate(false); setFormError('') }}
              >
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-3">通知ルール</h2>

        {loading ? (
          <LoadingState rows={3} columns={3} />
        ) : rules.length === 0 && !showCreate ? (
          <EmptyState
            icon={<Bell size={32} />}
            title="通知ルールがありません"
            description="「新規ルール」から最初のルールを作成してください"
            action={<Button onClick={() => setShowCreate(true)}>新規ルール</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-card rounded-lg border border-border p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{rule.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{rule.eventType}</p>
                  </div>
                  <button
                    onClick={() => handleToggleActive(rule.id, rule.isActive)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      rule.isActive ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                        rule.isActive ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1">
                  {rule.channels.map((ch) => (
                    <Badge key={ch} variant="secondary">{ch}</Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">{formatDatetime(rule.createdAt)}</span>
                  <button
                    onClick={() => setConfirmDelete(rule.id)}
                    className="text-xs font-medium text-destructive hover:text-destructive/80 transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">通知履歴</h2>
          <select
            className="border border-border rounded-lg px-3 py-1.5 min-h-[44px] text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
          >
            {statusFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <LoadingState rows={4} columns={5} />
        ) : notifications.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <p className="text-muted-foreground text-sm">通知履歴がありません。</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">タイトル</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">イベントタイプ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">チャンネル</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ステータス</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">日時</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {notifications.map((notification) => {
                    const statusInfo = statusConfig[notification.status]
                    return (
                      <tr key={notification.id} className="hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">{notification.title}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {notification.eventType}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {notification.channel}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDatetime(notification.createdAt)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null)
        }}
        title="通知ルールを削除しますか？"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />

      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
