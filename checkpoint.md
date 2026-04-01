# LINE Harness Phase 1 実装進捗チェックポイント
**最終更新**: 2026-04-01

## プロジェクト概要
Ciras株式会社のLINE公式アカウント（テストBot: @953mvanz / Channel ID: 2009662198）でマーケティングオートメーション構築中。

## 完了したタスク ✅

### Task #4: URLクリック条件の実装 ✅
**ファイル**: `apps/worker/src/services/step-delivery.ts`

**実装内容**:
- `evaluateCondition`関数に`link_clicked`条件を追加（L246-252）
- `link_not_clicked`条件も追加（L253-259）
- これにより、シナリオステップで「URLをクリックした人/しなかった人」で配信を分岐可能に

**コード**:
```typescript
case 'link_clicked': {
  const click = await db
    .prepare('SELECT 1 FROM link_clicks WHERE friend_id = ? AND tracked_link_id = ? LIMIT 1')
    .bind(friendId, step.condition_value)
    .first();
  return !!click;
}
case 'link_not_clicked': {
  const click = await db
    .prepare('SELECT 1 FROM link_clicks WHERE friend_id = ? AND tracked_link_id = ? LIMIT 1')
    .bind(friendId, step.condition_value)
    .first();
  return !click;
}
```

### Task #3: 初期データSQL作成・実行 ✅
**ファイル**: `packages/db/migrations/007_ciras_initial_data.sql`

**実装内容**: 以下9セクション、計120行のデータをD1に投入完了

#### 1. タグ（流入経路用）4件
- tag-ad: 広告（#FF6B6B）
- tag-sns: SNS（#4ECDC4）
- tag-meishi: 名刺（#95E1D3）
- tag-seminar-venue: セミナー会場（#FFD93D）

#### 2. 流入経路QRコード 4件
- route-ad: Google広告（ref=ad-google）
- route-sns: SNS（ref=sns-main）
- route-meishi: 名刺交換（ref=meishi）
- route-seminar: セミナー会場（ref=seminar）

#### 3. トラッキングリンク 2件
- link-ai-check: AI活用レベルチェッカー（https://www.ciras.jp/ai-check）
- link-web-check: Webサイト状況チェッカー（https://www.ciras.jp/web-check）

#### 4. スコアリングルール 7件
| イベント | スコア |
|---------|--------|
| URLクリック | +1 |
| セミナーページ閲覧 | +3 |
| AIチェッカー利用 | +5 |
| Webチェッカー利用 | +5 |
| メッセージ送信 | +5 |
| セミナー参加 | +10 |
| 打ち合わせ予約 | +15 |

#### 5. CV計測ゴール 3件
- cv-seminar: セミナー申込（seminar_registered）
- cv-contact: 問い合わせ（contact_submitted）
- cv-meeting: 打ち合わせ予約（meeting_booked）

#### 6. テンプレート 8件
- 日程確定、日程調整中、セミナー案内、セミナー後お礼、打ち合わせ後お礼、料金質問回答、AIチェッカー案内、Webチェッカー案内

#### 7. シナリオ 1件
- scenario-onboarding: 友だち追加オンボーディング（trigger_type='friend_add'）

#### 8. シナリオステップ 10件（条件分岐含む）
| step_order | ID | タイミング | delay_minutes | 条件 | 内容 |
|-----------|-----|----------|--------------|------|------|
| 0 | step-welcome | 即時 | 0 | - | ウェルカムメッセージ |
| 1 | step-day3 | Day3 | 4320 | - | AI仕組み化の本質 |
| 2 | step-day7 | Day7 | 5760 | - | AIチェッカー案内 |
| 3 | step-day10-a | Day10 | 4320 | link_clicked='link-ai-check' | チェッカー利用者向けA |
| 4 | step-day10-b | Day10 | 0 | link_not_clicked='link-ai-check' | 未利用者向けB |
| 5 | step-day14 | Day14 | 5760 | - | Webチェッカー案内 |
| 6 | step-day17-a | Day17 | 4320 | link_clicked='link-web-check' | Webチェッカー利用者向けA |
| 7 | step-day17-b | Day17 | 0 | link_not_clicked='link-web-check' | 未利用者向けB |
| 8 | step-day21 | Day21 | 5760 | - | AI導入失敗パターン |
| 9 | step-day28 | Day28 | 10080 | - | セミナー案内＋無料相談 |

**条件分岐の仕組み**:
- Day10とDay17で「クリックした/しなかった」で配信内容を自動で出し分け
- delay_minutes=0のステップは、前ステップと同じタイミングで条件判定される
- step-day10-a（条件true）が送信されると、step-day10-b（条件false）はスキップされる

