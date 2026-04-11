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
import { Bell } from 'lucide-react'

interface Reminder {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ReminderStep {
  id: string
  reminderId: string
  offsetMinutes: number
  messageType: string
  messageContent: string
  createdAt: string
}

interface ReminderWithSteps extends Reminder {
  steps: ReminderStep[]
}

interface CreateFormState {
  name: string
  description: string
}

interface StepFormState {
  offsetMinutes: number
  messageType: string
  messageContent: string
}

function formatOffset(minutes: number): string {
  const abs = Math.abs(minutes)
  const sign = minutes < 0 ? '' : '+'
  if (abs === 0) return '基準時刻'
  if (abs < 60) return `${sign}${minutes}分`
  if (abs % 1440 === 0) {
    const days = abs / 1440
    return minutes < 0 ? `${days}日前` : `${days}日後`
  }
  if (abs % 60 === 0) {
    const hours = abs / 60
    return minutes < 0 ? `${hours}時間前` : `${hours}時間後`
  }
  const hours = Math.floor(abs / 60)
  const mins = abs % 60
  const prefix = minutes < 0 ? '-' : '+'
  return `${prefix}${hours}時間${mins}分`
}

const messageTypeLabels: Record<string, string> = {
  text: 'テキスト',
  image: '画像',
  flex: 'Flex',
}

const ccPrompts = [
  {
    title: 'リマインダー作成',
    prompt: `新しいリマインダーの作成をサポートしてください。
1. リマインダーの用途別テンプレート（セミナー、予約、フォローアップ）を提案
2. 効果的なリマインダー名と説明文の書き方
3. 有効化タイミングと対象者設定のベストプラクティス
手順を示してください。`,
  },
  {
    title: 'リマインダーステップ設計',
    prompt: `リマインダーのステップ配信を設計してください。
1. オフセット時間の最適な設定（例: -24h, -1h, +30m）を提案
2. 各ステップのメッセージ内容テンプレートを作成
3. テキスト・画像・Flexメッセージの使い分けガイド
手順を示してください。`,
  },
]

const inputClass =
  'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function RemindersPage() {
  const { selectedAccountId } = useAccount()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateFormState>({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmDeleteStep, setConfirmDeleteStep] = useState<string | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedData, setExpandedData] = useState<ReminderWithSteps | null>(null)
  const [expandLoading, setExpandLoading] = useState(false)

  const [showStepForm, setShowStepForm] = useState(false)
  const [stepForm, setStepForm] = useState<StepFormState>({
    offsetMinutes: -60,
    messageType: 'text',
    messageContent: '',
  })
  const [stepSaving, setStepSaving] = useState(false)
  const [stepFormError, setStepFormError] = useState('')

