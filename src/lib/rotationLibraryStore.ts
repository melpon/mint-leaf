import type { Action } from '@/components/Canvas/types'
import { type Job, jobs } from '@/data/jobs'
import { en } from '@/messages/en'

const STORAGE_KEY = 'mint-leaf-rotations'
const STORE_VERSION = 1 as const

export interface RotationRecord {
    id: string
    title: string
    /** jobs の略称キー（例: DRK） */
    job: string
    expansion: string
    patch: string
    level: number
    wrapWidth: number | null
    rowSpacing: number | null
    prepullRotation: Action[]
    rotation: Action[]
}

export interface RotationLibraryStore {
    version: typeof STORE_VERSION
    activeId: string
    records: RotationRecord[]
}

/**
 * 空の作品レコードを 1 件作る。id は毎回新規発行する。
 */
export const createEmptyRecord = (options?: {
    title?: string
    expansion?: string
}): RotationRecord => ({
    id: crypto.randomUUID(),
    title: options?.title ?? en.defaults.rotationTitle,
    job: 'DRK',
    expansion: options?.expansion ?? en.defaults.expansion,
    patch: '7.4',
    level: 100,
    wrapWidth: null,
    rowSpacing: null,
    prepullRotation: [],
    rotation: [],
})

/**
 * ジョブ略称を Job に解決する。不明な略称は DRK に落とす。
 */
export const resolveJobFromAbbreviation = (abbreviation: string): Job => {
    const resolved = jobs[abbreviation]
    if (resolved) {
        return resolved
    }
    return jobs['DRK']
}

const createDefaultStore = (): RotationLibraryStore => {
    const record = createEmptyRecord()
    return {
        version: STORE_VERSION,
        activeId: record.id,
        records: [record],
    }
}

const isActionArray = (value: unknown): value is Action[] => Array.isArray(value)

/**
 * localStorage 上の JSON を検証し、壊れていれば null を返す。
 */
const parseStore = (raw: unknown): RotationLibraryStore | null => {
    if (!raw || typeof raw !== 'object') {
        return null
    }

    const candidate = raw as Record<string, unknown>
    if (candidate['version'] !== STORE_VERSION) {
        return null
    }
    if (typeof candidate['activeId'] !== 'string' || candidate['activeId'] === '') {
        return null
    }
    if (!Array.isArray(candidate['records'])) {
        return null
    }

    const records: RotationRecord[] = []
    for (const item of candidate['records']) {
        if (!item || typeof item !== 'object') {
            return null
        }
        const record = item as Record<string, unknown>
        if (typeof record['id'] !== 'string' || record['id'] === '') {
            return null
        }
        if (typeof record['title'] !== 'string') {
            return null
        }
        if (typeof record['job'] !== 'string') {
            return null
        }
        if (typeof record['expansion'] !== 'string') {
            return null
        }
        if (typeof record['patch'] !== 'string') {
            return null
        }
        if (typeof record['level'] !== 'number' || !Number.isFinite(record['level'])) {
            return null
        }
        if (record['wrapWidth'] !== null && typeof record['wrapWidth'] !== 'number') {
            return null
        }
        if (record['rowSpacing'] !== null && typeof record['rowSpacing'] !== 'number') {
            return null
        }
        if (!isActionArray(record['prepullRotation']) || !isActionArray(record['rotation'])) {
            return null
        }

        records.push({
            id: record['id'],
            title: record['title'],
            job: record['job'],
            expansion: record['expansion'],
            patch: record['patch'],
            level: record['level'],
            wrapWidth: record['wrapWidth'] as number | null,
            rowSpacing: record['rowSpacing'] as number | null,
            prepullRotation: record['prepullRotation'],
            rotation: record['rotation'],
        })
    }

    if (records.length === 0) {
        return null
    }

    const activeId = candidate['activeId']
    if (!records.some((record) => record.id === activeId)) {
        return null
    }

    return {
        version: STORE_VERSION,
        activeId,
        records,
    }
}

/**
 * 作品ライブラリを localStorage から読む。無い・壊れている場合は空レコード 1 件で初期化する。
 */
export const loadRotationLibrary = (): RotationLibraryStore => {
    if (typeof window === 'undefined') {
        return createDefaultStore()
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) {
            const initial = createDefaultStore()
            saveRotationLibrary(initial)
            return initial
        }

        const parsed = parseStore(JSON.parse(stored) as unknown)
        if (!parsed) {
            console.error('Invalid rotation library in local storage; recreating empty store')
            const initial = createDefaultStore()
            saveRotationLibrary(initial)
            return initial
        }

        return parsed
    } catch (error) {
        console.error('Error retrieving rotation library from local storage:', error)
        const initial = createDefaultStore()
        saveRotationLibrary(initial)
        return initial
    }
}

/**
 * 作品ライブラリを localStorage へ書き込む。
 */
export const saveRotationLibrary = (store: RotationLibraryStore): void => {
    if (typeof window === 'undefined') {
        return
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    } catch (error) {
        console.error('Error saving rotation library to local storage:', error)
    }
}

/**
 * activeId に対応するレコードを返す。見つからなければ先頭（無ければ新規）を返す。
 */
export const getActiveRecord = (store: RotationLibraryStore): RotationRecord => {
    const active = store.records.find((record) => record.id === store.activeId)
    if (active) {
        return active
    }
    const first = store.records[0]
    if (first) {
        return first
    }
    return createEmptyRecord()
}

/**
 * 同一 id のレコードを中身で置き換える。配列位置は動かさない。
 */
export const upsertRecord = (
    store: RotationLibraryStore,
    record: RotationRecord,
): RotationLibraryStore => {
    const index = store.records.findIndex((candidate) => candidate.id === record.id)
    if (index < 0) {
        return store
    }
    const records = [...store.records]
    records[index] = record
    return { ...store, records }
}

/**
 * レコードを先頭に追加し、それをアクティブにする。
 */
export const prependRecord = (
    store: RotationLibraryStore,
    record: RotationRecord,
): RotationLibraryStore => ({
    version: STORE_VERSION,
    activeId: record.id,
    records: [record, ...store.records],
})

/**
 * レコードを削除する。アクティブを消した場合は残件の先頭、無ければ空レコードを作る。
 */
export const deleteRecord = (
    store: RotationLibraryStore,
    recordId: string,
    emptyOptions?: { title?: string; expansion?: string },
): RotationLibraryStore => {
    const records = store.records.filter((record) => record.id !== recordId)
    if (records.length === 0) {
        const empty = createEmptyRecord(emptyOptions)
        return {
            version: STORE_VERSION,
            activeId: empty.id,
            records: [empty],
        }
    }

    const activeId =
        store.activeId === recordId
            ? (records[0]?.id ?? store.activeId)
            : store.activeId

    return {
        version: STORE_VERSION,
        activeId,
        records,
    }
}

/**
 * 一覧の並べ替え結果を反映する。activeId は変えない。
 */
export const reorderRecords = (
    store: RotationLibraryStore,
    fromIndex: number,
    toIndex: number,
): RotationLibraryStore => {
    if (
        fromIndex === toIndex
        || fromIndex < 0
        || toIndex < 0
        || fromIndex >= store.records.length
        || toIndex >= store.records.length
    ) {
        return store
    }

    const records = [...store.records]
    const [moved] = records.splice(fromIndex, 1)
    if (!moved) {
        return store
    }
    records.splice(toIndex, 0, moved)
    return { ...store, records }
}