#### 9. 自動返信 1件
- reply-ciras-intro: キーワード「1分でわかるCiras」→ 4カードのカルーセルFlex Message
  - カード1: 会社紹介
  - カード2: 課題提示
  - カード3: サービス3種紹介
  - カード4: CTA（AIチェッカー、Webチェッカー、無料相談ボタン）

### Task #6: 打ち合わせ予約フロー実装 ✅
**ファイル**: `apps/worker/src/routes/webhook.ts`

**実装内容**: L307付近に約150行追加
- キーワード「打ち合わせ予約」でトリガー
- クイックリプライで3ステップ対話を実装
  1. 所要時間（30分/1時間/1.5時間）
  2. 希望時期（今週中/来週/再来週/未定）
  3. 相談内容（自由テキスト入力）
- friend.metadataにステート保存（reservation_state、reservation_step1〜3）
- 完了時に確認Flex Message送信
- fireEvent('meeting_booked')でスコア+15、CV記録
- すべてreplyMessage使用（無料）

**コードパターン**:
```typescript
// ステップ1: 開始トリガー
if (incomingText === '打ち合わせ予約' && !reservationState) {
  await lineClient.replyMessage(event.replyToken, [{
    type: 'text',
    text: 'ご希望の所要時間を選択してください',
    quickReply: { items: [/* 30分/1時間/1.5時間 */] }
  }]);
  metadata.reservation_state = 'step1';
}

// ステップ4: 完了
if (reservationState === 'step3') {
  await fireEvent(db, 'meeting_booked', {
    friendId: friend.id,
    eventData: { duration, timing, content }
  });
}
```

### その他の修正 ✅
**ファイル**: `apps/worker/wrangler.toml`
- database_nameを`line-harness-test`に修正（L14）

**データベース**: D1（line-harness-test / 214b6b6c-b028-4b10-9fe0-e1b6ecf0c1cc）
- スキーマ適用完了（schema.sql、migrations 003/005/006）
- 初期データ投入完了（120行）

---

## 未完了のタスク 🔲

### Task #1: リッチメニュー2種を作成（新規客用・既存客用）
**状態**: pending（画像待ち）

**必要な作業**:
1. リッチメニュー画像2種を準備（2500x1686 or 2500x843）
   - 新規客用メニュー
   - 既存客用メニュー
2. MCPの`mcp__line-harness__create_rich_menu`で作成
3. 作成されたrich_menu_idをメモ（環境変数で使用）

### Task #2: wrangler.tomlに環境変数を追加
**状態**: pending

**追加する環境変数**:
```toml
[vars]
LINE_ADMIN_USER_ID = "Uxxx..." # 管理者のLINE user_id（リッチメニュー切替権限）
RICH_MENU_NEW = "richmenu-xxx" # 新規客用リッチメニューID（Task #1で取得）
RICH_MENU_EXISTING = "richmenu-yyy" # 既存客用リッチメニューID（Task #1で取得）
```

### Task #5: webhook.tsにリッチメニュー切り替えロジックを追加
**状態**: pending

**実装箇所**: `apps/worker/src/routes/webhook.ts`（L255付近）

**実装内容**:
- 管理者（LINE_ADMIN_USER_ID）のみ実行可能
- キーワード「既存」→ RICH_MENU_EXISTING を送信者に割り当て
- キーワード「新規」→ RICH_MENU_NEW を送信者に割り当て
- 内部でmanage-friends APIのset_rich_menuを呼び出し

**想定コード量**: 約30行

### Task #7: 統合テスト（友だち追加→シナリオ配信）
**状態**: ready for testing

**テスト項目**:

#### A. 打ち合わせ予約フロー（✅ 実装完了、テスト可能）
1. LINEアプリでテストBot（@953mvanz）を開く
2. 「打ち合わせ予約」と送信
3. クイックリプライで「30分」「1時間」「1.5時間」が表示されることを確認
4. いずれかを選択 → 「今週中」「来週」「再来週」「未定」が表示されることを確認
5. いずれかを選択 → 「相談内容を自由にご記入ください」が表示されることを確認
6. テキストを入力 → 確認メッセージ（Flex）が表示されることを確認
7. D1で`friend_scores`テーブルを確認 → スコア+15が記録されていることを確認
   ```bash
   npx wrangler d1 execute line-harness-test --command "SELECT * FROM friend_scores ORDER BY created_at DESC LIMIT 1" --remote
   ```

#### B. 自動返信（✅ 実装完了、テスト可能）
1. LINEアプリで「1分でわかるCiras」と送信
2. カルーセル（4カード）が表示されることを確認
   - カード1: 会社紹介
   - カード2: 課題提示
   - カード3: サービス3種紹介
   - カード4: CTA（ボタン3つ）

