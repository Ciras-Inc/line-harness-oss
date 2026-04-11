'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { api } from '@/lib/api'
import CcPromptButton from '@/components/cc-prompt-button'
import { Webhook } from 'lucide-react'

interface IncomingWebhook {
  id: string
  name: string
  sourceType: string
  secret: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface OutgoingWebhook {
  id: string
  name: string
  url: string
  eventTypes: string[]
  secret: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type Tab = 'incoming' | 'outgoing'

const ccPrompts = [
  {
    title: 'Webhook設定ガイド',
    prompt: `Webhookの設定手順をガイドしてください。
1. 受信Webhook（Incoming）の作成とエンドポイントURLの設定方法
2. 送信Webhook（Outgoing）のURL・イベントタイプ・シークレット設定
3. LINE公式アカウントとのWebhook連携設定手順
手順を示してください。`,
  },
  {
    title: 'Webhookデバッグ',
    prompt: `Webhookの動作確認とデバッグをサポートしてください。
1. 受信・送信Webhookの有効/無効ステータスを確認
2. Webhookのテスト送信と応答検証の手順
3. よくあるエラーパターンとトラブルシューティング方法
手順を示してください。`,
  },
]

const inputClass =
  'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function WebhooksPage() {
  const [tab, setTab] = useState<Tab>('incoming')
  const [incoming, setIncoming] = useState<IncomingWebhook[]>([])
  const [outgoing, setOutgoing] = useState<OutgoingWebhook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDeleteIncoming, setConfirmDeleteIncoming] = useState<string | null>(null)
  const [confirmDeleteOutgoing, setConfirmDeleteOutgoing] = useState<string | null>(null)

