import React, { useRef, useEffect, useMemo, forwardRef, useImperativeHandle, useState } from 'react'
import { Action, CanvasGCD, CanvasoGCD } from './types'
import { calculateIconPositions } from './calculateIconPositions'
import styled from 'styled-components'
import { default as NextImage } from 'next/image'
import { drawImageFromHTML, drawImageFromSource } from './drawImage'
import { calculateBuffLinePositions, calculateTimeline, sliceBuffLinesForRow } from './calculateBuffLinePositions'
import { calculateWidthWrappedLayout } from './calculateWidthWrappedLayout'
import { scale, styles } from './styles'
import { drawLabel, drawGCDLabel, drawOGCDLabel } from './drawLabel'
import { assignBuffLineDepths, drawBuffLines } from './drawBuffLines'
import { useTranslation } from '@/context/LanguageContext'

const { height, widthInitial, positions, fonts, colors } = styles

const CanvasContainer = styled.div<{ $overflow?: boolean }>`
    display: flex;
    width: 100%;
    height: 100%;
    overflow-x: scroll;
    flex-grow: 0;
    flex-shrink: 1;
    justify-content: ${props => props.$overflow ? 'flex-start' : 'center'};
    background-color: #22242b;
`

const BorderedCanvas = styled.canvas`
    border-left: 1px solid white;
    border-right: 1px solid white;
`

const drawPrepullTime = (
    context: CanvasRenderingContext2D,
    x: number,
    midLine: number,
    icon: CanvasGCD | CanvasoGCD,
) => {
    if (!icon.prepull) return

    context.fillStyle = colors.text
    context.font = fonts.pullTime
    context.textAlign = "center"

    drawLabel(icon.prepull.toString(), x + icon.width / 2, midLine - positions.pullLineHeightAbove - positions.textBottomPadding - positions.pullTimeAdjustTop, context)
}

const drawPrepullLine = (
    context: CanvasRenderingContext2D,
    x: number,
    midLine: number,
    pullLabel: string,
) => {
    context.beginPath()
    context.moveTo(x + positions.prepullPadding, midLine + positions.pullLineHeightBelow)
    context.lineTo(x + positions.prepullPadding, midLine - positions.pullLineHeightAbove)
    context.strokeStyle = colors.line
    context.lineWidth = scale
    context.stroke()
    context.fillStyle = colors.text
    context.font = fonts.pullLabel
    context.textAlign = "center"
    context.textBaseline = "bottom"
    context.fillText(pullLabel, x + positions.prepullPadding, midLine - positions.pullLineHeightAbove - positions.textBottomPadding)
}

const drawBalanceLogo = (
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
) => {
    drawImageFromSource(context, '/Balance_Logo-02.png', x, y, positions.balanceLogoWidth, positions.balanceLogoHeight)
    drawImageFromSource(context, '/Balance_Logotype-08.png', x + positions.balanceLogoWidth + positions.balanceLogoGap, y + (positions.balanceLogoHeight - positions.balanceLogotypeHeight) / 2 - positions.balanceLogotypeAdjustTop, positions.balanceLogotypeWidth, positions.balanceLogotypeHeight)

    context.fillStyle = colors.url
    context.font = fonts.url
    context.textAlign = "center"
    context.textBaseline = "top"
    context.fillText("www.thebalanceffxiv.com", x + positions.balanceLogoWidth / 2 + positions.balanceLogoWidth + positions.balanceLogoGap + positions.balanceUrlAdjustLeft, y + positions.balanceLogoHeight - positions.balanceUrlAdjustTop)
}

