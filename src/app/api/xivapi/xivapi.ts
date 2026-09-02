"use client";

import ky from 'ky'
import { Locale } from '@/context/LanguageContext'

const MAX_SEARCH_RESULTS = 10

/** ジョブ別一覧取得時の 1 リクエストあたりの件数上限 */
const JOB_ACTION_LIST_PAGE_LIMIT = 100

/** ジョブ別一覧で取得するフィールド */
const JOB_ACTION_LIST_FIELDS = 'Name,Icon,ClassJobLevel'

type XivapiSheet = 'Action' | 'Status' | 'Item' | 'ClassJob'

interface XivapiSearchResponse {
    fields: any
    row_id: number
    score: number
    sheet: string
}

interface XivapiSearchPage {
    results: XivapiSearchResponse[]
    next?: string
    version?: string
    schema?: string
}

/**
 * XIVAPI 正式 v2 クライアント。
 * version / schema はピン留めしない（常に最新）。
 * 新ジョブ・新コンテンツへの追従を優先するため。
 * ピン留めが必要な場合は Ensuring Stability ガイドを参照すること。
 * https://v2.xivapi.com/docs/guides/pinning/
 */
const xivapi = ky.create({
    prefixUrl: 'https://v2.xivapi.com/api',
})

export const xivapiSearch = async (
    sheets: XivapiSheet[],
    query: string,
    language: Locale,
): Promise<{ results: XivapiSearchResponse[] }> =>
    xivapi.get('search', {
        searchParams: {
            query,
            sheets: sheets.join(','),
            limit: MAX_SEARCH_RESULTS,
            ...(language === 'ja' ? { language: 'ja' } : {}),
        },
    }).json()

/**
 * cursor ページングで search を全件取得する。
 * 既存の名前検索（limit 10）とは別経路として使う。
 */
export const xivapiSearchAll = async (
    sheets: XivapiSheet[],
    query: string,
    language: Locale,
    options?: {
        limit?: number
        fields?: string
    },
): Promise<{
    results: XivapiSearchResponse[]
    version?: string
    schema?: string
}> => {
    const limit = options?.limit ?? JOB_ACTION_LIST_PAGE_LIMIT
    const fields = options?.fields
    const allResults: XivapiSearchResponse[] = []
    let cursor: string | undefined
    let version: string | undefined
    let schema: string | undefined

    do {
        const searchParams: Record<string, string | number> = {
            limit,
        }

        if (cursor) {
            // cursor 指定時は sheets / query は無視される
            searchParams.cursor = cursor
        } else {
            searchParams.query = query
            searchParams.sheets = sheets.join(',')
            if (fields) {
                searchParams.fields = fields
            }
            if (language === 'ja') {
                searchParams.language = 'ja'
            }
        }

        const page: XivapiSearchPage = await xivapi.get('search', { searchParams }).json()
        allResults.push(...page.results)

        if (page.version !== undefined) {
            version = page.version
        }
        if (page.schema !== undefined) {
            schema = page.schema
        }

        cursor = page.next
    } while (cursor)

    return { results: allResults, version, schema }
}

export const getObject = async (
    sheet: XivapiSheet,
    id: number,
    language: Locale,
): Promise<any> =>
    xivapi.get(`sheet/${sheet}/${id}`, {
        searchParams: language === 'ja' ? { language: 'ja' } : {},
    }).json()

/** ゲームテクスチャパスを xivapi.com の PNG CDN URL に変換する */
export const convertIconPath = (path: string): URL => {
    const [_, pathWithoutSuffix] = path.split('ui/icon/')
    const [pathWithoutFileType] = pathWithoutSuffix.split('.tex')
    const normalizedPath = pathWithoutFileType.replace(/_hr1$/, '')

    return new URL(`https://xivapi.com/i/${normalizedPath}.png`)
}

const PLACEHOLDER_ICON_ID = 405

export const buildNameSearchQuery = (nameQuery: string, language: Locale): string => {
    const field = language === 'ja' ? 'Name@ja' : 'Name'
    return `${field}~"${nameQuery}"`
}

export const buildActionSearchQuery = (nameQuery: string, language: Locale): string =>
    `${buildNameSearchQuery(nameQuery, language)} -Icon=${PLACEHOLDER_ICON_ID}`

export const buildStatusSearchQuery = (nameQuery: string, language: Locale): string =>
    `${buildNameSearchQuery(nameQuery, language)} -Icon=${PLACEHOLDER_ICON_ID}`

/**
 * ジョブで使える PvE プレイヤースキル一覧用クエリ。
 * ClassJobCategory でロールアクションも含め、IsPlayerAction で NPC/イベント技を除外する。
 */
export const buildJobActionListQuery = (jobAbbreviation: string): string =>
    `+ClassJobCategory.${jobAbbreviation}=true +IsPvP=false +IsPlayerAction=true`

export { JOB_ACTION_LIST_FIELDS, PLACEHOLDER_ICON_ID }
