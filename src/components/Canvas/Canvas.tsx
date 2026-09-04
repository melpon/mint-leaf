import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import styled from 'styled-components'
import { useTranslation } from '@/context/LanguageContext'
import { auditRenderPlan } from './auditRenderPlan'
import { blitWrappedCanvas, measureContentTop } from './composeWrappedCanvas'
import { layoutInfographic } from './layoutInfographic'
import { CanvasTextMeasurer } from './textLayout'
import { loadRenderImages, paintRenderPlan } from './paintRenderPlan'
import { Action, LayoutViolation } from './types'
import { styles, wrapWidthMin } from './styles'

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
    flex-shrink: 0;
`

export type CanvasRenderState =
    | { status: 'loading'; violations: LayoutViolation[] }
    | { status: 'ready'; violations: LayoutViolation[] }
    | { status: 'error'; violations: LayoutViolation[]; error: string }

interface CanvasProps {
    screenWidth: number
    prepullRotation: Action[]
    rotation: Action[]
    title: string
    jobName: string
    jobIcon: string
    level: number
    expansion: string
    patch: string
    useBalanceLogo: boolean
    wrapWidth?: number | null
    rowSpacing?: number | null
    onRenderStateChange?: (state: CanvasRenderState) => void
}

const waitForFonts = async (): Promise<void> => {
    if (!document.fonts) return
    await Promise.all([
        document.fonts.load(styles.fonts.label),
        document.fonts.load(styles.fonts.pullTime),
        document.fonts.load(styles.fonts.pullLabel),
        document.fonts.load(styles.fonts.title),
        document.fonts.load(styles.fonts.subtitle),
        document.fonts.load(styles.fonts.url),
        document.fonts.ready,
    ])
}

const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>((props, ref) => {
    const {
        screenWidth,
        prepullRotation,
        rotation,
        title,
        jobName,
        jobIcon,
        level,
        expansion,
        patch,
        useBalanceLogo,
        wrapWidth = null,
        rowSpacing = null,
        onRenderStateChange,
    } = props
    const { t } = useTranslation()
    const pullLabel = t('canvas.pull')
    const levelPrefix = t('canvas.levelPrefix')
    const patchLabel = t('canvas.patch')
    const innerRef = useRef<HTMLCanvasElement>(null)
    const generation = useRef(0)
    const [canvasWidth, setCanvasWidth] = useState<number>(styles.widthInitial)
    const [renderStatus, setRenderStatus] = useState<CanvasRenderState['status']>('loading')
    const [renderError, setRenderError] = useState('')

    useImperativeHandle(ref, () => innerRef.current!, [])

    useEffect(() => {
        const canvas = innerRef.current
        if (!canvas) return
        const currentGeneration = ++generation.current
        const abortController = new AbortController()
        const loadingState: CanvasRenderState = { status: 'loading', violations: [] }
        setRenderStatus('loading')
        setRenderError('')
        onRenderStateChange?.(loadingState)

        const render = async () => {
            await waitForFonts()
            if (abortController.signal.aborted || currentGeneration !== generation.current) return
            const context = canvas.getContext('2d')
            if (!context) throw new Error('Canvas 2D rendering is unavailable.')

            const measurer = new CanvasTextMeasurer(context)
            const layoutInput = {
                prepullRotation,
                rotation,
                title,
                jobName,
                jobIcon,
                level,
                expansion,
                patch,
                useBalanceLogo,
                pullLabel,
                levelPrefix,
                patchLabel,
            }

            // Always layout the full single-row strip first.
            const stripPlan = layoutInfographic(layoutInput, measurer)
            const violations = auditRenderPlan(stripPlan)
            const images = await loadRenderImages(stripPlan.requiredImages, abortController.signal)
            if (abortController.signal.aborted || currentGeneration !== generation.current) return

            const stripCanvas = document.createElement('canvas')
            stripCanvas.width = stripPlan.width
            stripCanvas.height = stripPlan.height
            paintRenderPlan(stripCanvas.getContext('2d')!, stripPlan, images)

            let output = stripCanvas
            // Ignore out-of-range wrap values; the toolbar commits only after debounce / blur clip.
            const wrapEnabled = wrapWidth != null
                && wrapWidth >= wrapWidthMin
                && wrapWidth <= stripPlan.width
            if (wrapEnabled) {
                const contentTop = measureContentTop(stripPlan)
                output = blitWrappedCanvas(
                    stripCanvas,
                    contentTop,
                    wrapWidth,
                    rowSpacing ?? styles.positions.rotationRowSpacing,
                )
            }

            canvas.width = output.width
            canvas.height = output.height
            setCanvasWidth(output.width)
            canvas.getContext('2d')!.drawImage(output, 0, 0)
            const readyState = { status: 'ready', violations } as const
            setRenderStatus('ready')
            onRenderStateChange?.(readyState)
        }

        render().catch(error => {
            if (abortController.signal.aborted || currentGeneration !== generation.current) return
            const message = error instanceof Error ? error.message : 'The infographic could not be rendered.'
            const errorState: CanvasRenderState = { status: 'error', violations: [], error: message }
            setRenderStatus('error')
            setRenderError(message)
            onRenderStateChange?.(errorState)
        })

        return () => abortController.abort()
    }, [
        prepullRotation,
        rotation,
        title,
        jobName,
        jobIcon,
        level,
        expansion,
        patch,
        useBalanceLogo,
        wrapWidth,
        rowSpacing,
        onRenderStateChange,
        pullLabel,
        levelPrefix,
        patchLabel,
    ])

    return (
        <CanvasContainer $overflow={canvasWidth > screenWidth}>
            <BorderedCanvas
                ref={innerRef}
                width={styles.widthInitial}
                height={styles.height}
                data-render-state={renderStatus}
                data-render-error={renderError || undefined}
            />
        </CanvasContainer>
    )
})

Canvas.displayName = 'Canvas'

export { Canvas }
