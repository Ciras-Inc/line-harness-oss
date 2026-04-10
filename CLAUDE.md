# LINE Harness プロジェクトルール

## 概要
- LINE Official Account CRM管理ツール
- Worker: https://line-harness.solitary-rain-3867.workers.dev
- 管理画面: https://harness.ciras.jp（Vercel、Cloudflare Access保護済み）
- テストBot: @953mvanz（Channel ID: 2009662198）
- D1 database_id: 214b6b6c-b028-4b10-9fe0-e1b6ecf0c1cc

## 技術構成
- API: Cloudflare Workers + Hono（apps/worker）
- 管理画面: Next.js 15 + React 19（apps/web）
- データベース: Cloudflare D1（42テーブル）
- モノレポ: pnpm workspace
- Vercel Root Directory: apps/web
- 認証: Authorization: Bearer <API_KEY>

## 絶対禁止
- 本番Bot（@473hqufe）への操作は絶対禁止。一切触るな
- 本番Webhook（https://line-richmenu-worker.solitary-rain-3867.workers.dev/webhook）は触るな
- D1のDELETE/DROP操作はplan modeで確認後のみ

## デプロイ
- Worker: cd apps/worker && npx wrangler deploy
- 管理画面: npx vercel build --prod → npx vercel --prod --prebuilt（直接 npx vercel --prod は失敗する）

## 設計判断ログ
（新しい判断があったら、日付・決定・理由・却下案の形式で自動追記すること）
