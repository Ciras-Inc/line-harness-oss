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
import CcPromptButton from '@/components/cc-prompt-button'
import { Zap } from 'lucide-react'

type AutomationEventType =
  | 'friend_add'
  | 'tag_change'
  | 'score_threshold'
  | 'cv_fire'
  | 'message_received'
  | 'calendar_booked'

interface AutomationAction {
  type: 'add_tag' | 'remove_tag' | 'start_scenario' | 'send_message' | 'send_webhook' | 'switch_rich_menu'
  params: Record<string, unknown>
}

interface Automation {
  id: string
  name: string
  description: string | null
  eventType: AutomationEventType
  conditions: Record<string, unknown>
  actions: AutomationAction[]
  isActive: boolean
  priority: number
  createdAt: string
  updatedAt: string
}

const eventTypeOptions: { value: AutomationEventType; label: string }[] = [
  { value: 'friend_add', label: '友だち追加' },
  { value: 'tag_change', label: 'タグ変更' },
  { value: 'score_threshold', label: 'スコア閾値' },
  { value: 'cv_fire', label: 'CV発火' },
  { value: 'message_received', label: 'メッセージ受信' },
  { value: 'calendar_booked', label: 'カレンダー予約' },
]

const eventTypeLabelMap: Record<AutomationEventType, string> = {
  friend_add: '友だち追加',
  tag_change: 'タグ変更',
  score_threshold: 'スコア閾値',
  cv_fire: 'CV発火',
  message_received: 'メッセージ受信',
  calendar_booked: 'カレンダー予約',
}

interface CreateFormState {
  name: string
  description: string
  eventType: AutomationEventType
  actionsJson: string
  conditionsJson: string
  priority: number
}

const initialForm: CreateFormState = {
  name: '',
  description: '',
  eventType: 'friend_add',
  actionsJson: '[\n  {\n    "type": "add_tag",\n    "params": {}\n  }\n]',
  conditionsJson: '{}',
  priority: 0,
}

const inputClass =
  'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

const ccPrompts = [
  {
    title: 'オートメーションルール作成',
    prompt: `新しいオートメーションルールを作成するサポートをしてください。
1. 利用可能なイベントタイプ（友だち追加、タグ変更、スコア閾値等）の説明
2. アクション設定のJSON形式テンプレートを提供
3. 条件設定と優先度の推奨値を提案
手順を示してください。`,
  },
  {
    title: 'オートメーション効果分析',
    prompt: `現在のオートメーションルールの効果を分析してください。
1. 各ルールの発火回数と成功率を確認
2. イベントタイプ別の自動化カバレッジを評価
3. 効果の低いルールの改善提案と新規ルールの推奨
結果をレポートしてください。`,
  },
]

export default function AutomationsPage() {
  const { selectedAccountId } = useAccount()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateFormState>({ ...initialForm })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const loadAutomations = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.automations.list({ accountId: selectedAccountId || undefined })
      if (res.success) {
        setAutomations(res.data)
      } else {
        setError(res.error)
      }
    } catch {
      setError('オートメーションの読み込みに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => {
    loadAutomations()
  }, [loadAutomations])

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setFormError('ルール名を入力してください')
      return
    }

    let parsedActions: AutomationAction[]
    let parsedConditions: Record<string, unknown>
    try {
      parsedActions = JSON.parse(form.actionsJson)
    } catch {
      setFormError('アクションのJSON形式が正しくありません')
      return
    }
    try {
      parsedConditions = JSON.parse(form.conditionsJson)
    } catch {
      setFormError('条件のJSON形式が正しくありません')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      const res = await api.automations.create({
        name: form.name,
        description: form.description || null,
        eventType: form.eventType,
        actions: parsedActions,
        conditions: parsedConditions,
        priority: form.priority,
      })
      if (res.success) {
        setShowCreate(false)
        setForm({ ...initialForm })
        loadAutomations()
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
      await api.automations.update(id, { isActive: !current })
      loadAutomations()
    } catch {
      setError('ステータスの変更に失敗しました')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.automations.delete(id)
      loadAutomations()
    } catch {
      setError('削除に失敗しました')
    }
  }

  return (
    <div className="py-6">
      <PageHeader
        title="オートメーション"
        description="イベントトリガーによる自動処理ルール"
        action={<Button onClick={() => setShowCreate(true)}>+ 新規ルール</Button>}
      />

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error}
        </div>
      )}

      {showCreate && (
        <div className="mb-6 rounded-md border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">新規オートメーションを作成</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                ルール名 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="例: 友だち追加時にウェルカムタグ付与"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">説明</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={2}
                placeholder="ルールの説明 (省略可)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                イベントタイプ
              </label>
              <select
                className={inputClass}
                value={form.eventType}
                onChange={(e) =>
                  setForm({ ...form, eventType: e.target.value as AutomationEventType })
                }
              >
                {eventTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                アクション (JSON)
              </label>
              <textarea
                className={`${inputClass} resize-y font-mono`}
                rows={6}
                placeholder='[{"type": "add_tag", "params": {"tagId": "..."}}]'
                value={form.actionsJson}
                onChange={(e) => setForm({ ...form, actionsJson: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                条件 (JSON)
              </label>
              <textarea
                className={`${inputClass} resize-y font-mono`}
                rows={3}
                placeholder='{"tagId": "...", "operator": "equals"}'
                value={form.conditionsJson}
                onChange={(e) => setForm({ ...form, conditionsJson: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">優先度</label>
              <input
                type="number"
                className={inputClass}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value, 10) || 0 })}
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
      ) : automations.length === 0 && !showCreate ? (
        <EmptyState
          icon={<Zap size={32} />}
          title="オートメーションがありません"
          description="「新規ルール」から最初のオートメーションを作成してください"
          action={<Button onClick={() => setShowCreate(true)}>新規ルール</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {automations.map((automation) => (
            <div
              key={automation.id}
              className="bg-card rounded-lg border border-border p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground leading-tight">
                  {automation.name}
                </h3>
                <Badge variant={automation.isActive ? 'default' : 'secondary'}>
                  {automation.isActive ? '有効' : '無効'}
                </Badge>
              </div>

              {automation.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {automation.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {eventTypeLabelMap[automation.eventType]}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>アクション: {automation.actions.length}件</span>
                <span>優先度: {automation.priority}</span>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <button
                  onClick={() => handleToggleActive(automation.id, automation.isActive)}
                  className="flex-1 text-xs font-medium text-muted-foreground py-1 min-h-[44px] flex items-center justify-center rounded-md hover:bg-accent transition-colors"
                >
                  {automation.isActive ? '無効にする' : '有効にする'}
                </button>
                <button
                  onClick={() => setConfirmDelete(automation.id)}
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
        title="オートメーションを削除しますか？"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />

      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
