/**
 * ルート相対パスに GitHub Pages 用の basePath を付与する。
 * next/image（unoptimized）も new Image() も basePath を自動付与しないため、
 * public 配下のパスを渡す箇所ではこの関数を通す。
 */
export const withBasePath = (path: string): string => {
    // 外部 URL・プロトコル相対 URL はそのまま返す
    if (!path.startsWith('/') || path.startsWith('//')) {
        return path
    }

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
    if (!basePath) {
        return path
    }

    // 既に付与済みなら二重に付けない
    if (path === basePath || path.startsWith(`${basePath}/`)) {
        return path
    }

    return `${basePath}${path}`
}
