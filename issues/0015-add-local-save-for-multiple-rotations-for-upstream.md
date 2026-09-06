# hintxiv/mint-leaf に複数ローテーションのローカル保存を追加する

- Priority: Medium
- Created: 2026-09-04
- Completed: 2026-09-06
- Model: GPT-5.6
- Branch: feature/add-local-save-for-multiple-rotations
- Polished: {YYYY-MM-DD}

## 目的

複数のローテーションをブラウザの localStorage に保持し、切替・再編集できるようにする。

## 優先度根拠

継続利用時の利便性を大きく向上させるが、既存の単一編集フローでも最低限の利用は可能であるため Medium とする。

## 現状

- 既存構成では保存の粒度が限定的で、複数案を並行管理しづらい
- fork 側には複数ローテーション管理機能があるが、upstream へ出すには仕様の明確化が必要

## 設計方針

- localStorage に作品集合と active レコードを保持する
- 既存の保存データがある場合は読み込み互換を壊さない
- import / export と干渉しないようデータ境界を分離する
- クリップボード用 JSON の `format` / `version` を固定し、互換性を維持する

## 作業時の注意事項

- この issue は hintxiv/mint-leaf への PR を前提とし、upstream の実装方針と命名を尊重すること
- コミットメッセージ、PR 本文、コードレビュー上のコメントは英語で記載すること
- 既存機能（エクスポート、編集、並び替え、既存保存データ読込）を壊さないこと
- 作業は `_working/mint-leaf` 配下で `main` からブランチを切って行うこと

## スコープ外

- UI 全体レイアウトの改修
- ローテーション描画ロジック（多段表示）の変更
- ブランド名称変更

## 完了条件

- 複数ローテーションを保存し、一覧から切替できる
- ページ再訪時に active レコードを復元できる
- 既存の import / export と競合しない
- 既存保存データ互換が維持される
- `format` / `version` の検証により、既存 import に対して安全に動作する

## 解決方法

1. `_working/mint-leaf` の `feature/add-local-save-for-multiple-rotations` で、複数ローテーションの localStorage 保存・読込と Library パネル（切替・新規・削除・並び替え・コピー／貼り付け）を実装した
2. 保存スキーマに `STORE_VERSION` と段階マイグレーション枠を用意し、壊れた JSON や未知バージョンは空ライブラリへ作り直す耐性を入れた。クリップボード用 JSON は `format` / `version` 付きでストレージとは分離し、レコードパースは共有した
3. hintxiv/mint-leaf への PR https://github.com/hintxiv/mint-leaf/pull/15 が 2026-09-06 にマージされた
