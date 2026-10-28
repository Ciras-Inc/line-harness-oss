# Ciras-Inc/line-harness-oss｜リポジトリ固有条件

この文書は対象リポジトリの技術・業務仕様と固有の制約です。パスはリポジトリのルートからの相対パスです。共通行動・承認・費用の判断は同梱の `00_CIRAS_POLICY.json` とルート `AGENTS.md` に従います。旧入口にあった包括的な自動マージ許可、常時記帳、無制限の再試行、主担当AIの固定は共通規則として再採用しません。固有の本人実行経路・必須レビュー・技術的保護は維持します。記載した本番コマンドや通知先は実行承認ではありません。

## 概要
- LINE Official Account CRM管理ツール
- Worker: https://line-harness.solitary-rain-3867.workers.dev
- 管理画面: https://harness.ciras.jp（Vercel、Cloudflare Access保護済み）
- テストBot: @953mvanz（Channel ID: 2009662198）
- D1 の実 ID は既存 Worker 設定を照合する。

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
- D1 の DELETE / DROP は plan mode で対象・影響・復元を確認し、共通 D01 の具体的な本人承認と適格経路を満たす場合だけ。

## デプロイ経路の参照（実行承認ではない）
- Worker: cd apps/worker && npx wrangler deploy
- 管理画面: npx vercel build --prod → npx vercel --prod --prebuilt（直接 npx vercel --prod は失敗する）

## 設計判断ログ
新しい設計判断は、依頼範囲の記録先へ日付・決定・理由・却下案を残す。

## 今回照合した構成

- 既定branch：`main`
- 配布前commit：`74e11182528e0a2d0ab9896a4ef1337d5a924b31`
- 既存lockfile：`pnpm-lock.yaml`
- 必須status check：取得できたRuleset内には指定なし。従来型branch protectionの不存在を意味しない

検査候補は `.ciras/ai-profile.json` の `local_check_commands` を参照。既存宣言を読み取った一覧であり、今回すべてを実行した結果ではない。依存関係・外部効果・実行面を確認して必要なものを使う。パッケージ管理を他repoの方式へ一律変更しない。
