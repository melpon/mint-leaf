# ジョブ別スキル一覧を XIVAPI から取得し Action Builder で選べるようにする

- Priority: Medium
- Created: 2026-09-02
- Completed: {YYYY-MM-DD}
- Model: Composer
- Branch: feature/add-job-action-list-from-xivapi
- Polished: {YYYY-MM-DD}

## 目的

Action Builder でスキルを 1 個ずつ XIVAPI 検索しなくても、選択中ジョブで使える PvE スキル（可能ならロールアクションを含む）を一覧から選べるようにする。XIVAPI への負荷を抑えるため、取得結果はローカルにキャッシュし、必要なときだけ手動で再取得できるようにする。

## 優先度根拠

ローテーション作成の主要 UX 改善であり、利用頻度が高い。ただし既存の名前検索は当面残せるため、新機能追加として Medium とする。

## 現状

- Action Builder は `SearchInput` による名前検索のみ（`src/components/Abilities/ActionSelect.tsx` → `SearchInput.tsx`）
- XIVAPI 検索は入力ごとにクライアントから呼び出し、最大 10 件（`src/app/api/xivapi/xivapi.ts` の `MAX_SEARCH_RESULTS`）
- `SearchInput` は `job` prop を受け取るが、検索クエリには未使用
- ジョブ定義は `src/data/jobs.ts`（略称キー `DRK` / `BLM` 等、表示名・ ClassJob ID）
- 既存の localStorage 利用例は `src/lib/customActionsStore.ts`（カスタムアクション保存）

## 設計方針

### XIVAPI 取得

調査結果（BLM 例、`IsPvP=false`、日本語）:

| クエリ | 件数 | 備考 |
|---|---:|---|
| `ClassJobCategory.BLM=true` のみ | 852 | 名前空・ Lv0 の敵/NPC/イベント技などが大量に混入。そのままでは使えない |
| `ClassJob.Abbreviation="BLM"` のみ | 22 | BLM 固有スキルのみ。基礎呪文・ロールアクションが漏れる |
| `ClassJobCategory.BLM=true` + `IsPlayerAction=true` | 38 | プレイヤー向けとして妥当（迅速魔・堅実魔等のロールアクション含む） |

- 対象シート: `Action`（PvE。`IsPvP=false` で PvP 版を除外）
- 検索クエリ（例）:

```text
+ClassJobCategory.BLM=true +IsPvP=false +IsPlayerAction=true
```

- ジョブ絞り込み: `+ClassJobCategory.{略称}=true`
  - ジョブ固有スキルに加え、迅速魔のようなロールアクションも含める（`ClassJob.Abbreviation` だけではロールアクションが漏れる）
- **必須フィルタ**: `+IsPlayerAction=true`
  - `ClassJobCategory` 単体ではノイズが多すぎるため、API クエリ段階で付ける
- 取得フィールド例: `Name`, `Icon`, `ClassJobLevel`, `ClassJobCategory`, `IsPvP`, `IsPlayerAction`
- ページング: search の `cursor` / `next` で全件取得（1 リクエストあたりの `limit` は XIVAPI 側上限に合わせる）
- 後処理:
  - プレースホルダーアイコン（既存 `buildActionSearchQuery` と同様 `Icon=405` 相当）を除外
  - `row_id` で重複排除
  - 表示順は `ClassJobLevel` 昇順 → 名前（ロケール順）など、一覧として分かりやすい順

#### BLM + `IsPlayerAction=true` で取得できるスキル例（38 件）

基礎呪文・ジョブスキル・ロールアクションが含まれる。実装時の期待値の目安とする。

```
ブリザド, ファイア, トランス, サンダー, アドル, スリプル, ブリザラ, ルーシッドドリーム,
コラプス, ファイラ, 迅速魔, サンダラ, マナフォント, マバリア, アンブラルソウル, ファイガ,
ブリザガ, フリーズ, 堅実魔, サンダガ, エーテリアルステップ, フレア, 黒魔紋, ブリザジャ,
ファイジャ, ラインズステップ, サンダジャ, 三連魔, ファウル, デスペア, ゼノグロシー,
ハイファイラ, ハイブリザラ, アンプリファイア, ハイサンダー, ハイサンダラ, 魔紋再設置, フレアスター
```

