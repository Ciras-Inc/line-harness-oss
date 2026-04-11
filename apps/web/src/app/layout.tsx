import type { Metadata } from 'next'
import './globals.css'
import AppShell from '@/components/app-shell'
import { Noto_Sans_JP } from "next/font/google";
import { cn } from "@/lib/utils";

const notoSansJP = Noto_Sans_JP({ subsets: ['latin'], variable: '--font-sans', weight: ['400', '500', '700'] });

export const metadata: Metadata = {
  title: 'LINE CRM 管理画面',
  description: 'LINE公式アカウント CRM 管理画面',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={cn("font-sans", notoSansJP.variable)}>
      <body className="bg-background text-foreground antialiased">
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  )
}
