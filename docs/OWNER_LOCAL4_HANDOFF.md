# Ciras-Inc/line-harness-oss の完成候補と本人操作

準備担当はCodex。これは隔離した候補全文であり、実設定・GitHub候補object・PR head・本番には未反映。正式レビューと製品別の技術的検収は未実施。

## 変更前後と固定版

- PR：https://github.com/Ciras-Inc/line-harness-oss/pull/2
- 現在head：`aaee3dd4cbcd8b1f122c54cd223cc1744c17b784`
- 比較base：`74e11182528e0a2d0ab9896a4ef1337d5a924b31`、反映先：`main`
- 作業branch：`codex/ai-settings-r2-1-20261028`
- 通常操作は共通の条件付きAI実行へ整合し、初期設定・有効な保護と固有の本人専用条件を保持。今回は設定候補のみ。
- 全文・全hash：`.ciras/ai-settings-manifest.json`。生成元と直前local候補の出所：`.ciras/execution-alignment-revision.json`。
- 既定branch、workflow、Ruleset、native認証/権限、Secret、課金設定は候補に含めない。元の必須検証と正式レビュー条件は保持。

## 本人に必要な操作

本人がこの公開repoへの候補全文の公開と、操作から連鎖するpreview・workflow・通知・費用を確認する。GitHubへblob/commitを作る段階から公開になる。この完成物は公開済みではない。manifestの全文が公開対象であり、個人Profile・秘密・個別相談実データ・native認証設定は含めない。本人の具体的な公開操作へ版・範囲・経路を結び付けてから、既存PRの作業branchに本人が保存する。一括ブラウザー保存経路は未実証であり、未確認のボタン案内は行わない。新headに必要なCIと既存の正式レビューを受け、初期設定の採用は本人が行う。
本番Botと本番Webhookへの操作禁止、D1 DELETE/DROPのplan mode条件を原文のままcontextへ保持。既存Vercel previewは現在headで過去に観測されたもので、新候補の成功証拠にはしない。

## 検証・費用・復元

実行記録は候補外のVALIDATION.jsonとlogsへ保存する。検査器と75件の回帰試験は静的な候補検証。実アプリのCI/製品読込/技術的拒否は未実施。共通の追加支出は0円。この作業に別承認された5 USD上限を共通方針や将来の費用許可へ書き込まない。今回の準備に依存導入・実API・外部送信は不要。

本人保存後は新しい完全headを取得し、manifestと公開された各ファイルを読戻す。版変更時は承認を流用しない。候補取消は未保存なら取り下げ、採用後はこの設定差分だけのrevert PRを用意し、既存の本人専用経路で実行する。force push・guard変更・本番の手動deployを復元の近道にしない。公開された情報はGit revertだけでは非公開に戻らない。

残条件は正式レビュー・同一新headのCI・本人の対象版確認と本人保存/採用・実製品の有効化と合成許可/拒否試験。一括のブラウザー適用UI経路は未実証。これらをローカル候補完成や静的成功へ読み替えない。
