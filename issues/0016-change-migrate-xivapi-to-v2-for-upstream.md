# hintxiv/mint-leaf に XIVAPI v2 移行を取り込む

- Priority: High
- Created: 2026-09-04
- Completed: {YYYY-MM-DD}
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

## 完了条件

- upstream 側で XIVAPI 呼び出しが v2 に切り替わっている
- Action / Status の名前検索が取得でき、アイコン表示が破綻しない
- ジョブ別スキル一覧が取得でき、既存のアクション選択フローに合流する
- v2 移行に伴う型・値の差分が呼び出し側に波及していない（コンパイルが通る）

## 解決方法

1. `src/app/api/xivapi/xivapi.ts` の XIVAPI ベース設定を v2 に切り替え、v2 asset へのアイコン変換を反映する
2. `src/app/api/xivapi/actionSearch.ts` / `statusSearch.ts` / `jobActionList.ts` が `xvapi.ts` 側の変換関数と整合するよう更新する
3. upstream の呼び出し側（`JobActionList` 等）が期待する戻り値と icon 型を満たしていることを確認する
4. 手動確認として、主要 UI でジョブ切替・アクション検索・一覧取得・選択が従来どおり動くことを検証する

