import { DataStatus } from '@/app/api/xivapi/types'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Status } from '../Canvas/types'
import { Job } from '@/data/jobs'
import { searchForStatus } from '@/app/api'
import styled from 'styled-components'
import SearchInput from './SearchInput'
import { BuffBuilder } from './BuffBuilder'
import { CustomBuffInput } from './CustomBuffInput'
import { useLanguage, useTranslation } from '@/context/LanguageContext'

const RotationBuilderContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    font-size: 16px;
    flex-shrink: 0;
    margin-bottom: auto;
`

const SearchContainer = styled.div`
    display: block;
    width: 100%;
`

interface BuffSelectProps {
    job: Job
    setStatus: (status: Status) => void
    preloadedStatus?: Status | undefined
}

const isSameStatus = (a: Status | undefined, b: Status): boolean => {
    if (!a) {
        return false
    }
    return (
        a.id === b.id
        && a.name === b.name
        && a.imageSrc === b.imageSrc
        && a.color === b.color
        && a.duration === b.duration
        && a.applicationDelay === b.applicationDelay
    )
}

export const BuffSelect: React.FC<BuffSelectProps> = ({ job, setStatus, preloadedStatus }) => {
    const { t } = useTranslation()
    const { locale } = useLanguage()
    const [currentStatus, setCurrentStatus] = useState<DataStatus | null>(null)
    const [applicationDelay, setApplicationDelay] = useState<number | null>(0)
    const [duration, setDuration] = useState<number | null>(20)
    const [color, setColor] = useState<string>()
    const setStatusRef = useRef(setStatus)
    const preloadedStatusRef = useRef(preloadedStatus)

    useEffect(() => {
        setStatusRef.current = setStatus
    }, [setStatus])

    useEffect(() => {
        preloadedStatusRef.current = preloadedStatus
    }, [preloadedStatus])

    // 既存バフがある場合はフォームへ流し込む
    useEffect(() => {
        if (preloadedStatus && !currentStatus) {
            const dataStatus: DataStatus = {
                id: preloadedStatus.id,
                name: preloadedStatus.name,
                icon: new URL(
                    preloadedStatus.imageSrc,
                    typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
                ),
            }
            setCurrentStatus(dataStatus)
            setDuration(preloadedStatus.duration)
            setApplicationDelay(preloadedStatus.applicationDelay)
            setColor(preloadedStatus.color)
        }
    }, [preloadedStatus, currentStatus])

    const searchStatuses = useCallback(
        (query: string, language: typeof locale) => searchForStatus(query, language),
        [],
    )

    const onCreate = useCallback(() => {
        if (!currentStatus || !currentStatus.icon || duration === null || applicationDelay === null) {
            return
        }

        const buff: Status = {
            id: currentStatus.id,
            name: currentStatus.name ?? t('buffBuilder.unknown'),
            imageSrc: currentStatus.icon.toString(),
            color: color ?? '#000000',
            duration: duration ?? 0,
            applicationDelay: applicationDelay ?? 0,
        }

        // 内容が同じなら親を更新しない（キャンバス無限再描画を防ぐ）
        if (isSameStatus(preloadedStatusRef.current, buff)) {
            return
        }

        setStatusRef.current(buff)
    }, [applicationDelay, color, currentStatus, duration, t])

    if (!currentStatus) {
        return (
            <RotationBuilderContainer>
                <SearchContainer>
                    <SearchInput
                        job={job}
                        onSelect={setCurrentStatus}
                        search={searchStatuses}
                        placeholder={t('abilities.searchStatus')}
                        language={locale}
                    />
                </SearchContainer>
                <div>{t('abilities.orDivider')}</div>
                <CustomBuffInput onCreate={setCurrentStatus} />
            </RotationBuilderContainer>
        )
    }

    return (
        <BuffBuilder
            status={currentStatus}
            applicationDelay={applicationDelay}
            setApplicationDelay={setApplicationDelay}
            duration={duration}
            setDuration={setDuration}
            color={color}
            setColor={setColor}
            onCreate={onCreate}
        />
    )
}
