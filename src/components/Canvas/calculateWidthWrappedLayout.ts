import { Action, CanvasIcon } from './types'
import { calculateIconPositions } from './calculateIconPositions'
import { styles } from './styles'

const { positions } = styles

export interface WidthWrappedRow {
    rowIndex: number
    midLine: number
    globalStart: number
    globalEnd: number
    /** Icons intersecting this row's viewport, with x already mapped to local (x - globalStart). */
    icons: CanvasIcon[]
    /** Original strip indices aligned with `icons` (for image refs). */
    stripIndices: number[]
}

export interface WidthWrappedLayout {
    width: number
    rows: WidthWrappedRow[]
    /** All icons on the continuous strip (strip coordinates). */
    stripIcons: CanvasIcon[]
    prepullStripIndices: number[]
    rotationStripIndices: number[]
    stripLength: number
    pullX: number
    singleRowMidLine: number
}

const intersects = (icon: CanvasIcon, start: number, end: number) =>
    icon.x < end && icon.x + icon.width > start

/**
 * Lay out prepull + rotation as one horizontal strip, then slice into
 * viewports of width W. Local x = stripX - i*W (left-aligned per row).
 */
export const calculateWidthWrappedLayout = (
    prepullRotation: Action[],
    rotation: Action[],
    wrapWidth: number,
    singleRowMidLine: number,
    rowSpacing: number = positions.rotationRowSpacing,
): WidthWrappedLayout => {
    const W = wrapWidth
    const prepullLayout = calculateIconPositions(prepullRotation)
    const rotationLayout = calculateIconPositions(rotation)

    const prepullGap = prepullRotation.length > 0 && rotation.length > 0
        ? positions.prepullPadding * 2.5
        : 0
    const rotationStart = positions.rotationPadding
        + (prepullLayout.width > 0 ? prepullLayout.width + prepullGap : 0)

    const stripIcons: CanvasIcon[] = []
    const prepullStripIndices: number[] = []
    const rotationStripIndices: number[] = []

    // Placeholder midLine; rows remap y when building row icons.
    prepullLayout.icons.forEach(icon => {
        prepullStripIndices.push(stripIcons.length)
        stripIcons.push({
            ...icon,
            x: positions.rotationPadding + icon.x,
            y: icon.y,
        })
    })

    rotationLayout.icons.forEach(icon => {
        rotationStripIndices.push(stripIcons.length)
        stripIcons.push({
            ...icon,
            x: rotationStart + icon.x,
            y: icon.y,
        })
    })

    const contentEnd = rotation.length > 0
        ? rotationStart + rotationLayout.width
        : positions.rotationPadding + prepullLayout.width
    const stripLength = contentEnd + positions.rotationPadding

    const pullX = prepullRotation.length > 0 && rotation.length > 0
        ? positions.rotationPadding + prepullLayout.width + positions.prepullPadding
        : 0

    const rowCount = Math.max(1, Math.ceil(stripLength / W))
    const rows: WidthWrappedRow[] = []
    const spacing = rowSpacing > 0 ? rowSpacing : positions.rotationRowSpacing

    for (let i = 0; i < rowCount; i++) {
        const globalStart = i * W
        const globalEnd = (i + 1) * W
        const midLine = singleRowMidLine + i * spacing
        const icons: CanvasIcon[] = []
        const stripIndices: number[] = []

        stripIcons.forEach((icon, index) => {
            if (!intersects(icon, globalStart, globalEnd)) return
            icons.push({
                ...icon,
                x: icon.x - globalStart,
                y: icon.y + midLine,
            })
            stripIndices.push(index)
        })

        rows.push({
            rowIndex: i,
            midLine,
            globalStart,
            globalEnd,
            icons,
            stripIndices,
        })
    }

    return {
        width: W,
        rows,
        stripIcons,
        prepullStripIndices,
        rotationStripIndices,
        stripLength,
        pullX,
        singleRowMidLine,
    }
}
