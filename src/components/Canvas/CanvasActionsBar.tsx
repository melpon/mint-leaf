import React, { useEffect, useMemo, useState } from 'react'
import { Button, Input as AntdInput } from 'antd'
import { debounce } from 'lodash'
import { useSession } from 'next-auth/react'
import styled from 'styled-components'
import { useTranslation } from '@/context/LanguageContext'
import { styles, wrapWidthMin } from './styles'

const { positions } = styles

const WRAP_WIDTH_DEBOUNCE_MS = 300

const Bar = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 8px 16px;
    background-color: #1a1c24;
    color: #e1e4e6;
    border-bottom: 1px solid white;
    flex-shrink: 0;
    font-size: 14px;
`

const Field = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
`

const TotalWidthValue = styled.span`
    font-variant-numeric: tabular-nums;
    min-width: 4ch;
`

const Input = styled(AntdInput)`
    width: 64px;
    font-size: 14px;

    /* Hide number spinners */
    -moz-appearance: textfield;
    appearance: textfield;

    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
`

const Spacer = styled.div`
    flex: 1;
`

interface CanvasActionsBarProps {
    totalWidth: number
    wrapWidth: number | null
    setWrapWidth: (width: number | null) => void
    rowSpacing: number | null
    setRowSpacing: (spacing: number | null) => void
    onPreview: () => void
    onExport: () => void
    exportReady: boolean
    useBalanceLogo: boolean
    setUseBalanceLogo: (useBalanceLogo: boolean) => void
}

const parsePositiveInt = (raw: string): number | null => {
    if (raw.trim() === '') return null
    const parsed = parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : null
}

// Clamp wrap width into [min, total]. Empty stays empty (no wrap).
const clipWrapWidth = (
    value: number | null,
    totalWidth: number,
    minWidth: number,
): number | null => {
    if (value === null) return null
    if (totalWidth < minWidth) return null
    return Math.min(totalWidth, Math.max(minWidth, value))
}

const isValidWrapWidth = (
    value: number | null,
    totalWidth: number,
    minWidth: number,
): boolean => {
    if (value === null) return true
    return value >= minWidth && value <= totalWidth
}

// Canvas toolbar: wrap controls on the left, Preview / Export / Balance on the right.
export const CanvasActionsBar = ({
    totalWidth,
    wrapWidth,
    setWrapWidth,
    rowSpacing,
    setRowSpacing,
    onPreview,
    onExport,
    exportReady,
    useBalanceLogo,
    setUseBalanceLogo,
}: CanvasActionsBarProps) => {
    const { data: session } = useSession()
    const { t } = useTranslation()
    const [wrapDraft, setWrapDraft] = useState(wrapWidth == null ? '' : String(wrapWidth))
    const [wrapFocused, setWrapFocused] = useState(false)

    // Keep the draft in sync with the committed value while the field is idle.
    useEffect(() => {
        if (wrapFocused) return
        setWrapDraft(wrapWidth == null ? '' : String(wrapWidth))
    }, [wrapWidth, wrapFocused])

    // If total width shrinks past the committed wrap, clip the canvas value.
    useEffect(() => {
        if (wrapWidth === null) return
        const clipped = clipWrapWidth(wrapWidth, totalWidth, wrapWidthMin)
        if (clipped !== wrapWidth) setWrapWidth(clipped)
    }, [totalWidth, wrapWidth, setWrapWidth])

    const commitWrapWidth = useMemo(
        () => debounce((raw: string) => {
            const parsed = parsePositiveInt(raw)
            // Empty clears wrap. Invalid sizes are ignored until blur clips them.
            if (raw.trim() === '') {
                setWrapWidth(null)
                return
            }
            if (parsed === null || !isValidWrapWidth(parsed, totalWidth, wrapWidthMin)) return
            setWrapWidth(parsed)
        }, WRAP_WIDTH_DEBOUNCE_MS),
        [setWrapWidth, totalWidth],
    )

    useEffect(() => () => commitWrapWidth.cancel(), [commitWrapWidth])

    const onWrapBlur = () => {
        setWrapFocused(false)
        commitWrapWidth.cancel()
        const parsed = parsePositiveInt(wrapDraft)
        if (wrapDraft.trim() === '' || parsed === null) {
            setWrapDraft('')
            setWrapWidth(null)
            return
        }
        const clipped = clipWrapWidth(parsed, totalWidth, wrapWidthMin)
        setWrapDraft(clipped == null ? '' : String(clipped))
        setWrapWidth(clipped)
    }

    return (
        <Bar>
            <Field>
                <span>{t('canvas.wrapWidth')}</span>
                <Input
                    type="number"
                    min={wrapWidthMin}
                    max={totalWidth}
                    value={wrapDraft}
                    placeholder="—"
                    onFocus={() => setWrapFocused(true)}
                    onBlur={onWrapBlur}
                    onChange={(e) => {
                        const raw = e.target.value
                        setWrapDraft(raw)
                        commitWrapWidth(raw)
                    }}
                />
                <span>/</span>
                <TotalWidthValue>{totalWidth}</TotalWidthValue>
            </Field>
            <Field>
                <span>{t('canvas.rowSpacing')}</span>
                <Input
                    type="number"
                    value={rowSpacing ?? ''}
                    placeholder={String(positions.rotationRowSpacing)}
                    onChange={(e) => {
                        const raw = e.target.value.trim()
                        if (raw === '') {
                            setRowSpacing(null)
                            return
                        }
                        const parsed = parseInt(raw, 10)
                        setRowSpacing(Number.isFinite(parsed) && parsed > 0 ? parsed : null)
                    }}
                />
            </Field>
            <Spacer />
            <Button type="primary" onClick={onPreview} disabled={!exportReady}>
                {t('canvas.preview')}
            </Button>
            <Button type="primary" onClick={onExport} disabled={!exportReady}>
                {t('footer.export')}
            </Button>
            {session && (
                <Button type="primary" onClick={() => setUseBalanceLogo(!useBalanceLogo)}>
                    {useBalanceLogo ? t('footer.removeBalanceStamp') : t('footer.addBalanceStamp')}
                </Button>
            )}
        </Bar>
    )
}
