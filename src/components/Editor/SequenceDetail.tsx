import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { Checkbox, InputNumber, Switch } from 'antd'
import { Action, Status } from '../Canvas/types'
import { AbilityIcon } from '../Abilities/AbilityIcon'
import { BuffSelect } from '../Abilities/BuffSelect'
import { Job } from '@/data/jobs'
import { DataAction } from '@/app/api'
import { useTranslation } from '@/context/LanguageContext'
import { SequenceListKind } from './SequenceList'

const DEFAULT_RECAST_TIME = 2.5
const DEFAULT_CAST_TIME = 0
const DEFAULT_PREPULL_TIME = -5

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 13px;
`

const Title = styled.h3`
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #c8cbce;
`

const EmptyText = styled.div`
    color: #888;
    font-size: 13px;
`

const Grid = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px 12px;
    align-items: center;
`

const FieldLabel = styled.span`
    color: #c8cbce;
    white-space: nowrap;
`

const HeaderRow = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
`

const ActionInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`

const ActionName = styled.div`
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`

const ActionId = styled.div`
    color: #888;
    font-size: 12px;
`

interface SequenceDetailProps {
    job: Job
    action: Action | null
    list: SequenceListKind | null
    onChange: (list: SequenceListKind, next: Action) => void
}

const toDataAction = (action: Action): DataAction => ({
    id: action.id,
    name: action.name,
    icon: action.imageSrc
        ? new URL(
            action.imageSrc,
            typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
        )
        : null,
})

