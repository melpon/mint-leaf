# GitHub Pages でデプロイする

- Priority: Medium
- Created: 2026-09-03
- Completed: {YYYY-MM-DD}
- Model: Composer
- Branch: feature/add-github-pages-deploy
- Polished: {YYYY-MM-DD}

## 目的

独立サイトとして公開するため、ビルド成果物を GitHub Pages に自動デプロイできるようにする。公開 URL は `https://melpon.github.io/mint-leaf/` とする。

## 優先度根拠

ローカル開発だけでは第三者に触れられず、ブランド整理（`0009`）後の公開先が無い。致命障害ではないため Medium とする。

## 現状

- `.github/` が無く、CI / デプロイワークフローが存在しない
- `next.config.mjs` に `output: 'export'`・`basePath`・`assetPrefix` が無い
- `package.json` の scripts は `dev` / `build` / `start` / `lint` のみ（静的 export 用の明示スクリプト無し）
- XIVAPI 呼び出しは `"use client"` のモジュールから `https://v2.xivapi.com` へ直接行い、Next.js Route Handler に依存しない
- `next/image` を多数のコンポーネントで利用している（静的ホストでは画像最適化サーバーが使えない）
- Discord / next-auth 関連は既に除去済み（`0001`）で、サーバー必須の認証ルートは残っていない想定

## 設計方針

### 公開 URL

- プロジェクトサイト: `https://melpon.github.io/mint-leaf/`
- `basePath` / `assetPrefix` は `/mint-leaf` に固定する（リポジトリ名変更は本 issue のスコープ外）

### Next.js 静的 export

- `next.config.mjs` で `output: 'export'` を有効にする
- `images.unoptimized: true` を設定し、`next/image` が静的ホストで動作するようにする
- 必要なら `trailingSlash` など Pages 向けのパス解決を調整する
- `next start` 前提のサーバー機能（Route Handler・middleware・SSR）に依存しないことをビルドで確認する

### GitHub Actions

- `main` への push（および必要なら workflow_dispatch）でビルド・デプロイする
- 成果物は GitHub Pages の公式デプロイ手段（`actions/upload-pages-artifact` + `actions/deploy-pages` 等）で公開する
- Node のセットアップ・依存インストール・`next build`（export 出力）までをワークフローに含める
- GitHub リポジトリ側の Pages 設定（Source: GitHub Actions）は実装時に README か issue 解決方法に手順を残す

### ドキュメント

- README に公開 URL とデプロイ概要（Actions 経由であること）を追記する
- ローカルで静的出力を確認する手順があれば簡潔に書く

### スコープ外

- カスタムドメイン
- リポジトリ名の変更（`mint-garden` 化）およびそれに伴う `basePath` 変更
- `0009` のブランド名・ロゴ変更そのもの（本 issue はホスト公開に限定）
- CDN や別ホスティングへの移行

## 完了条件

- `main` への push で GitHub Actions が静的ビルドを行い、GitHub Pages に公開される
- `https://melpon.github.io/mint-leaf/` でアプリが開き、アセット（JS / CSS / 画像）が 404 にならない
- 主要操作（ジョブ選択・アクション検索・キャンバス表示・エクスポート）が公開 URL 上で動く
- README に公開 URL が記載されている

## 解決方法

1. `next.config.mjs` に `output: 'export'`・`basePath` / `assetPrefix: '/mint-leaf'`・`images.unoptimized: true` を追加する
2. ローカルで `next build` が成功し、`out/`（または同等の静的出力）が生成されることを確認する
3. `.github/workflows/` に Pages デプロイ用ワークフローを追加する
4. リポジトリの Pages を GitHub Actions ソースに切り替え、初回デプロイを通す
5. 公開 URL でアセットパスと主要操作を手動確認する
6. README に公開 URL とデプロイ概要を追記する
