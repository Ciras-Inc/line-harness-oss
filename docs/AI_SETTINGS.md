# AI設定 CIRAS-SUCCESS-20261029-R2.2

共通入口は[AGENTS.md](../AGENTS.md)、Claude Codeは[CLAUDE.md](../CLAUDE.md)、Cursorは常時適用ルールとAGENTSを使用します。固有条件・既存レビュー・コマンド宣言は[repository-context.md](../.ciras/repository-context.md)を読んでください。

## 役割と本番の境界

AIは目的・依頼範囲を保ち、制作・実装・修正・必要な検証を完成させます。通常の公開・merge・送信は、同一固定版・当該操作に必要な検証/正式レビュー・有効な承認・実権限/既存の適格経路・副作用が一致した範囲でAIが実行・読戻しまで行います。承認だけで権限や検証成功が成立したとは扱いません。push/PRで起きる公開preview・workflow・外部送信も、この照合に含めます。初期設定・有効な保護の適用とrepo固有の本人専用操作は、承認後も杉本本人が実行します。既存の保護や自動化を勝手に解除・停止しません。

本人専用操作には[引継ぎの型](./OWNER_HANDOFF.md)を使い、変更前後、目的、完全版、検証結果と未確認、実行主体、対象、公開・送信・費用・データ等の副作用、手順、確認方法、復元方法をそろえます。通常の公開等で新たな承認が必要な場合も同じ判断材料を示します。有効な同一承認を聞き直さず、本人作業を待つ間も独立した通常作業を進めます。

## 候補の固定版

- 意図する正本repo：Ciras-Inc/ciras-os
- 既存実装の参照commit：`500db22a50d493566cde9c1617355cec5156134b`（新しいR2.2候補のcommitではありません）
- 元生成bundle SHA-256（今回の追加改訂を含まない来歴）：`cbef01c9d990041059f0aedad05c7b834058a436508e8483ba4cf2eadf58ac6d`
- 新候補source commit：未発行（null）
- 元生成器：`1.1.0`（今回の追加改訂は生成後の明示patch）
- 追加改訂の固定記録：`.ciras/execution-alignment-revision.json`（直前候補と変更前後のhash）
- 対象：`Ciras-Inc/line-harness-oss`
- 既定branchの基準記録：`main`
- 配布台帳：`.ciras/governance-release.yaml`
- 出力照合：`.ciras/ai-settings-manifest.json`

元生成bundleと今回の追加改訂を合わせた現出力はmanifestで固定しています。元bundleのhashを現在の全文との一致や採用の証拠にはしません。候補の内容は固定済みですが、GitHub配布・杉本の本番実行・実製品での有効化は未実施です。ローカルのhashは本人承認や実権限の証明ではありません。元commitの名義で新候補を配布せず、実際に正本を採用する段階で固定版・反映先・実行主体と受領記録を結び付けます。

## 静的確認と実製品確認

`node .ciras/verify-ai-settings.mjs --root . --expected-repository Ciras-Inc/line-harness-oss` は構成・型・対象・hashの静的確認です。配布検査には別途固定した検査器、manifest hash、source bundle hash、配布先から独立に確定したrepo名を使います。検査中に変更されない隔離checkoutを使い、ローカル検査器だけで改ざん耐性や承認を主張しません。

JSONは共通判断の正本で、全製品共通の実行hookではありません。Claude Code・Cursor・Codexの読込、trust、権限、許可/拒否は各実行面で合成データを使って別に確認します。未検証の危険操作だけを保留し、非機密の通常作業は継続します。新しいnative設定・MCP・hook・ワークフローで既存設定を上書きしません。

## 適用と復元

既存の必須チェック・レビュー資格/人数・本人実行条件を維持します。静的合格と正式レビュー合格は別です。採用前の対象commitは`74e11182528e0a2d0ab9896a4ef1337d5a924b31`。適用後に戻す場合は変更範囲を限定したrevert PRと検証を準備し、杉本本人が既存の保護経路で実行します。force pushを使わず、公開・送信・DB・共有の復元をGit revertだけで完了したとしません。

この候補の直前版はGitHub commitではなく、隔離保存されたR2.2候補である。`.ciras/execution-alignment-revision.json`のparent_candidate_local_*がその固定値、observed_pr_headが今回読取り照合した既存R2.1 PR headを表す。両者を同一の版として扱わない。完成版の本人作業は[固有引継ぎ](./OWNER_LOCAL4_HANDOFF.md)を参照する。
