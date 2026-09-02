# 編集 UI を Canvas 主役・シーケンス GUI 中心に再設計する

- Priority: High
- Created: 2026-09-02
- Completed: {YYYY-MM-DD}
- Model: Composer
- Branch: feature/change-editor-layout-sequence-gui
- Polished: {YYYY-MM-DD}

## 目的

現状の縦積みレイアウトでは Canvas プレビューが小さく、Header / Action Builder 帯が画面を占める。また Action List がテキスト中心で一般ユーザーに分かりにくく、0002（ジョブ別スキル一覧）を足すと UI が破綻する。Canvas を主役にし、シーケンスを GUI で直接編集できるレイアウトへ再設計する。初版は方針どおり実装し、見た目を見てから細部を調整する。

## 優先度根拠

0002 実装前にレイアウトの器がないと機能追加が使い物にならない。ユーザーからの明示的な UI 一新要求。Canvas が製品の成果物であるため、編集画面でもプレビューを十分大きくする必要がある。

## 現状

- `Home` は縦積み: Title（70px）→ Header（200px）→ Abilities（310px）→ CanvasWidthBar → Canvas（残り・`flex-shrink: 1`）→ Footer（50px）（`src/components/Home.tsx`）
- Header に Job（22 アイコン常時表示）・タイトル・Expansion・Patch・Level（`src/components/Header/Header.tsx` / `JobSelect.tsx`）
- Title に言語切替（`src/components/Title/Title.tsx`）
- Abilities は Action Builder（検索）と Action List（テキスト）が横並び（`src/components/Abilities/Abilities.tsx`）
- データフローはテキストがソース寄り: Action List 編集 → `parseRotation` → `textToRotation` → `rotation` / `prepullRotation` → Canvas（`Home.tsx` / `parseRotation.ts`）
- Action Builder からの追加もテキストへ書き戻す（`rotationToText`）

## 設計方針

### 領域分割（初版の骨格）

```
┌─────────────────────────────────────────────────────────┐
│ TopBar: ロゴ / 言語 / Export（Canvas 表示設定もここに寄せ可）│
├─────────────────────────────────────────────────────────┤
│ MetaBar: Job（選択中 + ドロップダウン）/ Title / Expansion │
│          / Patch / Level（コンパクト 1〜2 行）              │
├──────────────────────┬──────────────────────────────────┤
│ EditorPanel（左）     │ CanvasPreview（右・広い）          │
│ ・ジョブスキルパレット │ ・プレビュー本体                   │
│   （0002 の置き場）    │ ・折り返し幅 / 行間隔               │
│ ・シーケンス GUI      │ ・更新中表示（0003 と整合）         │
│ ・選択中の詳細編集    │                                    │
└──────────────────────┴──────────────────────────────────┘
```

### TopBar

- アプリ chrome: Mint Leaf ロゴ・言語・Export
- 言語は Title 右ナビから TopBar へ移す
- 22 ジョブは載せない

### MetaBar（現行 Header の後継）

- Canvas に描くメタ情報の入力: Job・ローテーション名・Expansion・Patch・Level
- Job は選択中 1 アイコン + ドロップダウン（22 個を常時並べない）
- 高さは現行 200px をやめ、コンパクト 1〜2 行（目安 56〜72px）

### EditorPanel

- **ソース・オブ・トゥルースは `Action[]`（および prepull）**。テキストを主入力にしない
- シーケンスを GUI で直接編集する（追加・並べ替え・削除・GCD/oGCD・時間・late weave・prepull・バフ）
- 既存の「Action Builder → Action List テキストへ追記」フローは主経路から外す
- ジョブスキル一覧（0002）はここへパレットとして載せる前提
- テキスト Action List は Import / Export（高度な編集）に格下げ。デフォルト非表示でもよい

### CanvasPreview

- 画面の半分以上を確保する（右ペイン）
- 内部描画解像度はそのまま、ビューポート側で十分大きく見せる

### 既存 issue との関係

- **0002**: 本 issue の EditorPanel にパレットとして載せる。本レイアウトなしで 0002 だけ入れると UI が破綻する
- **0003**: テキストを主入力にしなくなると優先度が下がる。Import 時やテキスト編集を残す場合はそちら向けに残す
- **0001**: Balance / mentor sign in 削除後の TopBar 構成と整合させる

## 完了条件

- Canvas プレビューが現行より明らかに大きく見える（右ペイン等で主領域を占める）
- MetaBar が現行 Header（200px + 22 ジョブ常時表示）よりコンパクトである
- 言語が TopBar にある
- シーケンスを GUI 上で直接編集でき、その結果が Canvas に反映される
- テキスト Action List が主経路ではない（残す場合は Import / Export 等の副経路）
- 0002 のスキル一覧を載せる場所（EditorPanel）がレイアウト上確保されている
- ビルドが通り、エクスポート PNG が従来どおり生成できる

## 解決方法

1. `Home` の縦積みを TopBar / MetaBar / 左右分割（EditorPanel + CanvasPreview）に組み替える
2. Title の言語 UI を TopBar へ移し、Header を MetaBar に縮小（Job はドロップダウン化）
3. `Action[]` を正として編集するシーケンス GUI を追加（並べ替え・削除・プロパティ編集の最小セット）
4. Action Builder / テキスト List を副経路または段階的に縮退（互換のため `rotationToText` / `textToRotation` は Import / Export 用に残す）
5. CanvasWidthBar・Footer の Export を TopBar / Canvas 付近へ再配置
6. 初版を出したうえで見た目・操作性を見て細部を調整する（本 issue の骨格を優先）
