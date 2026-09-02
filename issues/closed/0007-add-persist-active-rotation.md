# アクティブなスキル回しを localStorage に永続化する

- Priority: High
- Created: 2026-09-03
- Completed: 2026-09-03
- Model: Composer
- Branch: feature/add-persist-active-rotation
- Polished: {YYYY-MM-DD}

## 目的

エディタ上のスキル回しは React state のみで、リロードやタブを閉じると消える。作成中の内容を「下書き専用の別枠」に置くのではなく、**作品レコードの集合 + いま編集中の ID** として localStorage に持ち、再訪時に同じレコードへ復帰できるようにする。

## 優先度根拠

リロードで作業が消えるのは日常利用の障害であり、一覧・テキスト入出力（`0008`）の前提になるため High とする。

## 現状

- エディタ状態は `src/components/Home.tsx` の `useState` のみ（`job` / `rotationTitle` / `expansion` / `patch` / `level` / `prepullRotation` / `rotation` / `wrapWidth` / `rowSpacing`）
- 初期値は毎回デフォルト（ジョブ `DRK`、空シーケンス、`en` / `ja` の `defaults`）
- localStorage は別用途のみ
  - `src/lib/customActionsStore.ts`（`mint-leaf-custom-actions`）
  - `src/lib/jobActionsStore.ts`（`mint-leaf-job-actions`）
  - `src/context/LanguageContext.tsx`（`mint-leaf-locale`）
- 新規作成・作品一覧の UI は無い。`TopBar` の主操作は PNG エクスポートのみ（`src/components/TopBar/TopBar.tsx`）
- `Home` は Client Component。マウント前に `localStorage` を読むと SSR / ハイドレーションと食い違う

## 設計方針

作成中の保存は、独立した下書きスロットではなく **アクティブな作品レコードへの書き戻し** とする。

- ストレージは作品レコードの辞書と `activeId` を 1 キーで持つ（キー名は既存の `mint-leaf-*` に合わせる。キャッシュキーとは別にする）。本 issue の UI はアクティブ 1 件の復元だけだが、スキーマは最初から複数レコードを持てる形にする（`0008` が一覧・新規・削除を載せるため）
- 各レコードはエディタが再現できる一式を持つ
  - `id`
  - タイトル（MetaBar の Rotation Title）
  - ジョブ（`jobs` のキーである略称）
  - `expansion` / `patch` / `level`
  - `wrapWidth` / `rowSpacing`
  - `prepullRotation` / `rotation`（`Action` は JSON 可能な形。`imageSrc` は文字列）
- `activeId` が「いま編集中のレコード」を指す。エディタの変更はアクティブなレコードへ書き戻す
- 初回（レコードが無い）は空のレコードを 1 件作って `activeId` にする
- 起動時は `activeId` のレコードで `Home` の state を復元する。不明なジョブ略称は既存どおり `DRK` に落とす
- 破損・パース失敗時は空のレコードを作り直して続行する（アプリを壊さない）
- 復元はマウント後（`useEffect`）で行い、SSR との不一致を避ける
- 書き込み失敗（容量超過など）は既存ストアと同様に握りつぶさず、ログは英語で残す。UI 通知の詳細は実装時に最小でよい
- 新規レコード追加（先にアクティブへ書き戻し → デフォルトの新レコードを追加 → `activeId` を切り替える）はストア関数として用意してよい。**新規作成の UI は置かない**（`0008` の左パネルが入口）

### スコープ外

- 新規作成・一覧・削除・テキスト入出力の UI（`0008`）
- `TopBar` への新規作成ボタン
- 共有 URL、ログイン、サーバ保存
- カスタムアクションキャッシュやジョブアクションキャッシュの統合

## 完了条件

- リロード後も、直前まで編集していたスキル回し（メタ + シーケンス + 折り返し）が復元される
- ハイドレーションエラーを起こさない
- 新規作成・一覧・削除の UI を本 issue で追加しない（`TopBar` にも置かない）

## 解決方法

本 issue 単体では実装しない。アクティブなレコードの永続化だけを先行させても、新規・一覧の入口が無いため役割が残らない。永続化・一覧・新規・削除・テキスト入出力は `issues/0008-add-named-rotation-library.md` に統合した。
