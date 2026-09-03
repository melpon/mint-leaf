import { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { Job } from '@/data/jobs'
import { Action } from '../Canvas/types'
import { DataAction, searchForAction } from '@/app/api'
import { JobActionList } from '../Abilities/JobActionList'
import SearchInput from '../Abilities/SearchInput'
import { CustomActionInput } from '../Abilities/CustomActionInput'
import { useLanguage, useTranslation } from '@/context/LanguageContext'
import { SequenceList, SequenceListKind, SequenceSelection } from './SequenceList'
import { SequenceDetail } from './SequenceDetail'
import { ImportExport } from './ImportExport'
import { LIBRARY_TAB_GUTTER_PX } from '@/components/Library/LibraryPanel'

const DEFAULT_RECAST_TIME = 2.5
const DEFAULT_CAST_TIME = 0

const Column = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    height: 100%;
    overflow-y: auto;
    padding: 12px;
    background-color: #262833;
    color: white;
    border-right: 1px solid white;
    flex-shrink: 0;
`

/** 1 列目: パレット + Import/Export */
const PaletteColumn = styled(Column)`
    width: 280px;
`

/** 2 列目: シーケンス */
const SequenceColumn = styled(Column)`
    width: 320px;

    /* 背景クリックで選択解除できるよう、リスト外の余白も埋める */
    > * {
        flex: 1;
    }
`

/** 3 列目: 選択中アクション */
const DetailColumn = styled(Column)`
    width: 300px;
`

const SectionTitle = styled.h3`
    margin: 0 0 6px;
    font-size: 13px;
    font-weight: 600;
    color: #c8cbce;
`

/** ライブラリタブに被る「ジョブスキル」見出しだけ右へずらす */
const PaletteSectionTitle = styled(SectionTitle)`
    padding-left: ${LIBRARY_TAB_GUTTER_PX}px;
`

const PaletteExtras = styled.div`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
`

const Divider = styled.div`
    text-align: center;
    color: #888;
    font-size: 12px;
`

const Block = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`

interface EditorPanelProps {
    job: Job
    prepullRotation: Action[]
    rotation: Action[]
    importError: boolean
    onUpdateAction: (list: SequenceListKind, index: number, next: Action) => void
    onRemoveAction: (list: SequenceListKind, index: number) => void
    onReorderAction: (list: SequenceListKind, fromIndex: number, toIndex: number) => void
    onImport: (text: string) => void
    onPaletteSelect: (dataAction: DataAction) => void
    selectRotationIndex: number | null
    onSelectRotationIndexHandled: () => void
}

export const dataActionToDefaultAction = (dataAction: DataAction): Action => ({
    type: 'gcd',
    id: dataAction.id,
    name: dataAction.name ?? '',
    imageSrc: dataAction.icon ? dataAction.icon.toString() : '',
    recastTime: DEFAULT_RECAST_TIME,
    castTime: DEFAULT_CAST_TIME,
})

/**
 * MainRow の左 3 列。
 * 1: パレット + Import/Export
 * 2: シーケンス
 * 3: 選択アクション
 * （右の Canvas は Home 側）
 */
export const EditorPanel = ({
    job,
    prepullRotation,
    rotation,
    importError,
    onUpdateAction,
    onRemoveAction,
    onReorderAction,
    onImport,
    onPaletteSelect,
    selectRotationIndex,
    onSelectRotationIndexHandled,
}: EditorPanelProps) => {
    const { t } = useTranslation()
    const { locale } = useLanguage()
    const [selection, setSelection] = useState<SequenceSelection | null>(null)
    const selectionRef = useRef(selection)

    useEffect(() => {
        selectionRef.current = selection
    }, [selection])

    const searchActions = useCallback(
        (query: string, language: typeof locale) => searchForAction(query, language),
        [],
    )

    useEffect(() => {
        if (selectRotationIndex === null) {
            return
        }
        setSelection({ list: 'rotation', index: selectRotationIndex })
        onSelectRotationIndexHandled()
    }, [selectRotationIndex, onSelectRotationIndexHandled])

    const selectedAction =
        selection === null
            ? null
            : selection.list === 'prepull'
                ? prepullRotation[selection.index] ?? null
                : rotation[selection.index] ?? null

    const onRemove = useCallback(
        (list: SequenceListKind, index: number) => {
            onRemoveAction(list, index)
            setSelection((current) => {
                if (!current || current.list !== list) {
                    return current
                }
                if (current.index === index) {
                    return null
                }
                if (current.index > index) {
                    return { list, index: current.index - 1 }
                }
                return current
            })
        },
        [onRemoveAction],
    )

    const onReorder = useCallback(
        (list: SequenceListKind, fromIndex: number, toIndex: number) => {
            onReorderAction(list, fromIndex, toIndex)
            setSelection((current) => {
                if (!current || current.list !== list) {
                    return current
                }
                if (current.index === fromIndex) {
                    return { list, index: toIndex }
                }
                if (fromIndex < current.index && toIndex >= current.index) {
                    return { list, index: current.index - 1 }
                }
                if (fromIndex > current.index && toIndex <= current.index) {
                    return { list, index: current.index + 1 }
                }
                return current
            })
        },
        [onReorderAction],
    )

    const onDetailChange = useCallback(
        (list: SequenceListKind, next: Action) => {
            const current = selectionRef.current
            if (current === null || current.list !== list) {
                return
            }
            onUpdateAction(list, current.index, next)

            const willBePrepull = next.prepull !== undefined
            if (list === 'rotation' && willBePrepull) {
                setSelection({ list: 'prepull', index: prepullRotation.length })
            } else if (list === 'prepull' && !willBePrepull) {
                setSelection({ list: 'rotation', index: rotation.length })
            }
        },
        [onUpdateAction, prepullRotation.length, rotation.length],
    )

    return (
        <>
            <PaletteColumn>
                <Block>
                    <PaletteSectionTitle>{t('editor.palette')}</PaletteSectionTitle>
                    <JobActionList job={job} locale={locale} onSelect={onPaletteSelect} />
                    <PaletteExtras>
                        <Divider>{t('abilities.orDivider')}</Divider>
                        <SearchInput
                            job={job}
                            onSelect={onPaletteSelect}
                            search={searchActions}
                            placeholder={t('abilities.searchAction')}
                            language={locale}
                        />
                        <Divider>{t('abilities.orDivider')}</Divider>
                        <CustomActionInput onCreate={onPaletteSelect} />
                    </PaletteExtras>
                </Block>
                <ImportExport
                    prepullRotation={prepullRotation}
                    rotation={rotation}
                    importError={importError}
                    onImport={onImport}
                />
            </PaletteColumn>
            <SequenceColumn>
                <SequenceList
                    prepullRotation={prepullRotation}
                    rotation={rotation}
                    selection={selection}
                    onSelect={setSelection}
                    onReorder={onReorder}
                    onRemove={onRemove}
                />
            </SequenceColumn>
            {selectedAction && selection && (
                <DetailColumn>
                    <SequenceDetail
                        job={job}
                        action={selectedAction}
                        list={selection.list}
                        onChange={onDetailChange}
                    />
                </DetailColumn>
            )}
        </>
    )
}
