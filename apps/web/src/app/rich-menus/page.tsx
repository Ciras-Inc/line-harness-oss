'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { RichMenu, RichMenuArea } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LayoutGrid } from 'lucide-react'

// ─── テンプレート定義 ───

interface TemplateArea {
  bounds: { x: number; y: number; width: number; height: number }
}

interface Template {
  id: string
  label: string
  size: { width: number; height: number }
  areas: TemplateArea[]
}

const TEMPLATES: Template[] = [
  {
    id: '3x2',
    label: '3列×2行（6エリア）',
    size: { width: 2500, height: 1686 },
    areas: [
      { bounds: { x: 0,    y: 0,   width: 833,  height: 843 } },
      { bounds: { x: 833,  y: 0,   width: 833,  height: 843 } },
      { bounds: { x: 1666, y: 0,   width: 834,  height: 843 } },
      { bounds: { x: 0,    y: 843, width: 833,  height: 843 } },
      { bounds: { x: 833,  y: 843, width: 833,  height: 843 } },
      { bounds: { x: 1666, y: 843, width: 834,  height: 843 } },
    ],
  },
  {
    id: '2x2',
    label: '2列×2行（4エリア）',
    size: { width: 2500, height: 1686 },
    areas: [
      { bounds: { x: 0,    y: 0,   width: 1250, height: 843 } },
      { bounds: { x: 1250, y: 0,   width: 1250, height: 843 } },
      { bounds: { x: 0,    y: 843, width: 1250, height: 843 } },
      { bounds: { x: 1250, y: 843, width: 1250, height: 843 } },
    ],
  },
  {
    id: '3x1',
    label: '3列×1行（3エリア）',
    size: { width: 2500, height: 843 },
    areas: [
      { bounds: { x: 0,    y: 0, width: 833,  height: 843 } },
      { bounds: { x: 833,  y: 0, width: 833,  height: 843 } },
      { bounds: { x: 1666, y: 0, width: 834,  height: 843 } },
    ],
  },
  {
    id: '2x1',
    label: '2列×1行（2エリア）',
    size: { width: 2500, height: 843 },
    areas: [
      { bounds: { x: 0,    y: 0, width: 1250, height: 843 } },
      { bounds: { x: 1250, y: 0, width: 1250, height: 843 } },
    ],
  },
  {
    id: '1x1',
    label: '全面（1エリア）',
    size: { width: 2500, height: 1686 },
    areas: [
      { bounds: { x: 0, y: 0, width: 2500, height: 1686 } },
    ],
  },
]

const ACTION_COLORS = [
  'bg-blue-100 border-blue-300 text-blue-700',
  'bg-purple-100 border-purple-300 text-purple-700',
  'bg-orange-100 border-orange-300 text-orange-700',
  'bg-pink-100 border-pink-300 text-pink-700',
  'bg-teal-100 border-teal-300 text-teal-700',
  'bg-yellow-100 border-yellow-300 text-yellow-700',
]

type ActionType = 'uri' | 'message' | 'postback'

interface AreaFormState {
  label: string
  actionType: ActionType
  uri: string
  text: string
  data: string
}

const defaultAreaForm = (): AreaFormState => ({
  label: '',
  actionType: 'uri',
  uri: '',
  text: '',
  data: '',
})

const inputClass = 'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

// ─── ビジュアルプレビュー ───

