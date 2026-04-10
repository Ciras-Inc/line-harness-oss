/**
 * リッチメニュー一括セットアップスクリプト
 * 実行方法: LINE_CHANNEL_ACCESS_TOKEN=xxx node scripts/setup-richmenu.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!TOKEN) {
  console.error('エラー: LINE_CHANNEL_ACCESS_TOKEN 環境変数が未設定です');
  console.error('実行方法: LINE_CHANNEL_ACCESS_TOKEN=xxx node scripts/setup-richmenu.mjs');
  process.exit(1);
}

const LINE_API = 'https://api.line.me/v2/bot';
const LINE_DATA_API = 'https://api-data.line.me/v2/bot';

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

// ──────────────────────────────────────────
// ユーティリティ
// ──────────────────────────────────────────
async function lineApi(method, url, body) {
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}

function log(step, msg, data) {
  console.log(`\n[Step ${step}] ${msg}`);
  if (data !== undefined) console.log(JSON.stringify(data, null, 2));
}

// ──────────────────────────────────────────
// ステップ1: 既存リッチメニューを全削除
// ──────────────────────────────────────────
async function deleteAllRichMenus() {
  log(1, '既存リッチメニュー一覧を取得中...');
  const { ok, json } = await lineApi('GET', `${LINE_API}/richmenu/list`);
  if (!ok) throw new Error(`一覧取得失敗: ${JSON.stringify(json)}`);

  const menus = json.richmenus || [];
  log(1, `${menus.length} 件のリッチメニューを検出`);

  for (const menu of menus) {
    log(1, `削除中: ${menu.richMenuId} (${menu.name})`);
    const res = await lineApi('DELETE', `${LINE_API}/richmenu/${menu.richMenuId}`);
    if (!res.ok) {
      console.warn(`  警告: 削除失敗 ${menu.richMenuId}: ${JSON.stringify(res.json)}`);
    } else {
      console.log(`  削除完了: ${menu.richMenuId}`);
    }
  }
}

// ──────────────────────────────────────────
// ステップ2: 新規客用リッチメニュー作成
// ──────────────────────────────────────────
async function createNewMenu() {
  log(2, '新規客用リッチメニューを作成中...');
  const body = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: '新規客用メニュー',
    chatBarText: 'メニュー',
    areas: [
      // 左上: セミナー
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: 'uri', uri: 'https://www.ciras.jp/seminar' },
      },
      // 中上: 1分でわかるCiras
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: 'message', text: '1分でわかるCiras' },
      },
      // 右上: AIチェッカー
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: 'uri', uri: 'https://www.ciras.jp/ai-check' },
      },
      // 左下: ニーズ確認
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: { type: 'uri', uri: 'https://www.ciras.jp/needs' },
      },
      // 中下: 質問する
      {
        bounds: { x: 833, y: 843, width: 834, height: 843 },
        action: { type: 'message', text: '質問する' },
      },
      // 右下: サービス一覧
      {
        bounds: { x: 1667, y: 843, width: 833, height: 843 },
        action: { type: 'uri', uri: 'https://www.ciras.jp/#services' },
      },
    ],
  };

  const { ok, json } = await lineApi('POST', `${LINE_API}/richmenu`, body);
  if (!ok) throw new Error(`新規客用メニュー作成失敗: ${JSON.stringify(json)}`);
  log(2, `新規客用メニュー作成完了: ${json.richMenuId}`);
  return json.richMenuId;
}

// ──────────────────────────────────────────
// ステップ3: 既存客用リッチメニュー作成
// ──────────────────────────────────────────
async function createExistingMenu() {
  log(3, '既存客用リッチメニューを作成中...');
  const body = {
    size: { width: 2500, height: 1686 },
    selected: false,
    name: '既存客用メニュー',
    chatBarText: 'メニュー',
    areas: [
      // 左上: 打ち合わせ予約
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: 'message', text: '打ち合わせ予約' },
      },
      // 中上: セミナー
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: 'uri', uri: 'https://www.ciras.jp/seminar' },
      },
      // 右上: 相談する
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: 'message', text: '相談する' },
      },
      // 左下: AIチェッカー
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: { type: 'uri', uri: 'https://www.ciras.jp/ai-check' },
      },
      // 中下: Webチェッカー
      {
        bounds: { x: 833, y: 843, width: 834, height: 843 },
        action: { type: 'uri', uri: 'https://www.ciras.jp/web-check' },
      },
      // 右下: ブログ
      {
        bounds: { x: 1667, y: 843, width: 833, height: 843 },
        action: { type: 'uri', uri: 'https://www.ciras.jp/blog/' },
      },
    ],
  };

  const { ok, json } = await lineApi('POST', `${LINE_API}/richmenu`, body);
  if (!ok) throw new Error(`既存客用メニュー作成失敗: ${JSON.stringify(json)}`);
  log(3, `既存客用メニュー作成完了: ${json.richMenuId}`);
  return json.richMenuId;
}

// ──────────────────────────────────────────
// ステップ4: 画像アップロード
// ──────────────────────────────────────────
async function uploadImage(richMenuId, imagePath, label) {
  log(4, `${label} に画像をアップロード中: ${imagePath}`);

  const imageBuffer = fs.readFileSync(imagePath);
  const url = `${LINE_DATA_API}/richmenu/${richMenuId}/content`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'image/png',
    },
    body: imageBuffer,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`画像アップロード失敗 (${label}): ${text}`);
  log(4, `${label} 画像アップロード完了`);
}

// ──────────────────────────────────────────
// ステップ5: デフォルトリッチメニュー設定
// ──────────────────────────────────────────
async function setDefaultRichMenu(richMenuId) {
  log(5, `デフォルトリッチメニューを設定中: ${richMenuId}`);
  const { ok, json } = await lineApi('POST', `${LINE_API}/user/all/richmenu/${richMenuId}`);
  if (!ok) throw new Error(`デフォルト設定失敗: ${JSON.stringify(json)}`);
  log(5, 'デフォルトリッチメニュー設定完了');
}

// ──────────────────────────────────────────
// ステップ6: wrangler.toml 更新
// ──────────────────────────────────────────
function updateWranglerToml(richMenuNew, richMenuExisting) {
  log(6, 'wrangler.toml を更新中...');
  const tomlPath = path.join(ROOT, 'apps', 'worker', 'wrangler.toml');
  let content = fs.readFileSync(tomlPath, 'utf-8');

  // RICH_MENU_NEW の値を置換
  content = content.replace(
    /RICH_MENU_NEW\s*=\s*"[^"]*"/,
    `RICH_MENU_NEW = "${richMenuNew}"`
  );
  // RICH_MENU_EXISTING の値を置換
  content = content.replace(
    /RICH_MENU_EXISTING\s*=\s*"[^"]*"/,
    `RICH_MENU_EXISTING = "${richMenuExisting}"`
  );

  fs.writeFileSync(tomlPath, content, 'utf-8');
  log(6, `wrangler.toml 更新完了\n  RICH_MENU_NEW      = ${richMenuNew}\n  RICH_MENU_EXISTING = ${richMenuExisting}`);
}

// ──────────────────────────────────────────
// メイン実行
// ──────────────────────────────────────────
(async () => {
  try {
    // ステップ1: 全削除
    await deleteAllRichMenus();

    // ステップ2,3: 新規・既存メニュー作成
    const newMenuId = await createNewMenu();
    const existingMenuId = await createExistingMenu();

    // ステップ4: 画像アップロード
    const newImg = path.join(ROOT, 'richmenu-new.png');
    const existingImg = path.join(ROOT, 'richmenu-existing.png');
    await uploadImage(newMenuId, newImg, '新規客用');
    await uploadImage(existingMenuId, existingImg, '既存客用');

    // ステップ5: デフォルト設定（新規客用をデフォルトに）
    await setDefaultRichMenu(newMenuId);

    // ステップ6: wrangler.toml 更新
    updateWranglerToml(newMenuId, existingMenuId);

    console.log('\n========================================');
    console.log('✅ リッチメニューセットアップ完了！');
    console.log(`  新規客用 ID: ${newMenuId}`);
    console.log(`  既存客用 ID: ${existingMenuId}`);
    console.log('\n次のステップ: npx wrangler deploy を実行してください');
    console.log('========================================\n');

  } catch (err) {
    console.error('\n❌ エラーが発生しました:', err.message);
    process.exit(1);
  }
})();
