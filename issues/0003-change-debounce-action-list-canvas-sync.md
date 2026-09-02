# Action List の Canvas 反映にデバウンスと更新中表示を入れる

- Priority: Medium
- Created: 2026-09-02
- Completed: {YYYY-MM-DD}
- Model: Composer
- Branch: feature/change-debounce-action-list-canvas-sync
- Polished: {YYYY-MM-DD}

## 目的

Action List（テキストエリア）を編集するたびに即座にパース・ Canvas 再描画が走り、入力中に XIVAPI 呼び出しと Canvas 更新が過剰に発生している。入力が落ち着いてから Canvas に反映するデバウンスを入れ、反映処理中はユーザーに「更新中」であることが分かる表示をする。

## 優先度根拠

編集体験と性能に直結するが、機能欠落ではない。Action List を手入力する利用者に影響が大きいため Medium とする。

## 現状

- Action List の `TextArea` は `onChange` のたびに `parseRotation` を呼ぶ（`src/components/Abilities/Abilities.tsx`）
- `parseRotation` は `setRotationText` 後、即 `applyParsedRotation` を実行（`src/components/Home.tsx`）
- `applyParsedRotation` → `textToRotation` は行ごとに `getActionByID`（XIVAPI）を await する非同期処理（`src/lib/parseRotation.ts`）
- デバウンスは未実装。1 キー入力ごとにパース + Canvas 用 state 更新が走る
- 更新中であることを示す UI はない（`rotationInputError` のエラー表示のみ）
- 参考: Action 検索の `SearchInput` は lodash `debounce`（500ms）を使用（`src/components/Abilities/SearchInput.tsx`）

## 設計方針

### デバウンス

- Action List のテキスト編集に対する `applyParsedRotation` の呼び出しをデバウンスする
- テキストエリアの表示（`rotationText`）は入力に追従させ、Canvas 反映（`rotation` / `prepullRotation`）だけを遅延させる
- Action Builder からの追加（`addAction`）は従来どおり即時反映とする（プログラム更新はデバウンス対象外）
- デバウンス時間は定数化（例: 300〜500ms。`SearchInput` と揃えるかは実装時に判断）
- 連続入力時のレース対策: 古いパース結果で Canvas を上書きしない（リクエスト世代 ID や Abort 相当の打ち切り）

### 更新中表示

- デバウンス待ち + パース実行中を「Canvas 反映中」とみなし、ユーザーに可視化する
- 表示場所の候補: Canvas 上のオーバーレイ、Action List 付近、または Canvas 幅バー付近（実装時にレイアウトを選ぶ）
- 反映完了で非表示。パース失敗時は既存の `rotationInputError` と併用
- i18n 対応（`en.ts` / `ja.ts`）

## 完了条件

- Action List を連続入力しても、キー入力のたびに Canvas 再描画・ XIVAPI 全件パースが走らない
- 入力停止後、デバウンス経由で 1 回 Canvas に反映される
- Canvas 反映の待ち・実行中、ユーザーに更新中であることが分かる
- Action Builder からの追加は従来どおり即時 Canvas に反映される
- 言語切替時の再パース（`locale` 変更）も、必要なら debounce / 更新中表示と整合する
- ビルドが通り、Action List 編集 → Canvas 表示・エクスポートが従来どおり動作する

## 解決方法

1. `Home.tsx` で Action List 由来の `applyParsedRotation` 呼び出しを debounce 化（lodash 等、既存依存に合わせる）
2. `rotationText`（入力表示）と `rotation` / `prepullRotation`（Canvas 用）の更新タイミングを分離
3. `isParsingRotation`（または同等）state を追加し、debounce 待ち・パース中を管理
4. Canvas またはその近傍に更新中 UI を追加（`Home` から props で渡す）
5. パース完了・エラー・キャンセル時に更新中 state を確実に解除
6. 文言キーを `messages/en.ts` / `ja.ts` に追加