function RichMenuPreview({ template, areaForms, imagePreviewUrl }: {
  template: Template
  areaForms: AreaFormState[]
  imagePreviewUrl: string | null
}) {
  const PREVIEW_W = 280
  const PREVIEW_H = Math.round(PREVIEW_W * (template.size.height / template.size.width))
  const scaleX = PREVIEW_W / template.size.width
  const scaleY = PREVIEW_H / template.size.height

  return (
    <div className="sticky top-6">
      <p className="text-xs font-medium text-muted-foreground mb-2">LINEプレビュー</p>
      <div
        className="relative border border-border rounded-lg overflow-hidden bg-muted/30"
        style={{ width: PREVIEW_W, height: PREVIEW_H }}
      >
        {imagePreviewUrl && (
          <img
            src={imagePreviewUrl}
            alt="プレビュー"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {template.areas.map((area, idx) => {
          const color = ACTION_COLORS[idx % ACTION_COLORS.length]
          return (
            <div
              key={idx}
              className={`absolute border-2 flex items-center justify-center text-xs font-bold rounded-sm ${color} ${imagePreviewUrl ? 'bg-opacity-40 border-opacity-60' : ''}`}
              style={{
                left: Math.round(area.bounds.x * scaleX),
                top: Math.round(area.bounds.y * scaleY),
                width: Math.round(area.bounds.width * scaleX),
                height: Math.round(area.bounds.height * scaleY),
              }}
            >
              {areaForms[idx]?.label || `エリア${idx + 1}`}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">{template.size.width} × {template.size.height} px</p>
    </div>
  )
}

// ─── メインページ ───

export default function RichMenusPage() {
  const { selectedAccountId } = useAccount()
  const [menus, setMenus] = useState<RichMenu[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // フォーム状態
  const [menuName, setMenuName] = useState('メインメニュー')
  const [chatBarText, setChatBarText] = useState('メニューを開く')
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(TEMPLATES[0])
  const [areaForms, setAreaForms] = useState<AreaFormState[]>(TEMPLATES[0].areas.map(defaultAreaForm))
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageContentType, setImageContentType] = useState<'image/png' | 'image/jpeg'>('image/png')
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const loadMenus = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.richMenus.list(selectedAccountId || undefined)
      if (res.success) setMenus(res.data as RichMenu[])
    } catch {
      setError('リッチメニューの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => { loadMenus() }, [loadMenus])

  const handleTemplateChange = (tpl: Template) => {
    setSelectedTemplate(tpl)
    setAreaForms(tpl.areas.map(defaultAreaForm))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setImageFile(file)
      setImageBase64(dataUrl.split(',')[1])
      setImageContentType(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png')
      setImagePreviewUrl(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const updateAreaForm = (idx: number, patch: Partial<AreaFormState>) => {
    setAreaForms(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f))
  }

  const buildAreas = (): RichMenuArea[] => {
    return selectedTemplate.areas.map((area, idx) => {
      const form = areaForms[idx] ?? defaultAreaForm()
      const action: RichMenuArea['action'] = { type: form.actionType }
      if (form.actionType === 'uri') action.uri = form.uri
      else if (form.actionType === 'message') { action.text = form.text; action.label = form.label }
      else if (form.actionType === 'postback') { action.data = form.data; action.label = form.label }
      return { bounds: area.bounds, action }
    })
  }

  const handleCreate = async () => {
    if (!menuName.trim()) { setFormError('メニュー名を入力してください'); return }
    if (!chatBarText.trim()) { setFormError('チャットバーテキストを入力してください'); return }

    setSaving(true)
    setFormError('')
    try {
      const body = {
        name: menuName,
        chatBarText,
        size: selectedTemplate.size,
        selected: false,
        areas: buildAreas(),
      }
      const res = await api.richMenus.create(body, selectedAccountId || undefined)
      if (!res.success) { setFormError((res as { error: string }).error); return }

      const richMenuId = res.data.richMenuId
      if (imageBase64 && richMenuId) {
        await api.richMenus.uploadImage(richMenuId, imageBase64, imageContentType)
      }

      setShowCreate(false)
      resetForm()
      loadMenus()
    } catch {
      setFormError('作成に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setMenuName('メインメニュー')
    setChatBarText('メニューを開く')
    setSelectedTemplate(TEMPLATES[0])
    setAreaForms(TEMPLATES[0].areas.map(defaultAreaForm))
    setImageFile(null)
    setImageBase64(null)
    setImagePreviewUrl(null)
    setFormError('')
  }

  const handleSetDefault = async (id: string) => {
    try {
      await api.richMenus.setDefault(id, selectedAccountId || undefined)
      loadMenus()
    } catch {
      setError('デフォルト設定に失敗しました')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.richMenus.delete(id, selectedAccountId || undefined)
      loadMenus()
    } catch {
      setError('削除に失敗しました')
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div className="py-6">
      <PageHeader
        title="リッチメニュー"
        description="LINE リッチメニューの作成・管理"
        action={
          <Button onClick={() => setShowCreate(true)}>
            + 新規リッチメニュー
          </Button>
        }
      />

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error}
        </div>
      )}

      {/* ビジュアルビルダー */}
      {showCreate && (
        <div className="mb-6 rounded-md border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-6">新規リッチメニューを作成</h2>

          <div className="flex gap-8">
            {/* 左: フォーム */}
            <div className="flex-1 space-y-5 min-w-0">
              {/* 基本情報 */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    メニュー名 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    value={menuName}
                    onChange={(e) => setMenuName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    チャットバーテキスト <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="例: メニューを開く"
                    value={chatBarText}
                    onChange={(e) => setChatBarText(e.target.value)}
                  />
                </div>
              </div>

              {/* テンプレート選択 */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">レイアウトテンプレート</label>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleTemplateChange(tpl)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        selectedTemplate.id === tpl.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:bg-accent'
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 背景画像 */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">背景画像 (PNG / JPEG)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleImageChange}
                  className="text-sm text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-border file:bg-muted file:text-sm file:font-medium file:cursor-pointer"
                />
                {imageFile && (
                  <p className="text-xs text-muted-foreground mt-1">{imageFile.name}</p>
                )}
              </div>

              {/* エリア設定 */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  エリア設定 ({selectedTemplate.areas.length} エリア)
                </label>
                <div className="space-y-3">
                  {selectedTemplate.areas.map((_, idx) => {
                    const form = areaForms[idx] ?? defaultAreaForm()
                    const color = ACTION_COLORS[idx % ACTION_COLORS.length]
                    return (
                      <div key={idx} className={`rounded-lg border-2 p-3 ${color}`}>
                        <p className="text-xs font-semibold mb-2">エリア {idx + 1}</p>
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium mb-0.5">ラベル（表示名）</label>
                            <input
                              type="text"
                              className="w-full border border-border rounded px-2 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              placeholder="例: ホームページ"
                              value={form.label}
                              onChange={(e) => updateAreaForm(idx, { label: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-0.5">アクションタイプ</label>
                            <select
                              className="w-full border border-border rounded px-2 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              value={form.actionType}
                              onChange={(e) => updateAreaForm(idx, { actionType: e.target.value as ActionType })}
                            >
                              <option value="uri">URLを開く (uri)</option>
                              <option value="message">メッセージ送信 (message)</option>
                              <option value="postback">ポストバック (postback)</option>
                            </select>
                          </div>
                          {form.actionType === 'uri' && (
                            <div>
                              <label className="block text-xs font-medium mb-0.5">URL</label>
                              <input
                                type="url"
                                className="w-full border border-border rounded px-2 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                placeholder="https://example.com"
                                value={form.uri}
                                onChange={(e) => updateAreaForm(idx, { uri: e.target.value })}
                              />
                            </div>
                          )}
                          {form.actionType === 'message' && (
                            <div>
                              <label className="block text-xs font-medium mb-0.5">送信テキスト</label>
                              <input
                                type="text"
                                className="w-full border border-border rounded px-2 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                placeholder="例: ホームページを見たい"
                                value={form.text}
                                onChange={(e) => updateAreaForm(idx, { text: e.target.value })}
                              />
                            </div>
                          )}
                          {form.actionType === 'postback' && (
                            <div>
                              <label className="block text-xs font-medium mb-0.5">ポストバックデータ</label>
                              <input
                                type="text"
                                className="w-full border border-border rounded px-2 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                placeholder="例: action=home"
                                value={form.data}
                                onChange={(e) => updateAreaForm(idx, { data: e.target.value })}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {formError && <p className="text-xs text-destructive">{formError}</p>}

              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? '作成中...' : '作成'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setShowCreate(false); resetForm() }}
                >
                  キャンセル
                </Button>
              </div>
            </div>

            {/* 右: プレビュー */}
            <div className="shrink-0">
              <RichMenuPreview
                template={selectedTemplate}
                areaForms={areaForms}
                imagePreviewUrl={imagePreviewUrl}
              />
            </div>
          </div>
        </div>
      )}

      {/* 一覧 */}
      {loading ? (
        <LoadingState rows={3} columns={3} />
      ) : menus.length === 0 && !showCreate ? (
        <EmptyState
          icon={<LayoutGrid size={32} />}
          title="リッチメニューがありません"
          description="「新規リッチメニュー」から作成してください"
          action={<Button onClick={() => setShowCreate(true)}>新規リッチメニュー</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {menus.map((menu) => (
            <div
              key={menu.richMenuId}
              className="bg-card rounded-lg border border-border p-5 hover:shadow-sm transition-shadow"
            >
              <h3 className="text-sm font-semibold text-foreground mb-1">{menu.name}</h3>
              <p className="text-xs text-muted-foreground mb-3">{menu.chatBarText}</p>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="outline">
                  {menu.size.width} × {menu.size.height}
                </Badge>
                <Badge variant={menu.selected ? 'default' : 'secondary'}>
                  {menu.selected ? 'デフォルト表示' : '非表示'}
                </Badge>
                <Badge variant="outline">
                  {menu.areas.length} エリア
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground font-mono truncate mb-3">{menu.richMenuId}</p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSetDefault(menu.richMenuId)}
                >
                  デフォルトに設定
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirmDelete(menu.richMenuId)}
                >
                  削除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}
        title="リッチメニューを削除しますか？"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </div>
  )
}