const drawHeaderChrome = (
    context: CanvasRenderingContext2D,
    width: number,
    title: string,
    jobName: string,
    jobIcon: string,
    level: number,
    expansion: string,
    patch: string,
    useBalanceLogo: boolean,
    levelPrefix: string,
    patchLabel: string,
) => {
    drawImageFromSource(
        context,
        jobIcon,
        positions.titleMarginLeft - positions.jobIconAdjustLeft,
        positions.titleMarginTop - positions.jobIconAdjustTop,
        positions.jobIconWidth,
        positions.jobIconWidth,
    )

    context.fillStyle = colors.title
    context.font = fonts.title
    context.textAlign = "left"
    context.textBaseline = "top"
    context.fillText(title, positions.titleMarginLeft + positions.jobIconWidth + positions.jobIconPadding, positions.titleMarginTop)

    context.fillStyle = colors.subtitle
    context.font = fonts.subtitle
    context.textAlign = "left"
    context.textBaseline = "top"
    const subtitle = `${jobName} ${levelPrefix}${level}`
    const subtitleWidth = context.measureText(subtitle).width
    const subtitleHeight = context.measureText(subtitle).actualBoundingBoxAscent - context.measureText(subtitle).actualBoundingBoxDescent
    context.fillText(subtitle, positions.titleMarginLeft + positions.jobIconWidth + positions.jobIconPadding, positions.titleMarginTop + 64 * scale)

    const expansionPatch = `${expansion} ${patchLabel} ${patch}`
    const expansionPatchWidth = context.measureText(expansionPatch).width
    context.textAlign = "right"
    context.fillText(expansionPatch, width - positions.titleMarginLeft, positions.titleMarginTop + 64 * scale)

    context.beginPath()
    context.moveTo(positions.titleMarginLeft + positions.jobIconWidth + positions.jobIconPadding + subtitleWidth + positions.subtitleLinePadding, positions.titleMarginTop + 64 * scale - subtitleHeight / 2 - 2)
    context.lineTo(width - positions.titleMarginLeft - expansionPatchWidth - positions.subtitleLinePadding, positions.titleMarginTop + 64 * scale - subtitleHeight / 2 - 2)
    context.strokeStyle = colors.line
    context.lineWidth = scale
    context.stroke()

    if (useBalanceLogo) {
        drawBalanceLogo(context, width - positions.titleMarginLeft - positions.balanceLogoWidth - positions.balanceLogotypeWidth - positions.balanceLogoGap, positions.titleMarginTop - positions.balanceLogoAdjustTop)
    }
}

interface CanvasProps {
    screenWidth: number
    prepullRotation: Action[]
    rotation: Action[]
    wrapWidth?: number | null
    rowSpacing?: number | null
    title: string
    jobName: string
    jobIcon: string
    level: number
    expansion: string
    patch: string
    useBalanceLogo: boolean
};

