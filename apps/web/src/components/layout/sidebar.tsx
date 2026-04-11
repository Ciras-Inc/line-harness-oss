'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccount } from '@/contexts/account-context'
import type { AccountWithStats } from '@/contexts/account-context'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Send,
  FileText,
  BarChart2,
  Settings,
  Menu,
  LogOut,
  ChevronDown,
  Check,
  Megaphone,
  Repeat2,
  Clock,
  Grid2X2,
  ClipboardList,
  ClipboardCheck,
  Share2,
  TrendingUp,
  Star,
  Link2,
  UserCog,
  Building2,
  KeyRound,
  ArrowLeftRight,
  ShieldCheck,
  AlertTriangle,
  Webhook,
  Bell,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── メニュー定義 ───────────────────────────────────────────

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  danger?: boolean
  roles?: string[]       // undefined = 全員表示
  mobileHide?: boolean   // スマホでは非表示
  mobilePriority?: boolean  // スマホでは「よく使う」に表示
}

type NavSection = {
  label: string | null
  items: NavItem[]
}

const menuSections: NavSection[] = [
  {
    label: null,
    items: [
      { href: '/', label: 'ホーム', icon: <LayoutDashboard size={18} />, mobilePriority: true },
    ],
  },
  {
    label: 'メッセージ',
    items: [
      { href: '/broadcasts', label: '一斉配信', icon: <Megaphone size={18} />, mobilePriority: true },
      { href: '/scenarios', label: 'シナリオ配信', icon: <Repeat2 size={18} /> },
      { href: '/templates', label: 'テンプレート', icon: <FileText size={18} />, mobilePriority: true },
      { href: '/auto-replies', label: '自動返信', icon: <Send size={18} /> },
      { href: '/reminders', label: 'リマインダ', icon: <Clock size={18} /> },
    ],
  },
  {
    label: '友だち・チャット',
    items: [
      { href: '/friends', label: '友だち管理', icon: <Users size={18} />, mobilePriority: true },
      { href: '/chats', label: '個別チャット', icon: <MessageSquare size={18} />, mobilePriority: true },
    ],
  },
  {
    label: 'コンテンツ',
    items: [
      { href: '/rich-menus', label: 'リッチメニュー', icon: <Grid2X2 size={18} /> },
      { href: '/forms', label: 'フォーム管理', icon: <ClipboardList size={18} /> },
      { href: '/form-submissions', label: 'フォーム回答', icon: <ClipboardCheck size={18} /> },
    ],
  },
  {
    label: '分析',
    items: [
      { href: '/affiliates', label: '流入経路', icon: <Share2 size={18} />, mobileHide: true },
      { href: '/conversions', label: 'CV計測', icon: <TrendingUp size={18} />, mobileHide: true },
      { href: '/scoring', label: 'スコアリング', icon: <Star size={18} /> },
      { href: '/tracked-links', label: 'リンク計測', icon: <Link2 size={18} /> },
      { href: '/ad-platforms', label: '広告連携', icon: <BarChart2 size={18} />, mobileHide: true },
    ],
  },
  {
    label: '自動化',
    items: [
      { href: '/automations', label: 'オートメーション', icon: <Zap size={18} /> },
      { href: '/webhooks', label: 'Webhook', icon: <Webhook size={18} />, mobileHide: true },
      { href: '/notifications', label: '通知', icon: <Bell size={18} /> },
    ],
  },
  {
    label: '設定',
    items: [
      { href: '/staff', label: 'スタッフ管理', icon: <UserCog size={18} />, roles: ['owner'] },
      { href: '/accounts', label: 'LINEアカウント', icon: <Building2 size={18} />, roles: ['owner', 'admin'] },
      { href: '/users', label: 'UUID管理', icon: <KeyRound size={18} />, roles: ['owner', 'admin'], mobileHide: true },
      { href: '/traffic-pools', label: 'トラフィックプール', icon: <ArrowLeftRight size={18} />, mobileHide: true },
      { href: '/health', label: 'BAN検知', icon: <ShieldCheck size={18} /> },
      { href: '/emergency', label: '緊急コントロール', icon: <AlertTriangle size={18} />, danger: true },
    ],
  },
]

// ─── アカウントアバター ───────────────────────────────────────

