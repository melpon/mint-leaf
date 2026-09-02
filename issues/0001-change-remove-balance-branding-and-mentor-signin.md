# The Balance ブランディングと mentor sign in を削除する

- Priority: Medium
- Created: 2026-09-02
- Completed: {YYYY-MM-DD}
- Model: Composer
- Branch: feature/change-remove-balance-branding-and-mentor-signin
- Polished: {YYYY-MM-DD}

## 目的

Mint Leaf から The Balance 向けのブランディング（ロゴ・リンク・キャンバススタンプ）と、メンター向け Discord サインインを取り除き、独立したツールとして使える状態にする。

## 優先度根拠

プロダクトの帰属・認証まわりの整理であり、機能追加やバグ修正より先に方針を確定しておく必要がある。ユーザーからの明示的な削除要求に基づく。

## 現状

- Title 右ナビに The Balance Discord へのリンクとロゴ画像がある（`src/components/Title/Title.tsx`）
- Title に Discord 認証 UI（mentor sign in / アバター）を差し込んでいる（`DiscordAuth` → `page.tsx` → `Title`）
- Discord OAuth（next-auth）はホワイトリストユーザーのみサインイン可（`src/auth.ts`）。サインイン後のみ Footer で Balance スタンプの ON/OFF が可能（`src/components/Footer/Footer.tsx`）
- Canvas ヘッダーに Balance ロゴ・ロゴタイプ・ URL を描画できる（`drawBalanceLogo` in `src/components/Canvas/Canvas.tsx`）
- 静的アセット `public/Balance_Logo-02.png` / `public/Balance_Logotype-08.png` を利用している
- `SessionProvider`（`src/components/Providers.tsx`）と `src/app/api/auth/[...nextauth]/route.ts`、および `src/middleware.ts`（`auth` を middleware として export）が認証基盤として存在する
- 文言キーが `src/messages/en.ts` / `ja.ts` の `title.balance*` / `footer.*BalanceStamp` / `discord.*` にある
- README のデモ URL が `mint-leaf.thebalanceffxiv.com` を指している

## 設計方針

- UI 上の The Balance ロゴ・リンク・スタンプ、および mentor sign in をすべて削除する
- Discord / next-auth の利用箇所が上記のみであることを前提に、認証まわりのコード・依存・環境変数もまとめて取り除く（残す用途が無いため）
- Mint Leaf 本体のロゴ・言語切替・エクスポートなど、本筋の UI は維持する
- README のホスト名・リンクは The Balance 依存を外す（代替 URL が未定ならリンクを外すかプレースホルダにする）

## 完了条件

- 画面上に mentor sign in / Discord アバターが表示されない
- 画面上およびエクスポート画像に The Balance のロゴ・リンク・スタンプが出ない
- `next-auth` および Discord OAuth 関連のコード・ルート・依存がリポジトリから除去されている
- Balance 用静的アセットと関連 i18n キーが残っていない
- アプリが認証なしで従来どおりローテーション作成・エクスポートできる

## 解決方法

1. Title から `DiscordAuthContainer` と `BalanceLink`（および関連 styled）を削除する
2. `page.tsx` / `Home` / `Footer` / `Canvas` から `discordAuth`・`useBalanceLogo`・`drawBalanceLogo` を除去する
3. `src/components/Discord/`・`src/auth.ts`・`src/app/api/auth/`・`src/types/next-auth.d.ts`・`src/middleware.ts`・`SessionProvider` を削除する
4. `package.json` から `next-auth` を外し、lockfile を更新する
5. `public/Balance_*.png` と Canvas `styles.ts` の balance* 寸法定数を削除する
6. `en.ts` / `ja.ts` から balance / discord / BalanceStamp 関連キーを削除する
7. `.env.local` 例やドキュメントから `DISCORD_*` / `AUTH_SECRET` の説明を整理する（実値は issue・コミットに含めない）
8. README の The Balance ホスト参照を見直す
