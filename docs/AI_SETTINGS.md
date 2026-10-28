# AI設定 CIRAS-SUCCESS-20261028-R2.1

共通入口は[AGENTS.md](../AGENTS.md)、Claude Codeは[CLAUDE.md](../CLAUDE.md)、CursorはAGENTSと常時適用ルールを使用します。固有の技術条件・コマンドは[repository-context.md](../.ciras/repository-context.md)を参照します。

## 配布版

- 正本：Ciras-Inc/ciras-os の commit `a10e91e9b577609517084329d088743f50c8f083`
- 生成器：`1.0.3`
- 対象：`Ciras-Inc/line-harness-oss`
- 既定branch：`main`
- 配布台帳：`.ciras/governance-release.yaml`
- 出力照合：`.ciras/ai-settings-manifest.json`

## 確認と更新

`node .ciras/verify-ai-settings.mjs --root . --expected-repository Ciras-Inc/line-harness-oss` で構成・hashを確認します。最終配布検査は固定元の検査器、別に固定したmanifest hash、配布先から別に確定したexpected-repositoryを使います。hashなしはローカル整合のみ、対象指定なしはrepo名の自己申告のみを検査します。検査中に変更されない隔離checkoutを使い、同時書換えへのOS隔離はこの静的検査器では保証しません。候補内の検査器・hashだけでは承認や改ざん耐性の証拠になりません。

設定更新は作業branchとPRで行い、共通規則は固定元の生成器から再生成します。既存の必須チェック・レビュー・本人実行条件を守ります。既存の権限、hook、sandbox、Ruleset、共有・課金設定はこの配布で変更しません。

## 実行面の状態

この配布はファイル構成の検査です。Claude Code・Cursor・Codexの実製品での読込、trust、権限、許可/拒否の動作は未検証です。各実行面で確認し、未検証の危険操作は保留、独立した通常作業は継続します。新規native権限・MCP・hookを空の設定で上書きしません。

## 復元

配布前commitは `74e11182528e0a2d0ab9896a4ef1337d5a924b31`。適用済みPRを取り消す場合は対象差分を確認した追加のrevert PRで戻します。force pushや既存履歴の書換えは行いません。
