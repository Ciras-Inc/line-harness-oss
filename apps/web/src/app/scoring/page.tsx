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
import { Target } from 'lucide-react'

interface ScoringRule {
  id: string
  name: string
  eventType: string
  scoreValue: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface CreateFormState {
  name: string
  eventType: string
  scoreValue: string
}

const ccPrompts = [
  {
    title: 'スコアリングルール設計',
    prompt: `スコアリングルールの設計をサポートしてください。
1. 主要なイベントタイプ別の推奨スコア値を提案
2. 正のスコア（エンゲージメント）と負のスコア（離脱兆候）のバランス設計
3. スコア閾値に基づくセグメント分類の推奨設定
手順を示してください。`,
  },
  {
    title: 'スコア分析レポート',
    prompt: `現在のスコアリングデータを分析してください。
1. ルール別のスコア付与回数と合計値を集計
2. 有効・無効ルールの見直しと最適化提案
3. スコア分布に基づく友だちのセグメント分析
結果をレポートしてください。`,
  },
]

const inputClass =
  'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function ScoringPage() {
  const { selectedAccountId } = useAccount()
  const [rules, setRules] = useState<ScoringRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateFormState>({
    name: '',
    eventType: '',
    scoreValue: '',
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const loadRules = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.scoring.rules()
      if (res.success) {
        setRules(res.data)
      } else {
        setError(res.error)
      }
    } catch {
      setError('スコアリングルールの読み込みに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setFormError('ルール名を入力してください')
      return
    }
    if (!form.eventType.trim()) {
      setFormError('イベントタイプを入力してください')
      return
    }
    if (!form.scoreValue || isNaN(Number(form.scoreValue))) {
      setFormError('スコア値を数値で入力してください')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const res = await api.scoring.createRule({
        name: form.name,
        eventType: form.eventType,
        scoreValue: Number(form.scoreValue),
      })
      if (res.success) {
        setShowCreate(false)
        setForm({ name: '', eventType: '', scoreValue: '' })
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
      await api.scoring.updateRule(id, { isActive: !current })
      loadRules()
    } catch {
      setError('ステータスの変更に失敗しました')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.scoring.deleteRule(id)
      loadRules()
    } catch {
      setError('削除に失敗しました')
    }
  }

  const totalRules = rules.length
  const activeRules = rules.filter((r) => r.isActive).length

  return (
    <div className="py-6">
      <PageHeader
        title="スコアリングルール"
        description="イベントトリガーによるスコア付与ルール"
        action={<Button onClick={() => setShowCreate(true)}>+ 新規ルール</Button>}
      />

      {!loading && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">ルール総数</p>
            <p className="text-2xl font-bold text-foreground">{totalRules}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">有効なルール</p>
            <p className="text-2xl font-bold text-primary">{activeRules}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error}
        </div>
      )}

      {showCreate && (
        <div className="mb-6 rounded-md border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">新規スコアリングルールを作成</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                ルール名 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="例: メッセージ開封"
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
                placeholder="例: message_open, url_click, friend_add"
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                スコア値 <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                className={inputClass}
                placeholder="例: 10 (正の値で加算、負の値で減算)"
                value={form.scoreValue}
                onChange={(e) => setForm({ ...form, scoreValue: e.target.value })}
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
        <LoadingState rows={3} columns={5} />
      ) : rules.length === 0 && !showCreate ? (
        <EmptyState
          icon={<Target size={32} />}
          title="スコアリングルールがありません"
          description="「新規ルール」から最初のルールを作成してください"
          action={<Button onClick={() => setShowCreate(true)}>新規ルール</Button>}
        />
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">ルール名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">イベントタイプ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">スコア値</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">ステータス</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-accent/50">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{rule.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{rule.eventType}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      <span className={rule.scoreValue >= 0 ? 'text-primary' : 'text-destructive'}>
                        {rule.scoreValue >= 0 ? `+${rule.scoreValue}` : rule.scoreValue}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(rule.id, rule.isActive)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          rule.isActive ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            rule.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setConfirmDelete(rule.id)}
                        className="text-destructive hover:text-destructive/80 text-sm"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null)
        }}
        title="スコアリングルールを削除しますか？"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />

      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
