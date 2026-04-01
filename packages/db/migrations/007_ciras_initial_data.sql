-- Ciras株式会社 LINE公式アカウント 初期データ
-- Phase 1: テストBot（@953mvanz）構築用

-- ============================================================
-- 1. タグ（流入経路用）
-- ============================================================
INSERT INTO tags (id, name, color) VALUES
  ('tag-ad', '広告', '#FF6B6B'),
  ('tag-sns', 'SNS', '#4ECDC4'),
  ('tag-meishi', '名刺', '#95E1D3'),
  ('tag-seminar-venue', 'セミナー会場', '#FFD93D');

-- ============================================================
-- 2. 流入経路QRコード 4種
-- ============================================================
INSERT INTO entry_routes (id, ref_code, name, tag_id, is_active) VALUES
  ('route-ad', 'ad-google', 'Google広告', 'tag-ad', 1),
  ('route-sns', 'sns-main', 'SNS（X・Threads）', 'tag-sns', 1),
  ('route-meishi', 'meishi', '名刺交換', 'tag-meishi', 1),
  ('route-seminar', 'seminar', 'セミナー会場', 'tag-seminar-venue', 1);

-- ============================================================
-- 3. トラッキングリンク（URLクリック計測用）
-- ============================================================
INSERT INTO tracked_links (id, name, original_url, is_active) VALUES
  ('link-ai-check', 'AI活用レベルチェッカー', 'https://www.ciras.jp/ai-check', 1),
  ('link-web-check', 'Webサイト状況チェッカー', 'https://www.ciras.jp/web-check', 1);

-- ============================================================
-- 4. スコアリングルール 7種
-- ============================================================
INSERT INTO scoring_rules (id, name, event_type, score_value, is_active) VALUES
  ('score-url-click', 'URLを1回クリック', 'link_clicked', 1, 1),
  ('score-seminar-page', 'セミナーページを開いた', 'link_clicked_seminar', 3, 1),
  ('score-ai-checker', 'AI活用チェッカーを使った', 'link_clicked_ai_check', 5, 1),
  ('score-web-checker', 'Webサイトチェッカーを使った', 'link_clicked_web_check', 5, 1),
  ('score-message-sent', 'メッセージを送ってきた', 'message_received', 5, 1),
  ('score-seminar-joined', 'セミナーに参加した', 'seminar_attended', 10, 1),
  ('score-meeting-booked', '打ち合わせを予約した', 'meeting_booked', 15, 1);

-- ============================================================
-- 5. CV計測ゴール 3種
-- ============================================================
INSERT INTO conversion_points (id, name, event_type) VALUES
  ('cv-seminar', 'セミナー申込', 'seminar_registered'),
  ('cv-contact', '問い合わせ', 'contact_submitted'),
  ('cv-meeting', '打ち合わせ予約', 'meeting_booked');

