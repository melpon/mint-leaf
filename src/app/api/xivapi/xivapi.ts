"use client";

import ky from 'ky'

const MAX_SEARCH_RESULTS = 10

type XivapiSheet = 'Action' | 'Status' | 'Item' | 'ClassJob'

interface XivapiSearchResponse {
    fields: any
    row_id: number
    score: number
    sheet: string
}

const xivapi = ky.create({
    prefixUrl: 'https://v2.xivapi.com/api',
})

export const xivapiSearch = async (
    sheets: XivapiSheet[],
    query: string,
): Promise<{ results: XivapiSearchResponse[] }> =>
    xivapi.get('search', {
        searchParams: {
            query,
            sheets: sheets.join(','),
            limit: MAX_SEARCH_RESULTS,
        },
    }).json()

export const getObject = async (
    sheet: XivapiSheet,
    id: number,
): Promise<any> =>
    xivapi.get(`sheet/${sheet}/${id}`).json()

// Convert a game texture path (e.g. ui/icon/000000/000786_hr1.tex)
// to a v2 asset PNG URL so icon delivery stays on the same API host.
export const convertIconPath = (path: string): URL =>
    new URL(`https://v2.xivapi.com/api/asset/${path}?format=png`)

// Empty / unused Action and Status rows often use Icon id 405
// (ui/icon/000000/000405*.tex). Excluding it in the query reduces
// junk hits from the API.
const PLACEHOLDER_ICON_ID = 405

// Build an Action / Item name search query.
// Name~ matches the entered text; -Icon excludes placeholder icons.
export const buildActionSearchQuery = (nameQuery: string): string =>
    `Name~"${nameQuery}" -Icon=${PLACEHOLDER_ICON_ID}`

// Build a Status name search query.
export const buildStatusSearchQuery = (nameQuery: string): string =>
    `Name~"${nameQuery}" -Icon=${PLACEHOLDER_ICON_ID}`