#### C. 友だち追加シナリオ（✅ 実装完了、テスト可能）
1. 新しいLINEアカウントでテストBotを友だち追加
2. ウェルカムメッセージが即時受信されることを確認
3. D1で`friend_scenarios`テーブルを確認 → シナリオ登録されていることを確認
   ```bash
   npx wrangler d1 execute line-harness-test --command "SELECT * FROM friend_scenarios WHERE scenario_id='scenario-onboarding' ORDER BY created_at DESC LIMIT 1" --remote
   ```
4. `next_delivery_at`が3日後（4320分後）に設定されていることを確認

#### D. 条件分岐（⏸️ 実装完了、実際の配信テストは3日後〜）
1. AIチェッカーリンクをクリック → `link_clicks`に記録
2. Day10配信時にクリック済みメッセージ（step-day10-a）が届くことを確認
3. 別アカウントで未クリック → Day10配信時に未クリックメッセージ（step-day10-b）が届くことを確認

#### E. リッチメニュー切り替え（⏸️ Task #5実装待ち）
- Task #5完了後にテスト

---

## 次のセッションで最初にやるべきこと

### オプションA: リッチメニュー画像がある場合
1. **Task #1実行**: リッチメニュー2種を作成
   - `mcp__line-harness__create_rich_menu`で新規客用・既存客用を作成
   - rich_menu_idを2つメモ
2. **Task #2実行**: wrangler.tomlに環境変数追加
3. **Task #5実行**: webhook.tsにリッチメニュー切り替えロジック追加
4. **Task #7実行**: 統合テスト

### オプションB: リッチメニュー画像がない場合（推奨）
1. **Task #7実行**: 統合テスト（部分的に実行可能）
   - ✅ 打ち合わせ予約フロー完走テスト（Task #6完了）
   - ✅ キーワード「1分でわかるCiras」→ カルーセル受信テスト
   - ✅ 友だち追加 → ウェルカムメッセージ即時受信テスト
   - ⏸️ リッチメニュー切り替えテスト（Task #5実装後）
2. **Task #5実行**: リッチメニュー切り替えロジック（画像なしでもコード実装可能）
3. リッチメニュー画像が揃ったらTask #1→#2を実行

### 推奨: オプションB → 統合テスト優先
理由: Task #6（打ち合わせ予約フロー）が完了したため、主要機能のテストが可能。リッチメニュー関連以外のテストを先行実施し、動作確認を進める。

---

## 重要な技術メモ

### 条件分岐の実装パターン
```typescript
// day10で「クリックした人」と「しなかった人」を送り分け
// step 3: link_clicked条件、delay=4320（3日後）
// step 4: link_not_clicked条件、delay=0（同時刻判定）
// → クリックした人: step 3送信 → step 4スキップ → step 5へ
// → クリックしなかった人: step 3スキップ → step 4送信 → step 5へ
```

### delay_minutesの計算
delay_minutesは「前ステップ実行時刻からの経過時間」（累積ではない）
- Day3: 4320分（3日 = 72時間）
- Day7: 5760分（4日 = 96時間、day3から4日後）
- Day10: 4320分（day7から3日後）

### データベース接続
```bash
# リモートDB操作
npx wrangler d1 execute line-harness-test --command "SELECT ..." --remote

# マイグレーション実行
npx wrangler d1 execute line-harness-test --file=packages/db/migrations/XXX.sql --remote
```

### MCP経由のLINE操作
```javascript
// メッセージ送信（テストBot）
mcp__line-harness__send_message({ friendId: 'xxx', content: 'テスト' })

// リッチメニュー作成
mcp__line-harness__create_rich_menu({ name: '新規客用', areas: [...], imageData: 'base64...' })
```

---

## ファイル変更履歴

### 変更したファイル
1. `apps/worker/src/services/step-delivery.ts` - link_clicked/link_not_clicked条件追加（Task #4）
2. `apps/worker/wrangler.toml` - database_name修正
3. `packages/db/migrations/007_ciras_initial_data.sql` - 初期データSQL作成（Task #3）
4. `apps/worker/src/routes/webhook.ts` - 打ち合わせ予約フロー追加（L307付近、約150行、Task #6）

### 次に変更するファイル（予定）
1. `apps/worker/wrangler.toml` - 環境変数追加（Task #2）
2. `apps/worker/src/routes/webhook.ts` - リッチメニュー切替（Task #5）

---

## 参考リンク
- プラン: `C:\Users\tsugi\.claude\plans\stateless-scribbling-star.md`
- 仕様書: `C:\Ciras\line-harness-oss\specs\line-harness-spec.md`
- Worker URL: https://line-harness.solitary-rain-3867.workers.dev
- テストBot: @953mvanz（Channel ID: 2009662198）
