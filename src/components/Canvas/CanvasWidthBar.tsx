import styled from 'styled-components'
import { Button, Input as AntdInput } from 'antd'
import { useTranslation } from '@/context/LanguageContext'
import { styles } from './styles'

const { positions } = styles

const Bar = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 24px;
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
    width: 120px;
    font-size: 14px;
`

const Spacer = styled.div`
    flex: 1;
`

interface CanvasWidthBarProps {
    totalWidth: number
    wrapWidth: number | null
    setWrapWidth: (width: number | null) => void
    rowSpacing: number | null
    setRowSpacing: (spacing: number | null) => void
    onPreview: () => void
}

/** Layout controls for the infographic canvas (not header metadata). */
export const CanvasWidthBar = ({
    totalWidth,
    wrapWidth,
    setWrapWidth,
    rowSpacing,
    setRowSpacing,
    onPreview,
}: CanvasWidthBarProps) => {
    const { t } = useTranslation()

    return (
        <Bar>
            <Field>
                <span>{t('canvas.totalWidth')}</span>
                <TotalWidthValue>{totalWidth}</TotalWidthValue>
            </Field>
            <Field>
                <span>{t('canvas.wrapWidth')}</span>
                <Input
                    type="number"
                    value={wrapWidth ?? ''}
                    placeholder="—"
                    onChange={(e) => {
                        const raw = e.target.value.trim()
                        if (raw === '') {
                            setWrapWidth(null)
                            return
                        }
                        const parsed = parseInt(raw, 10)
                        setWrapWidth(Number.isFinite(parsed) && parsed > 0 ? parsed : null)
                    }}
                />
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
            <Button type="primary" onClick={onPreview}>
                {t('canvas.preview')}
            </Button>
        </Bar>
    )
}