  const [inForm, setInForm] = useState({ name: '', sourceType: '' })
  const [outForm, setOutForm] = useState({ name: '', url: '', eventTypes: '', secret: '' })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [inRes, outRes] = await Promise.all([
        api.webhooks.incoming.list(),
        api.webhooks.outgoing.list(),
      ])
      if (inRes.success) setIncoming(inRes.data)
      else setError(inRes.error)
      if (outRes.success) setOutgoing(outRes.data)
      else setError(outRes.error)
    } catch {
      setError('データの読み込みに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleToggleIncoming = async (id: string, currentActive: boolean) => {
    try {
      await api.webhooks.incoming.update(id, { isActive: !currentActive })
      load()
    } catch {
      setError('更新に失敗しました')
    }
  }

  const handleToggleOutgoing = async (id: string, currentActive: boolean) => {
    try {
      await api.webhooks.outgoing.update(id, { isActive: !currentActive })
      load()
    } catch {
      setError('更新に失敗しました')
    }
  }

  const handleDeleteIncoming = async (id: string) => {
    try {
      await api.webhooks.incoming.delete(id)
      load()
    } catch {
      setError('削除に失敗しました')
    }
  }

  const handleDeleteOutgoing = async (id: string) => {
    try {
      await api.webhooks.outgoing.delete(id)
      load()
    } catch {
      setError('削除に失敗しました')
    }
  }

  const handleCreateIncoming = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inForm.name) return
    try {
      await api.webhooks.incoming.create({
        name: inForm.name,
        sourceType: inForm.sourceType || undefined,
      })
      setInForm({ name: '', sourceType: '' })
      setShowCreate(false)
      load()
    } catch {
      setError('作成に失敗しました')
    }
  }

  const handleCreateOutgoing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!outForm.name || !outForm.url) return
    try {
      const eventTypes = outForm.eventTypes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      await api.webhooks.outgoing.create({
        name: outForm.name,
        url: outForm.url,
        eventTypes,
        secret: outForm.secret || undefined,
      })
      setOutForm({ name: '', url: '', eventTypes: '', secret: '' })
      setShowCreate(false)
      load()
    } catch {
      setError('作成に失敗しました')
    }
  }

  const endpointUrl = (id: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/incoming/${id}`

  return (
    <div className="py-6">
      <PageHeader
        title="Webhook管理"
        description="受信・送信Webhookエンドポイントの管理"
        action={
          <Button onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'キャンセル' : '+ 新規Webhook'}
          </Button>
        }
      />

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1 w-fit">
        <button
          onClick={() => { setTab('incoming'); setShowCreate(false) }}
          className={`px-4 py-2 min-h-[44px] text-sm font-medium rounded-md transition-colors ${
            tab === 'incoming'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          受信 (Incoming)
        </button>
        <button
          onClick={() => { setTab('outgoing'); setShowCreate(false) }}
          className={`px-4 py-2 min-h-[44px] text-sm font-medium rounded-md transition-colors ${
            tab === 'outgoing'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          送信 (Outgoing)
        </button>
      </div>

      {showCreate && tab === 'incoming' && (
        <form onSubmit={handleCreateIncoming} className="bg-card rounded-md border border-border p-6 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">受信Webhook作成</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">名前</label>
              <input
                value={inForm.name}
                onChange={(e) => setInForm({ ...inForm, name: e.target.value })}
                className={inputClass}
                placeholder="LINE公式アカウント"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">ソースタイプ</label>
              <input
                value={inForm.sourceType}
                onChange={(e) => setInForm({ ...inForm, sourceType: e.target.value })}
                className={inputClass}
                placeholder="line"
              />
            </div>
          </div>
          <Button type="submit" className="mt-4">作成</Button>
        </form>
      )}

      {showCreate && tab === 'outgoing' && (
        <form onSubmit={handleCreateOutgoing} className="bg-card rounded-md border border-border p-6 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">送信Webhook作成</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">名前</label>
              <input
                value={outForm.name}
                onChange={(e) => setOutForm({ ...outForm, name: e.target.value })}
                className={inputClass}
                placeholder="外部CRM連携"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">URL</label>
              <input
                value={outForm.url}
                onChange={(e) => setOutForm({ ...outForm, url: e.target.value })}
                className={inputClass}
                placeholder="https://example.com/webhook"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">イベントタイプ (カンマ区切り)</label>
              <input
                value={outForm.eventTypes}
                onChange={(e) => setOutForm({ ...outForm, eventTypes: e.target.value })}
                className={inputClass}
                placeholder="friend.added, message.received"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">シークレット (任意)</label>
              <input
                value={outForm.secret}
                onChange={(e) => setOutForm({ ...outForm, secret: e.target.value })}
                className={inputClass}
                placeholder="webhook-secret-key"
              />
            </div>
          </div>
          <Button type="submit" className="mt-4">作成</Button>
        </form>
      )}

      {loading ? (
        <LoadingState rows={4} columns={6} />
      ) : tab === 'incoming' ? (
        incoming.length === 0 && !showCreate ? (
          <EmptyState
            icon={<Webhook size={32} />}
            title="受信Webhookがありません"
            description="「新規Webhook」から作成してください"
            action={<Button onClick={() => setShowCreate(true)}>新規Webhook</Button>}
          />
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">名前</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ソースタイプ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">エンドポイントURL</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ステータス</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">作成日</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {incoming.map((wh) => (
                    <tr key={wh.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{wh.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{wh.sourceType || '-'}</td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-muted px-2 py-1 rounded text-foreground break-all">
                          {endpointUrl(wh.id)}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleToggleIncoming(wh.id, wh.isActive)}>
                          <Badge variant={wh.isActive ? 'default' : 'secondary'}>
                            {wh.isActive ? '有効' : '無効'}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(wh.createdAt).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setConfirmDeleteIncoming(wh.id)}
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
        )
      ) : (
        outgoing.length === 0 && !showCreate ? (
          <EmptyState
            icon={<Webhook size={32} />}
            title="送信Webhookがありません"
            description="「新規Webhook」から作成してください"
            action={<Button onClick={() => setShowCreate(true)}>新規Webhook</Button>}
          />
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">名前</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">イベントタイプ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ステータス</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">作成日</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {outgoing.map((wh) => (
                    <tr key={wh.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{wh.name}</td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-muted px-2 py-1 rounded text-foreground break-all">
                          {wh.url}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {wh.eventTypes.map((et) => (
                            <Badge key={et} variant="outline">{et}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleToggleOutgoing(wh.id, wh.isActive)}>
                          <Badge variant={wh.isActive ? 'default' : 'secondary'}>
                            {wh.isActive ? '有効' : '無効'}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(wh.createdAt).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setConfirmDeleteOutgoing(wh.id)}
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
        )
      )}

      <ConfirmDialog
        open={confirmDeleteIncoming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteIncoming(null)
        }}
        title="受信Webhookを削除しますか？"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={() => confirmDeleteIncoming && handleDeleteIncoming(confirmDeleteIncoming)}
      />

      <ConfirmDialog
        open={confirmDeleteOutgoing !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteOutgoing(null)
        }}
        title="送信Webhookを削除しますか？"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={() => confirmDeleteOutgoing && handleDeleteOutgoing(confirmDeleteOutgoing)}
      />

      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
