'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ChevronUp, ChevronDown, Trash2, Plus, FileText } from 'lucide-react'

interface FormField {
  name: string
  label: string
  type: string
  required?: boolean
}

interface FormItem {
  id: string
  name: string
  description: string | null
  fields: FormField[]
  onSubmitTagId: string | null
  onSubmitScenarioId: string | null
  saveToMetadata: boolean
  isActive: boolean
  submitCount: number
  createdAt: string
  updatedAt: string
}

const FIELD_TYPES = [
  { value: 'text', label: 'テキスト' },
  { value: 'email', label: 'メールアドレス' },
  { value: 'tel', label: '電話番号' },
  { value: 'number', label: '数値' },
  { value: 'textarea', label: 'テキストエリア' },
  { value: 'select', label: 'セレクト' },
  { value: 'checkbox', label: 'チェックボックス' },
  { value: 'date', label: '日付' },
]

const inputClass =
  'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

function FieldPreview({ field }: { field: FormField }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-foreground mb-1">
        {field.label || field.name || 'フィールド'}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </label>
      {field.type === 'textarea' ? (
        <textarea
          className={`${inputClass} resize-none opacity-60`}
          rows={2}
          placeholder={`${field.label}を入力`}
          disabled
        />
      ) : field.type === 'select' ? (
        <select className={`${inputClass} opacity-60`} disabled>
          <option>選択してください</option>
        </select>
      ) : field.type === 'checkbox' ? (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-border accent-primary"
            disabled
          />
          <span className="text-xs text-muted-foreground">{field.label}</span>
        </div>
      ) : (
        <input
          type={field.type}
          className={`${inputClass} opacity-60`}
          placeholder={`${field.label || ''}を入力`}
          disabled
        />
      )}
    </div>
  )
}

