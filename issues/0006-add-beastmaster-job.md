# 魔獣使い（BST）ジョブを追加する

- Priority: Medium
- Created: 2026-09-03
- Completed: {YYYY-MM-DD}
- Model: Composer
- Branch: feature/add-beastmaster-job
- Polished: {YYYY-MM-DD}

## 目的

パッチ 7.56 で実装される限定ジョブ「魔獣使い / Beastmaster（略称 `BST`、ClassJob ID `43`）」をジョブ選択・ Canvas 表示・ジョブ別スキル一覧の対象に加える。既存ジョブと同じく白塗り SVG と枠付き PNG を用意し、ローテーション図作成を開始できるようにする。

## 優先度根拠

新ジョブ追従は本ツールの主要価値だが、ゲーム内ジョブ実装（7.56）前でもデータ・アイコンはクライアントに先行投入済みであり、UI 側の準備を進める価値がある。致命障害ではないため Medium とする。

## 現状

- ジョブ定義は `src/data/jobs.ts`（`jobs` Record + `tanks` / `healers` / `melee` / `physRanged` / `casters`）
- Job 選択 UI は `src/components/Header/JobSelect.tsx`（ロール配列を列挙）
- Canvas タイトル横のジョブマークは `job.icon`（SVG）。選択 UI は `job.borderedIcon`（PNG）
- ジョブ略称は `src/lib/jobs.ts` の `getJobAbbreviation` 経由で XIVAPI の `ClassJobCategory.{略称}` に渡る（`jobActionList`）
- 既存限定ジョブの先例: `BLU` は `casters` 末尾に配置
- 魔獣使いは melee DPS の限定ジョブ（青魔道士と同系統の limited job）
- 確認事実（2026-09-03）:
  - XIVAPI v2: `ClassJob/43` → `Abbreviation: BST` / `Name_ja: 魔獣使い` / `Name: beastmaster`
  - `062100 + ClassJobID` の枠付きスロットは存在するが、**`062143_hr1.png` は魔獣使いのジョブマークではない**（汎用の人物シルエットのプレースホルダ）
  - 対照: `062141` = ヴァイパー、`062142` = ピクトマンサー、`062136` = 青魔道士。スロット番号の対応と「中身が本物のジョブマークか」は別問題
  - Soul Crystal `Item/47474` は Name / Icon とも空（`Icon id: 0`）
  - `ClassJobCategory` に `BST` カラムはまだ無く、DoW 行は `Unknown0`〜`Unknown2` のみ
  - Companion / 既存コミュニティ SVG パックにも未掲載
- 関連: XIVAPI 正式 v2 移行は `issues/0005-change-migrate-xivapi-client-to-v2.md`（本 issue の必須依存にはしない）

## 設計方針

### ジョブ定義

- `src/data/jobs.ts` に `BST` を追加する

```ts
BST: {
    id: 43,
    name: "Beastmaster",
    nameJa: "魔獣使い",
    icon: "/job-icons/bst.svg",
    // 枠付き PNG のファイル名は、公式ジョブマーク特定後に決める
    borderedIcon: "/job-icons/bordered/<正式アイコン>.png",
},
```

- ロール配列は `melee` に追加する（限定ジョブだがロールは近接物理）
- `JobSelect` はロール配列参照のため、配列更新で選択 UI に載る想定

### アイコン（実装者が自ら作成・配置すること）

コミュニティ SVG の到着待ちや外部委託に頼らない。ただし **`062143_hr1.png` を魔獣使いアイコンとして使ってはならない**。

1. **公式ジョブマークの特定（ブロッカー）**
   - ゲームクライアント / XIVAPI CDN 上の本物の枠付きジョブアイコン、または PLL・FanFest・Lodestone 等の公式素材から、魔獣使い固有のマークを特定する
   - プレースホルダ（`062143` の人物シルエット等）や無関係アセット（ミニオン枠など）は採用しない
   - 本物が未投入の間は、アイコン作業を開始せず issue をブロック状態のままにする（仮アイコンでマージしない）
2. **枠付き PNG**
   - 特定した正式アイコンを `public/job-icons/bordered/` に配置する（既存ジョブと同パターン。中身が仮なら `*_temp.png` も避け、そもそもマージしない）
3. **白塗り SVG**
   - 正式な枠付きアイコンからジョブマークだけを切り出し、トレースして SVG 化する
   - 既存の Canvas 用アイコンに合わせる
     - `fill="white"`（または同等の単色塗り）
     - 背景なし
     - 可能なら `viewBox` を正方形寄りに揃える（他ジョブは多くが `0 0 512 512`）
   - 配置先: `public/job-icons/bst.svg`
   - 先例: `pct.svg` / `vpr.svg` も PNG からのトレース由来。自動トレース後はパスの汚れを手直しする

### スキル一覧

- `fetchJobActions` は略称 `BST` で `ClassJobCategory.BST=true` を叩く既存経路をそのまま使う想定
- 現状 `ClassJobCategory` に `BST` が無いため、パッチ投入 / XIVAPI 反映までは取得 0 件やクエリ失敗があり得る。空表示は既存の `jobActionListEmpty` で足りるなら追加 UI は不要
- ClassJobCategory に `BST` が無い / 検索が失敗する場合は、XIVAPI 側の鮮度（`0005`）やクエリを調査してから直す。ジョブ定義・アイコン追加自体のうち、**アイコンは正式マーク特定後にのみ進める**

### スコープ外

- 魔獣使い固有のローテーション仕様（ペット・蛮族関連など）の専用 UI
- XIVAPI v2 移行そのもの（`0005`）
- `VPR` / `PCT` の `*_temp.png` 正式差し替え

## 完了条件

- 魔獣使いの**正式**ジョブマークを特定し、プレースホルダを使っていない
- Job 選択に魔獣使いが表示され、選択できる
- Canvas タイトル横に白塗り `bst.svg` が表示される
- `borderedIcon` に正式な枠付き PNG が表示される
- `getJobAbbreviation` が `BST` を返し、ジョブ別スキル一覧取得がその略称で動く（取得 0 件でもエラーにならない）
- SVG は実装者が正式マークから作成したもので、既存ジョブアイコンと同程度に Canvas 上で識別できる

## 解決方法

1. 公式ソースから魔獣使いジョブマークを特定する（`062143_hr1.png` は使わない）
2. 正式アイコンを `public/job-icons/bordered/` に配置する
3. 同画像からマークをトレースし `public/job-icons/bst.svg` を作成する（白塗り・背景なし）
4. `src/data/jobs.ts` に `BST` 定義を追加し、`melee` 配列に含める
5. Job 選択・ Canvas・ジョブ別スキル一覧を手動確認する
6. スキル取得が API エラーになる場合のみ、クエリ / XIVAPI 側を切り分けて最小修正する
