'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { Scenario, ScenarioStep, ScenarioTriggerType, MessageType } from '@line-crm/shared'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import FlexPreviewComponent from '@/components/flex-preview'
import { ChevronUp, ChevronDown, Plus } from 'lucide-react'

type ScenarioWithSteps = Scenario & { steps: ScenarioStep[] }

const triggerOptions: { value: ScenarioTriggerType; label: string }[] = [
  { value: 'friend_add', label: '友だち追加時' },
  { value: 'tag_added', label: 'タグ付与時' },
  { value: 'manual', label: '手動' },
]

const messageTypeOptions: { value: MessageType; label: string }[] = [
  { value: 'text', label: 'テキスト' },
  { value: 'image', label: '画像' },
  { value: 'flex', label: 'Flex' },
]

function formatDelay(minutes: number): string {
  if (minutes === 0) return '即時'
  if (minutes < 60) return `${minutes}分後`
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m === 0 ? `${h}時間後` : `${h}時間${m}分後`
  }
  const d = Math.floor(minutes / 1440)
  const remaining = minutes % 1440
  if (remaining === 0) return `${d}日後`
  const h = Math.floor(remaining / 60)
  return h > 0 ? `${d}日${h}時間後` : `${d}日${remaining}分後`
}

interface StepFormState {
  stepOrder: number
  delayMinutes: number
  messageType: MessageType
  messageContent: string
}

const emptyStepForm: StepFormState = {
  stepOrder: 1,
  delayMinutes: 0,
  messageType: 'text',
  messageContent: '',
}

const inputClass = 'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

function FlexPreview({ content }: { content: string }) {
  return <FlexPreviewComponent content={content} maxWidth={300} />
}

function ImagePreview({ content }: { content: string }) {
  try {
    const parsed = JSON.parse(content)
    const url = parsed.previewImageUrl || parsed.originalContentUrl
    return (
      <div>
        <Badge variant="outline" className="mb-2">画像</Badge>
        {url ? (
          <img src={url} alt="preview" className="max-w-[200px] rounded-lg border border-border mt-1" />
        ) : (
          <p className="text-xs text-muted-foreground">プレビューなし</p>
        )}
      </div>
    )
  } catch {
    return <p className="text-xs text-destructive">画像 JSON パースエラー</p>
  }
}

