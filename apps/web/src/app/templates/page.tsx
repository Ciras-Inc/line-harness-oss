'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import CcPromptButton from '@/components/cc-prompt-button'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LayoutTemplate } from 'lucide-react'

interface Template {
  id: string
  name: string
  category: string
  messageType: string
  messageContent: string
  createdAt: string
  updatedAt: string
}

const messageTypeLabels: Record<string, string> = {
  text: 'テキスト',
  image: '画像',
  flex: 'Flex',
}

interface FormState {
  name: string
  category: string
  messageType: string
  messageContent: string
}

type CreateFormState = FormState

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const ccPrompts = [
  {
    title: 'テンプレート作成',
    prompt: `新しいメッセージテンプレートの作成をサポートしてください。
1. 用途別（挨拶、キャンペーン、通知、フォローアップ）のテンプレート文例を提案
2. テキスト・画像・Flexメッセージそれぞれの効果的な使い方
3. カテゴリ分類と命名規則のベストプラクティス
手順を示してください。`,
  },
  {
    title: 'テンプレート整理',
    prompt: `既存のテンプレートを整理・最適化してください。
1. カテゴリ別のテンプレート数と使用頻度を分析
2. 重複・類似テンプレートの統合提案
3. 不足しているカテゴリやテンプレートの追加推奨
結果をレポートしてください。`,
  },
]

const inputClass = 'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [form, setForm] = useState<CreateFormState>({
    name: '',
    category: '',
    messageType: 'text',
    messageContent: '',
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [editForm, setEditForm] = useState<FormState>({ name: '', category: '', messageType: 'text', messageContent: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.templates.list(
        selectedCategory !== 'all' ? selectedCategory : undefined
      )
      if (res.success) {
        setTemplates(res.data)
      } else {
        setError(res.error)
      }
    } catch {
      setError('テンプレートの読み込みに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }, [selectedCategory])

  useEffect(() => {
    load()
  }, [load])

  const categories = Array.from(
    new Set(templates.map((t) => t.category).filter(Boolean))
  )

  const handleCreate = async () => {
    if (!form.name.trim()) { setFormError('テンプレート名を入力してください'); return }
    if (!form.category.trim()) { setFormError('カテゴリを入力してください'); return }
    if (!form.messageContent.trim()) { setFormError('メッセージ内容を入力してください'); return }
    setSaving(true)
    setFormError('')
    try {
      const res = await api.templates.create({
        name: form.name,
        category: form.category,
        messageType: form.messageType,
        messageContent: form.messageContent,
      })
      if (res.success) {
        setShowCreate(false)
        setForm({ name: '', category: '', messageType: 'text', messageContent: '' })
        load()
      } else {
        setFormError(res.error)
      }
    } catch {
      setFormError('作成に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleEditOpen = (template: Template) => {
    setEditingTemplate(template)
    setEditForm({
      name: template.name,
      category: template.category,
      messageType: template.messageType,
      messageContent: template.messageContent,
    })
    setEditError('')
  }

  const handleEditSave = async () => {
    if (!editingTemplate) return
    if (!editForm.name.trim()) { setEditError('テンプレート名を入力してください'); return }
    if (!editForm.category.trim()) { setEditError('カテゴリを入力してください'); return }
    if (!editForm.messageContent.trim()) { setEditError('メッセージ内容を入力してください'); return }
    setEditSaving(true)
    setEditError('')
    try {
      const res = await api.templates.update(editingTemplate.id, {
        name: editForm.name,
        category: editForm.category,
        messageType: editForm.messageType,
        messageContent: editForm.messageContent,
      })
      if (res.success) {
        setEditingTemplate(null)
        load()
      } else {
        setEditError(res.error)
      }
    } catch {
      setEditError('保存に失敗しました')
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.templates.delete(id)
      load()
    } catch {
      setError('削除に失敗しました')
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div className="py-6">
      <PageHeader
        title="テンプレート管理"
        description="メッセージテンプレートの作成・編集"
        action={
          <Button onClick={() => setShowCreate(true)}>
            + 新規テンプレート
          </Button>
        }
      />

      {/* 編集ダイアログ */}
      <Dialog
        open={editingTemplate !== null}
        onOpenChange={(open) => { if (!open) setEditingTemplate(null) }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>テンプレートを編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                テンプレート名 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                カテゴリ <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">メッセージタイプ</label>
              <select
                className={inputClass}
                value={editForm.messageType}
                onChange={(e) => setEditForm({ ...editForm, messageType: e.target.value })}
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
                rows={5}
                value={editForm.messageContent}
                onChange={(e) => setEditForm({ ...editForm, messageContent: e.target.value })}
              />
            </div>
            {editError && <p className="text-xs text-destructive">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)} disabled={editSaving}>
              キャンセル
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認 */}
      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}
        title="テンプレートを削除しますか？"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error}
        </div>
      )}

      {/* カテゴリフィルター */}
      {!loading && categories.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            全て
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* 作成フォーム */}
      {showCreate && (
        <div className="mb-6 rounded-md border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">新規テンプレートを作成</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                テンプレート名 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="例: ウェルカムメッセージ"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                カテゴリ <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="例: 挨拶、キャンペーン、通知"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">メッセージタイプ</label>
              <select
                className={inputClass}
                value={form.messageType}
                onChange={(e) => setForm({ ...form, messageType: e.target.value })}
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
                rows={4}
                placeholder="メッセージ内容を入力してください"
                value={form.messageContent}
                onChange={(e) => setForm({ ...form, messageContent: e.target.value })}
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
        <LoadingState rows={4} columns={4} />
      ) : templates.length === 0 && !showCreate ? (
        <EmptyState
          icon={<LayoutTemplate size={32} />}
          title="テンプレートがありません"
          description="「新規テンプレート」から最初のテンプレートを作成してください"
          action={<Button onClick={() => setShowCreate(true)}>新規テンプレート</Button>}
        />
      ) : (
        <div className="rounded-md border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>テンプレート名</TableHead>
                <TableHead>カテゴリ</TableHead>
                <TableHead>メッセージタイプ</TableHead>
                <TableHead>作成日時</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                        {template.messageContent.slice(0, 50)}
                        {template.messageContent.length > 50 ? '...' : ''}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{template.category}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {messageTypeLabels[template.messageType] || template.messageType}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(template.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditOpen(template)}
                      >
                        編集
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmDelete(template.id)}
                      >
                        削除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
