import type { Metadata, Viewport } from 'next'
import './globals.css'
import AppShell from '@/components/app-shell'
import SwRegister from '@/components/sw-register'
import { Noto_Sans_JP } from "next/font/google";
import { cn } from "@/lib/utils";

const notoSansJP = Noto_Sans_JP({ subsets: ['latin'], variable: '--font-sans', weight: ['400', '500', '700'] });

export const metadata: Metadata = {
  title: 'LINE Harness',
  description: 'LINE公式アカウント CRM 管理画面',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LINE Harness',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0071e3',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={cn("font-sans", notoSansJP.variable)}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className="bg-background text-foreground antialiased">
        <SwRegister />
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  )
}
