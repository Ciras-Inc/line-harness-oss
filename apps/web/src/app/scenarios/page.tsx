'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Scenario, ScenarioTriggerType } from '@line-crm/shared'
import { api } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import ScenarioList from '@/components/scenarios/scenario-list'
import CcPromptButton from '@/components/cc-prompt-button'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { GitBranch } from 'lucide-react'

const ccPrompts = [
  {
    title: '新しいシナリオを作成',
    prompt: `新しいシナリオ配信を作成してください。
1. ターゲット: [対象を指定]
2. トリガー: 友だち追加 / タグ変更 / 手動
3. ステップ数: [希望数]
4. メッセージ内容の提案もお願いします
各ステップの配信間隔も含めて構成してください。`,
  },
  {
    title: 'シナリオの効果分析',
    prompt: `現在のシナリオ配信の効果を分析してください。
1. 各シナリオの配信実績を確認
2. ステップごとの離脱率を分析
3. 改善が必要なシナリオを特定
具体的な改善案を提示してください。`,
  },
]

type ScenarioWithCount = Scenario & { stepCount?: number }

const triggerOptions: { value: ScenarioTriggerType; label: string }[] = [
  { value: 'friend_add', label: '友だち追加時' },
  { value: 'tag_added', label: 'タグ付与時' },
  { value: 'manual', label: '手動' },
]

const inputClass = 'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

interface CreateFormState {
  name: string
  description: string
  triggerType: ScenarioTriggerType
  triggerTagId: string
  isActive: boolean
}

export default function ScenariosPage() {
  const { selectedAccountId } = useAccount()
  const [scenarios, setScenarios] = useState<ScenarioWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateFormState>({
    name: '',
    description: '',
    triggerType: 'friend_add',
    triggerTagId: '',
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const loadScenarios = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.scenarios.list({ accountId: selectedAccountId || undefined })
      if (res.success) {
        setScenarios(res.data)
      } else {
        setError(res.error)
      }
    } catch {
      setError('シナリオの読み込みに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => {
    loadScenarios()
  }, [loadScenarios])

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setFormError('シナリオ名を入力してください')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const res = await api.scenarios.create({
        name: form.name,
        description: form.description || null,
        triggerType: form.triggerType,
        triggerTagId: form.triggerTagId || null,
        isActive: form.isActive,
      })
      if (res.success) {
        setShowCreate(false)
        setForm({ name: '', description: '', triggerType: 'friend_add', triggerTagId: '', isActive: true })
        loadScenarios()
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
      await api.scenarios.update(id, { isActive: !current })
      loadScenarios()
    } catch {
      setError('ステータスの変更に失敗しました')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.scenarios.delete(id)
      loadScenarios()
    } catch {
      setError('削除に失敗しました')
    }
  }

  return (
    <div className="py-6">
      <PageHeader
        title="シナリオ配信"
        description="友だち追加などのトリガーに応じた自動配信シナリオ"
        action={
          <Button onClick={() => setShowCreate(true)}>
            + 新規シナリオ
          </Button>
        }
      />

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error}
        </div>
      )}

      {/* 作成フォーム */}
      {showCreate && (
        <div className="mb-6 rounded-md border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">新規シナリオを作成</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                シナリオ名 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="例: 友だち追加ウェルカムシナリオ"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">説明</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={2}
                placeholder="シナリオの説明 (省略可)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">トリガー</label>
              <select
                className={inputClass}
                value={form.triggerType}
                onChange={(e) => setForm({ ...form, triggerType: e.target.value as ScenarioTriggerType })}
              >
                {triggerOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <label htmlFor="isActive" className="text-sm text-muted-foreground">作成後すぐに有効にする</label>
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
      ) : scenarios.length === 0 && !showCreate ? (
        <EmptyState
          icon={<GitBranch size={32} />}
          title="シナリオがありません"
          description="「新規シナリオ」から最初のシナリオを作成してください"
          action={<Button onClick={() => setShowCreate(true)}>新規シナリオ</Button>}
        />
      ) : (
        <ScenarioList
          scenarios={scenarios}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
          loading={loading}
        />
      )}

      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
