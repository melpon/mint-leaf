'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import styled from 'styled-components'
import { Button, Popconfirm } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { useLanguage, useTranslation } from '@/context/LanguageContext'
import { getJobName } from '@/lib/jobs'
import type { RotationRecord } from '@/lib/rotationLibraryStore'
import { resolveJobFromAbbreviation } from '@/lib/rotationLibraryStore'

const PANEL_WIDTH_PX = 280
/** 畳んだタブがラベルに被らないよう、MetaBar / パレット左に足す余白 */
export const LIBRARY_TAB_GUTTER_PX = 28

const Root = styled.div`
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 20;
    pointer-events: none;
`

const Tab = styled.button<{ $open: boolean }>`
    pointer-events: auto;
    position: absolute;
    top: 12px;
    left: ${({ $open }) => ($open ? `${PANEL_WIDTH_PX}px` : '0')};
    z-index: 21;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    padding: 10px 6px;
    border: 1px solid #444;
    border-left: none;
    border-radius: 0 6px 6px 0;
    background: #1a1c24;
    color: #c8cbce;
    font-size: 12px;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: left 0.18s ease;

    &:hover {
        color: #aaf0d1;
        border-color: #666;
    }
`

const Panel = styled.aside<{ $open: boolean }>`
    pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: ${PANEL_WIDTH_PX}px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    box-sizing: border-box;
    background: #14161d;
    border-right: 1px solid #333;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.35);
    transform: translateX(${({ $open }) => ($open ? '0' : '-100%')});
    transition: transform 0.18s ease;
    overflow: hidden;
`

const PanelHeader = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`

const PanelTitle = styled.h2`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #c8cbce;
`

const ListScroll = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
`

const Row = styled.div<{ $active: boolean; $dragging: boolean }>`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 6px 6px 6px 2px;
    border: 1px solid ${({ $active }) => ($active ? '#aaf0d1' : '#444')};
    border-radius: 4px;
    background: ${({ $active }) => ($active ? '#2a3a34' : '#1a1c24')};
    color: white;
    font-size: 12px;
    opacity: ${({ $dragging }) => ($dragging ? 0.7 : 1)};
    box-shadow: ${({ $dragging }) => ($dragging ? '0 4px 12px rgba(0,0,0,0.35)' : 'none')};
    touch-action: none;
    cursor: pointer;

    &:hover {
        border-color: #888;
    }
`

const DragHandle = styled.button`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: #9a9da3;
    cursor: grab;
    font-size: 14px;
    line-height: 1;

    &:active {
        cursor: grabbing;
    }

    &:hover {
        color: #aaf0d1;
        background: #2a2d3a;
    }
`

const JobIcon = styled(Image)`
    flex-shrink: 0;
    border-radius: 2px;
`

const Labels = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
`

const JobLabel = styled.span`
    font-size: 10px;
    color: #8b8e96;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`

const TitleLabel = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`

const RowActions = styled.div`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
`

const IconButton = styled.button`
    padding: 1px 5px;
    border: 1px solid #555;
    border-radius: 3px;
    background: #2a2d3a;
    color: white;
    cursor: pointer;
    font-size: 11px;
    line-height: 1.2;

    &:hover {
        background: #3a3d4a;
    }
`

const ImportBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
`

const ErrorText = styled.div`
    color: #ff8a8a;
    font-size: 12px;
`

interface LibraryPanelProps {
    records: RotationRecord[]
    activeId: string
    onSelect: (recordId: string) => void
    onCreate: () => void
    onDelete: (recordId: string) => void
    onReorder: (fromIndex: number, toIndex: number) => void
    onCopy: (recordId: string) => Promise<void>
    onImport: (text: string) => boolean
}

