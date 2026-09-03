# hintxiv/mint-leaf に XIVAPI v2 移行を取り込む

- Priority: High
- Created: 2026-09-04
- Completed: 2026-09-04
- Model: GPT-5.6
- Branch: feature/change-migrate-xivapi-to-v2
- Polished: {YYYY-MM-DD}

## 目的

hintxiv/mint-leaf の upstream main が使用している XIVAPI クライアント（v1 系）を、working 側で実装済みの XIVAPI v2 クライアントに移行する。

これにより、ジョブ・アクション等の取得鮮度と安定性を確保し、後続の UI / 機能追加（日本語 i18n、ローテーション表示、パレット、ローカル保存）を upstream 側でも正しく動作させる。

## 優先度根拠

API 基盤の差し替えは後続機能の前提になり、ここがズレると複数 PR が同時に破綻し得るため High とする。

## 現状

- upstream 側は XIVAPI v1 系（beta 経由）を使用している
- working 側では XIVAPI v2（`https://v2.xivapi.com`）へ移行した実装が存在し、アイコン URL 変換も v2 asset 経由になっている

## 設計方針

- upstream が期待する API 呼び出しの形（`src/app/api/xivapi/*` の公開関数と返却型）を維持しつつ、内部の XIVAPI ベース URL とクエリ/レスポンス扱いを v2 に合わせて差し替える
- アイコン URL は v2 asset 経由に変換し、既存の `next/image` 利用や表示ロジックが動くことを優先する
- language 指定や placeholder アイコン ID、並び順など、既存の挙動差分が出ないよう注意する

## 作業時の注意事項

- これは hintxiv/mint-leaf に対する PR を前提とし、upstream の実装方針・命名・構造を尊重すること
- コメントやコミットなど、コードレビューに残る情報は英語で記載すること
- 既存機能を壊さないこと（アクション検索、ステータス検索、ジョブ別スキル一覧、アイコン表示）
- 作業は `_working/mint-leaf` 配下で `main` からブランチを切って行うこと

## スコープ外

- 日本語 i18n の追加改修
- UI レイアウト変更
- ローテーション多段レイアウト追加
- 選択ジョブのパレット表示
- 複数ローテーションのローカル保存
- ジョブ別スキル一覧（`jobActionList` / UI）の追加（0014 側）

## 完了条件

- upstream 側で XIVAPI 呼び出しが v2 に切り替わっている
- Action / Status の名前検索が取得でき、アイコン表示が破綻しない
- v2 移行に伴う型・値の差分が呼び出し側に波及していない（コンパイルが通る）

## 解決方法

1. `_working/mint-leaf` の `feature/change-migrate-xivapi-to-v2` で、`xivapi.ts` の `prefixUrl` を `https://v2.xivapi.com/api` に切り替えた
2. `convertBetaIconPath` を `convertIconPath` に置き換え、アイコンを v2 asset PNG URL に変換するようにした
3. `buildActionSearchQuery` / `buildStatusSearchQuery` でプレースホルダ Icon id `405` を検索クエリから除外した
4. 公開関数のシグネチャは維持した（`language` 引数は付けない）
5. もともと `ky` を import していたが `package.json` 未記載だったため、ローカルで動かすために `"ky": "1"` と `yarn.lock` を追加した（v2 API 自体の要件ではない）
6. `yarn build` と v2 の search / sheet / asset 応答を確認した。コミットは `af3b86d`
