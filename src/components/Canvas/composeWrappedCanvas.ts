import { RenderPlan, RenderPrimitive } from './types'
import { styles } from './styles'

const { positions } = styles

const isBackground = (primitive: RenderPrimitive): boolean =>
    primitive.kind === 'shape' && primitive.role === 'background'

const isHeaderPrimitive = (primitive: RenderPrimitive): boolean => {
    if (isBackground(primitive)) return false
    const id = primitive.id
    const ownerId = primitive.ownerId ?? ''
    return id === 'job-icon'
        || id.startsWith('header-')
        || id.startsWith('balance-')
        || ownerId === 'header'
        || ownerId === 'header-subtitle'
        || ownerId === 'header-metadata'
        || ownerId === 'branding'
}

// Y where rotation content starts (below the header chrome).
export const measureContentTop = (plan: RenderPlan): number => {
    const content = plan.primitives.filter(primitive => !isBackground(primitive) && !isHeaderPrimitive(primitive))
    if (content.length === 0) return 0
    return Math.min(...content.map(primitive => primitive.bounds.y))
}

export const measureWrappedCanvasSize = (
    stripWidth: number,
    stripHeight: number,
    contentTop: number,
    wrapWidth: number,
    rowSpacing: number,
): { width: number; height: number; rowCount: number } => {
    const contentHeight = Math.max(0, stripHeight - contentTop)
    const rowCount = Math.max(1, Math.ceil(stripWidth / wrapWidth))
    const spacing = rowSpacing > 0 ? rowSpacing : positions.rotationRowSpacing
    return {
        width: wrapWidth,
        height: Math.ceil(contentTop + contentHeight + (rowCount - 1) * spacing),
        rowCount,
    }
}

// Slice a painted single-row strip into wrapWidth columns and stack the rows.
export const blitWrappedCanvas = (
    strip: HTMLCanvasElement,
    contentTop: number,
    wrapWidth: number,
    rowSpacing: number,
): HTMLCanvasElement => {
    const spacing = rowSpacing > 0 ? rowSpacing : positions.rotationRowSpacing
    const size = measureWrappedCanvasSize(
        strip.width,
        strip.height,
        contentTop,
        wrapWidth,
        spacing,
    )
    const contentHeight = Math.max(0, strip.height - contentTop)

    const finalCanvas = document.createElement('canvas')
    finalCanvas.width = size.width
    finalCanvas.height = size.height
    const context = finalCanvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D rendering is unavailable.')

    context.fillStyle = styles.colors.background
    context.fillRect(0, 0, size.width, size.height)

    // Header once from the left of the strip (same pixels as the unwrapped chrome).
    const headerWidth = Math.min(wrapWidth, strip.width)
    if (contentTop > 0 && headerWidth > 0) {
        context.drawImage(strip, 0, 0, headerWidth, contentTop, 0, 0, headerWidth, contentTop)
    }

    for (let rowIndex = 0; rowIndex < size.rowCount; rowIndex++) {
        const sourceX = rowIndex * wrapWidth
        const sourceWidth = Math.min(wrapWidth, strip.width - sourceX)
        if (sourceWidth <= 0) continue
        const destinationY = contentTop + rowIndex * spacing
        context.drawImage(
            strip,
            sourceX,
            contentTop,
            sourceWidth,
            contentHeight,
            0,
            destinationY,
            sourceWidth,
            contentHeight,
        )
    }

    return finalCanvas
}