#### 意図的に含まれない（または別扱い）もの

- **スプリント / テレポ / デジョン** 等: `ClassJobCategory` にはヒットするが `IsPlayerAction=false`（Lv0・全クラス系）
- ローテーション図に載せる需要が低ければ初版では除外してよい。載せたい場合は別クエリまたは固定 ID で追加する

### キャッシュ

- 保存先: ブラウザ `localStorage`（既存 `customActionsStore` と同様のクライアント側パターン）
- キャッシュキー: ジョブ略称 + ロケール（`en` / `ja`）を含める（名前が言語依存のため）
- TTL: 例として 7 日（実装時に定数化。パッチ直後の再取得需要と負荷のバランス）
- エントリに含めるメタデータ: 取得日時、XIVAPI `version` / `schema`（レスポンスに含まれる場合）、アクション配列
- 有効期限内はキャッシュを即表示。期限切れはバックグラウンド再取得または次回手動更新まで stale 表示のどちらかを実装時に決める（手動更新ボタンは必須）

### 手動再読み込み

- Action Builder 付近に「スキル一覧を再取得」等の UI を用意
- 押下時は TTL を無視して XIVAPI から再取得し、キャッシュを上書き
- 取得中はローディング表示、失敗時はエラー表示（キャッシュがあれば前回結果を維持）

### UI

- ジョブ変更時（Header の Job 選択）に、そのジョブの一覧を表示
- 一覧から 1 件選ぶと、既存 `ActionBuilder` フロー（GCD / oGCD 設定 → 追加）に合流
- 既存の名前検索・カスタムアクション入力は残す（一覧は追加の選択手段）
- 件数が多いジョブ向けに、一覧内フィルタ（テキスト絞り込み）があるとよい

## 完了条件

- 選択中ジョブの PvE スキル一覧が Action Builder から選べる（`IsPlayerAction=true` 等でノイズ除去済み）
- キャスター等で迅速魔・堅実魔・ルーシッドドリームなど、当該ジョブが使えるロールアクションが一覧に含まれる
- タンク等でランパート・ロウブロウ・挑発など、当該ジョブが使えるロールアクションが一覧に含まれる（他ジョブも同様に `IsPlayerAction=true` で取得）
- 同一ジョブ・同一ロケールで TTL 内の再訪問時、XIVAPI へは再取得しない（手動更新時を除く）
- 手動再読み込みでキャッシュを更新できる
- ジョブ切替・言語切替で適切な一覧（またはキャッシュ）が表示される
- ビルドが通り、一覧選択 → ローテーション追加が従来どおり動作する

## 解決方法

1. `src/app/api/xivapi/` にジョブ別 Action 一覧取得関数を追加（`ClassJobCategory` + `IsPvP=false` + `IsPlayerAction=true`、cursor ページング、後処理フィルタ）
2. `src/lib/` に job action キャッシュ用 store を追加（get / set / invalidate / TTL 判定）
3. ジョブ略称 ↔ `ClassJobCategory` フラグ名の対応を `jobs.ts` または専用マップで定義（キー `DRK` 等をそのまま使える想定）
4. Action Builder 用の一覧 UI コンポーネントを追加（アイコン + 名前、クリックで `DataAction` を `setCurrentAction`）
5. `ActionSelect` に一覧・再読み込み・ローディング / エラー状態を組み込む
6. i18n（再読み込みボタン、読み込み中、エラー、空一覧など）を `en.ts` / `ja.ts` に追加
7. XIVAPI 呼び出し回数が増えないよう、ジョブ × ロケール単位で取得を 1 回にまとめ、以降はキャッシュのみ参照する
