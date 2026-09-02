import { DataAction } from '@/app/api'
import { Locale } from '@/context/LanguageContext'

const JOB_ACTIONS_KEY = 'mint-leaf-job-actions'

/** キャッシュ有効期間（7 日）。パッチ直後は手動再取得を想定する */
export const JOB_ACTIONS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

interface StoredJobAction {
    id: string
    name: string | null
    /** URL 文字列として保存（localStorage 向け） */
    iconUrl: string | null
}

export interface JobActionsCacheEntry {
    fetchedAt: number
    version?: string
    schema?: string
    actions: StoredJobAction[]
}

interface JobActionsStore {
    [cacheKey: string]: JobActionsCacheEntry
}

/**
 * ジョブ略称 × ロケールからキャッシュキーを組み立てる。
 * 名前が言語依存のためロケールを含める。
 */
export const buildJobActionsCacheKey = (jobAbbreviation: string, locale: Locale): string =>
    `${jobAbbreviation}:${locale}`

const readStore = (): JobActionsStore => {
    if (typeof window === 'undefined') {
        return {}
    }

    try {
        const stored = localStorage.getItem(JOB_ACTIONS_KEY)
        if (!stored) {
            return {}
        }
        return JSON.parse(stored) as JobActionsStore
    } catch (error) {
        console.error('Error retrieving job actions from local storage:', error)
        return {}
    }
}

const writeStore = (store: JobActionsStore): void => {
    if (typeof window === 'undefined') {
        return
    }

    try {
        localStorage.setItem(JOB_ACTIONS_KEY, JSON.stringify(store))
    } catch (error) {
        console.error('Error saving job actions to local storage:', error)
    }
}

const toDataActions = (actions: StoredJobAction[]): DataAction[] =>
    actions.map(({ id, name, iconUrl }) => ({
        id,
        name,
        icon: iconUrl ? new URL(iconUrl) : null,
    }))

const toStoredActions = (actions: DataAction[]): StoredJobAction[] =>
    actions.map(({ id, name, icon }) => ({
        id,
        name,
        iconUrl: icon ? icon.toString() : null,
    }))

/**
 * キャッシュエントリが TTL 内かどうかを判定する。
 */
export const isCacheFresh = (
    entry: JobActionsCacheEntry,
    now: number = Date.now(),
): boolean => now - entry.fetchedAt < JOB_ACTIONS_CACHE_TTL_MS

/**
 * ジョブ × ロケールのキャッシュを取得する。
 * 無い場合は null。TTL 切れでもエントリ自体は返す（表示用）。
 */
export const getCachedJobActions = (
    jobAbbreviation: string,
    locale: Locale,
): { actions: DataAction[]; entry: JobActionsCacheEntry; fresh: boolean } | null => {
    const key = buildJobActionsCacheKey(jobAbbreviation, locale)
    const entry = readStore()[key]
    if (!entry) {
        return null
    }

    return {
        actions: toDataActions(entry.actions),
        entry,
        fresh: isCacheFresh(entry),
    }
}

/**
 * ジョブ × ロケールのキャッシュを上書き保存する。
 */
export const setCachedJobActions = (
    jobAbbreviation: string,
    locale: Locale,
    actions: DataAction[],
    meta?: { version?: string; schema?: string },
): void => {
    const key = buildJobActionsCacheKey(jobAbbreviation, locale)
    const store = readStore()
    const entry: JobActionsCacheEntry = {
        fetchedAt: Date.now(),
        actions: toStoredActions(actions),
    }
    if (meta?.version !== undefined) {
        entry.version = meta.version
    }
    if (meta?.schema !== undefined) {
        entry.schema = meta.schema
    }
    store[key] = entry
    writeStore(store)
}