export const SequenceDetail = ({ job, action, list, onChange }: SequenceDetailProps) => {
    const { t } = useTranslation()
    const [buffEditorOpen, setBuffEditorOpen] = useState(false)

    useEffect(() => {
        setBuffEditorOpen(!!action?.statusApplied)
    }, [action?.id, action?.statusApplied, list])

    if (!action || !list) {
        return (
            <Container>
                <Title>{t('editor.detail')}</Title>
                <EmptyText>{t('editor.detailEmpty')}</EmptyText>
            </Container>
        )
    }

    const isGcd = action.type === 'gcd'
    const hasPrepull = action.prepull !== undefined

    const emit = (next: Action) => {
        onChange(list, next)
    }

    const setGcd = (gcd: boolean) => {
        if (gcd) {
            emit({
                type: 'gcd',
                id: action.id,
                name: action.name,
                imageSrc: action.imageSrc,
                prepull: action.prepull,
                statusApplied: action.statusApplied,
                recastTime: DEFAULT_RECAST_TIME,
                castTime: DEFAULT_CAST_TIME,
            })
            return
        }

        emit({
            type: 'ogcd',
            id: action.id,
            name: action.name,
            imageSrc: action.imageSrc,
            prepull: action.prepull,
            statusApplied: action.statusApplied,
            lateWeave: false,
        })
    }

    const setPrepullEnabled = (enabled: boolean) => {
        if (enabled) {
            emit({ ...action, prepull: action.prepull ?? DEFAULT_PREPULL_TIME })
            return
        }
        if (action.type === 'gcd') {
            emit({
                type: 'gcd',
                id: action.id,
                name: action.name,
                imageSrc: action.imageSrc,
                statusApplied: action.statusApplied,
                recastTime: action.recastTime,
                castTime: action.castTime,
            })
            return
        }
        emit({
            type: 'ogcd',
            id: action.id,
            name: action.name,
            imageSrc: action.imageSrc,
            statusApplied: action.statusApplied,
            lateWeave: action.lateWeave,
        })
    }

    const clearBuff = () => {
        setBuffEditorOpen(false)
        if (action.type === 'gcd') {
            emit({
                type: 'gcd',
                id: action.id,
                name: action.name,
                imageSrc: action.imageSrc,
                prepull: action.prepull,
                recastTime: action.recastTime,
                castTime: action.castTime,
            })
            return
        }
        emit({
            type: 'ogcd',
            id: action.id,
            name: action.name,
            imageSrc: action.imageSrc,
            prepull: action.prepull,
            lateWeave: action.lateWeave,
        })
    }

    const setStatus = (status: Status) => {
        if (
            action.statusApplied
            && action.statusApplied.id === status.id
            && action.statusApplied.name === status.name
            && action.statusApplied.imageSrc === status.imageSrc
            && action.statusApplied.color === status.color
            && action.statusApplied.duration === status.duration
            && action.statusApplied.applicationDelay === status.applicationDelay
        ) {
            return
        }
        emit({ ...action, statusApplied: status })
    }

    const dataAction = toDataAction(action)

    return (
        <Container>
            <Title>{t('editor.detail')}</Title>
            <HeaderRow>
                {action.imageSrc && <AbilityIcon action={dataAction} width={48} />}
                <ActionInfo>
                    <ActionName>{action.name || t('actionBuilder.unknown')}</ActionName>
                    <ActionId>{action.id}</ActionId>
                </ActionInfo>
            </HeaderRow>
            <Grid>
                <FieldLabel>{t('actionBuilder.actionType')}</FieldLabel>
                <Switch
                    checkedChildren={t('actionBuilder.gcd')}
                    unCheckedChildren={t('actionBuilder.ogcd')}
                    checked={isGcd}
                    onChange={setGcd}
                />

                <FieldLabel>{t('actionBuilder.prepull')}</FieldLabel>
                <Checkbox
                    checked={hasPrepull}
                    onChange={(e) => setPrepullEnabled(e.target.checked)}
                />

                {hasPrepull && (
                    <>
                        <FieldLabel>{t('actionBuilder.timeSeconds')}</FieldLabel>
                        <InputNumber
                            min={-60}
                            max={0}
                            value={action.prepull ?? DEFAULT_PREPULL_TIME}
                            onChange={(value) => emit({ ...action, prepull: value ?? DEFAULT_PREPULL_TIME })}
                        />
                    </>
                )}

                {isGcd ? (
                    <>
                        <FieldLabel>{t('actionBuilder.recastTime')}</FieldLabel>
                        <InputNumber
                            min={0}
                            max={10}
                            value={action.type === 'gcd' ? (action.recastTime ?? DEFAULT_RECAST_TIME) : DEFAULT_RECAST_TIME}
                            onChange={(value) => {
                                if (action.type !== 'gcd') return
                                emit({ ...action, recastTime: value ?? DEFAULT_RECAST_TIME })
                            }}
                        />
                        <FieldLabel>{t('actionBuilder.castTime')}</FieldLabel>
                        <InputNumber
                            min={0}
                            max={10}
                            value={action.type === 'gcd' ? (action.castTime ?? DEFAULT_CAST_TIME) : DEFAULT_CAST_TIME}
                            onChange={(value) => {
                                if (action.type !== 'gcd') return
                                emit({ ...action, castTime: value ?? DEFAULT_CAST_TIME })
                            }}
                        />
                    </>
                ) : (
                    !hasPrepull && (
                        <>
                            <FieldLabel>{t('actionBuilder.weaveLate')}</FieldLabel>
                            <Checkbox
                                checked={action.type === 'ogcd' ? !!action.lateWeave : false}
                                onChange={(e) => {
                                    if (action.type !== 'ogcd') return
                                    emit({ ...action, lateWeave: e.target.checked })
                                }}
                            />
                        </>
                    )
                )}

                <FieldLabel>{t('actionBuilder.appliesBuff')}</FieldLabel>
                <Checkbox
                    checked={buffEditorOpen || !!action.statusApplied}
                    onChange={(e) => {
                        if (e.target.checked) {
                            setBuffEditorOpen(true)
                            return
                        }
                        clearBuff()
                    }}
                />
            </Grid>
            {(buffEditorOpen || !!action.statusApplied) && (
                <BuffSelect
                    job={job}
                    setStatus={setStatus}
                    preloadedStatus={action.statusApplied}
                />
            )}
        </Container>
    )
}