function AccountAvatar({ account, size = 28 }: { account: AccountWithStats; size?: number }) {
  const displayName = account.displayName || account.name
  if (account.pictureUrl) {
    return (
      <img
        src={account.pictureUrl}
        alt={displayName}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0 bg-primary"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {displayName.charAt(0)}
    </div>
  )
}

// ─── アカウント切替 ───────────────────────────────────────────

function AccountSwitcher() {
  const { accounts, selectedAccount, setSelectedAccountId, loading } = useAccount()

  if (loading || accounts.length === 0 || !selectedAccount) return null

  const displayName = selectedAccount.displayName || selectedAccount.name

  return (
    <div className="px-3 py-2 border-b border-border">
      <DropdownMenu>
        <DropdownMenuTrigger className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-accent transition-colors cursor-pointer bg-transparent border-0 text-left">
          <AccountAvatar account={selectedAccount} size={26} />
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
          </div>
          <ChevronDown size={14} className="text-muted-foreground shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {accounts.map((account) => {
            const isSelected = account.id === selectedAccount.id
            const name = account.displayName || account.name
            return (
              <DropdownMenuItem
                key={account.id}
                onClick={() => setSelectedAccountId(account.id)}
                className="flex items-center gap-2.5 cursor-pointer"
              >
                <AccountAvatar account={account} size={22} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm truncate', isSelected && 'font-semibold text-primary')}>{name}</p>
                  {account.basicId && (
                    <p className="text-xs text-muted-foreground truncate">{account.basicId}</p>
                  )}
                </div>
                {isSelected && <Check size={14} className="text-primary shrink-0" />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ─── サイドバー本体 ───────────────────────────────────────────

function SidebarContent({ staffRole, mobile = false }: { staffRole: string | null; mobile?: boolean }) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  // モバイル用「よく使う」セクション
  const priorityItems = menuSections
    .flatMap((s) => s.items)
    .filter((item) => item.mobilePriority)

  return (
    <div className="flex flex-col h-full">
      {/* ロゴ */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-sm bg-primary">
            H
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">LINE Harness</p>
            <p className="text-xs text-muted-foreground">管理画面</p>
          </div>
        </div>
      </div>

      {/* アカウント切替 */}
      <AccountSwitcher />

      {/* ナビゲーション */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {/* モバイル: よく使うセクション */}
        {mobile && (
          <div>
            <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              よく使う
            </p>
            {priorityItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={`priority-${item.href}`}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}
            <div className="my-3 border-t border-border" />
          </div>
        )}

        {/* 全セクション（モバイルではmobileHideをフィルタ） */}
        {menuSections.map((section, si) => {
          const visibleItems = section.items.filter((item) => {
            if (item.roles && staffRole && !item.roles.includes(staffRole)) return false
            if (mobile && item.mobileHide) return false
            return true
          })
          if (visibleItems.length === 0) return null
          return (
            <div key={si}>
              {section.label && (
                <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.label}
                </p>
              )}
              {visibleItems.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      active
                        ? item.danger
                          ? 'bg-destructive text-white'
                          : 'bg-primary text-primary-foreground'
                        : item.danger
                          ? 'text-destructive hover:bg-destructive/10'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* フッター */}
      <div className="border-t border-border px-4 py-3">
        <p className="text-xs text-muted-foreground mb-2">
          LINE Harness v{process.env.APP_VERSION || '0.0.0'}
        </p>
        <button
          onClick={() => {
            localStorage.removeItem('lh_api_key')
            localStorage.removeItem('lh_staff_name')
            localStorage.removeItem('lh_staff_role')
            window.location.href = '/login'
          }}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut size={14} />
          ログアウト
        </button>
      </div>
    </div>
  )
}

// ─── エクスポート ─────────────────────────────────────────────

export default function Sidebar() {
  const [staffRole, setStaffRole] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setStaffRole(localStorage.getItem('lh_staff_role'))
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <>
      {/* モバイル: ハンバーガーヘッダー */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-background border-b border-border px-4 h-14 flex items-center gap-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-md hover:bg-accent transition-colors bg-transparent border-0 cursor-pointer"
            aria-label="メニュー"
          >
            <Menu size={20} />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent staffRole={staffRole} mobile={true} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs bg-primary">H</div>
          <p className="text-sm font-bold">LINE Harness</p>
        </div>
      </div>

      {/* デスクトップ: 常時表示 */}
      <aside className="hidden lg:flex w-60 border-r border-border flex-col h-screen sticky top-0 bg-background">
        <SidebarContent staffRole={staffRole} />
      </aside>
    </>
  )
}
