import { useState } from 'react'
import { Job, casters, healers, jobs, melee, physRanged, tanks } from '@/data/jobs'
import { default as NextImage } from 'next/image'
import styled from 'styled-components'
import { Dropdown } from 'antd'
import { useLanguage, useTranslation } from '@/context/LanguageContext'
import { getJobName } from '@/lib/jobs'
import type { TranslationKey } from '@/context/LanguageContext'

const JOB_ICON_WIDTH = 36
const MENU_ICON_WIDTH = 32

const Trigger = styled.button`
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    border: 1px solid #555;
    border-radius: 6px;
    background: #1a1c24;
    color: white;
    cursor: pointer;
    font-size: 14px;

    &:hover {
        border-color: #888;
    }
`

const Chevron = styled.span`
    font-size: 10px;
    opacity: 0.7;
`

const Panel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    background: #1a1c24;
    border: 1px solid #555;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
`

const RoleBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`

const RoleLabel = styled.div`
    color: #9a9da3;
    font-size: 12px;
`

const RoleIcons = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 2px;
`

const JobButton = styled.button<{ $selected: boolean }>`
    padding: 4px;
    border: none;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    opacity: ${({ $selected }) => ($selected ? 1 : 0.4)};
    transition: opacity 0.15s;

    &:hover {
        opacity: 1;
        background: #2a2d3a;
    }
`

const roleGroups: {
    key: TranslationKey
    roles: readonly string[]
}[] = [
    { key: 'header.role.tanks', roles: tanks },
    { key: 'header.role.healers', roles: healers },
    { key: 'header.role.melee', roles: melee },
    { key: 'header.role.physRanged', roles: physRanged },
    { key: 'header.role.casters', roles: casters },
]

export interface JobSelectProps {
    currentJob?: Job
    setJob: (job: Job) => void
}

export const JobSelect = ({ currentJob, setJob }: JobSelectProps) => {
    const { locale } = useLanguage()
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)

    const panel = (
        <Panel>
            {roleGroups.map((group) => (
                <RoleBlock key={group.key}>
                    <RoleLabel>{t(group.key)}</RoleLabel>
                    <RoleIcons>
                        {group.roles.map((jobKey) => {
                            const job = jobs[jobKey]
                            return (
                                <JobButton
                                    key={jobKey}
                                    type="button"
                                    $selected={currentJob === job}
                                    title={getJobName(job, locale)}
                                    onClick={() => {
                                        setJob(job)
                                        setOpen(false)
                                    }}
                                >
                                    <NextImage
                                        src={job.borderedIcon}
                                        alt={getJobName(job, locale)}
                                        width={MENU_ICON_WIDTH}
                                        height={MENU_ICON_WIDTH}
                                    />
                                </JobButton>
                            )
                        })}
                    </RoleIcons>
                </RoleBlock>
            ))}
        </Panel>
    )

    return (
        <Dropdown
            open={open}
            onOpenChange={setOpen}
            dropdownRender={() => panel}
            trigger={['click']}
        >
            <Trigger type="button" aria-label={t('header.job')}>
                {currentJob && (
                    <NextImage
                        src={currentJob.borderedIcon}
                        alt={getJobName(currentJob, locale)}
                        width={JOB_ICON_WIDTH}
                        height={JOB_ICON_WIDTH}
                    />
                )}
                <span>{currentJob ? getJobName(currentJob, locale) : t('header.job')}</span>
                <Chevron>▼</Chevron>
            </Trigger>
        </Dropdown>
    )
}
