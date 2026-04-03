'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import Header from '@/components/layout/header'

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

interface CreateFormState {
  name: string
  description: string
  fieldsJson: string
  onSubmitTagId: string
  onSubmitScenarioId: string
  saveToMetadata: boolean
}

const initialForm: CreateFormState = {
  name: '',
  description: '',
  fieldsJson: '[\n  { "name": "email", "label": "メールアドレス", "type": "email", "required": true }\n]',
  onSubmitTagId: '',
  onSubmitScenarioId: '',
  saveToMetadata: true,
}

export default function FormsPage() {
  const [forms, setForms] = useState<FormItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateFormState>({ ...initialForm })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadForms = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.forms.list()
      if (res.success) {
        setForms(res.data as FormItem[])
      }
    } catch {
      setError('フォームの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadForms() }, [loadForms])

  const handleCreate = async () => {
    if (!form.name.trim()) { setFormError('フォーム名を入力してください'); return }
    let parsedFields: FormField[]
    try { parsedFields = JSON.parse(form.fieldsJson) } catch { setFormError('フィールドのJSON形式が正しくありません'); return }

    setSaving(true); setFormError('')
    try {
      const res = await api.forms.create({
        name: form.name,
        description: form.description || null,
        fields: parsedFields,
        onSubmitTagId: form.onSubmitTagId || null,
        onSubmitScenarioId: form.onSubmitScenarioId || null,
        saveToMetadata: form.saveToMetadata,
      })
      if (res.success) {
        setShowCreate(false); setForm({ ...initialForm }); loadForms()
      } else { setFormError((res as { error: string }).error) }
    } catch { setFormError('作成に失敗しました') } finally { setSaving(false) }
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    try { await api.forms.update(id, { isActive: !current }); loadForms() } catch { setError('ステータスの変更に失敗しました') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このフォームを削除してもよいですか？')) return
    try { await api.forms.delete(id); loadForms() } catch { setError('削除に失敗しました') }
  }

  return (
    <div>
      <Header
        title="フォーム管理"
        description="LIFFフォームの作成・編集・回答管理"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 min-h-[44px] text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#06C755' }}
          >
            + 新規フォーム
          </button>
        }
      />

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {showCreate && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">新規フォームを作成</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">フォーム名 <span className="text-red-500">*</span></label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="例: お問い合わせフォーム" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">説明</label>
              <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" rows={2} placeholder="フォームの説明 (省略可)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">フィールド定義 (JSON)</label>
              <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 resize-y" rows={6} value={form.fieldsJson} onChange={(e) => setForm({ ...form, fieldsJson: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">送信時タグID (省略可)</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="タグIDを入力" value={form.onSubmitTagId} onChange={(e) => setForm({ ...form, onSubmitTagId: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">送信時シナリオID (省略可)</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="シナリオIDを入力" value={form.onSubmitScenarioId} onChange={(e) => setForm({ ...form, onSubmitScenarioId: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="saveToMetadata" checked={form.saveToMetadata} onChange={(e) => setForm({ ...form, saveToMetadata: e.target.checked })} className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
              <label htmlFor="saveToMetadata" className="text-xs text-gray-600">回答をメタデータに保存</label>
            </div>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 min-h-[44px] text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-opacity" style={{ backgroundColor: '#06C755' }}>{saving ? '作成中...' : '作成'}</button>
              <button onClick={() => { setShowCreate(false); setFormError('') }} className="px-4 py-2 min-h-[44px] text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : forms.length === 0 && !showCreate ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">フォームがありません。「新規フォーム」から作成してください。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {forms.map((f) => (
            <div key={f.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 leading-tight">{f.name}</h3>
                <button
                  onClick={() => handleToggleActive(f.id, f.isActive)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${f.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                  title={f.isActive ? '有効' : '無効'}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${f.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
              {f.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{f.description}</p>}
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${f.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {f.isActive ? '有効' : '無効'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {(f.fields || []).length} フィールド
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                  {f.submitCount} 回答
                </span>
              </div>
              {f.saveToMetadata && <p className="text-xs text-gray-400 mb-2">メタデータ保存: ON</p>}

              <button
                onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                className="text-xs text-green-600 hover:text-green-700 mb-2"
              >
                {expandedId === f.id ? 'フィールドを隠す' : 'フィールドを見る'}
              </button>
              {expandedId === f.id && (
                <div className="mb-3 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 max-h-40 overflow-auto">
                  {(f.fields || []).map((field: FormField, i: number) => (
                    <div key={i} className="py-0.5">
                      <span className="font-semibold">{field.label}</span> ({field.name}: {field.type}){field.required ? ' *' : ''}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button onClick={() => handleDelete(f.id)} className="px-3 py-1 min-h-[44px] text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors">削除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
