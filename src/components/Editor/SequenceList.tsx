import Image from 'next/image'
import styled from 'styled-components'
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
import { Action } from '../Canvas/types'
import { useTranslation } from '@/context/LanguageContext'

export type SequenceListKind = 'prepull' | 'rotation'

// Selection is always (list, index) because prepull and rotation are separate arrays.
export interface SequenceSelection {
    list: SequenceListKind
    index: number
}

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    min-height: 100%;
    cursor: default;
`

const SectionTitle = styled.h3`
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #c8cbce;
`

const EmptyText = styled.div`
    color: #888;
    font-size: 13px;
    padding: 8px 0;
`

const Row = styled.div<{ $selected: boolean; $dragging: boolean }>`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 6px 8px 6px 2px;
    border: 1px solid ${({ $selected }) => ($selected ? '#aaf0d1' : '#444')};
    border-radius: 4px;
    background: ${({ $selected }) => ($selected ? '#2a3a34' : '#1a1c24')};
    color: white;
    text-align: left;
    font-size: 13px;
    opacity: ${({ $dragging }) => ($dragging ? 0.7 : 1)};
    box-shadow: ${({ $dragging }) => ($dragging ? '0 4px 12px rgba(0,0,0,0.35)' : 'none')};
    touch-action: none;

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
    margin-left: 0;
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

const Name = styled.span`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
`

const TimingMeta = styled.span`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    line-height: 1.15;
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: #6b6e76;
    white-space: nowrap;
`

const Badge = styled.span`
    flex-shrink: 0;
    font-size: 11px;
    color: #aaf0d1;
    border: 1px solid #555;
    border-radius: 3px;
    padding: 1px 4px;
`

const RemoveButton = styled.button`
    flex-shrink: 0;
    padding: 2px 6px;
    border: 1px solid #555;
    border-radius: 3px;
    background: #2a2d3a;
    color: white;
    cursor: pointer;
    font-size: 12px;
    line-height: 1.2;

    &:hover {
        background: #3a3d4a;
    }
`

const List = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`

// dnd-kit item ids must be unique across the page; include the list name.
const itemId = (list: SequenceListKind, index: number) => `${list}:${index}`

interface SequenceListProps {
    prepullRotation: Action[]
    rotation: Action[]
    selection: SequenceSelection | null
    onSelect: (selection: SequenceSelection | null) => void
    onReorder: (list: SequenceListKind, fromIndex: number, toIndex: number) => void
    onRemove: (list: SequenceListKind, index: number) => void
}

const SortableActionRow = ({
    list,
    index,
    action,
    selected,
    onSelect,
    onRemove,
}: {
    list: SequenceListKind
    index: number
    action: Action
    selected: boolean
    onSelect: (selection: SequenceSelection) => void
    onRemove: (list: SequenceListKind, index: number) => void
}) => {
    const { t } = useTranslation()
    const id = itemId(list, index)
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id })

    // Drag listeners stay on the handle so a row click still selects.
    return (
        <Row
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            $selected={selected}
            $dragging={isDragging}
            onClick={(event) => {
                // Don't let the section's clear-selection handler run.
                event.stopPropagation()
                onSelect({ list, index })
            }}
        >
            <DragHandle
                type="button"
                aria-label={t('editor.dragHandle')}
                onClick={(event) => event.stopPropagation()}
                {...attributes}
                {...listeners}
            >
                ⠿
            </DragHandle>
            {action.imageSrc && (
                <Image
                    width={28}
                    height={28}
                    src={action.imageSrc}
                    alt={action.name}
                />
            )}
            <Name>{action.name}</Name>
            {action.type === 'gcd' && (
                <TimingMeta>
                    <span>{action.castTime ?? 0}</span>
                    <span>{action.recastTime ?? 2.5}</span>
                </TimingMeta>
            )}
            <Badge>
                {action.type === 'gcd' ? t('editor.gcd') : t('editor.ogcd')}
            </Badge>
            <RemoveButton
                type="button"
                aria-label={t('editor.remove')}
                onClick={(event) => {
                    event.stopPropagation()
                    onRemove(list, index)
                }}
            >
                ×
            </RemoveButton>
        </Row>
    )
}

// One sortable list for either prepull or rotation (never both mixed).
const ActionRows = ({
    list,
    actions,
    selection,
    onSelect,
    onReorder,
    onRemove,
}: {
    list: SequenceListKind
    actions: Action[]
    selection: SequenceSelection | null
    onSelect: (selection: SequenceSelection | null) => void
    onReorder: (list: SequenceListKind, fromIndex: number, toIndex: number) => void
    onRemove: (list: SequenceListKind, index: number) => void
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            // Don't start a drag until the pointer moves 6px.
            activationConstraint: { distance: 6 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    )

    if (actions.length === 0) {
        return null
    }

    const ids = actions.map((_, index) => itemId(list, index))

    const onDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) {
            return
        }

        // Map dnd-kit ids back to indices in this list only.
        const fromIndex = ids.indexOf(String(active.id))
        const toIndex = ids.indexOf(String(over.id))
        if (fromIndex < 0 || toIndex < 0) {
            return
        }

        onReorder(list, fromIndex, toIndex)
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={onDragEnd}
        >
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <List>
                    {actions.map((action, index) => (
                        <SortableActionRow
                            key={ids[index]}
                            list={list}
                            index={index}
                            action={action}
                            selected={selection?.list === list && selection.index === index}
                            onSelect={(next) => onSelect(next)}
                            onRemove={onRemove}
                        />
                    ))}
                </List>
            </SortableContext>
        </DndContext>
    )
}

export const SequenceList = ({
    prepullRotation,
    rotation,
    selection,
    onSelect,
    onReorder,
    onRemove,
}: SequenceListProps) => {
    const { t } = useTranslation()
    const isEmpty = prepullRotation.length === 0 && rotation.length === 0

    return (
        // Click empty chrome to clear selection (rows stopPropagation).
        <Section onClick={() => onSelect(null)}>
            <SectionTitle>{t('editor.sequence')}</SectionTitle>
            {isEmpty && <EmptyText>{t('editor.emptySequence')}</EmptyText>}
            {prepullRotation.length > 0 && (
                <>
                    <SectionTitle>{t('editor.prepull')}</SectionTitle>
                    <ActionRows
                        list="prepull"
                        actions={prepullRotation}
                        selection={selection}
                        onSelect={onSelect}
                        onReorder={onReorder}
                        onRemove={onRemove}
                    />
                </>
            )}
            {rotation.length > 0 && (
                <>
                    <SectionTitle>{t('editor.rotation')}</SectionTitle>
                    <ActionRows
                        list="rotation"
                        actions={rotation}
                        selection={selection}
                        onSelect={onSelect}
                        onReorder={onReorder}
                        onRemove={onRemove}
                    />
                </>
            )}
        </Section>
    )
}
