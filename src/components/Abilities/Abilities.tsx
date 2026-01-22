import styled from 'styled-components'
import { Action, Status } from '../Canvas/types'
import TextArea from 'antd/es/input/TextArea'
import { Job } from '@/data/jobs'
import { useCallback, useState } from 'react'
import { ActionSelect } from './ActionSelect'
import { BuffSelect } from './BuffSelect'
import { saveCustomAction, statusToBuffDetails, StoredCustomAction } from '@/lib/customActionsStore'

const AbilityContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    background-color: #262833;
    color: white;
    width: 100%;
    border-bottom: 1px solid white;
    height: 310px;
    flex-shrink: 0;
`;

const AbilityTitle = styled.h1`
    margin: 0;
    height: calc(100% - 32px);
    padding: 16px;
    border-right: 1px solid white;
    align-content: center;
    text-align: center;
    font-size: 1.5em;
    width: 150px;
`;

const AbilityOptions = styled.div`
    display: flex;
    flex-direction: row;
    gap: 64px;
    padding: 16px 32px;
    margin-bottom: auto;
`;

const AbilityOptionColumn = styled.div<{ $width?: number }>`
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: ${props => props.$width ?? 650}px;
    font-size: 1.25em;
`;

interface AbilitiesProps {
    createAction: (action: Action, status?: Status) => void;
    rotationText: string;
    parseRotation: (rotationText: string) => void;
    rotationInputError: boolean;
    job: Job;
}

export const Abilities = ({
    createAction,
    rotationText,
    parseRotation,
    rotationInputError,
    job,
}: AbilitiesProps) => {
    const [appliesBuff, setAppliesBuff] = useState<boolean>(false);
    const [status, setStatus] = useState<Status | undefined>(undefined);

    const onCreateAction = useCallback((action: Action) => {
        // Save to local storage if it's a custom action
        if (action.id.startsWith('custom-') || action.id.startsWith('item-')) {
            const storedAction: StoredCustomAction = {
                id: action.id,
                name: action.name,
                iconUrl: action.imageSrc,
                isGCD: action.type === 'gcd',
                appliesBuff: appliesBuff,
            };

            if (action.type === 'gcd') {
                storedAction.recastTime = action.recastTime;
                storedAction.castTime = action.castTime;
            } else {
                storedAction.lateWeave = action.lateWeave;
            }

            if (appliesBuff && status) {
                storedAction.buffDetails = statusToBuffDetails(status);
            }

            saveCustomAction(storedAction);
        }

        createAction(action, status);
        setStatus(undefined);
    }, [appliesBuff, createAction, status]);

    const onApplyBuffChange = useCallback((appliesBuff: boolean) => {
        setAppliesBuff(appliesBuff);
        if (!appliesBuff) {
            setStatus(undefined);
        }
    }, []);

    return (
        <AbilityContainer>
            <AbilityTitle>Actions</AbilityTitle>
            <AbilityOptions>
                <AbilityOptionColumn>
                    <span>Action Builder</span>
                    <ActionSelect
                        job={job}
                        createAction={onCreateAction}
                        appliesBuff={appliesBuff}
                        setAppliesBuff={onApplyBuffChange}
                        setStatus={setStatus}
                    />
                </AbilityOptionColumn>
                {appliesBuff &&
                    <AbilityOptionColumn $width={350}>
                        <span>Buff Builder</span>
                        <BuffSelect
                            job={job}
                            setStatus={setStatus}
                            preloadedStatus={status}
                        />
                    </AbilityOptionColumn> 
                }
                <AbilityOptionColumn>
                    <span>Action List</span>
                    <TextArea
                        style={{ fontSize: '16px' }}
                        value={rotationText}
                        onChange={(e) => parseRotation(e.target.value)}
                        placeholder={'Paste your rotation here...'}
                        autoSize={{ minRows: 7, maxRows: 7 }}
                        status={rotationInputError ? 'error' : undefined}
                    />
                </AbilityOptionColumn>
            </AbilityOptions>
        </AbilityContainer>
    );
}
