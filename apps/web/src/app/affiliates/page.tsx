'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { GitBranch } from 'lucide-react'

const WORKER_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

interface RefRoute {
  refCode: string
  name: string
  friendCount: number
  clickCount: number
  latestAt: string | null
}

interface RefSummaryData {
  routes: RefRoute[]
  totalFriends: number
  friendsWithRef: number
  friendsWithoutRef: number
}

interface RefFriend {
  id: string
  displayName: string
  trackedAt: string | null
}

interface RefDetailData {
  refCode: string
  name: string
  friends: RefFriend[]
}

export default function AttributionPage() {
  const { selectedAccountId } = useAccount()
  const [summary, setSummary] = useState<RefSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRef, setSelectedRef] = useState<string | null>(null)
  const [detail, setDetail] = useState<RefDetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    try {
      const query = selectedAccountId ? `?lineAccountId=${selectedAccountId}` : ''
      const res = await fetchApi<{ success: boolean; data: RefSummaryData }>(`/api/analytics/ref-summary${query}`)
      setSummary(res.data)
    } catch {
      // silent
    }
    setLoading(false)
  }, [selectedAccountId])

  useEffect(() => {
    loadSummary()
    const handleVisibility = () => { if (document.visibilityState === 'visible') loadSummary() }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [loadSummary])

  const handleRowClick = async (refCode: string) => {
    if (selectedRef === refCode) {
      setSelectedRef(null)
      setDetail(null)
      return
    }
    setSelectedRef(refCode)
    setDetailLoading(true)
    try {
      const query = selectedAccountId ? `?lineAccountId=${selectedAccountId}` : ''
      const res = await fetchApi<{ success: boolean; data: RefDetailData }>(`/api/analytics/ref/${encodeURIComponent(refCode)}${query}`)
      setDetail(res.data)
    } catch {
      setDetail(null)
    }
    setDetailLoading(false)
  }

  const handleCopy = async (refCode: string) => {
    const url = `${WORKER_BASE}/auth/line?ref=${encodeURIComponent(refCode)}`
    await navigator.clipboard.writeText(url)
    setCopiedCode(refCode)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }

  return (
    <div className="py-6">
      <PageHeader
        title="流入経路分析"
        description="ref コード別の友だち獲得・クリック実績"
      />

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-xl p-5 border border-border">
            <p className="text-sm text-muted-foreground">総友だち数</p>
            <p className="text-3xl font-bold text-foreground mt-1">{summary.totalFriends}</p>
          </div>
          <div className="bg-card rounded-xl p-5 border border-border">
            <p className="text-sm text-muted-foreground">ref 経由</p>
            <p className="text-3xl font-bold text-primary mt-1">{summary.friendsWithRef}</p>
          </div>
          <div className="bg-card rounded-xl p-5 border border-border">
            <p className="text-sm text-muted-foreground">ref 不明</p>
            <p className="text-3xl font-bold text-muted-foreground mt-1">{summary.friendsWithoutRef}</p>
          </div>
          <div className="bg-card rounded-xl p-5 border border-border">
            <p className="text-sm text-muted-foreground">経路数</p>
            <p className="text-3xl font-bold text-foreground mt-1">{summary?.routes.length ?? 0}</p>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState rows={3} columns={6} />
      ) : !summary || summary.routes.length === 0 ? (
        <EmptyState
          icon={<GitBranch size={32} />}
          title="流入経路がまだ登録されていません"
          description="ref パラメータ付きURLから友だち追加があると自動的に記録されます"
        />
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">ref コード</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">経路名</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">友だち数</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">クリック数</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">最新追加日</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {summary.routes.map((route) => {
                const authUrl = `${WORKER_BASE}/auth/line?ref=${encodeURIComponent(route.refCode)}`
                const isExpanded = selectedRef === route.refCode
                return (
                  <React.Fragment key={route.refCode}>
                    <tr
                      className="hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(route.refCode)}
                    >
                      <td className="px-4 py-3 text-sm font-mono text-primary">{route.refCode}</td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{route.name}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-foreground">{route.friendCount}</td>
                      <td className="px-4 py-3 text-sm text-right text-muted-foreground">{route.clickCount}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(route.latestAt)}</td>
                      <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground/60 truncate max-w-[180px]">{authUrl}</span>
                          <button
                            onClick={() => handleCopy(route.refCode)}
                            className="text-xs text-primary hover:text-primary/80 shrink-0"
                          >
                            {copiedCode === route.refCode ? 'コピー済' : 'コピー'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${route.refCode}-detail`}>
                        <td colSpan={6} className="px-6 py-4 bg-muted/30">
                          {detailLoading ? (
                            <p className="text-sm text-muted-foreground">読み込み中...</p>
                          ) : detail && detail.friends.length > 0 ? (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                                このルートから追加した友だち ({detail.friends.length}人)
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {detail.friends.map((f) => (
                                  <div key={f.id} className="flex items-center justify-between bg-card rounded-lg px-3 py-2 border border-border">
                                    <span className="text-sm text-foreground font-medium truncate">{f.displayName}</span>
                                    <span className="text-xs text-muted-foreground ml-2 shrink-0">{formatDate(f.trackedAt)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">このルートから追加した友だちはまだいません</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