const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>((
    {
        screenWidth,
        prepullRotation,
        rotation,
        wrapWidth = null,
        rowSpacing = null,
        title,
        jobName,
        jobIcon,
        level,
        expansion,
        patch,
        useBalanceLogo,
    },
    ref,
) => {
    const { t } = useTranslation()
    const innerRef = useRef<HTMLCanvasElement>(null)
    useImperativeHandle(ref, () => innerRef.current!, [])
    const stripIconRefs = useRef<Array<HTMLImageElement | null>>([])
    const statusIconRefs = useRef<Array<HTMLImageElement | null>>([])
    const prepullIconRefs = useRef<Array<HTMLImageElement | null>>([])
    const rotationIconRefs = useRef<Array<HTMLImageElement | null>>([])
    const [canvasWidth, setCanvasWidth] = useState(0)
    const [buffLineHeight, setBuffLineHeight] = useState(0)

    useEffect(() => {
        const observer = new ResizeObserver(() => {
            setCanvasWidth(innerRef.current?.scrollWidth ?? 0)
        })
        observer.observe(innerRef.current!)
        return () => observer.disconnect()
    }, [])

    const singleRowMidLine = height / 2 + positions.midlineAdjustBottom
    const useWrap = wrapWidth != null && wrapWidth > 0

    const wrappedLayout = useMemo(
        () => useWrap
            ? calculateWidthWrappedLayout(
                prepullRotation,
                rotation,
                wrapWidth!,
                singleRowMidLine,
                rowSpacing ?? positions.rotationRowSpacing,
            )
            : null,
        [useWrap, prepullRotation, rotation, wrapWidth, singleRowMidLine, rowSpacing],
    )

    const { icons: prepullIcons, width: prepullWidth } = useMemo(() => {
        const { icons, width } = calculateIconPositions(prepullRotation)
        return {
            icons: icons.map(icon => ({
                ...icon,
                x: icon.x + positions.rotationPadding,
                y: icon.y + singleRowMidLine,
            })),
            width,
        }
    }, [singleRowMidLine, prepullRotation])

    const { icons: rotationIcons, width: rotationWidth } = useMemo(() => {
        const { icons, width } = calculateIconPositions(rotation)
        return {
            icons: icons.map(icon => ({
                ...icon,
                x: icon.x + (prepullWidth > 0 ? prepullWidth + positions.prepullPadding * 2.5 : 0) + positions.rotationPadding,
                y: icon.y + singleRowMidLine,
            })),
            width,
        }
    }, [singleRowMidLine, prepullWidth, rotation])

    const singleStatusIcons = useMemo(
        () => rotationIcons.map(icon => icon.type === 'gcd' || icon.type === 'ogcd' ? (icon.statusApplied ?? null) : null),
        [rotationIcons],
    )

    const singlePrepullStatusIcons = useMemo(
        () => prepullIcons.map(icon => icon.type === 'gcd' || icon.type === 'ogcd' ? (icon.statusApplied ?? null) : null),
        [prepullIcons],
    )

    const wrapStatusIcons = useMemo(() => {
        if (!wrappedLayout) return []
        return wrappedLayout.rotationStripIndices.map(index => {
            const icon = wrappedLayout.stripIcons[index]
            return icon.type === 'gcd' || icon.type === 'ogcd' ? (icon.statusApplied ?? null) : null
        })
    }, [wrappedLayout])

    const calculatedWidth = rotationWidth + (
        prepullRotation.length > 0
            ? prepullWidth + (rotation.length > 0 ? positions.prepullPadding * 2 : 0)
            : 0
    )
    const singleWidth = Math.max(calculatedWidth + positions.rotationPadding * 2, widthInitial)
    const width = useWrap ? wrapWidth! : singleWidth

    const wrapCanvasHeight = useMemo(() => {
        if (!wrappedLayout || wrappedLayout.rows.length === 0) return height
        const lastMid = wrappedLayout.rows[wrappedLayout.rows.length - 1].midLine
        return lastMid
            + positions.pullLineHeightBelow
            + positions.gcdHeight
            + positions.gcdLabelTopPadding
            + positions.gcdCountLabelTopPadding
            + 64 * scale
    }, [wrappedLayout])

    const globalBuffStackHeight = useMemo(() => {
        if (!wrappedLayout) return 0

        const prepullStripIcons = wrappedLayout.prepullStripIndices.map(i => wrappedLayout.stripIcons[i])
        const rotationStripIcons = wrappedLayout.rotationStripIndices.map(i => wrappedLayout.stripIcons[i])
        const timeline = calculateTimeline(
            prepullStripIcons,
            rotationStripIcons,
            wrappedLayout.stripLength,
            wrappedLayout.pullX,
        )
        const buffLines = calculateBuffLinePositions(
            rotationStripIcons,
            timeline,
            { current: [] },
            wrappedLayout.stripLength,
        )
        return assignBuffLineDepths(buffLines)
    }, [wrappedLayout])

    const canvasHeight = useWrap
        ? Math.max(height, wrapCanvasHeight) + globalBuffStackHeight
        : height + buffLineHeight

    useEffect(() => {
        const canvas = innerRef.current
        if (!canvas) return

        const context = canvas.getContext('2d')
        if (!context) return

        context.clearRect(0, 0, width, canvasHeight)
        context.textBaseline = "bottom"
        context.textAlign = "center"
        context.scale(1, 1)

        context.fillStyle = colors.background
        context.roundRect(0, 0, width, canvasHeight, positions.canvasCornerRadius)
        context.fill()

        drawHeaderChrome(
            context,
            width,
            title,
            jobName,
            jobIcon,
            level,
            expansion,
            patch,
            useBalanceLogo,
            t('canvas.levelPrefix'),
            t('canvas.patch'),
        )

        if (useWrap && wrappedLayout) {
            const prepullStripIcons = wrappedLayout.prepullStripIndices.map(i => wrappedLayout.stripIcons[i])
            const rotationStripIcons = wrappedLayout.rotationStripIndices.map(i => wrappedLayout.stripIcons[i])
            const prepullIndexSet = new Set(wrappedLayout.prepullStripIndices)

            const timeline = calculateTimeline(
                prepullStripIcons,
                rotationStripIcons,
                wrappedLayout.stripLength,
                wrappedLayout.pullX,
            )
            const globalBuffLines = calculateBuffLinePositions(
                rotationStripIcons,
                timeline,
                { current: statusIconRefs.current },
                wrappedLayout.stripLength,
            )
            assignBuffLineDepths(globalBuffLines)

            const counters = { gcdCount: 0, ogcdCount: 0 }

            wrappedLayout.rows.forEach(row => {
                context.save()
                context.beginPath()
                context.rect(0, 0, width, canvasHeight)
                context.clip()

                if (
                    prepullRotation.length > 0
                    && rotation.length > 0
                    && wrappedLayout.pullX >= row.globalStart
                    && wrappedLayout.pullX < row.globalEnd
                ) {
                    drawPrepullLine(
                        context,
                        wrappedLayout.pullX - row.globalStart - positions.prepullPadding,
                        row.midLine,
                        t('canvas.pull'),
                    )
                }

                counters.ogcdCount = 0
                let rowOgcdStarted = false

                row.icons.forEach((icon, localIndex) => {
                    const stripIndex = row.stripIndices[localIndex]
                    const stripIcon = wrappedLayout.stripIcons[stripIndex]
                    const image = stripIconRefs.current[stripIndex]
                    const isPrepull = prepullIndexSet.has(stripIndex)
                    const anchorInRow = stripIcon.x >= row.globalStart && stripIcon.x < row.globalEnd

                    if (!isPrepull && !rowOgcdStarted) {
                        // Keep gcdCount continuous; reset ogcd stack when rotation content starts on this row.
                        if (anchorInRow) {
                            counters.ogcdCount = 0
                            rowOgcdStarted = true
                        }
                    }

                    if (icon.type === 'gcd' || icon.type === 'ogcd') {
                        drawImageFromHTML(context, image, icon.x, icon.y, icon.width, icon.height)

                        if (icon.type === 'gcd') {
                            if (anchorInRow && !isPrepull) {
                                counters.gcdCount++
                            }
                            if (anchorInRow) {
                                counters.ogcdCount = 0
                            }
                            drawGCDLabel(
                                context,
                                icon.x,
                                icon.y,
                                icon,
                                isPrepull ? undefined : (anchorInRow ? counters.gcdCount : undefined),
                                isPrepull,
                            )
                            if (isPrepull && anchorInRow) {
                                drawPrepullTime(context, icon.x, row.midLine, icon)
                            }
                        } else {
                            if (anchorInRow) {
                                counters.ogcdCount++
                                drawOGCDLabel(context, icon.x, icon.y, icon, counters.ogcdCount)
                                if (isPrepull) {
                                    drawPrepullTime(context, icon.x, row.midLine, icon)
                                }
                            }
                        }
                    } else {
                        drawImageFromHTML(context, image, icon.x, icon.y, icon.width, icon.height)
                    }
                })


                const rowBuffLines = sliceBuffLinesForRow(
                    globalBuffLines,
                    row.globalStart,
                    row.globalEnd,
                )
                const buffLineBaseY = row.midLine
                    + positions.pullLineHeightBelow
                    + positions.gcdHeight
                    + positions.gcdLabelTopPadding
                    + positions.gcdCountLabelTopPadding
                drawBuffLines(context, rowBuffLines, buffLineBaseY, width)

                context.restore()
            })

            return
        }

        // Single-row path (unchanged behavior)
        let ogcdCount = 0

        prepullIcons.forEach((icon, index) => {
            const image = prepullIconRefs.current[index]
            drawImageFromHTML(context, image, icon.x, icon.y, icon.width, icon.height)

            switch (icon.type) {
                case 'gcd':
                    ogcdCount = 0
                    drawGCDLabel(context, icon.x, icon.y, icon, undefined, true)
                    drawPrepullTime(context, icon.x, singleRowMidLine, icon)
                    break
                case 'ogcd':
                    ogcdCount++
                    drawOGCDLabel(context, icon.x, icon.y, icon, ogcdCount)
                    drawPrepullTime(context, icon.x, singleRowMidLine, icon)
                    break
            }
        })

        if (prepullRotation.length > 0 && rotation.length > 0) {
            drawPrepullLine(context, prepullWidth + positions.rotationPadding, singleRowMidLine, t('canvas.pull'))
        }

        let gcdCount = 0
        ogcdCount = 0

        rotationIcons.forEach((icon, index) => {
            const image = rotationIconRefs.current[index]
            drawImageFromHTML(context, image, icon.x, icon.y, icon.width, icon.height)

            switch (icon.type) {
                case 'gcd':
                    gcdCount++
                    ogcdCount = 0
                    drawGCDLabel(context, icon.x, icon.y, icon, gcdCount)
                    break
                case 'ogcd':
                    ogcdCount++
                    drawOGCDLabel(context, icon.x, icon.y, icon, ogcdCount)
                    break
            }
        })

        const pullX = prepullRotation.length > 0 && rotation.length > 0
            ? prepullWidth + positions.rotationPadding + positions.prepullPadding
            : 0

        const timeline = calculateTimeline(prepullIcons, rotationIcons, width, pullX)
        const buffLines = calculateBuffLinePositions(rotationIcons, timeline, statusIconRefs, width)
        const addedHeight = drawBuffLines(context, buffLines, height - positions.midlineAdjustBottom / 2, width - positions.rotationPadding)
        setBuffLineHeight(addedHeight)
    }, [
        width, canvasHeight, useWrap, wrappedLayout, prepullIcons, rotationIcons, singleRowMidLine,
        prepullRotation.length, rotation.length, prepullWidth, screenWidth, jobIcon, title, jobName,
        level, expansion, patch, canvasWidth, buffLineHeight, useBalanceLogo, t, globalBuffStackHeight,
    ])

    return (
        <CanvasContainer $overflow={canvasWidth > screenWidth}>
            <BorderedCanvas
                ref={innerRef}
                width={width}
                height={canvasHeight}
            />
            {useWrap && wrappedLayout
                ? (
                    <>
                        {wrappedLayout.stripIcons.map((icon, index) => (
                            <NextImage
                                key={`strip-${index}`}
                                ref={ref => { stripIconRefs.current[index] = ref }}
                                src={icon.imageSrc}
                                alt={''}
                                style={{ display: 'none' }}
                                width={icon.width}
                                height={icon.height}
                                priority={true}
                            />
                        ))}
                        {wrapStatusIcons.map((icon, index) => icon ? (
                            <NextImage
                                key={`wrap-status-${index}`}
                                ref={ref => { statusIconRefs.current[index] = ref }}
                                src={icon.imageSrc}
                                alt={''}
                                style={{ display: 'none' }}
                                width={positions.buffLineIconWidth}
                                height={positions.buffLineIconHeight}
                                priority={true}
                            />
                        ) : null)}
                    </>
                )
                : (
                    <>
                        {prepullIcons.map((icon, index) => (
                            <NextImage
                                key={`prepull-${index}`}
                                ref={ref => { prepullIconRefs.current[index] = ref }}
                                src={icon.imageSrc}
                                alt={''}
                                style={{ display: 'none' }}
                                width={icon.width}
                                height={icon.height}
                                priority={true}
                            />
                        ))}
                        {singlePrepullStatusIcons.map((icon, index) => icon ? (
                            <NextImage
                                key={`prepull-status-${index}`}
                                ref={ref => { /* unused in single path for buffs */ }}
                                src={icon.imageSrc}
                                alt={''}
                                style={{ display: 'none' }}
                                width={positions.buffLineIconWidth}
                                height={positions.buffLineIconHeight}
                                priority={true}
                            />
                        ) : null)}
                        {rotationIcons.map((icon, index) => (
                            <NextImage
                                key={`rotation-${index}`}
                                ref={ref => { rotationIconRefs.current[index] = ref }}
                                src={icon.imageSrc}
                                alt={''}
                                style={{ display: 'none' }}
                                width={icon.width}
                                height={icon.height}
                                priority={true}
                            />
                        ))}
                        {singleStatusIcons.map((icon, index) => icon ? (
                            <NextImage
                                key={`status-${index}`}
                                ref={ref => { statusIconRefs.current[index] = ref }}
                                src={icon.imageSrc}
                                alt={''}
                                style={{ display: 'none' }}
                                width={positions.buffLineIconWidth}
                                height={positions.buffLineIconHeight}
                                priority={true}
                            />
                        ) : null)}
                    </>
                )
            }
        </CanvasContainer>
    )
})

Canvas.displayName = 'Canvas'

export { Canvas }
