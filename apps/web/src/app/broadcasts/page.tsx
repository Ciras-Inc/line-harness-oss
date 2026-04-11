'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Tag } from '@line-crm/shared'
import { api, type ApiBroadcast, type BroadcastInsight } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import BroadcastForm from '@/components/broadcasts/broadcast-form'
import CcPromptButton from '@/components/cc-prompt-button'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Megaphone } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const ccPrompts = [
  {
    title: '配信メッセージを作成',
    prompt: `一斉配信用のメッセージを作成してください。
1. 配信目的: [目的を指定]
2. ターゲット: 全員 / タグ指定
3. メッセージタイプ: テキスト / 画像 / Flex
効果的なメッセージ文面を提案してください。`,
  },
  {
    title: '配信スケジュール最適化',
    prompt: `配信スケジュールを最適化してください。
1. 過去の配信実績から最適な時間帯を分析
2. 曜日別の開封率を確認
3. 推奨スケジュールを提案
データに基づいた根拠も示してください。`,
  },
]

const statusBadge: Record<ApiBroadcast['status'], { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: '下書き', variant: 'secondary' },
  scheduled: { label: '予約済み', variant: 'outline' },
  sending: { label: '送信中', variant: 'default' },
  sent: { label: '送信完了', variant: 'default' },
}

