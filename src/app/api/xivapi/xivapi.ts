"use client";

import ky from 'ky'
import { Locale } from '@/context/LanguageContext'

const MAX_SEARCH_RESULTS = 10

type XivapiSheet = 'Action' | 'Status' | 'Item'

interface XivapiSearchResponse {
    fields: any
    row_id: number
    score: number
    sheet: string
}

const xivapi = ky.create({
    prefixUrl: 'https://beta.xivapi.com/api/1',
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

export const getObject = async (
    sheet: XivapiSheet,
    id: number,
    language: Locale,
): Promise<any> =>
    xivapi.get(`sheet/${sheet}/${id}`, {
        searchParams: language === 'ja' ? { language: 'ja' } : {},
    }).json()

export const convertBetaIconPath = (path: string): URL => {
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