export default function FormsPage() {
  const [forms, setForms] = useState<FormItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formFields, setFormFields] = useState<FormField[]>([
    { name: 'email', label: 'メールアドレス', type: 'email', required: true },
  ])
  const [onSubmitTagId, setOnSubmitTagId] = useState('')
  const [onSubmitScenarioId, setOnSubmitScenarioId] = useState('')
  const [saveToMetadata, setSaveToMetadata] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const loadForms = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.forms.list()
      if (res.success) setForms(res.data as FormItem[])
    } catch {
      setError('フォームの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadForms()
  }, [loadForms])

  const addField = () => {
    setFormFields((prev) => [...prev, { name: '', label: '', type: 'text', required: false }])
  }

  const updateField = (idx: number, updates: Partial<FormField>) => {
    setFormFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...updates } : f)))
  }

  const removeField = (idx: number) => {
    setFormFields((prev) => prev.filter((_, i) => i !== idx))
  }

  const moveField = (idx: number, direction: 'up' | 'down') => {
    setFormFields((prev) => {
      const next = [...prev]
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      ;[next[idx], next[targetIdx]] = [next[targetIdx], next[idx]]
      return next
    })
  }

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormFields([{ name: 'email', label: 'メールアドレス', type: 'email', required: true }])
    setOnSubmitTagId('')
    setOnSubmitScenarioId('')
    setSaveToMetadata(true)
    setFormError('')
  }

  const handleCreate = async () => {
    if (!formName.trim()) {
      setFormError('フォーム名を入力してください')
      return
    }
    if (formFields.length === 0) {
      setFormError('フィールドを1つ以上追加してください')
      return
    }
    const emptyField = formFields.find((f) => !f.name.trim() || !f.label.trim())
    if (emptyField) {
      setFormError('すべてのフィールドの名前とラベルを入力してください')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      const res = await api.forms.create({
        name: formName,
        description: formDescription || null,
        fields: formFields,
        onSubmitTagId: onSubmitTagId || null,
        onSubmitScenarioId: onSubmitScenarioId || null,
        saveToMetadata,
      })
      if (res.success) {
        setShowCreate(false)
        resetForm()
        loadForms()
      } else {
        setFormError((res as { error: string }).error)
      }
    } catch {
      setFormError('作成に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await api.forms.update(id, { isActive: !current })
      loadForms()
    } catch {
      setError('ステータスの変更に失敗しました')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.forms.delete(id)
      loadForms()
    } catch {
      setError('削除に失敗しました')
    }
  }

  return (
    <div className="py-6">
      <PageHeader
        title="フォーム管理"
        description="LIFFフォームの作成・編集・回答管理"
        action={<Button onClick={() => setShowCreate(true)}>+ 新規フォーム</Button>}
      />

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error}
        </div>
      )}

      {showCreate && (
        <div className="mb-6 rounded-md border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">新規フォームを作成</h2>
          <div className="flex gap-6">
            {/* 左: 設定 */}
            <div className="flex-1 space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  フォーム名 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="例: お問い合わせフォーム"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">説明</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={2}
                  placeholder="フォームの説明 (省略可)"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              {/* フィールドビルダー */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-muted-foreground">フィールド</label>
                  <button
                    onClick={addField}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    <Plus size={12} /> フィールドを追加
                  </button>
                </div>
                <div className="space-y-2">
                  {formFields.map((field, idx) => (
                    <div key={idx} className="rounded-md border border-border bg-background p-3">
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-xs font-medium text-muted-foreground mr-auto">
                          フィールド {idx + 1}
                        </span>
                        <button
                          onClick={() => moveField(idx, 'up')}
                          disabled={idx === 0}
                          className="p-0.5 rounded text-muted-foreground hover:bg-accent disabled:opacity-30"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => moveField(idx, 'down')}
                          disabled={idx === formFields.length - 1}
                          className="p-0.5 rounded text-muted-foreground hover:bg-accent disabled:opacity-30"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          onClick={() => removeField(idx)}
                          className="p-0.5 rounded text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-0.5">name (英字)</label>
                          <input
                            type="text"
                            className={inputClass}
                            placeholder="email"
                            value={field.name}
                            onChange={(e) => updateField(idx, { name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-0.5">ラベル</label>
                          <input
                            type="text"
                            className={inputClass}
                            placeholder="メールアドレス"
                            value={field.label}
                            onChange={(e) => updateField(idx, { label: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-0.5">タイプ</label>
                          <select
                            className={inputClass}
                            value={field.type}
                            onChange={(e) => updateField(idx, { type: e.target.value })}
                          >
                            {FIELD_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!field.required}
                              onChange={(e) => updateField(idx, { required: e.target.checked })}
                              className="w-4 h-4 rounded border-border accent-primary"
                            />
                            必須
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  送信時タグID (省略可)
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="タグIDを入力"
                  value={onSubmitTagId}
                  onChange={(e) => setOnSubmitTagId(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  送信時シナリオID (省略可)
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="シナリオIDを入力"
                  value={onSubmitScenarioId}
                  onChange={(e) => setOnSubmitScenarioId(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="saveToMetadata"
                  checked={saveToMetadata}
                  onChange={(e) => setSaveToMetadata(e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-primary"
                />
                <label htmlFor="saveToMetadata" className="text-sm text-muted-foreground">
                  回答をメタデータに保存
                </label>
              </div>

              {formError && <p className="text-xs text-destructive">{formError}</p>}

              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? '作成中...' : '作成'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreate(false)
                    resetForm()
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </div>

            {/* 右: プレビュー */}
            <div className="w-64 shrink-0 hidden lg:block">
              <p className="text-xs font-medium text-muted-foreground mb-2">プレビュー</p>
              <div className="rounded-md border border-border bg-background p-4">
                <p className="text-sm font-semibold text-foreground mb-3">{formName || 'フォーム名'}</p>
                {formDescription && (
                  <p className="text-xs text-muted-foreground mb-3">{formDescription}</p>
                )}
                {formFields.map((field, idx) => (
                  <FieldPreview key={idx} field={field} />
                ))}
                <button className="w-full mt-2 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md opacity-60 cursor-default">
                  送信
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState rows={3} columns={3} />
      ) : forms.length === 0 && !showCreate ? (
        <EmptyState
          icon={<FileText size={32} />}
          title="フォームがありません"
          description="「新規フォーム」から最初のフォームを作成してください"
          action={<Button onClick={() => setShowCreate(true)}>新規フォーム</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {forms.map((f) => (
            <div
              key={f.id}
              className="bg-card rounded-lg border border-border p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground leading-tight">{f.name}</h3>
                <Badge variant={f.isActive ? 'default' : 'secondary'}>
                  {f.isActive ? '有効' : '無効'}
                </Badge>
              </div>
              {f.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{f.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{(f.fields || []).length} フィールド</span>
                <span>·</span>
                <span>{f.submitCount} 回答</span>
                {f.saveToMetadata && (
                  <>
                    <span>·</span>
                    <span>メタデータ保存</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <button
                  onClick={() => handleToggleActive(f.id, f.isActive)}
                  className="flex-1 text-xs font-medium text-muted-foreground py-1 min-h-[44px] flex items-center justify-center rounded-md hover:bg-accent transition-colors"
                >
                  {f.isActive ? '無効にする' : '有効にする'}
                </button>
                <button
                  onClick={() => setConfirmDelete(f.id)}
                  className="flex-1 text-xs font-medium text-destructive py-1 min-h-[44px] flex items-center justify-center rounded-md hover:bg-destructive/10 transition-colors"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null)
        }}
        title="フォームを削除しますか？"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </div>
  )
}
