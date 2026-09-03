/** @type {import('next').NextConfig} */

/** GitHub Pages プロジェクトサイト用のパス接頭辞（リポジトリ名と一致させる） */
const basePath = '/mint-leaf'

const nextConfig = {
    output: 'export',
    basePath,
    assetPrefix: basePath,
    // Pages 向けに out/.../index.html 形式にする
    trailingSlash: true,
    images: {
        // 静的ホストでは画像最適化サーバーが使えない
        unoptimized: true,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'xivapi.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'cdn.discordapp.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '**',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'http',
                hostname: 'mint-leaf.thebalanceffxiv.com',
                port: '',
                pathname: '/**',
            }
        ],
    },
    env: {
        NEXT_PUBLIC_BASE_PATH: basePath,
    },
    crossOrigin: 'anonymous',
}

export default nextConfig