  const loadReminders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.reminders.list({ accountId: selectedAccountId || undefined })
      if (res.success) {
        setReminders(res.data)
      } else {
        setError(res.error)
      }
    } catch {
      setError('リマインダーの読み込みに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => {
    loadReminders()
  }, [loadReminders])

  const loadDetail = useCallback(async (id: string) => {
    setExpandLoading(true)
    try {
      const res = await api.reminders.get(id)
      if (res.success) {
        setExpandedData(res.data)
      } else {
        setError(res.error)
      }
    } catch {
      setError('詳細の読み込みに失敗しました')
    } finally {
      setExpandLoading(false)
    }
  }, [])

  const handleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      setExpandedData(null)
      setShowStepForm(false)
      return
    }
    setExpandedId(id)
    setExpandedData(null)
    setShowStepForm(false)
    setStepFormError('')
    loadDetail(id)
  }

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setFormError('リマインダー名を入力してください')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const res = await api.reminders.create({
        name: form.name,
        description: form.description || undefined,
      })
      if (res.success) {
        setShowCreate(false)
        setForm({ name: '', description: '' })
        loadReminders()
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
      await api.reminders.update(id, { isActive: !current })
      loadReminders()
      if (expandedId === id && expandedData) {
        setExpandedData({ ...expandedData, isActive: !current })
      }
    } catch {
      setError('ステータスの変更に失敗しました')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.reminders.delete(id)
      if (expandedId === id) {
        setExpandedId(null)
        setExpandedData(null)
      }
      loadReminders()
    } catch {
      setError('削除に失敗しました')
    }
  }

  const handleAddStep = async () => {
    if (!expandedId) return
    if (!stepForm.messageContent.trim()) {
      setStepFormError('メッセージ内容を入力してください')
      return
    }
    setStepSaving(true)
    setStepFormError('')
    try {
      const res = await api.reminders.addStep(expandedId, {
        offsetMinutes: stepForm.offsetMinutes,
        messageType: stepForm.messageType,
        messageContent: stepForm.messageContent,
      })
      if (res.success) {
        setShowStepForm(false)
        setStepForm({ offsetMinutes: -60, messageType: 'text', messageContent: '' })
        loadDetail(expandedId)
      } else {
        setStepFormError(res.error)
      }
    } catch {
      setStepFormError('ステップの追加に失敗しました')
    } finally {
      setStepSaving(false)
    }
  }

  const handleDeleteStep = async (stepId: string) => {
    if (!expandedId) return
    try {
      await api.reminders.deleteStep(expandedId, stepId)
      loadDetail(expandedId)
    } catch {
      setError('ステップの削除に失敗しました')
    }
  }

  return (
    <div className="py-6">
      <PageHeader
        title="リマインダ配信"
        description="基準時刻に対するオフセット配信ステップ管理"
        action={<Button onClick={() => setShowCreate(true)}>+ 新規リマインダー</Button>}
      />

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error}
        </div>
      )}

      {showCreate && (
        <div className="mb-6 rounded-md border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">新規リマインダーを作成</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                リマインダー名 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="例: セミナー参加リマインダー"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">説明</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={2}
                placeholder="リマインダーの説明 (省略可)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
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

      {loading ? (
        <LoadingState rows={3} columns={3} />
      ) : reminders.length === 0 && !showCreate ? (
        <EmptyState
          icon={<Bell size={32} />}
          title="リマインダーがありません"
          description="「新規リマインダー」から最初のリマインダーを作成してください"
          action={<Button onClick={() => setShowCreate(true)}>新規リマインダー</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reminders.map((reminder) => {
            const isExpanded = expandedId === reminder.id

            return (
              <div
                key={reminder.id}
                className={`bg-card rounded-lg border border-border transition-all ${isExpanded ? 'md:col-span-2 xl:col-span-3' : ''}`}
              >
                <div
                  className="p-5 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleExpand(reminder.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{reminder.name}</h3>
                      {reminder.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{reminder.description}</p>
                      )}
                    </div>
                    <Badge variant={reminder.isActive ? 'default' : 'secondary'}>
                      {reminder.isActive ? '有効' : '無効'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span>作成日: {new Date(reminder.createdAt).toLocaleDateString('ja-JP')}</span>
                    <span>{isExpanded ? '▲ 閉じる' : '▼ 詳細'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <Button
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); handleToggleActive(reminder.id, reminder.isActive) }}
                      >
                        {reminder.isActive ? '無効にする' : '有効にする'}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(reminder.id) }}
                      >
                        削除
                      </Button>
                    </div>

                    {expandLoading ? (
                      <LoadingState rows={2} columns={1} />
                    ) : expandedData ? (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-semibold text-foreground">
                            ステップ ({expandedData.steps.length}件)
                          </h4>
                          <Button
                            variant="outline"
                            onClick={() => { setShowStepForm(true); setStepFormError('') }}
                          >
                            + ステップ追加
                          </Button>
                        </div>

                        {expandedData.steps.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-4 text-center">
                            ステップがありません。「ステップ追加」から作成してください。
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {expandedData.steps
                              .sort((a, b) => a.offsetMinutes - b.offsetMinutes)
                              .map((step) => (
                                <div
                                  key={step.id}
                                  className="flex items-start justify-between bg-muted/50 rounded-lg p-3 border border-border"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline">{formatOffset(step.offsetMinutes)}</Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {messageTypeLabels[step.messageType] ?? step.messageType}
                                      </span>
                                    </div>
                                    <p className="text-xs text-foreground whitespace-pre-wrap break-words line-clamp-3">
                                      {step.messageContent}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setConfirmDeleteStep(step.id)}
                                    className="ml-2 shrink-0 min-h-[44px] min-w-[44px] text-xs text-destructive hover:text-destructive/80 transition-colors"
                                  >
                                    削除
                                  </button>
                                </div>
                              ))}
                          </div>
                        )}

                        {showStepForm && (
                          <div className="mt-4 bg-background border border-border rounded-lg p-4">
                            <h5 className="text-xs font-semibold text-foreground mb-3">ステップを追加</h5>
                            <div className="space-y-3 max-w-lg">
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">オフセット (分)</label>
                                <input
                                  type="number"
                                  className={inputClass}
                                  placeholder="例: -60 (1時間前), +30 (30分後)"
                                  value={stepForm.offsetMinutes}
                                  onChange={(e) => setStepForm({ ...stepForm, offsetMinutes: Number(e.target.value) })}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  現在の値: {formatOffset(stepForm.offsetMinutes)}
                                </p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">メッセージタイプ</label>
                                <select
                                  className={inputClass}
                                  value={stepForm.messageType}
                                  onChange={(e) => setStepForm({ ...stepForm, messageType: e.target.value })}
                                >
                                  <option value="text">テキスト</option>
                                  <option value="image">画像</option>
                                  <option value="flex">Flex</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                  メッセージ内容 <span className="text-destructive">*</span>
                                </label>
                                <textarea
                                  className={`${inputClass} resize-none`}
                                  rows={3}
                                  placeholder="メッセージ内容を入力"
                                  value={stepForm.messageContent}
                                  onChange={(e) => setStepForm({ ...stepForm, messageContent: e.target.value })}
                                />
                              </div>

                              {stepFormError && <p className="text-xs text-destructive">{stepFormError}</p>}

                              <div className="flex gap-2">
                                <Button onClick={handleAddStep} disabled={stepSaving}>
                                  {stepSaving ? '追加中...' : '追加'}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => { setShowStepForm(false); setStepFormError('') }}
                                >
                                  キャンセル
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null)
        }}
        title="リマインダーを削除しますか？"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />

      <ConfirmDialog
        open={confirmDeleteStep !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteStep(null)
        }}
        title="ステップを削除しますか？"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={() => confirmDeleteStep && handleDeleteStep(confirmDeleteStep)}
      />

      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
