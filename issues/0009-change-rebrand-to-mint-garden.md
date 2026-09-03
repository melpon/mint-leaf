# ブランドを Mint Garden に変更する

- Priority: Medium
- Created: 2026-09-03
- Completed: {YYYY-MM-DD}
- Model: Composer
- Branch: feature/change-rebrand-to-mint-garden
- Polished: {YYYY-MM-DD}

## 目的

本リポジトリを元 Mint Leaf（hintxiv / The Balance 配下）から独立したサイトとして運用するため、ユーザー向けブランド名を **Mint Garden** に統一する。出自は隠蔽せず、README および UI に Based on Mint Leaf のクレジットを残す。

## 優先度根拠

別サイト運用の前提となる表向きの帰属整理である。機能追加より先に名前とクレジットを揃えないと、公式 Mint Leaf との混同や「盗用」誤解が残る。致命障害ではないため Medium とする。

## 現状

- 表示名が Mint Leaf のまま
  - `src/app/layout.tsx` の `title`
  - `src/messages/en.ts` / `ja.ts` の `meta.title`
  - `src/components/TopBar/TopBar.tsx` でタイトル文字列が `'Mint Leaf'` 直書き（i18n 未使用）
- ロゴ・ファビコンが単葉モチーフ
  - TopBar: `public/leaf-icon.svg`（ミント色 `#aaf0d1` の葉 1 枚）
  - `layout.tsx` / README: `public/favicon.ico`（README は upstream の raw URL を参照）
- `package.json` / `package-lock.json` の `name` が `mint-leaf`
- README 見出し・説明が Mint Leaf のまま。Based on クレジット無し
- localStorage / 作品テキストの内部キーは `mint-leaf-*`
  - `mint-leaf-locale` / `mint-leaf-custom-actions` / `mint-leaf-job-actions` / `mint-leaf-rotations`
  - 作品 JSON の `format: mint-leaf-rotation`（`src/lib/rotationRecordText.ts`）
- フッター文言にクレジット用キーは無い（`footer.export` のみ。旧 Balance 削除済み）

## 設計方針

### ブランド

- ユーザー向け名称はすべて **Mint Garden**（日本語 UI でも英名のままでよい。必要なら副題だけ日本語）
- 公式 Mint Leaf / The Balance 非所属であることを明示する
- クレジット例（文言は実装時に i18n 化）:
  - `Based on Mint Leaf by hintxiv`
  - 可能なら元リポジトリへのリンクを README に置く

### 表示・ドキュメント（必須）

- `meta.title` / `layout` の document title / TopBar タイトルを Mint Garden に変更する
- TopBar の直書きをやめ、`t('meta.title')` 等の i18n に寄せる
- `README.md` を Mint Garden 向けに書き換える
  - 見出し・説明
  - ロゴ画像は本リポジトリのアセットを指す（upstream raw URL をやめる）
  - Getting Started は現状の手順を維持しつつ、必要なら package manager 表記を実態に合わせる
  - Based on Mint Leaf セクション（または同等の一文）を追加する
- `package.json` の `name` を `mint-garden` に変更する（lockfile も追随）

### ロゴ・ファビコン（必須）

- 「葉 1 枚」から「ミントが生い茂った庭」のイメージへ更新する
- 置き換え対象: `public/leaf-icon.svg`（または新ファイル名に差し替えて TopBar 参照を更新）、`public/favicon.ico`
- 画像生成ツールや手編集で作成してよい。扁平・識別しやすいアイコン向き（TopBar 32px・ファビコン）を優先する
- 旧 `leaf-icon.svg` を残す必要は無い（参照が無ければ削除）

### 内部識別子（互換）

- **作品テキストの `format` 値**は互換のため当面 `mint-leaf-rotation` を維持する。変更する場合は import 時に旧 format も受理すること
- localStorage キーは次のいずれか一方に決めて実装する
  1. **維持**: ユーザー向けブランドと切り離し、`mint-leaf-*` のまま（移行コストなし）
  2. **改名**: `mint-garden-*` にし、初回読込で旧キーから移行（または新旧どちらも読む）
- 推奨: 表示・README・package 名を優先し、ストレージは (1) 維持か (2) 移行付き改名。黙ってキーだけ変えて既存データを消さないこと

### スコープ外

- ドメイン取得・ホスティング設定そのもの
- 元作者への連絡（推奨だが本 issue の完了条件にはしない）
- 機能追加や UI 大規模改修
- GitHub リポジトリ名の変更（必要なら別作業。本 issue ではコード・ドキュメント上のブランドを対象とする）

## 完了条件

- ブラウザのタブタイトル、TopBar、i18n のプロダクト名が Mint Garden になっている
- TopBar / ファビコンが庭モチーフの新ロゴになっている
- README が Mint Garden を名乗り、Based on Mint Leaf のクレジットがある
- `package.json` の `name` が `mint-garden` である
- 画面上に「公式 Mint Leaf である」と誤解される単独表記が残っていない
- 既存の localStorage / 作品テキスト互換について、方針どおりデータ消失が起きない

## 解決方法

1. i18n と `layout.tsx` / TopBar の表示名を Mint Garden に更新する
2. クレジット用の文言キーと表示箇所（README 必須。UI はフッターまたは TopBar 付近の控えめな一文）を追加する
3. Mint Garden 向けロゴ・ファビコンを作成し、参照を差し替える
4. README を書き換え、upstream favicon URL 依存をやめる
5. `package.json` / lockfile の `name` を更新する
6. ストレージキー方針を確定し、必要なら移行処理を入れる（作品 `format` は互換を壊さない）
7. トップページ表示・言語切替・既存保存データの読み込みを手動確認する
