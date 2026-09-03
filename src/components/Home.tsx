"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from './Canvas/Canvas'
import styled from 'styled-components'
import { Action, Status } from './Canvas/types'
import { calculateIconPositions } from './Canvas/calculateIconPositions'
import { styles } from './Canvas/styles'
import { textToRotation } from '../lib/parseRotation'
import { Job, jobs } from '../data/jobs'
import { TopBar } from './TopBar/TopBar'
import { MetaBar } from './MetaBar/MetaBar'
import { EditorPanel, dataActionToDefaultAction } from './Editor/EditorPanel'
import { SequenceListKind } from './Editor/SequenceList'
import { CanvasWidthBar } from './Canvas/CanvasWidthBar'
import { CanvasPreviewModal } from './Canvas/CanvasPreviewModal'
import { LibraryPanel } from './Library/LibraryPanel'
import { useLanguage } from '@/context/LanguageContext'
import { en } from '@/messages/en'
import { ja } from '@/messages/ja'
import { getJobAbbreviation, getJobName } from '@/lib/jobs'
import { DataAction } from '@/app/api'
import {
    createEmptyRecord,
    deleteRecord,
    getActiveRecord,
    loadRotationLibrary,
    prependRecord,
    reorderRecords,
    resolveJobFromAbbreviation,
    saveRotationLibrary,
    upsertRecord,
    type RotationLibraryStore,
    type RotationRecord,
} from '@/lib/rotationLibraryStore'
import { rotationRecordToText, textToRotationRecord } from '@/lib/rotationRecordText'

const { positions } = styles

const Container = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    overflow: hidden;
`

const MainRow = styled.div`
    position: relative;
    display: flex;
    flex-direction: row;
    flex: 1;
    min-height: 0;
    width: 100%;
`

const CanvasPreview = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
`

/** Natural canvas width: left padding + content + right padding (no widthInitial floor). */
const calculateTotalWidth = (prepullRotation: Action[], rotation: Action[]): number => {
    const prepullWidth = calculateIconPositions(prepullRotation).width
    const rotationWidth = calculateIconPositions(rotation).width
    const contentWidth = rotationWidth + (
        prepullRotation.length > 0
            ? prepullWidth + (rotation.length > 0 ? positions.prepullPadding * 2 : 0)
            : 0
    )
    return Math.round(contentWidth + positions.rotationPadding * 2)
}

const sortPrepull = (actions: Action[]): Action[] =>
    [...actions].sort((a, b) => (a.prepull ?? 0) - (b.prepull ?? 0))

const buildRecordFromEditor = (
    id: string,
    fields: {
        job: Job
        rotationTitle: string
        expansion: string
        patch: string
        level: number
        wrapWidth: number | null
        rowSpacing: number | null
        prepullRotation: Action[]
        rotation: Action[]
    },
): RotationRecord => ({
    id,
    title: fields.rotationTitle,
    job: getJobAbbreviation(fields.job),
    expansion: fields.expansion,
    patch: fields.patch,
    level: fields.level,
    wrapWidth: fields.wrapWidth,
    rowSpacing: fields.rowSpacing,
    prepullRotation: fields.prepullRotation,
    rotation: fields.rotation,
})

const recordsEqual = (left: RotationRecord, right: RotationRecord): boolean =>
    JSON.stringify(left) === JSON.stringify(right)

