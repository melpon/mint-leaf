import { withBasePath } from '@/lib/basePath'

const canDrawImage = (image: HTMLImageElement): boolean =>
    image.complete && image.naturalWidth > 0 && image.naturalHeight > 0

export const drawImageFromSource = (
    context: CanvasRenderingContext2D,
    imageSrc: string,
    x: number,
    y: number,
    width: number,
    height: number,
) => {
    const image = new Image()
    // 外部アイコン描画後に toDataURL するため CORS モードで読む
    image.crossOrigin = 'anonymous'
    // public 配下のルート相対パスは basePath 付きにしないと Pages 上で 404 になる
    image.src = withBasePath(imageSrc)
    image.onload = () => {
        if (!canDrawImage(image)) return
        context.drawImage(image, x, y, width, height)
    }
}

export const drawImageFromHTML = (
    context: CanvasRenderingContext2D,
    image: HTMLImageElement | null,
    x: number,
    y: number,
    width: number,
    height: number,
) => {
    if (!image) return

    const draw = () => {
        if (!canDrawImage(image)) return
        context.drawImage(image, x, y, width, height)
    }

    if (canDrawImage(image)) {
        draw()
    } else {
        image.onload = draw
    }
}
