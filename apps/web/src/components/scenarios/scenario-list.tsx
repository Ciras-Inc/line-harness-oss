'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Scenario } from '@line-crm/shared'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Zap, ClipboardList } from 'lucide-react'

type ScenarioWithCount = Scenario & { stepCount?: number }

const triggerLabels: Record<string, string> = {
  friend_add: '友だち追加時',
  tag_added: 'タグ付与時',
  manual: '手動',
}

interface ScenarioListProps {
  scenarios: ScenarioWithCount[]
  onToggleActive: (id: string, current: boolean) => void
  onDelete: (id: string) => void
  loading?: boolean
}

export default function ScenarioList({ scenarios, onToggleActive, onDelete, loading }: ScenarioListProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  if (scenarios.length === 0) {
    return null
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className="bg-card rounded-lg border border-border p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
          >
            {/* ヘッダー */}
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/scenarios/detail?id=${scenario.id}`}
                className="text-sm font-semibold text-foreground hover:text-primary transition-colors leading-tight"
              >
                {scenario.name}
              </Link>
              <Badge variant={scenario.isActive ? 'default' : 'secondary'}>
                {scenario.isActive ? '有効' : '無効'}
              </Badge>
            </div>

            {/* 説明 */}
            {scenario.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{scenario.description}</p>
            )}

            {/* メタ情報 */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap size={12} />
                <span>トリガー: {triggerLabels[scenario.triggerType] ?? scenario.triggerType}</span>
              </span>
              <span className="flex items-center gap-1">
                <ClipboardList size={12} />
                <span>ステップ数: {scenario.stepCount ?? '-'}</span>
              </span>
            </div>

            {/* アクション */}
            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <Link
                href={`/scenarios/detail?id=${scenario.id}`}
                className="flex-1 text-center text-xs font-medium text-primary py-1 min-h-[44px] flex items-center justify-center rounded-md hover:bg-accent transition-colors"
              >
                編集
              </Link>
              <button
                onClick={() => onToggleActive(scenario.id, scenario.isActive)}
                disabled={loading}
                className="flex-1 text-xs font-medium text-muted-foreground py-1 min-h-[44px] flex items-center justify-center rounded-md hover:bg-accent transition-colors disabled:opacity-40"
              >
                {scenario.isActive ? '無効にする' : '有効にする'}
              </button>
              <button
                onClick={() => setConfirmDelete(scenario.id)}
                disabled={loading}
                className="flex-1 text-xs font-medium text-destructive py-1 min-h-[44px] flex items-center justify-center rounded-md hover:bg-destructive/10 transition-colors disabled:opacity-40"
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}
        title="シナリオを削除しますか？"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={() => confirmDelete && onDelete(confirmDelete)}
      />
    </>
  )
}
