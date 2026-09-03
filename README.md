<p align="center"><img src="https://raw.githubusercontent.com/melpon/mint-leaf/main/public/favicon.ico" height="150" width="130" alt="logo"></p>

<h1 align="center">Mint Leaf</h1>

A tool for creating FFXIV rotation infographics.

**Live site:** [https://melpon.github.io/mint-leaf/](https://melpon.github.io/mint-leaf/)

## Getting Started

**Requirements**

* [git](https://git-scm.com/)
* [node.js](https://nodejs.org/en/)
* [yarn](https://yarnpkg.com/)

Install dependencies and run the development server:

```bash
yarn install
yarn dev
```

Open [http://localhost:3000/mint-leaf/](http://localhost:3000/mint-leaf/) in your browser to see the result.

(`basePath` is `/mint-leaf`, so the app is not served at the site root.)

## Deploy (GitHub Pages)

On every push to `main`, GitHub Actions builds a static export (`out/`) and deploys it to GitHub Pages.

**One-time repository setup**

1. Open the repository **Settings** → **Pages**
2. Set **Source** to **GitHub Actions**

After the workflow succeeds, the site is available at [https://melpon.github.io/mint-leaf/](https://melpon.github.io/mint-leaf/).

## Local static build

```bash
yarn build
```

This writes static files to `out/`. Preview them with:

```bash
npx --yes serve out
```

`yarn start` is not supported: the app uses `output: 'export'` and has no Next.js server.
