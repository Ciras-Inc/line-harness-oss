'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import CcPromptButton from '@/components/cc-prompt-button'
import { useAccount } from '@/contexts/account-context'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  Repeat2,
  Megaphone,
  FileText,
  Zap,
  Star,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react'

const ccPrompts = [
  {
    title: 'ダッシュボードのKPI分析',
    prompt: `LINE CRM ダッシュボードのデータを分析してください。
1. 友だち数の推移を確認
2. アクティブシナリオの効果を評価
3. 配信の開封率・クリック率を分析
改善提案を含めてレポートしてください。`,
  },
  {
    title: '新しいシナリオを提案',
    prompt: `現在の友だちデータとタグ情報を元に、効果的なシナリオ配信を提案してください。
1. ターゲットセグメントの特定
2. メッセージ内容の提案
3. 配信タイミングの最適化
具体的なステップ配信の構成を含めてください。`,
  },
]

interface DashboardStats {
  friendCount: number | null
  activeScenarioCount: number | null
  broadcastCount: number | null
  templateCount: number | null
  automationCount: number | null
  scoringRuleCount: number | null
}

interface StatCardProps {
  title: string
  value: number | null
  loading: boolean
  icon: React.ReactNode
  href: string
}

function StatCard({ title, value, loading, icon, href }: StatCardProps) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow group cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="w-9 h-9 rounded-md flex items-center justify-center text-primary-foreground bg-primary shrink-0">
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="text-3xl font-bold">
              {value !== null ? value.toLocaleString('ja-JP') : '-'}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1 group-hover:text-primary transition-colors">
            詳細を見る →
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function DashboardPage() {
  const { selectedAccountId, selectedAccount } = useAccount()
  const [stats, setStats] = useState<DashboardStats>({
    friendCount: null,
    activeScenarioCount: null,
    broadcastCount: null,
    templateCount: null,
    automationCount: null,
    scoringRuleCount: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [friendCountRes, scenariosRes, broadcastsRes, templatesRes, automationsRes, scoringRes] = await Promise.allSettled([
          api.friends.count({ accountId: selectedAccountId ?? undefined }),
          api.scenarios.list(),
          api.broadcasts.list(),
          api.templates.list(),
          api.automations.list(),
          api.scoring.rules(),
        ])

        setStats({
          friendCount:
            friendCountRes.status === 'fulfilled' && friendCountRes.value.success
              ? friendCountRes.value.data.count
              : null,
          activeScenarioCount:
            scenariosRes.status === 'fulfilled' && scenariosRes.value.success
              ? scenariosRes.value.data.filter((s) => s.isActive).length
              : null,
          broadcastCount:
            broadcastsRes.status === 'fulfilled' && broadcastsRes.value.success
              ? broadcastsRes.value.data.length
              : null,
          templateCount:
            templatesRes.status === 'fulfilled' && templatesRes.value.success
              ? templatesRes.value.data.length
              : null,
          automationCount:
            automationsRes.status === 'fulfilled' && automationsRes.value.success
              ? automationsRes.value.data.filter((a) => a.isActive).length
              : null,
          scoringRuleCount:
            scoringRes.status === 'fulfilled' && scoringRes.value.success
              ? scoringRes.value.data.length
              : null,
        })
      } catch {
        setError('データの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [selectedAccountId])

  return (
    <div className="py-6">
      <PageHeader
        title="ダッシュボード"
        description={
          selectedAccount
            ? `${selectedAccount.displayName || selectedAccount.name} の管理画面`
            : 'LINE公式アカウント CRM 管理画面'
        }
      />

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error}
        </div>
      )}

      {/* KPI グリッド */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="友だち数"
          value={stats.friendCount}
          loading={loading}
          href="/friends"
          icon={<Users size={18} />}
        />
        <StatCard
          title="アクティブシナリオ数"
          value={stats.activeScenarioCount}
          loading={loading}
          href="/scenarios"
          icon={<Repeat2 size={18} />}
        />
        <StatCard
          title="配信数 (合計)"
          value={stats.broadcastCount}
          loading={loading}
          href="/broadcasts"
          icon={<Megaphone size={18} />}
        />
        <StatCard
          title="テンプレート数"
          value={stats.templateCount}
          loading={loading}
          href="/templates"
          icon={<FileText size={18} />}
        />
        <StatCard
          title="アクティブルール数"
          value={stats.automationCount}
          loading={loading}
          href="/automations"
          icon={<Zap size={18} />}
        />
        <StatCard
          title="スコアリングルール数"
          value={stats.scoringRuleCount}
          loading={loading}
          href="/scoring"
          icon={<Star size={18} />}
        />
      </div>

      {/* クイックアクション */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">クイックアクション</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { href: '/friends', label: '友だち管理', desc: '友だちの一覧・タグ管理', icon: <Users size={16} /> },
              { href: '/scenarios', label: 'シナリオ配信', desc: '自動配信シナリオの作成・編集', icon: <Repeat2 size={16} /> },
              { href: '/broadcasts', label: '一斉配信', desc: 'メッセージの一斉送信・予約', icon: <Megaphone size={16} /> },
              { href: '/chats', label: 'チャット', desc: 'オペレーターチャット管理', icon: <MessageSquare size={16} /> },
              { href: '/health', label: 'BAN検知', desc: 'アカウント健康度ダッシュボード', icon: <ShieldCheck size={16} /> },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 p-3 rounded-md border border-border hover:border-primary/40 hover:bg-accent transition-colors group"
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-primary-foreground bg-primary shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
