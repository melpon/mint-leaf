# XIVAPI クライアントを正式な v2 に移行する

- Priority: Medium
- Created: 2026-09-03
- Completed: {YYYY-MM-DD}
- Model: Composer
- Branch: feature/change-migrate-xivapi-client-to-v2
- Polished: {YYYY-MM-DD}

## 目的

ゲームデータ取得を公式の XIVAPI v2（`https://v2.xivapi.com`）に揃え、シートの鮮度と長期安定性を確保する。legacy v1 の一覧が古い（例: ClassJob が PCT 止まりで魔獣使い `BST` が欠ける）一方、v2 には既に載っているデータがあり、クライアント基盤を v2 に寄せないと新ジョブ・新コンテンツ追従が破綻する。

## 優先度根拠

現行の `beta.xivapi.com/api/1` 経由の Action / Status 検索・ジョブ別一覧は動作しているため、即時障害ではない。ただし正式ドキュメント・ピン留め（`version` / `schema`）・シート鮮度は v2 側が正であり、今後のジョブ追加（魔獣使い等）の前提になるため Medium とする。

## 現状

- API クライアントは `src/app/api/xivapi/xivapi.ts` で `prefixUrl: 'https://beta.xivapi.com/api/1'` を使用
- 利用エンドポイント:
  - `search`（名前検索・ジョブ別 Action 一覧の全件取得）
  - `sheet/{sheet}/{id}`（ID 指定取得）
- 呼び出し元:
  - `src/app/api/xivapi/actionSearch.ts`
  - `src/app/api/xivapi/statusSearch.ts`
  - `src/app/api/xivapi/jobActionList.ts`
- アイコン URL は `convertBetaIconPath` で `https://xivapi.com/i/...png` に変換（CDN 側は別系統）
- 公式 v2 ドキュメント: `https://v2.xivapi.com/docs/migrate/`
  - v1 との後方互換はない
  - 用語は content/indexes → sheets、column → field
  - スキーマは EXDSchema。配列フィールド指定は `Array[].Field`
  - `version` / `schema` のピン留めが可能（`Ensuring Stability`）
- 確認事実（2026-09-03）:
  - legacy `https://xivapi.com/ClassJob` の一覧は ID 42（PCT）まで
  - v2 `https://v2.xivapi.com/api/sheet/ClassJob/43` は `Abbreviation: BST` / `Name_ja: 魔獣使い` を返す
  - なお `062143_hr1.png`（`062100 + ClassJobID`）はスロット上存在するが、中身は魔獣使いのジョブマークではなくプレースホルダである（アイコン特定は `0006` 側の課題）

## 設計方針

- `xivapi.ts` の `prefixUrl` を `https://v2.xivapi.com/api`（または公式が示す v2 ベース）へ切り替える
- 移行ガイドに従い、search / sheet のクエリ・レスポンス差分を吸収する
  - 既存の `row_id` / `fields` / `next`（cursor）前提が v2 と一致するか検証し、差分があればアダプタ側で吸収する
  - `fields=` の配列記法など、必要ならクエリ組み立てを更新する
- 安定性のため、取得時にレスポンスの `version` / `schema` を扱い、可能ならピン留め方針を決める（現行 `jobActionList` は既にメタデータとして保持）
- アイコン CDN（`xivapi.com/i/...`）はゲームテクスチャ配信であり、本 issue の必須スコープ外とする。パス変換が壊れる場合のみ最小修正する
- ClassJob をアプリ側で動的参照する機能追加（魔獣使いの UI 追加など）は本 issue に含めない。本 issue はクライアント基盤の v2 移行に限定する

## 完了条件

- XIVAPI 呼び出しのベース URL が正式 v2 になっている
- 既存機能が同等に動作する
  - Action / Status の名前検索
  - ID 指定取得（`getObject`）
  - ジョブ別 Action 一覧（`fetchJobActions` / `xivapiSearchAll`）
- v2 上で ClassJob シート（少なくとも ID 43 `BST`）を取得できることを、クライアント経由または同等の呼び出しで確認できる
- 破壊的な API 差分がある場合は、呼び出し側の型・マッピングが追従している

## 解決方法

1. [Migrating to V2](https://v2.xivapi.com/docs/migrate/) と Sheets / Search / Pinning ガイドを読み、現行 `beta.xivapi.com/api/1` との差分を洗い出す
2. `src/app/api/xivapi/xivapi.ts` の `prefixUrl` と search / sheet 呼び出しを v2 に合わせる
3. `actionSearch.ts` / `statusSearch.ts` / `jobActionList.ts` でレスポンスマッピングを確認・修正する
4. ブラウザ上で名前検索・ジョブ別一覧・ID 解決を手動確認する
5. 必要なら `version` / `schema` の取り扱い（ピン留め有無）をコードとコメントで明示する