const SortableLibraryRow = ({
    record,
    active,
    onSelect,
    onDelete,
    onCopy,
}: {
    record: RotationRecord
    active: boolean
    onSelect: (recordId: string) => void
    onDelete: (recordId: string) => void
    onCopy: (recordId: string) => Promise<void>
}) => {
    const { t } = useTranslation()
    const { locale } = useLanguage()
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: record.id })

    const job = resolveJobFromAbbreviation(record.job)
    const title = record.title.trim() === '' ? t('library.emptyTitle') : record.title

    return (
        <Row
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            $active={active}
            $dragging={isDragging}
            onClick={() => onSelect(record.id)}
        >
            <DragHandle
                type="button"
                aria-label={t('library.dragHandle')}
                onClick={(event) => event.stopPropagation()}
                {...attributes}
                {...listeners}
            >
                ⠿
            </DragHandle>
            <JobIcon
                width={24}
                height={24}
                src={job.icon}
                alt={getJobName(job, locale)}
            />
            <Labels>
                <JobLabel>{getJobName(job, locale)}</JobLabel>
                <TitleLabel>
                    {title}
                    {active ? ` · ${t('library.active')}` : ''}
                </TitleLabel>
            </Labels>
            <RowActions>
                <IconButton
                    type="button"
                    aria-label={t('library.copy')}
                    onClick={(event) => {
                        event.stopPropagation()
                        void onCopy(record.id)
                    }}
                >
                    {t('library.copy')}
                </IconButton>
                <Popconfirm
                    title={t('library.deleteConfirm')}
                    okText={t('library.delete')}
                    cancelText={t('customAction.cancel')}
                    onConfirm={(event) => {
                        event?.stopPropagation()
                        onDelete(record.id)
                    }}
                    onPopupClick={(event) => event.stopPropagation()}
                >
                    <IconButton
                        type="button"
                        aria-label={t('library.delete')}
                        onClick={(event) => event.stopPropagation()}
                    >
                        {t('library.delete')}
                    </IconButton>
                </Popconfirm>
            </RowActions>
        </Row>
    )
}

export const LibraryPanel = ({
    records,
    activeId,
    onSelect,
    onCreate,
    onDelete,
    onReorder,
    onCopy,
    onImport,
}: LibraryPanelProps) => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const [importOpen, setImportOpen] = useState(false)
    const [importText, setImportText] = useState('')
    const [importError, setImportError] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            // クリック選択とドラッグを分ける
            activationConstraint: { distance: 6 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    )

    useEffect(() => {
        if (!open) {
            return
        }

        const onPointerDown = (event: MouseEvent) => {
            const target = event.target
            if (!(target instanceof Node)) {
                return
            }
            if (rootRef.current?.contains(target)) {
                return
            }
            // antd Popconfirm のポータル内クリックは外側扱いしない
            if (target instanceof Element && target.closest('.ant-popover')) {
                return
            }
            setOpen(false)
        }

        document.addEventListener('mousedown', onPointerDown)
        return () => document.removeEventListener('mousedown', onPointerDown)
    }, [open])

    const onDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) {
            return
        }
        const fromIndex = records.findIndex((record) => record.id === active.id)
        const toIndex = records.findIndex((record) => record.id === over.id)
        if (fromIndex < 0 || toIndex < 0) {
            return
        }
        onReorder(fromIndex, toIndex)
    }

    const applyImport = () => {
        const ok = onImport(importText)
        if (ok) {
            setImportText('')
            setImportError(false)
            setImportOpen(false)
            return
        }
        setImportError(true)
    }

    return (
        <Root ref={rootRef}>
            <Tab
                type="button"
                $open={open}
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
            >
                {t('library.tab')}
            </Tab>
            <Panel $open={open} aria-hidden={!open}>
                <PanelHeader>
                    <PanelTitle>{t('library.title')}</PanelTitle>
                    <Button type="primary" size="small" onClick={onCreate}>
                        {t('library.new')}
                    </Button>
                </PanelHeader>
                <ListScroll>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis]}
                        onDragEnd={onDragEnd}
                    >
                        <SortableContext
                            items={records.map((record) => record.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {records.map((record) => (
                                <SortableLibraryRow
                                    key={record.id}
                                    record={record}
                                    active={record.id === activeId}
                                    onSelect={onSelect}
                                    onDelete={onDelete}
                                    onCopy={onCopy}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </ListScroll>
                <ImportBlock>
                    <Button
                        size="small"
                        onClick={() => {
                            setImportOpen((current) => !current)
                            setImportError(false)
                        }}
                    >
                        {t('library.importToggle')}
                    </Button>
                    {importOpen && (
                        <>
                            <TextArea
                                value={importText}
                                onChange={(event) => {
                                    setImportText(event.target.value)
                                    setImportError(false)
                                }}
                                placeholder={t('library.importPlaceholder')}
                                autoSize={{ minRows: 4, maxRows: 8 }}
                                status={importError ? 'error' : undefined}
                                style={{ fontSize: 12 }}
                            />
                            <Button type="primary" size="small" onClick={applyImport}>
                                {t('library.importApply')}
                            </Button>
                            {importError && <ErrorText>{t('library.importError')}</ErrorText>}
                        </>
                    )}
                </ImportBlock>
            </Panel>
        </Root>
    )
}
