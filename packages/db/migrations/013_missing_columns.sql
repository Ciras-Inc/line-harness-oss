-- Migration 013: 未適用のマイグレーションをまとめて適用
-- 008_multi_account, 009_token_expiry, 012_alt_text の内容 + notification_rules/auto_replies への line_account_id

-- ① friendsに line_account_id 追加（マルチアカウント対応）
ALTER TABLE friends ADD COLUMN line_account_id TEXT REFERENCES line_accounts(id);

-- ② 各テーブルに line_account_id 追加
ALTER TABLE scenarios ADD COLUMN line_account_id TEXT;
ALTER TABLE broadcasts ADD COLUMN line_account_id TEXT;
ALTER TABLE reminders ADD COLUMN line_account_id TEXT;
ALTER TABLE automations ADD COLUMN line_account_id TEXT;
ALTER TABLE chats ADD COLUMN line_account_id TEXT;
ALTER TABLE notification_rules ADD COLUMN line_account_id TEXT;
ALTER TABLE auto_replies ADD COLUMN line_account_id TEXT;

-- ③ line_accountsにLINE Loginカラム追加
ALTER TABLE line_accounts ADD COLUMN login_channel_id TEXT;
ALTER TABLE line_accounts ADD COLUMN login_channel_secret TEXT;
ALTER TABLE line_accounts ADD COLUMN liff_id TEXT;

-- ④ line_accountsにトークン有効期限カラム追加
ALTER TABLE line_accounts ADD COLUMN token_expires_at TEXT;

-- ⑤ broadcastsにalt_textカラム追加
ALTER TABLE broadcasts ADD COLUMN alt_text TEXT;
