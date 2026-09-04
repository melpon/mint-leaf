import { Button } from 'antd'
import { useSession } from 'next-auth/react'
import styled from 'styled-components'
import { useTranslation } from '@/context/LanguageContext'

const Bar = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    width: 100%;
    padding: 8px 16px;
    background-color: #1a1c24;
    color: #e1e4e6;
    border-bottom: 1px solid white;
    flex-shrink: 0;
    font-size: 14px;
`

interface CanvasActionsBarProps {
    onPreview: () => void
    onExport: () => void
    exportReady: boolean
    useBalanceLogo: boolean
    setUseBalanceLogo: (useBalanceLogo: boolean) => void
}

// Right-pane toolbar: Preview / Export / Balance stamp
export const CanvasActionsBar = ({
    onPreview,
    onExport,
    exportReady,
    useBalanceLogo,
    setUseBalanceLogo,
}: CanvasActionsBarProps) => {
    const { data: session } = useSession()
    const { t } = useTranslation()

    return (
        <Bar>
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
