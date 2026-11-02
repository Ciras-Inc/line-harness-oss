# Ciras-Inc/line-harness-oss｜リポジトリ固有条件

## R2.2の通常実行と本人専用操作

通常の公開・merge・deploy等は、同一固定版の必要検証・正式レビュー、有効な杉本承認、実権限・採用済み適格経路、共有・通知・公開・費用等の副作用が一致すればAIが実行し読戻す。初期設定・有効な保護の適用と、各repoで採用済みの本人専用操作は杉本本人が行う。承認だけで実権限を得たり、既存制御を迂回したりしない。 具体的な判断は同梱 `00_CIRAS_POLICY.json`（CIRAS-SUCCESS-20261029-R2.2）と、この文書の採用済み本人専用条件に従う。

push・PR・preview・workflow・保存は実際の全効果で判定する。共有・通知・公開・deploy・費用が既存の同一承認と実権限の範囲内なら、採用済み経路で進める。本人専用操作または未承認/不明な副作用がある送出だけ保留し、独立した準備を続ける。 既存の業務自動化・安全ガードを勝手に停止・変更しない。

着手・方針変更・引継ぎ時には鳥の目で目的、全体の完了条件、依存、利用者への影響に戻る。虫の目で対象版と実装・検証を確認し、魚の目で変更や運用の流れを捉える。個別検査やレビューの反復を目的にせず、杉本がBefore/Afterで判断できる成果へまとめる。



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

## 固有条件の現行原文（2026-11-01再取得）

以下の引用は採用済みbaseの固有条件を改変せず保持したもの。共通入口の条件付き通常実行により本人専用条件・指定実行手続・既存の安全境界を解除しない。候補準備は実設定の保存・有効化・指定主体による実行と区別する。

### 原文1

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

## 今回の公開範囲

公開対象の全文は候補フォルダーのmanifest管理ファイル一式であり、公開すると誰でも閲覧・複製できる。個人Profile・秘密・個別相談実データ・native認証設定は含めない。public repoへのblob保存を非公開の準備扱いにしない。公開preview・workflow・通知・費用の副作用は別に確認し、今回Codexは外部書込みを行わない。