function formatDatetime(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function BroadcastsPage() {
  const { selectedAccountId } = useAccount()
  const [broadcasts, setBroadcasts] = useState<ApiBroadcast[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [insights, setInsights] = useState<Record<string, BroadcastInsight>>({})
  const [fetchingInsight, setFetchingInsight] = useState<string | null>(null)
  const [confirmSend, setConfirmSend] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const loadInsight = async (id: string) => {
    try {
      const res = await api.broadcasts.getInsight(id)
      if (res.success && res.data) {
        setInsights(prev => ({ ...prev, [id]: res.data! }))
      }
    } catch { /* ignore */ }
  }

  const handleFetchInsight = async (id: string) => {
    setFetchingInsight(id)
    try {
      const res = await api.broadcasts.fetchInsight(id)
      if (res.success && res.data) {
        setInsights(prev => ({ ...prev, [id]: res.data }))
      }
    } catch {
      setError('インサイトの取得に失敗しました')
    } finally {
      setFetchingInsight(null)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [broadcastsRes, tagsRes] = await Promise.all([
        api.broadcasts.list({ accountId: selectedAccountId || undefined }),
        api.tags.list(),
      ])
      if (broadcastsRes.success) setBroadcasts(broadcastsRes.data)
      else setError(broadcastsRes.error)
      if (tagsRes.success) setTags(tagsRes.data)
    } catch {
      setError('データの読み込みに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    broadcasts.filter(b => b.status === 'sent').forEach(b => loadInsight(b.id))
  }, [broadcasts])

  const handleSend = async (id: string) => {
    setSendingId(id)
    try {
      await api.broadcasts.send(id)
      load()
    } catch {
      setError('送信に失敗しました')
    } finally {
      setSendingId(null)
      setConfirmSend(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.broadcasts.delete(id)
      load()
    } catch {
      setError('削除に失敗しました')
    } finally {
      setConfirmDelete(null)
    }
  }

  const getTagName = (tagId: string | null) => {
    if (!tagId) return null
    return tags.find((t) => t.id === tagId)?.name ?? null
  }

  return (
    <div className="py-6">
      <PageHeader
        title="一斉配信"
        description="友だちへのメッセージ一斉送信・予約管理"
        action={
          <Button onClick={() => setShowCreate(true)}>
            + 新規配信作成
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
        <div className="mb-6">
          <BroadcastForm
            tags={tags}
            onSuccess={() => { setShowCreate(false); load() }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {loading ? (
        <LoadingState rows={4} columns={5} />
      ) : broadcasts.length === 0 && !showCreate ? (
        <EmptyState
          icon={<Megaphone size={32} />}
          title="配信がありません"
          description="「新規配信作成」から最初の配信を作成してください"
          action={<Button onClick={() => setShowCreate(true)}>新規配信作成</Button>}
        />
      ) : (
        <div className="rounded-md border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>配信タイトル</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>配信対象</TableHead>
                <TableHead>予約日時</TableHead>
                <TableHead>送信完了日時</TableHead>
                <TableHead>実績</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {broadcasts.map((broadcast) => {
                const { label, variant } = statusBadge[broadcast.status]
                const tagName = getTagName(broadcast.targetTagId)
                const isSending = sendingId === broadcast.id

                return (
                  <TableRow key={broadcast.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{broadcast.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {broadcast.messageType === 'text' ? 'テキスト' : broadcast.messageType === 'image' ? '画像' : 'Flex'}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={variant}>{label}</Badge>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {broadcast.targetType === 'all' ? '全員' : tagName ? `タグ: ${tagName}` : 'タグ指定'}
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {formatDatetime(broadcast.scheduledAt)}
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {formatDatetime(broadcast.sentAt)}
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {broadcast.status === 'sent' ? (
                        <div>
                          {broadcast.totalCount > 0 && (
                            <p>{broadcast.successCount.toLocaleString('ja-JP')} / {broadcast.totalCount.toLocaleString('ja-JP')} 件</p>
                          )}
                          {insights[broadcast.id] ? (
                            <div className="mt-1 space-y-0.5">
                              {insights[broadcast.id].delivered != null && (
                                <p className="text-xs">配信: <span className="font-medium text-foreground">{insights[broadcast.id].delivered!.toLocaleString('ja-JP')}</span></p>
                              )}
                              {insights[broadcast.id].uniqueImpression != null && (
                                <p className="text-xs">開封: <span className="font-medium text-primary">{insights[broadcast.id].uniqueImpression!.toLocaleString('ja-JP')}</span>
                                  {insights[broadcast.id].openRate != null && (
                                    <span className="text-muted-foreground"> ({(insights[broadcast.id].openRate! * 100).toFixed(1)}%)</span>
                                  )}
                                </p>
                              )}
                              {insights[broadcast.id].uniqueClick != null && (
                                <p className="text-xs">クリック: <span className="font-medium text-primary">{insights[broadcast.id].uniqueClick!.toLocaleString('ja-JP')}</span>
                                  {insights[broadcast.id].clickRate != null && (
                                    <span className="text-muted-foreground"> ({(insights[broadcast.id].clickRate! * 100).toFixed(1)}%)</span>
                                  )}
                                </p>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleFetchInsight(broadcast.id)}
                              disabled={fetchingInsight === broadcast.id}
                              className="mt-1 text-xs text-primary hover:underline disabled:opacity-50"
                            >
                              {fetchingInsight === broadcast.id ? '取得中...' : 'インサイトを取得'}
                            </button>
                          )}
                        </div>
                      ) : '-'}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {broadcast.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setConfirmSend(broadcast.id)}
                            disabled={isSending}
                          >
                            {isSending ? '送信中...' : '今すぐ送信'}
                          </Button>
                        )}
                        {(broadcast.status === 'draft' || broadcast.status === 'scheduled') && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setConfirmDelete(broadcast.id)}
                          >
                            削除
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 送信確認 */}
      <ConfirmDialog
        open={confirmSend !== null}
        onOpenChange={(open) => { if (!open) setConfirmSend(null) }}
        title="今すぐ送信しますか？"
        description="この配信を今すぐ全対象者に送信します。送信後は取り消せません。"
        confirmLabel="送信する"
        variant="default"
        onConfirm={() => confirmSend && handleSend(confirmSend)}
        loading={sendingId !== null}
      />

      {/* 削除確認 */}
      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}
        title="配信を削除しますか？"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />

      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
