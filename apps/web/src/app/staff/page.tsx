'use client'
import { useState, useEffect } from 'react'
import { fetchApi } from '@/lib/api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Users } from 'lucide-react'
import type { ApiResponse } from '@line-crm/shared'
import type { StaffMember } from '@line-crm/shared'

type NewApiKey = { apiKey: string; staffId: string }

const inputClass =
  'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

function RoleBadge({ role }: { role: string }) {
  if (role === 'owner') return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">オーナー</Badge>
  if (role === 'admin') return <Badge variant="default">管理者</Badge>
  return <Badge variant="secondary">スタッフ</Badge>
}

function maskKey(key: string): string {
  if (!key || key.length <= 8) return '••••••••'
  return key.slice(0, 4) + '••••••••' + key.slice(-4)
}

export default function StaffPage() {
  const [members, setMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [newKey, setNewKey] = useState<NewApiKey | null>(null)
  const [copied, setCopied] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState<'admin' | 'staff'>('staff')
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const [confirmRegenKey, setConfirmRegenKey] = useState<StaffMember | null>(null)
  const [confirmDeleteMember, setConfirmDeleteMember] = useState<StaffMember | null>(null)

  const loadMembers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchApi<ApiResponse<StaffMember[]>>('/api/staff')
      if (res.success) {
        setMembers(res.data)
      } else {
        setError(res.error ?? 'スタッフの読み込みに失敗しました')
      }
    } catch {
      setError('スタッフの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')
    try {
      const body: { name: string; role: 'admin' | 'staff'; email?: string } = {
        name: formName,
        role: formRole,
      }
      if (formEmail) body.email = formEmail

      const res = await fetchApi<ApiResponse<StaffMember & { apiKey?: string }>>('/api/staff', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (res.success) {
        if (res.data.apiKey) {
          setNewKey({ apiKey: res.data.apiKey, staffId: res.data.id })
        }
        setFormName('')
        setFormEmail('')
        setFormRole('staff')
        setShowForm(false)
        await loadMembers()
      } else {
        setFormError(res.error ?? '作成に失敗しました')
      }
    } catch {
      setFormError('作成に失敗しました')
    } finally {
      setFormLoading(false)
    }
  }

  const handleToggleActive = async (member: StaffMember) => {
    try {
      await fetchApi<ApiResponse<StaffMember>>(`/api/staff/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !member.isActive }),
      })
      await loadMembers()
    } catch {
      setError('更新に失敗しました')
    }
  }

  const handleRegenerateKey = async (member: StaffMember) => {
    try {
      const res = await fetchApi<ApiResponse<{ apiKey: string }>>(`/api/staff/${member.id}/regenerate-key`, {
        method: 'POST',
      })
      if (res.success) {
        setNewKey({ apiKey: res.data.apiKey, staffId: member.id })
      } else {
        setError(res.error ?? 'キー再生成に失敗しました')
      }
    } catch {
      setError('キー再生成に失敗しました')
    }
  }

  const handleDelete = async (member: StaffMember) => {
    try {
      await fetchApi<ApiResponse<null>>(`/api/staff/${member.id}`, { method: 'DELETE' })
      await loadMembers()
    } catch {
      setError('削除に失敗しました')
    }
  }

  const handleCopy = async () => {
    if (!newKey) return
    await navigator.clipboard.writeText(newKey.apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="py-6">
      <PageHeader
        title="スタッフ管理"
        action={<Button onClick={() => setShowForm(!showForm)}>+ スタッフを追加</Button>}
      />

      {newKey && (
        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium text-foreground mb-2">
            APIキーが発行されました。このキーは一度しか表示されません。
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-background border border-primary/20 rounded px-3 py-2 font-mono break-all text-foreground">
              {newKey.apiKey}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 px-3 py-2 text-xs font-medium text-primary bg-background border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
            >
              {copied ? 'コピー済み' : 'コピー'}
            </button>
            <button
              onClick={() => setNewKey(null)}
              className="shrink-0 px-3 py-2 text-xs font-medium text-muted-foreground bg-background border border-border rounded-lg hover:bg-accent transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mb-6 p-5 bg-card border border-border rounded-lg">
          <h2 className="text-sm font-semibold text-foreground mb-4">新しいスタッフを追加</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">名前 *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="田中 太郎"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="taro@example.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">ロール *</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as 'admin' | 'staff')}
                  className={inputClass}
                >
                  <option value="staff">スタッフ</option>
                  <option value="admin">管理者</option>
                </select>
              </div>
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={formLoading || !formName}>
                {formLoading ? '作成中...' : '作成'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowForm(false); setFormError('') }}
              >
                キャンセル
              </Button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState rows={3} columns={6} />
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title="スタッフがいません"
          description="「+ スタッフを追加」から追加してください"
          action={<Button onClick={() => setShowForm(true)}>スタッフを追加</Button>}
        />
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">名前</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">メール</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ロール</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">APIキー</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">状態</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{member.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{member.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden md:table-cell">
                    {maskKey(member.apiKey ?? '')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${member.isActive ? 'text-green-700' : 'text-muted-foreground'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${member.isActive ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                      {member.isActive ? '有効' : '無効'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {member.role !== 'owner' && (
                        <>
                          <button
                            onClick={() => handleToggleActive(member)}
                            className="px-2.5 py-1 text-xs font-medium text-muted-foreground bg-background border border-border rounded hover:bg-accent transition-colors"
                          >
                            {member.isActive ? '無効化' : '有効化'}
                          </button>
                          <button
                            onClick={() => setConfirmRegenKey(member)}
                            className="px-2.5 py-1 text-xs font-medium text-primary bg-background border border-primary/30 rounded hover:bg-primary/5 transition-colors"
                          >
                            キー再生成
                          </button>
                          <button
                            onClick={() => setConfirmDeleteMember(member)}
                            className="px-2.5 py-1 text-xs font-medium text-destructive bg-background border border-destructive/30 rounded hover:bg-destructive/5 transition-colors"
                          >
                            削除
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmRegenKey !== null}
        onOpenChange={(open) => { if (!open) setConfirmRegenKey(null) }}
        title="APIキーを再生成しますか？"
        description={`${confirmRegenKey?.name} の現在のキーは無効になります。`}
        confirmLabel="再生成する"
        variant="destructive"
        onConfirm={() => confirmRegenKey && handleRegenerateKey(confirmRegenKey)}
      />

      <ConfirmDialog
        open={confirmDeleteMember !== null}
        onOpenChange={(open) => { if (!open) setConfirmDeleteMember(null) }}
        title="スタッフを削除しますか？"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={() => confirmDeleteMember && handleDelete(confirmDeleteMember)}
      />
    </div>
  )
}