export const Home = () => {
    const { locale } = useLanguage()
    const [rotation, setRotation] = useState<Action[]>([])
    const [prepullRotation, setPrepullRotation] = useState<Action[]>([])
    const [importError, setImportError] = useState(false)
    const [wrapWidth, setWrapWidth] = useState<number | null>(null)
    const [rowSpacing, setRowSpacing] = useState<number | null>(null)
    const [job, setJob] = useState<Job>(jobs['DRK'])
    const [rotationTitle, setRotationTitle] = useState<string>(en.defaults.rotationTitle)
    const [expansion, setExpansion] = useState<string>(en.defaults.expansion)
    const [patch, setPatch] = useState<string>('7.4')
    const [level, setLevel] = useState<number>(100)
    const [selectRotationIndex, setSelectRotationIndex] = useState<number | null>(null)
    const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null)
    const [library, setLibrary] = useState<RotationLibraryStore | null>(null)
    const [hydrated, setHydrated] = useState(false)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    /** パネル操作直後の書き戻しで古いエディタ state が上書きしないよう抑制する */
    const skipNextWriteBackRef = useRef(false)
    /** パネル操作でクロージャの古い library を避ける */
    const libraryRef = useRef<RotationLibraryStore | null>(null)
    /** パネル操作時に最新のエディタ内容を同期的に書き戻すためのスナップショット */
    const editorSnapshotRef = useRef({
        job,
        rotationTitle,
        expansion,
        patch,
        level,
        wrapWidth,
        rowSpacing,
        prepullRotation,
        rotation,
    })
    editorSnapshotRef.current = {
        job,
        rotationTitle,
        expansion,
        patch,
        level,
        wrapWidth,
        rowSpacing,
        prepullRotation,
        rotation,
    }

    const localeDefaults = useMemo(
        () => (locale === 'ja'
            ? { title: ja.defaults.rotationTitle, expansion: ja.defaults.expansion }
            : { title: en.defaults.rotationTitle, expansion: en.defaults.expansion }),
        [locale],
    )

    const applyRecordToEditor = useCallback((record: RotationRecord) => {
        setJob(resolveJobFromAbbreviation(record.job))
        setRotationTitle(record.title)
        setExpansion(record.expansion)
        setPatch(record.patch)
        setLevel(record.level)
        setWrapWidth(record.wrapWidth)
        setRowSpacing(record.rowSpacing)
        setPrepullRotation(record.prepullRotation)
        setRotation(record.rotation)
        setSelectRotationIndex(null)
        setImportError(false)
    }, [])

    const commitLibrary = useCallback((next: RotationLibraryStore) => {
        libraryRef.current = next
        setLibrary(next)
        saveRotationLibrary(next)
    }, [])

    /** 現在のエディタ内容をアクティブレコードへ書き戻したストアを返す */
    const flushEditorIntoLibrary = useCallback((current: RotationLibraryStore): RotationLibraryStore => {
        const snapshot = editorSnapshotRef.current
        const record = buildRecordFromEditor(current.activeId, snapshot)
        return upsertRecord(current, record)
    }, [])

    useEffect(() => {
        const loaded = loadRotationLibrary()
        skipNextWriteBackRef.current = true
        libraryRef.current = loaded
        setLibrary(loaded)
        applyRecordToEditor(getActiveRecord(loaded))
        setHydrated(true)
    }, [applyRecordToEditor])

    useEffect(() => {
        setRotationTitle((current) => {
            if (current === en.defaults.rotationTitle || current === ja.defaults.rotationTitle) {
                return locale === 'ja' ? ja.defaults.rotationTitle : en.defaults.rotationTitle
            }
            return current
        })
        setExpansion((current) => {
            if (current === en.defaults.expansion || current === ja.defaults.expansion) {
                return locale === 'ja' ? ja.defaults.expansion : en.defaults.expansion
            }
            return current
        })
    }, [locale])

    // 編集内容をアクティブレコードへ書き戻す（配列位置は維持）
    useEffect(() => {
        if (!hydrated) {
            return
        }
        if (skipNextWriteBackRef.current) {
            skipNextWriteBackRef.current = false
            return
        }

        const current = libraryRef.current
        if (!current) {
            return
        }
        const snapshot = editorSnapshotRef.current
        const nextRecord = buildRecordFromEditor(current.activeId, snapshot)
        const existing = current.records.find((record) => record.id === current.activeId)
        if (existing && recordsEqual(existing, nextRecord)) {
            return
        }
        commitLibrary(upsertRecord(current, nextRecord))
    }, [
        hydrated,
        job,
        rotationTitle,
        expansion,
        patch,
        level,
        wrapWidth,
        rowSpacing,
        prepullRotation,
        rotation,
        commitLibrary,
    ])

    const totalWidth = useMemo(
        () => calculateTotalWidth(prepullRotation, rotation),
        [prepullRotation, rotation],
    )

    const addAction = useCallback((action: Action, status?: Status) => {
        const nextAction = status ? { ...action, statusApplied: status } : action

        if (nextAction.prepull !== undefined) {
            setPrepullRotation((current) => sortPrepull([...current, nextAction]))
            return
        }

        setRotation((current) => [...current, nextAction])
    }, [])

    const onPaletteSelect = useCallback((dataAction: DataAction) => {
        setSelectRotationIndex(rotation.length)
        addAction(dataActionToDefaultAction(dataAction))
    }, [addAction, rotation.length])

    const onSelectRotationIndexHandled = useCallback(() => {
        setSelectRotationIndex(null)
    }, [])

    const removeAction = useCallback((list: SequenceListKind, index: number) => {
        if (list === 'prepull') {
            setPrepullRotation((current) => current.filter((_, i) => i !== index))
            return
        }
        setRotation((current) => current.filter((_, i) => i !== index))
    }, [])

    const reorderAction = useCallback((list: SequenceListKind, fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) {
            return
        }

        const reorder = (actions: Action[]) => {
            if (
                fromIndex < 0
                || toIndex < 0
                || fromIndex >= actions.length
                || toIndex >= actions.length
            ) {
                return actions
            }
            const next = [...actions]
            const [moved] = next.splice(fromIndex, 1)
            next.splice(toIndex, 0, moved)
            return next
        }

        if (list === 'prepull') {
            setPrepullRotation(reorder)
            return
        }
        setRotation(reorder)
    }, [])

    const updateAction = useCallback((list: SequenceListKind, index: number, next: Action) => {
        const willBePrepull = next.prepull !== undefined

        if (list === 'rotation' && willBePrepull) {
            setRotation((current) => current.filter((_, i) => i !== index))
            setPrepullRotation((current) => sortPrepull([...current, next]))
            return
        }

        if (list === 'prepull' && !willBePrepull) {
            setPrepullRotation((current) => current.filter((_, i) => i !== index))
            setRotation((current) => [...current, next])
            return
        }

        if (list === 'prepull') {
            setPrepullRotation((current) => {
                const updated = current.map((action, i) => (i === index ? next : action))
                return sortPrepull(updated)
            })
            return
        }

        setRotation((current) => current.map((action, i) => (i === index ? next : action)))
    }, [])

    const importRotationText = useCallback(async (text: string) => {
        if (text.trim() === '') {
            setRotation([])
            setPrepullRotation([])
            setImportError(false)
            return
        }

        try {
            const parsedRotation = await textToRotation(text.trim(), locale)

            if (!parsedRotation) {
                setImportError(true)
                return
            }

            setRotation(parsedRotation.filter((action) => !action.prepull))
            setPrepullRotation(
                sortPrepull(parsedRotation.filter((action) => action.prepull)),
            )
            setImportError(false)
        } catch {
            setImportError(true)
        }
    }, [locale])

    const exportInfographic = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        const link = document.createElement('a')
        link.download = `${getJobName(job, locale)} ${rotationTitle}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
    }

    const openPreview = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        setPreviewImageSrc(canvas.toDataURL('image/png'))
    }, [])

    const closePreview = useCallback(() => {
        setPreviewImageSrc(null)
    }, [])

    const onLibrarySelect = useCallback((recordId: string) => {
        const current = libraryRef.current
        if (!current || recordId === current.activeId) {
            return
        }
        const flushed = flushEditorIntoLibrary(current)
        const next: RotationLibraryStore = { ...flushed, activeId: recordId }
        const record = next.records.find((candidate) => candidate.id === recordId)
        if (!record) {
            return
        }
        skipNextWriteBackRef.current = true
        commitLibrary(next)
        applyRecordToEditor(record)
    }, [flushEditorIntoLibrary, commitLibrary, applyRecordToEditor])

    const onLibraryCreate = useCallback(() => {
        const current = libraryRef.current
        if (!current) {
            return
        }
        const empty = createEmptyRecord(localeDefaults)
        const next = prependRecord(flushEditorIntoLibrary(current), empty)
        skipNextWriteBackRef.current = true
        commitLibrary(next)
        applyRecordToEditor(empty)
    }, [flushEditorIntoLibrary, localeDefaults, commitLibrary, applyRecordToEditor])

    const onLibraryDelete = useCallback((recordId: string) => {
        const current = libraryRef.current
        if (!current) {
            return
        }
        const next = deleteRecord(flushEditorIntoLibrary(current), recordId, localeDefaults)
        skipNextWriteBackRef.current = true
        commitLibrary(next)
        applyRecordToEditor(getActiveRecord(next))
    }, [flushEditorIntoLibrary, localeDefaults, commitLibrary, applyRecordToEditor])

    const onLibraryReorder = useCallback((fromIndex: number, toIndex: number) => {
        const current = libraryRef.current
        if (!current) {
            return
        }
        commitLibrary(reorderRecords(current, fromIndex, toIndex))
    }, [commitLibrary])

    const onLibraryCopy = useCallback(async (recordId: string) => {
        const current = libraryRef.current
        if (!current) {
            return
        }
        let source = current
        if (recordId === current.activeId) {
            source = flushEditorIntoLibrary(current)
            commitLibrary(source)
        }
        const record = source.records.find((candidate) => candidate.id === recordId)
        if (!record) {
            return
        }
        try {
            await navigator.clipboard.writeText(rotationRecordToText(record))
        } catch (error) {
            console.error('Failed to copy rotation record text:', error)
        }
    }, [flushEditorIntoLibrary, commitLibrary])

    const onLibraryImport = useCallback((text: string): boolean => {
        const current = libraryRef.current
        if (!current) {
            return false
        }
        try {
            const imported = textToRotationRecord(text.trim())
            const next = prependRecord(flushEditorIntoLibrary(current), imported)
            skipNextWriteBackRef.current = true
            commitLibrary(next)
            applyRecordToEditor(imported)
            return true
        } catch (error) {
            console.error('Failed to import rotation record text:', error)
            return false
        }
    }, [flushEditorIntoLibrary, commitLibrary, applyRecordToEditor])

    return (
        <Container>
            <TopBar onExport={exportInfographic} />
            <MetaBar
                currentJob={job}
                setJob={setJob}
                title={rotationTitle}
                setTitle={setRotationTitle}
                expansion={expansion}
                setExpansion={setExpansion}
                patch={patch}
                setPatch={setPatch}
                level={level}
                setLevel={setLevel}
            />
            <MainRow>
                {library && (
                    <LibraryPanel
                        records={library.records}
                        activeId={library.activeId}
                        onSelect={onLibrarySelect}
                        onCreate={onLibraryCreate}
                        onDelete={onLibraryDelete}
                        onReorder={onLibraryReorder}
                        onCopy={onLibraryCopy}
                        onImport={onLibraryImport}
                    />
                )}
                <EditorPanel
                    job={job}
                    prepullRotation={prepullRotation}
                    rotation={rotation}
                    importError={importError}
                    onUpdateAction={updateAction}
                    onRemoveAction={removeAction}
                    onReorderAction={reorderAction}
                    onImport={(text) => void importRotationText(text)}
                    onPaletteSelect={onPaletteSelect}
                    selectRotationIndex={selectRotationIndex}
                    onSelectRotationIndexHandled={onSelectRotationIndexHandled}
                />
                <CanvasPreview>
                    <CanvasWidthBar
                        totalWidth={totalWidth}
                        wrapWidth={wrapWidth}
                        setWrapWidth={setWrapWidth}
                        rowSpacing={rowSpacing}
                        setRowSpacing={setRowSpacing}
                        onPreview={openPreview}
                    />
                    <Canvas
                        prepullRotation={prepullRotation}
                        rotation={rotation}
                        wrapWidth={wrapWidth}
                        rowSpacing={rowSpacing}
                        jobName={getJobName(job, locale)}
                        jobIcon={job?.icon}
                        title={rotationTitle}
                        expansion={expansion}
                        patch={patch}
                        level={level}
                        ref={canvasRef}
                    />
                </CanvasPreview>
            </MainRow>
            {previewImageSrc && (
                <CanvasPreviewModal
                    imageSrc={previewImageSrc}
                    onClose={closePreview}
                />
            )}
        </Container>
    )
}
