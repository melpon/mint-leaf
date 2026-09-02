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
import { useLanguage } from '@/context/LanguageContext'
import { en } from '@/messages/en'
import { ja } from '@/messages/ja'
import { getJobName } from '@/lib/jobs'
import { DataAction } from '@/app/api'

const { positions } = styles

const Container = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    overflow: hidden;
`

const MainRow = styled.div`
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
    const canvasRef = useRef<HTMLCanvasElement>(null)

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