-- ============================================================
-- 6. テンプレート 8種
-- ============================================================
INSERT INTO templates (id, name, category, message_type, message_content) VALUES
  ('tpl-schedule-confirmed', '日程確定', 'meeting', 'text',
   '{{name}}さん、お打ち合わせの日程が決まりました。

📅 ◯月◯日（◯）◯:00〜
📍 （場所 or Zoomリンク）

よろしくお願いいたします。'),

  ('tpl-schedule-pending', '日程調整中', 'meeting', 'text',
   '{{name}}さん、打ち合わせのご希望ありがとうございます。

確認して、明日中に日程をお返しします。'),

  ('tpl-seminar-info', 'セミナー案内', 'seminar', 'text',
   '{{name}}さん、次回のセミナー情報です。

📅 ◯月◯日（◯）
📍 （会場 or オンライン）
💰 3,000円

▼ 詳細・お申し込み
https://www.ciras.jp/seminar'),

  ('tpl-seminar-thanks', 'セミナー後のお礼', 'seminar', 'text',
   '{{name}}さん、本日はありがとうございました。'),

  ('tpl-meeting-thanks', '打ち合わせ後のお礼', 'meeting', 'text',
   '{{name}}さん、本日はお時間いただきありがとうございました。

お話しした内容をまとめて改めてお送りいたします。'),

  ('tpl-pricing-info', '料金の質問への回答', 'general', 'text',
   '{{name}}さん、ご質問ありがとうございます。

サービスの一覧と料金はこちらです。
https://www.ciras.jp/#services'),

  ('tpl-ai-checker-guide', 'AI活用チェッカーの案内', 'general', 'text',
   '{{name}}さん、6つの質問に答えるだけで御社に合ったAI活用の提案が出ます。

▼ AI活用レベルチェッカー（無料・1分）
https://www.ciras.jp/ai-check'),

  ('tpl-web-checker-guide', 'Webチェッカーの案内', 'general', 'text',
   '{{name}}さん、URLを入力するだけでWebサイトの状態がスコアで出ます。

▼ Webサイト状況チェッカー（無料）
https://www.ciras.jp/web-check');

-- ============================================================
-- 7. シナリオ「友だち追加オンボーディング」
-- ============================================================
INSERT INTO scenarios (id, name, description, trigger_type, is_active) VALUES
  ('scenario-onboarding', '友だち追加オンボーディング', '新規友だち向けの8ステップ配信（条件分岐含む）', 'friend_add', 1);

-- ============================================================
-- 8. シナリオステップ 8件
-- ============================================================
-- 4-0. あいさつメッセージ（即時）
INSERT INTO scenario_steps (id, scenario_id, step_order, delay_minutes, message_type, message_content) VALUES
  ('step-welcome', 'scenario-onboarding', 0, 0, 'text',
   '{{name}}さん、友だち追加ありがとうございます！

Ciras（シラス）株式会社です。

👇 メニューからサービスや無料診断ツールをご覧いただけます。');

-- 4-1. day3：AI仕組み化の本質
INSERT INTO scenario_steps (id, scenario_id, step_order, delay_minutes, message_type, message_content) VALUES
  ('step-day3', 'scenario-onboarding', 1, 4320, 'text',
   'こんにちは、Cirasです。

目の前に鉛筆があれば、すぐ書ける。
でも、わざわざ歩いて取りに行くなら、
書くこと自体をやめてしまう。

仕事も同じです。

「こんなことがしたい」
「これのここを直したい」
「こんなものが欲しい」

思いついても、
調べて、設定して、入力して…
その手間があるだけで、やらなくなる。

AIの仕組み化は、
その「面倒くさい」をなくすことです。

鉛筆が常に手元にある状態を作る。
思いついたら、すぐできる。

やりたいことの数は変わらなくても、
実際にやれることの数が変わります。

▼ 御社の課題に近いものはありますか？
https://www.ciras.jp/needs

▼ AI活用度を確認する
https://www.ciras.jp/ai-check');

-- 4-2. day7：AI活用レベルチェッカー案内
INSERT INTO scenario_steps (id, scenario_id, step_order, delay_minutes, message_type, message_content) VALUES
  ('step-day7', 'scenario-onboarding', 2, 5760, 'text',
   'こんにちは、Cirasです。

前回、AIの仕組み化の話をしました。

「うちだと、何から始めればいいんだろう」

もしそう思ったら、
まずは現在地を確認してみてください。

6つの質問に答えるだけで、
御社に合ったAI活用の提案を
AIがその場で作成します。

▼ AI活用レベルチェッカー（無料・1分）
https://www.ciras.jp/ai-check');

-- 4-3a. day10-A：チェッカーを使った人（条件：link_clicked = link-ai-check）
INSERT INTO scenario_steps (id, scenario_id, step_order, delay_minutes, message_type, message_content, condition_type, condition_value) VALUES
  ('step-day10-a', 'scenario-onboarding', 3, 4320, 'text',
   'こんにちは、Cirasです。

チェッカーのご利用ありがとうございました。

次は、Webサイトの状態も
確認してみませんか？

AI検索時代に対応できているか、
URLを入力するだけで
100点満点でスコアが出ます。

▼ Webサイト状況チェッカー（無料）
https://www.ciras.jp/web-check', 'link_clicked', 'link-ai-check');

-- 4-3b. day10-B：チェッカーを使わなかった人（条件：link_not_clicked）
INSERT INTO scenario_steps (id, scenario_id, step_order, delay_minutes, message_type, message_content, condition_type, condition_value) VALUES
  ('step-day10-b', 'scenario-onboarding', 4, 0, 'text',
   'こんにちは、Cirasです。

前回ご案内した
AI活用レベルチェッカー、
まだの方へ改めてご紹介です。

6つの質問に答えるだけで、
御社に合った提案をAIがその場で作ります。

所要時間は1分ほどです。

▼ AI活用レベルチェッカー（無料）
https://www.ciras.jp/ai-check', 'link_not_clicked', 'link-ai-check');

-- 4-4. day14：Webサイト状況チェッカー案内
INSERT INTO scenario_steps (id, scenario_id, step_order, delay_minutes, message_type, message_content) VALUES
  ('step-day14', 'scenario-onboarding', 5, 5760, 'text',
   'こんにちは、Cirasです。

御社のWebサイト、
最後に見直したのはいつですか？

今はGoogleだけでなく、
ChatGPTやPerplexityなどの
AI検索でも会社が紹介される時代です。

公式サイトの情報が古いと、
AIが間違った紹介をしてしまいます。

URLを入力するだけで、
100点満点でスコアが出ます。

▼ Webサイト状況チェッカー（無料）
https://www.ciras.jp/web-check');

-- 4-5a. day17-A：Webチェッカーを使った人（条件：link_clicked = link-web-check）
INSERT INTO scenario_steps (id, scenario_id, step_order, delay_minutes, message_type, message_content, condition_type, condition_value) VALUES
  ('step-day17-a', 'scenario-onboarding', 6, 4320, 'text',
   'こんにちは、Cirasです。

チェッカーのご利用ありがとうございました。

ここまでで、
AI活用とWebサイトの現状、
2つの角度から御社の状態が
見えてきたかと思います。', 'link_clicked', 'link-web-check');

-- 4-5b. day17-B：Webチェッカーを使わなかった人（条件：link_not_clicked）
INSERT INTO scenario_steps (id, scenario_id, step_order, delay_minutes, message_type, message_content, condition_type, condition_value) VALUES
  ('step-day17-b', 'scenario-onboarding', 7, 0, 'text',
   'こんにちは、Cirasです。

前回ご案内した
Webサイト状況チェッカー、
まだの方へ改めてご紹介です。

URLを入力するだけで、
AI検索時代に対応できているか
100点満点でスコアが出ます。

▼ Webサイト状況チェッカー（無料）
https://www.ciras.jp/web-check', 'link_not_clicked', 'link-web-check');

-- 4-6. day21：AI導入で失敗するパターン
INSERT INTO scenario_steps (id, scenario_id, step_order, delay_minutes, message_type, message_content) VALUES
  ('step-day21', 'scenario-onboarding', 8, 5760, 'text',
   'こんにちは、Cirasです。

AIを導入した中小企業で、
うまくいかないケースには
共通点があります。

「全部AIにやらせようとする」ことです。

AIが得意なのは、
繰り返しの作業、下書き、振り分け。

判断や交渉、お客様との関係づくりは
人がやった方がうまくいきます。

大事なのは
「どこを人がやり、どこをAIに任せるか」
の線引きです。

この線引きが御社の業務に合っていれば、
少ない手間で大きな効果が出ます。

▼ 御社の課題に近いものはありますか？
https://www.ciras.jp/needs');

-- 4-7. day28：セミナー案内＋無料相談案内
INSERT INTO scenario_steps (id, scenario_id, step_order, delay_minutes, message_type, message_content) VALUES
  ('step-day28', 'scenario-onboarding', 9, 10080, 'text',
   'こんにちは、Cirasです。

ここまでお読みいただき
ありがとうございました。

Cirasでは、
生成AI活用のセミナーと塾を
定期的に開催しています。

セミナーはオンライン30分の入門編。
塾は対面1時間の実践型です。

▼ セミナー・塾の情報はこちら
https://www.ciras.jp/seminar

「まだセミナーは早いかな」という方は、
30分の無料相談もやっています。

▼ 無料相談
https://www.ciras.jp/contact');

-- ============================================================
-- 9. カルーセル「1分でわかるCiras」自動返信
-- ============================================================
INSERT INTO auto_replies (id, keyword, match_type, response_type, response_content, is_active) VALUES
  ('reply-ciras-intro', '1分でわかるCiras', 'exact', 'flex',
   '{
  "type": "carousel",
  "contents": [
    {
      "type": "bubble",
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "Ciras（シラス）株式会社",
            "weight": "bold",
            "size": "lg",
            "margin": "md"
          },
          {
            "type": "text",
            "text": "その仕事、AIで減らせます。",
            "size": "md",
            "margin": "md",
            "wrap": true
          },
          {
            "type": "text",
            "text": "愛媛県松山市から、中小企業のAI活用を「使える形」に整えています。",
            "size": "sm",
            "margin": "md",
            "wrap": true,
            "color": "#999999"
          }
        ]
      }
    },
    {
      "type": "bubble",
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "こんな課題、ありませんか？",
            "weight": "bold",
            "size": "lg",
            "margin": "md"
          },
          {
            "type": "text",
            "text": "・AIを使っているけど仕事が減らない\n・仕組みにしたいけど自分では作れない\n・IT・AIの判断を一人で抱えている",
            "size": "sm",
            "margin": "md",
            "wrap": true,
            "color": "#555555"
          }
        ]
      }
    },
    {
      "type": "bubble",
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "3つのサービスで対応します",
            "weight": "bold",
            "size": "lg",
            "margin": "md"
          },
          {
            "type": "text",
            "text": "AI顧問（月3.3万円）\n→ 相談と方針づくり\n\nAI導入（月8.8万円）\n→ 仕組みを作って納品\n\n影武者（月27.5万円〜）\n→ 経営者と同じ目線で動く",
            "size": "sm",
            "margin": "md",
            "wrap": true,
            "color": "#555555"
          }
        ]
      }
    },
    {
      "type": "bubble",
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "まずはここから",
            "weight": "bold",
            "size": "lg",
            "margin": "md"
          },
          {
            "type": "text",
            "text": "無料診断ツール2つと、30分の無料相談をやっています。",
            "size": "sm",
            "margin": "md",
            "wrap": true,
            "color": "#555555"
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "contents": [
          {
            "type": "button",
            "style": "primary",
            "action": {
              "type": "uri",
              "label": "AI活用チェッカー",
              "uri": "https://www.ciras.jp/ai-check"
            },
            "color": "#1B4F8A"
          },
          {
            "type": "button",
            "style": "primary",
            "action": {
              "type": "uri",
              "label": "Webサイトチェッカー",
              "uri": "https://www.ciras.jp/web-check"
            },
            "color": "#1B4F8A"
          },
          {
            "type": "button",
            "style": "primary",
            "action": {
              "type": "uri",
              "label": "無料相談を申し込む",
              "uri": "https://www.ciras.jp/contact"
            },
            "color": "#B22222"
          }
        ]
      }
    }
  ]
}', 1);
