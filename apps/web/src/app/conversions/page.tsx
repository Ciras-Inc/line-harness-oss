'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { ConversionPoint } from '@line-crm/shared'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import CcPromptButton from '@/components/cc-prompt-button'
import { Target } from 'lucide-react'

interface ConversionReportItem {
  conversionPointId: string
  conversionPointName: string
  eventType: string
  totalCount: number
  totalValue: number
}

const inputClass =
  'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

const ccPrompts = [
  {
    title: 'CV計測ポイント設定',
    prompt: `コンバージョン計測ポイントの設定をサポートしてください。
1. 主要なイベントタイプ（友だち追加、URLクリック、購入完了等）の説明
2. 各CVポイントに設定すべき金額の目安を提案
3. CVファネル全体の計測設計のベストプラクティス
手順を示してください。`,
  },
  {
    title: 'コンバージョン分析',
    prompt: `現在のコンバージョンデータを分析してください。
1. CVポイント別の発火回数と金額を集計
2. イベントタイプ別のCV率とトレンドを分析
3. CV率向上のための改善施策を提案
結果をレポートしてください。`,
  },
]

export default function ConversionsPage() {
  const [points, setPoints] = useState<ConversionPoint[]>([])
  const [report, setReport] = useState<ConversionReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', eventType: '', value: '' })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [pointsRes, reportRes] = await Promise.allSettled([
        api.conversions.points(),
        api.conversions.report(),
      ])
      if (pointsRes.status === 'fulfilled' && pointsRes.value.success) setPoints(pointsRes.value.data)
      if (reportRes.status === 'fulfilled' && reportRes.value.success) setReport(reportRes.value.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.eventType) return
    try {
      await api.conversions.createPoint({
        name: form.name,
        eventType: form.eventType,
        value: form.value ? Number(form.value) : null,
      })
      setForm({ name: '', eventType: '', value: '' })
      setShowCreate(false)
      load()
    } catch {}
  }

  const handleDelete = async (id: string) => {
    await api.conversions.deletePoint(id)
    load()
  }

  const eventTypes = [
    { value: 'friend_add', label: '友だち追加' },
    { value: 'rich_menu_tap', label: 'リッチメニュータップ' },
    { value: 'url_click', label: 'URLクリック' },
    { value: 'form_submit', label: 'フォーム送信' },
    { value: 'keyword_sent', label: 'キーワード送信' },
    { value: 'scenario_step', label: 'シナリオステップ到達' },
    { value: 'liff_view', label: 'LIFF閲覧' },
    { value: 'purchase', label: '購入完了' },
    { value: 'custom', label: 'カスタム' },
  ]

  return (
    <div className="py-6">
      <PageHeader
        title="コンバージョン計測"
        description="CVポイント定義 & レポート"
        action={
          <Button onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'キャンセル' : '+ CVポイント作成'}
          </Button>
        }
      />

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-card rounded-lg border border-border p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">CV名</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                placeholder="購入完了"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">イベントタイプ</label>
              <select
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                className={inputClass}
                required
              >
                <option value="">選択...</option>
                {eventTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">金額 (任意)</label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className={inputClass}
                placeholder="0"
              />
            </div>
          </div>
          <Button type="submit" className="mt-4">作成</Button>
        </form>
      )}

      {report.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {report.map((r) => (
            <div key={r.conversionPointId} className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">{r.conversionPointName}</p>
                <Badge variant="outline">{r.eventType}</Badge>
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-2xl font-bold text-foreground">{r.totalCount}</p>
                  <p className="text-xs text-muted-foreground">CV数</p>
                </div>
                {r.totalValue > 0 && (
                  <div>
                    <p className="text-lg font-semibold text-primary">{r.totalValue.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</p>
                    <p className="text-xs text-muted-foreground">売上</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <LoadingState rows={3} columns={5} />
      ) : points.length === 0 ? (
        <EmptyState
          icon={<Target size={32} />}
          title="CVポイントがありません"
          description="「+ CVポイント作成」から最初のポイントを作成してください"
          action={<Button onClick={() => setShowCreate(true)}>CVポイント作成</Button>}
        />
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">CV名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">イベントタイプ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">金額</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">作成日</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {points.map((point) => (
                <tr key={point.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{point.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{point.eventType}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {point.value !== null ? `¥${point.value.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(point.createdAt).toLocaleDateString('ja-JP')}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setConfirmDelete(point.id)}
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
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}
        title="CVポイントを削除しますか？"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />

      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
