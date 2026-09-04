import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { Button, Collapse } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { Action } from '../Canvas/types'
import { rotationToText } from '@/lib/parseRotation'
import { useTranslation } from '@/context/LanguageContext'

const PanelBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`

const Actions = styled.div`
    display: flex;
    flex-direction: row;
    gap: 8px;
`

interface ImportExportProps {
    prepullRotation: Action[]
    rotation: Action[]
    importError: boolean
    onImport: (text: string) => void
}

export const ImportExport = ({
    prepullRotation,
    rotation,
    importError,
    onImport,
}: ImportExportProps) => {
    const { t } = useTranslation()
    const exportText = useMemo(
        () => rotationToText([...prepullRotation, ...rotation]),
        [prepullRotation, rotation],
    )
    const [draftText, setDraftText] = useState(exportText)

    useEffect(() => {
        setDraftText(exportText)
    }, [exportText])

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(exportText)
        } catch (error) {
            console.error('Failed to copy rotation text:', error)
        }
    }

    return (
        <Collapse
            size="small"
            items={[
                {
                    key: 'import-export',
                    label: t('editor.importExport'),
                    children: (
                        <PanelBody>
                            <TextArea
                                value={draftText}
                                onChange={(e) => setDraftText(e.target.value)}
                                placeholder={t('abilities.rotationPlaceholder')}
                                autoSize={{ minRows: 4, maxRows: 8 }}
                                status={importError ? 'error' : undefined}
                                style={{ fontSize: 13 }}
                            />
                            <Actions>
                                <Button type="primary" size="small" onClick={() => onImport(draftText)}>
                                    {t('editor.importApply')}
                                </Button>
                                <Button size="small" onClick={() => void onCopy()}>
                                    {t('editor.exportCopy')}
                                </Button>
                            </Actions>
                        </PanelBody>
                    ),
                },
            ]}
        />
    )
}
