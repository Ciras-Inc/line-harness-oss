'use client'
import { usePathname } from 'next/navigation'
import Sidebar from './layout/sidebar'
import AuthGuard from './auth-guard'
import { AccountProvider } from '@/contexts/account-context'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <AuthGuard>
      <AccountProvider>
        <TooltipProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 pt-14 lg:pt-0 px-4 pb-6 sm:px-6 lg:px-8 lg:pb-8 overflow-auto">
              {children}
            </main>
          </div>
        </TooltipProvider>
      </AccountProvider>
    </AuthGuard>
  )
}