export default function ScenarioDetailClient({ scenarioId }: { scenarioId: string }) {
  const id = scenarioId

  const [scenario, setScenario] = useState<ScenarioWithSteps | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '', triggerType: 'friend_add' as ScenarioTriggerType, isActive: true })
  const [saving, setSaving] = useState(false)

  const [showStepForm, setShowStepForm] = useState(false)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [stepForm, setStepForm] = useState<StepFormState>(emptyStepForm)
  const [stepSaving, setStepSaving] = useState(false)
  const [stepError, setStepError] = useState('')
  const [confirmDeleteStep, setConfirmDeleteStep] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)

  const loadScenario = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.scenarios.get(id)
      if (res.success) {
        setScenario(res.data)
        setEditForm({
          name: res.data.name,
          description: res.data.description ?? '',
          triggerType: res.data.triggerType,
          isActive: res.data.isActive,
        })
      } else {
        setError(res.error)
      }
    } catch {
      setError('シナリオの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadScenario()
  }, [loadScenario])

  const handleSaveScenario = async () => {
    if (!editForm.name.trim()) return
    setSaving(true)
    try {
      const res = await api.scenarios.update(id, {
        name: editForm.name,
        description: editForm.description || null,
        triggerType: editForm.triggerType,
        isActive: editForm.isActive,
      })
      if (res.success) {
        setEditing(false)
        loadScenario()
      } else {
        setError(res.error)
      }
    } catch {
      setError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const openAddStep = () => {
    const nextOrder = scenario && scenario.steps.length > 0
      ? Math.max(...scenario.steps.map(s => s.stepOrder)) + 1
      : 1
    setStepForm({ ...emptyStepForm, stepOrder: nextOrder })
    setEditingStepId(null)
    setShowStepForm(true)
    setStepError('')
  }

  const openEditStep = (step: ScenarioStep) => {
    setStepForm({
      stepOrder: step.stepOrder,
      delayMinutes: step.delayMinutes,
      messageType: step.messageType,
      messageContent: step.messageContent,
    })
    setEditingStepId(step.id)
    setShowStepForm(true)
    setStepError('')
  }

  const handleSaveStep = async () => {
    if (!stepForm.messageContent.trim()) {
      setStepError('メッセージ内容を入力してください')
      return
    }
    setStepSaving(true)
    setStepError('')
    try {
      if (editingStepId) {
        const res = await api.scenarios.updateStep(id, editingStepId, {
          stepOrder: stepForm.stepOrder,
          delayMinutes: stepForm.delayMinutes,
          messageType: stepForm.messageType,
          messageContent: stepForm.messageContent,
        })
        if (!res.success) { setStepError(res.error); return }
      } else {
        const res = await api.scenarios.addStep(id, {
          stepOrder: stepForm.stepOrder,
          delayMinutes: stepForm.delayMinutes,
          messageType: stepForm.messageType,
          messageContent: stepForm.messageContent,
        })
        if (!res.success) { setStepError(res.error); return }
      }
      setShowStepForm(false)
      setEditingStepId(null)
      loadScenario()
    } catch {
      setStepError('ステップの保存に失敗しました')
    } finally {
      setStepSaving(false)
    }
  }

  const handleDeleteStep = async (stepId: string) => {
    try {
      await api.scenarios.deleteStep(id, stepId)
      loadScenario()
    } catch {
      setError('ステップの削除に失敗しました')
    } finally {
      setConfirmDeleteStep(null)
    }
  }

  const handleMoveStep = async (step: ScenarioStep, direction: 'up' | 'down') => {
    if (!scenario || reordering) return
    const sorted = [...scenario.steps].sort((a, b) => a.stepOrder - b.stepOrder)
    const idx = sorted.findIndex(s => s.id === step.id)
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= sorted.length) return

    const target = sorted[targetIdx]
    setReordering(true)
    try {
      await Promise.all([
        api.scenarios.updateStep(id, step.id, {
          stepOrder: target.stepOrder,
          delayMinutes: step.delayMinutes,
          messageType: step.messageType,
          messageContent: step.messageContent,
        }),
        api.scenarios.updateStep(id, target.id, {
          stepOrder: step.stepOrder,
          delayMinutes: target.delayMinutes,
          messageType: target.messageType,
          messageContent: target.messageContent,
        }),
      ])
      loadScenario()
    } catch {
      setError('並び替えに失敗しました')
    } finally {
      setReordering(false)
    }
  }

  if (loading) {
    return (
      <div className="py-6">
        <PageHeader title="シナリオ詳細" />
        <div className="rounded-md border border-border bg-card p-8 animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (!scenario) {
    return (
      <div className="py-6">
        <PageHeader title="シナリオ詳細" />
        <div className="rounded-md border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground text-sm">{error || 'シナリオが見つかりません'}</p>
          <Link href="/scenarios" className="text-sm text-primary hover:underline mt-4 inline-block">
            ← シナリオ一覧に戻る
          </Link>
        </div>
      </div>
    )
  }

  const sortedSteps = [...scenario.steps].sort((a, b) => a.stepOrder - b.stepOrder)

  return (
    <div className="py-6">
      <PageHeader
        title="シナリオ詳細"
        action={
          <Link
            href="/scenarios"
            className="inline-flex items-center px-4 py-2 text-sm font-medium border border-border rounded-md bg-background hover:bg-accent transition-colors"
          >
            ← シナリオ一覧
          </Link>
        }
      />

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error}
        </div>
      )}

      {/* シナリオ情報 */}
      <div className="rounded-md border border-border bg-card p-6 mb-6">
        {editing ? (
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                シナリオ名 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">説明</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={2}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">トリガー</label>
              <select
                className={inputClass}
                value={editForm.triggerType}
                onChange={(e) => setEditForm({ ...editForm, triggerType: e.target.value as ScenarioTriggerType })}
              >
                {triggerOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editIsActive"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <label htmlFor="editIsActive" className="text-sm text-muted-foreground">有効</label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveScenario} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false)
                  setEditForm({
                    name: scenario.name,
                    description: scenario.description ?? '',
                    triggerType: scenario.triggerType,
                    isActive: scenario.isActive,
                  })
                }}
              >
                キャンセル
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <h2 className="text-lg font-semibold text-foreground">{scenario.name}</h2>
              <div className="flex items-center gap-2">
                <Badge variant={scenario.isActive ? 'default' : 'secondary'}>
                  {scenario.isActive ? '有効' : '無効'}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  編集
                </Button>
              </div>
            </div>
            {scenario.description && (
              <p className="text-sm text-muted-foreground mb-3">{scenario.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>トリガー: {triggerOptions.find(o => o.value === scenario.triggerType)?.label ?? scenario.triggerType}</span>
              <span>ステップ数: {scenario.steps.length}</span>
              <span>作成日: {new Date(scenario.createdAt).toLocaleDateString('ja-JP')}</span>
            </div>
          </div>
        )}
      </div>

      {/* ステップ一覧 */}
      <div className="rounded-md border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-foreground">ステップ一覧</h3>
          <Button size="sm" onClick={openAddStep}>
            <Plus size={14} className="mr-1" />
            ステップ追加
          </Button>
        </div>

        {/* ステップ追加フォーム */}
        {showStepForm && (
          <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
            <h4 className="text-sm font-medium text-foreground mb-3">
              {editingStepId ? 'ステップを編集' : '新しいステップを追加'}
            </h4>
            <div className="space-y-3 max-w-lg">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">ステップ順序</label>
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    value={stepForm.stepOrder}
                    onChange={(e) => setStepForm({ ...stepForm, stepOrder: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">遅延 (分)</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={stepForm.delayMinutes}
                    onChange={(e) => setStepForm({ ...stepForm, delayMinutes: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDelay(stepForm.delayMinutes)}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">メッセージタイプ</label>
                <select
                  className={inputClass}
                  value={stepForm.messageType}
                  onChange={(e) => setStepForm({ ...stepForm, messageType: e.target.value as MessageType })}
                >
                  {messageTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  メッセージ内容 <span className="text-destructive">*</span>
                </label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={4}
                  placeholder="メッセージ内容を入力..."
                  value={stepForm.messageContent}
                  onChange={(e) => setStepForm({ ...stepForm, messageContent: e.target.value })}
                />
              </div>

              {stepError && <p className="text-xs text-destructive">{stepError}</p>}

              <div className="flex gap-2">
                <Button onClick={handleSaveStep} disabled={stepSaving}>
                  {stepSaving ? '保存中...' : editingStepId ? '更新' : '追加'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setShowStepForm(false); setEditingStepId(null); setStepError('') }}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ステップ一覧（縦フロー） */}
        {sortedSteps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            ステップがありません。「ステップ追加」から追加してください。
          </div>
        ) : (
          <div className="space-y-2">
            {sortedSteps.map((step, idx) => (
              <div key={step.id}>
                {/* ステップカード */}
                <div className="border border-border rounded-lg p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* 並び替えボタン */}
                    <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
                      <button
                        onClick={() => handleMoveStep(step, 'up')}
                        disabled={idx === 0 || reordering}
                        className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="上へ"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => handleMoveStep(step, 'down')}
                        disabled={idx === sortedSteps.length - 1 || reordering}
                        className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="下へ"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    {/* ステップ番号 */}
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-primary text-primary-foreground shrink-0">
                      {step.stepOrder}
                    </span>

                    {/* コンテンツ */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">{formatDelay(step.delayMinutes)}</span>
                        <Badge variant="outline" className="text-xs">
                          {messageTypeOptions.find(o => o.value === step.messageType)?.label ?? step.messageType}
                        </Badge>
                      </div>
                      <div className="text-sm text-foreground bg-muted/30 rounded-md px-3 py-2">
                        {step.messageType === 'text' ? (
                          <p className="whitespace-pre-wrap break-words">{step.messageContent}</p>
                        ) : step.messageType === 'flex' ? (
                          <FlexPreview content={step.messageContent} />
                        ) : step.messageType === 'image' ? (
                          <ImagePreview content={step.messageContent} />
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{step.messageContent}</p>
                        )}
                      </div>
                    </div>

                    {/* 操作ボタン */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditStep(step)}
                      >
                        編集
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmDeleteStep(step.id)}
                      >
                        削除
                      </Button>
                    </div>
                  </div>
                </div>

                {/* ステップ間の追加ボタン */}
                {idx < sortedSteps.length - 1 && (
                  <div className="flex items-center justify-center py-1">
                    <button
                      onClick={openAddStep}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded hover:bg-accent"
                    >
                      <Plus size={12} />
                      ステップを追加
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* 末尾の追加ボタン */}
            <div className="flex items-center justify-center pt-2">
              <button
                onClick={openAddStep}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded border border-dashed border-border hover:border-primary"
              >
                <Plus size={12} />
                ステップを追加
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ステップ削除確認 */}
      <ConfirmDialog
        open={confirmDeleteStep !== null}
        onOpenChange={(open) => { if (!open) setConfirmDeleteStep(null) }}
        title="ステップを削除しますか？"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={() => confirmDeleteStep && handleDeleteStep(confirmDeleteStep)}
      />
    </div>
  )
}
