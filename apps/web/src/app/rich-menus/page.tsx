'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { api, type RichMenu, type RichMenuArea } from '@/lib/api'
import Header from '@/components/layout/header'

// ─── デフォルトエリア設定（3列×2行、2500×1686） ───
function defaultAreas(): RichMenuArea[] {
  return [
    { bounds: { x: 0,    y: 0,   width: 833, height: 843 }, action: { type: 'uri', uri: '' } },
    { bounds: { x: 833,  y: 0,   width: 834, height: 843 }, action: { type: 'uri', uri: '' } },
    { bounds: { x: 1667, y: 0,   width: 833, height: 843 }, action: { type: 'uri', uri: '' } },
    { bounds: { x: 0,    y: 843, width: 833, height: 843 }, action: { type: 'uri', uri: '' } },
    { bounds: { x: 833,  y: 843, width: 834, height: 843 }, action: { type: 'uri', uri: '' } },
    { bounds: { x: 1667, y: 843, width: 833, height: 843 }, action: { type: 'uri', uri: '' } },
  ]
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  uri: 'URLを開く',
  message: 'メッセージ送信',
  postback: 'ポストバック',
}

function AreaEditor({
  areas,
  onChange,
}: {
  areas: RichMenuArea[]
  onChange: (areas: RichMenuArea[]) => void
}) {
  const updateArea = (i: number, area: RichMenuArea) => {
    const next = [...areas]
    next[i] = area
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {areas.map((area, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-600">エリア {i + 1}（x:{area.bounds.x} y:{area.bounds.y}）</p>
          <div className="flex gap-2">
            <select
              className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
              value={area.action.type}
              onChange={(e) => updateArea(i, { ...area, action: { type: e.target.value as 'uri' | 'message' | 'postback' } })}
            >
              {Object.entries(ACTION_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            {area.action.type === 'uri' ? (
              <input
                type="text"
                placeholder="https://example.com"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                value={area.action.uri ?? ''}
                onChange={(e) => updateArea(i, { ...area, action: { type: 'uri', uri: e.target.value } })}
              />
            ) : area.action.type === 'message' ? (
              <input
                type="text"
                placeholder="送信するテキスト"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                value={area.action.text ?? ''}
                onChange={(e) => updateArea(i, { ...area, action: { type: 'message', text: e.target.value } })}
              />
            ) : (
              <input
                type="text"
                placeholder="ポストバックデータ"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                value={area.action.data ?? ''}
                onChange={(e) => updateArea(i, { ...area, action: { type: 'postback', data: e.target.value } })}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function RichMenusPage() {
  const [menus, setMenus] = useState<RichMenu[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // 新規作成フォーム
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createChatBarText, setCreateChatBarText] = useState('メニュー')
  const [createSize, setCreateSize] = useState<'1686' | '843'>('1686')
  const [createSelected, setCreateSelected] = useState(false)
  const [createAreas, setCreateAreas] = useState<RichMenuArea[]>(defaultAreas())
  const [createImage, setCreateImage] = useState<string | null>(null)
  const [createImageType, setCreateImageType] = useState<'image/png' | 'image/jpeg'>('image/png')
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ユーザー割り当てモーダル
  const [assignMenuId, setAssignMenuId] = useState<string | null>(null)
  const [assignUserId, setAssignUserId] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignError, setAssignError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.richMenus.list()
      if (res.success) {
        setMenus(res.data)
      } else {
        setError(res.error)
      }
    } catch {
      setError('リッチメニューの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSetDefault = async (id: string) => {
    setActionLoading(id + ':default')
    try {
      const res = await api.richMenus.setDefault(id)
      if (res.success) {
        await load()
      } else {
        setError(res.error)
      }
    } catch {
      setError('デフォルト設定に失敗しました')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このリッチメニューを削除してもよいですか？')) return
    setActionLoading(id + ':delete')
    try {
      const res = await api.richMenus.delete(id)
      if (res.success) {
        setMenus((prev) => prev.filter((m) => m.richMenuId !== id))
      } else {
        setError(res.error)
      }
    } catch {
      setError('削除に失敗しました')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAssign = async () => {
    if (!assignMenuId || !assignUserId.trim()) { setAssignError('LINE user_idを入力してください'); return }
    setAssignLoading(true)
    setAssignError('')
    try {
      const res = await api.richMenus.assign(assignMenuId, assignUserId.trim())
      if (res.success) {
        setAssignMenuId(null)
        setAssignUserId('')
      } else {
        setAssignError(res.error)
      }
    } catch {
      setAssignError('割り当てに失敗しました')
    } finally {
      setAssignLoading(false)
    }
  }

  const handleImageFile = (file: File) => {
    const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'
    setCreateImageType(type)
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      // data:image/png;base64,xxx の形式で保持
      setCreateImage(result)
    }
    reader.readAsDataURL(file)
  }

  const handleCreate = async () => {
    if (!createName.trim()) { setCreateError('名前を入力してください'); return }
    setCreateSaving(true)
    setCreateError('')
    try {
      const height = createSize === '1686' ? 1686 : 843
      const areas: RichMenuArea[] = createAreas.map((a) => ({
        ...a,
        bounds: { ...a.bounds, height: height / 2 },
      }))
      const createRes = await api.richMenus.create({
        name: createName,
        chatBarText: createChatBarText,
        size: { width: 2500, height },
        selected: createSelected,
        areas,
      })
      if (!createRes.success) { setCreateError(createRes.error); return }

      const newId = createRes.data.richMenuId

      // 画像アップロード（選択されていれば）
      if (createImage) {
        const imgRes = await api.richMenus.uploadImage(newId, createImage, createImageType)
        if (!imgRes.success) {
          setCreateError(`メニュー作成成功しましたが、画像アップロードに失敗: ${imgRes.error}`)
          setCreateSaving(false)
          load()
          return
        }
      }

      // デフォルト設定
      if (createSelected) {
        await api.richMenus.setDefault(newId)
      }

      setShowCreate(false)
      setCreateName('')
      setCreateChatBarText('メニュー')
      setCreateSize('1686')
      setCreateSelected(false)
      setCreateAreas(defaultAreas())
      setCreateImage(null)
      load()
    } catch {
      setCreateError('作成に失敗しました')
    } finally {
      setCreateSaving(false)
    }
  }

  return (
    <div>
      <Header
        title="リッチメニュー管理"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#06C755' }}
          >
            + 新規作成
          </button>
        }
      />

      {/* エラー */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ユーザー割り当てモーダル */}
      {assignMenuId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-800">ユーザーに割り当て</h2>
              <button onClick={() => setAssignMenuId(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">LINE user_id <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Uxxxxxxxxxx..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                />
              </div>
              {assignError && <p className="text-xs text-red-600">{assignError}</p>}
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-200">
              <button
                onClick={handleAssign}
                disabled={assignLoading}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: '#06C755' }}
              >
                {assignLoading ? '割り当て中...' : '割り当て'}
              </button>
              <button
                onClick={() => { setAssignMenuId(null); setAssignUserId('') }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新規作成フォーム */}
      {showCreate && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">新規リッチメニューを作成</h2>
          <div className="space-y-4 max-w-xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">名前 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="例: 新規客用メニュー"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">チャットバーテキスト</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={createChatBarText}
                  onChange={(e) => setCreateChatBarText(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">サイズ</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={createSize}
                  onChange={(e) => setCreateSize(e.target.value as '1686' | '843')}
                >
                  <option value="1686">大（2500×1686）</option>
                  <option value="843">小（2500×843）</option>
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-green-600"
                    checked={createSelected}
                    onChange={(e) => setCreateSelected(e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">デフォルトに設定</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">ボタンエリア設定（3列×2行）</label>
              <AreaEditor areas={createAreas} onChange={setCreateAreas} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">メニュー画像（PNG/JPEG）</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleImageFile(e.target.files[0]) }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
              >
                {createImage ? '画像を変更' : '画像を選択'}
              </button>
              {createImage && (
                <div className="mt-2">
                  <img src={createImage} alt="プレビュー" className="max-h-24 rounded border border-gray-200 object-contain" />
                </div>
              )}
            </div>

            {createError && <p className="text-xs text-red-600">{createError}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={createSaving}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: '#06C755' }}
              >
                {createSaving ? '作成中...' : '作成'}
              </button>
              <button
                onClick={() => { setShowCreate(false); setCreateError('') }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* リッチメニュー一覧 */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 border-b border-gray-100 flex items-center gap-4 animate-pulse">
              <div className="w-20 h-12 bg-gray-200 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-40" />
                <div className="h-2 bg-gray-100 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : menus.length === 0 && !showCreate ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">リッチメニューがありません。「新規作成」から追加してください。</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100">
          {menus.map((menu) => (
            <div key={menu.richMenuId} className="p-4 flex items-start gap-4">
              {/* 画像プレビュー */}
              <div className="w-24 h-14 bg-gray-100 rounded border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}/api/rich-menus/${menu.richMenuId}/content`}
                  alt={menu.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const el = e.currentTarget
                    el.style.display = 'none'
                    el.parentElement!.innerHTML = '<span class="text-xs text-gray-400">No image</span>'
                  }}
                />
              </div>

              {/* 情報 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900">{menu.name}</p>
                  {menu.selected && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      デフォルト
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {menu.size.width}×{menu.size.height} / {menu.areas.length}エリア / バー: {menu.chatBarText}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{menu.richMenuId}</p>
              </div>

              {/* アクション */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {!menu.selected && (
                  <button
                    onClick={() => handleSetDefault(menu.richMenuId)}
                    disabled={actionLoading === menu.richMenuId + ':default'}
                    className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-50"
                  >
                    {actionLoading === menu.richMenuId + ':default' ? '設定中...' : 'デフォルトに設定'}
                  </button>
                )}
                <button
                  onClick={() => { setAssignMenuId(menu.richMenuId); setAssignUserId(''); setAssignError('') }}
                  className="px-3 py-1 text-xs font-medium text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
                >
                  ユーザーに割り当て
                </button>
                <button
                  onClick={() => handleDelete(menu.richMenuId)}
                  disabled={actionLoading === menu.richMenuId + ':delete'}
                  className="px-3 py-1 text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50"
                >
                  {actionLoading === menu.richMenuId + ':delete' ? '削除中...' : '削除'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
