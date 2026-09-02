"use client";

import { Locale } from '@/context/LanguageContext'
import { DataAction } from './types'
import {
    buildJobActionListQuery,
    convertIconPath,
    JOB_ACTION_LIST_FIELDS,
    PLACEHOLDER_ICON_ID,
    xivapiSearchAll,
} from './xivapi'

const defaultIcon = 'https://xivapi.com/i/000000/000405_hr1.png'

export interface JobActionFetchResult {
    actions: DataAction[]
    /** XIVAPI レスポンスに含まれる場合のゲームバージョン */
    version?: string
    /** XIVAPI レスポンスに含まれる場合のスキーマ識別子 */
    schema?: string
}

interface SortedJobAction extends DataAction {
    classJobLevel: number
}

/**
 * 選択中ジョブの PvE プレイヤースキルを XIVAPI から全件取得する。
 * ロールアクション（迅速魔・ランパート等）も含む。
 */
export const fetchJobActions = async (
    jobAbbreviation: string,
    language: Locale,
): Promise<JobActionFetchResult> => {
    const query = buildJobActionListQuery(jobAbbreviation)
    const { results, version, schema } = await xivapiSearchAll(
        ['Action'],
        query,
        language,
        { fields: JOB_ACTION_LIST_FIELDS },
    )

    const seenIds = new Set<number>()
    const mapped: SortedJobAction[] = []

    for (const { row_id, fields } of results) {
        if (seenIds.has(row_id)) {
            continue
        }
        seenIds.add(row_id)

        // Icon フィールドはオブジェクトまたは数値 ID の場合がある
        const iconId =
            typeof fields.Icon === 'number'
                ? fields.Icon
                : fields.Icon?.id
        if (iconId === PLACEHOLDER_ICON_ID) {
            continue
        }

        const iconPath = fields.Icon?.path_hr1
        const icon = iconPath ? convertIconPath(iconPath) : null
        if (!icon || icon.toString() === defaultIcon) {
            continue
        }

        mapped.push({
            id: row_id.toString(),
            name: fields.Name ?? null,
            icon,
            classJobLevel: typeof fields.ClassJobLevel === 'number' ? fields.ClassJobLevel : 0,
        })
    }

    const localeTag = language === 'ja' ? 'ja' : 'en'
    mapped.sort((a, b) => {
        if (a.classJobLevel !== b.classJobLevel) {
            return a.classJobLevel - b.classJobLevel
        }
        return (a.name ?? '').localeCompare(b.name ?? '', localeTag)
    })

    const actions: DataAction[] = mapped.map(({ id, name, icon }) => ({ id, name, icon }))

    return { actions, version, schema }
}
