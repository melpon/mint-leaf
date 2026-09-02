import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import styled from 'styled-components'
import { DataAction, fetchJobActions } from '@/app/api'
import { Job } from '@/data/jobs'
import { Locale, useTranslation } from '@/context/LanguageContext'
import { getJobAbbreviation } from '@/lib/jobs'
import { getCachedJobActions, setCachedJobActions } from '@/lib/jobActionsStore'

const ListContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    font-size: 14px;
`

const Toolbar = styled.div`
    display: flex;
    flex-direction: row;
    gap: 8px;
    align-items: center;
`

const FilterInput = styled.input`
    flex: 1;
    min-width: 0;
    padding: 6px 10px;
    border: 1px solid #555;
    border-radius: 4px;
    background: #1a1c24;
    color: white;
    font-size: 14px;

    &::placeholder {
        color: #888;
    }
`

const ReloadButton = styled.button`
    flex-shrink: 0;
    padding: 6px 12px;
    border: 1px solid #555;
    border-radius: 4px;
    background: #2a2d3a;
    color: white;
    cursor: pointer;
    font-size: 13px;
    white-space: nowrap;

    &:hover:not(:disabled) {
        background: #3a3d4a;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`

const StatusText = styled.div`
    color: #aaa;
    font-size: 13px;
`

const ErrorText = styled.div`
    color: #f66;
    font-size: 13px;
`

const ActionScroll = styled.div`
    max-height: 140px;
    overflow-y: auto;
    border: 1px solid #444;
    border-radius: 4px;
    background: #1a1c24;
`

const ActionRow = styled.button`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 10px;
    border: none;
    border-bottom: 1px solid #333;
    background: transparent;
    color: white;
    cursor: pointer;
    text-align: left;
    font-size: 14px;

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: #2a2d3a;
    }
`

interface JobActionListProps {
    job: Job
    locale: Locale
    onSelect: (action: DataAction) => void
}

export const JobActionList: React.FC<JobActionListProps> = ({
    job,
    locale,
    onSelect,
}) => {
    const { t } = useTranslation()
    const [actions, setActions] = useState<DataAction[]>([])
    const [filterText, setFilterText] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const jobAbbreviation = useMemo(() => getJobAbbreviation(job), [job])

    const loadActions = useCallback(
        async (forceRefresh: boolean) => {
            const cached = getCachedJobActions(jobAbbreviation, locale)

            // キャッシュがあれば即表示（TTL 切れでも stale 表示）
            if (cached && !forceRefresh) {
                setActions(cached.actions)
                setErrorMessage(null)
                // 有効期限内・期限切れとも再取得は手動ボタンのみ
                return
            }

            if (cached) {
                // 強制再取得中も前回結果を維持してちらつきを防ぐ
                setActions(cached.actions)
            } else {
                // ジョブ切替直後に前ジョブの一覧が残らないようにする
                setActions([])
            }

            setLoading(true)
            setErrorMessage(null)

            try {
                const { actions: fetched, version, schema } = await fetchJobActions(
                    jobAbbreviation,
                    locale,
                )
                setCachedJobActions(jobAbbreviation, locale, fetched, { version, schema })
                setActions(fetched)
            } catch (error) {
                console.error('Failed to fetch job actions:', error)
                setErrorMessage(t('abilities.jobActionListError'))
                // 失敗時はキャッシュがあれば前回結果を維持
                if (!cached) {
                    setActions([])
                }
            } finally {
                setLoading(false)
            }
        },
        [jobAbbreviation, locale, t],
    )

    useEffect(() => {
        setFilterText('')
        void loadActions(false)
    }, [loadActions])

    const filteredActions = useMemo(() => {
        const trimmed = filterText.trim().toLowerCase()
        if (!trimmed) {
            return actions
        }
        return actions.filter((action) =>
            (action.name ?? '').toLowerCase().includes(trimmed),
        )
    }, [actions, filterText])

    return (
        <ListContainer>
            <Toolbar>
                <FilterInput
                    type="text"
                    value={filterText}
                    onChange={(event) => setFilterText(event.target.value)}
                    placeholder={t('abilities.jobActionListFilter')}
                    aria-label={t('abilities.jobActionListFilter')}
                />
                <ReloadButton
                    type="button"
                    onClick={() => void loadActions(true)}
                    disabled={loading}
                >
                    {t('abilities.jobActionListReload')}
                </ReloadButton>
            </Toolbar>

            {loading && <StatusText>{t('abilities.jobActionListLoading')}</StatusText>}
            {errorMessage && <ErrorText>{errorMessage}</ErrorText>}

            {!loading && !errorMessage && actions.length === 0 && (
                <StatusText>{t('abilities.jobActionListEmpty')}</StatusText>
            )}

            {filteredActions.length > 0 && (
                <ActionScroll>
                    {filteredActions.map((action) => (
                        <ActionRow
                            key={action.id}
                            type="button"
                            onClick={() => onSelect(action)}
                        >
                            {action.icon && (
                                <Image
                                    width={28}
                                    height={28}
                                    src={action.icon.toString()}
                                    alt={action.name ?? ''}
                                />
                            )}
                            <span>{action.name}</span>
                        </ActionRow>
                    ))}
                </ActionScroll>
            )}
        </ListContainer>
    )
}
