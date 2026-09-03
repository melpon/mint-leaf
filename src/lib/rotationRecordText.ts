import type { Action, Status } from '@/components/Canvas/types'
import type { RotationRecord } from '@/lib/rotationLibraryStore'

const TEXT_FORMAT = 'mint-leaf-rotation'
const TEXT_VERSION = 1 as const

export interface RotationRecordTextPayload {
    format: typeof TEXT_FORMAT
    version: typeof TEXT_VERSION
    record: RotationRecord
}

/**
 * 作品レコード一式をクリップボード向け JSON テキストにする。
 * シーケンス専用テキスト（parseRotation）とは別形式。
 */
export const rotationRecordToText = (record: RotationRecord): string =>
    JSON.stringify(
        {
            format: TEXT_FORMAT,
            version: TEXT_VERSION,
            record,
        } satisfies RotationRecordTextPayload,
        null,
        2,
    )

const isStatus = (value: unknown): value is Status => {
    if (!value || typeof value !== 'object') {
        return false
    }
    const status = value as Record<string, unknown>
    return (
        typeof status['id'] === 'string'
        && typeof status['name'] === 'string'
        && typeof status['imageSrc'] === 'string'
        && typeof status['color'] === 'string'
        && typeof status['applicationDelay'] === 'number'
        && typeof status['duration'] === 'number'
    )
}

const isAction = (value: unknown): value is Action => {
    if (!value || typeof value !== 'object') {
        return false
    }
    const action = value as Record<string, unknown>
    if (typeof action['id'] !== 'string' || typeof action['name'] !== 'string') {
        return false
    }
    if (typeof action['imageSrc'] !== 'string') {
        return false
    }
    if (action['prepull'] !== undefined && typeof action['prepull'] !== 'number') {
        return false
    }
    if (action['statusApplied'] !== undefined && !isStatus(action['statusApplied'])) {
        return false
    }

    if (action['type'] === 'gcd') {
        if (action['recastTime'] !== undefined && typeof action['recastTime'] !== 'number') {
            return false
        }
        if (action['castTime'] !== undefined && typeof action['castTime'] !== 'number') {
            return false
        }
        return true
    }

    if (action['type'] === 'ogcd') {
        if (action['lateWeave'] !== undefined && typeof action['lateWeave'] !== 'boolean') {
            return false
        }
        return true
    }

    return false
}

const isActionArray = (value: unknown): value is Action[] =>
    Array.isArray(value) && value.every(isAction)

/**
 * 貼り付けテキストから作品レコードを復元する。
 * 成功時は新しい id を振ったレコードを返す。失敗時は Error を投げる。
 */
export const textToRotationRecord = (text: string): RotationRecord => {
    let parsed: unknown
    try {
        parsed = JSON.parse(text)
    } catch {
        throw new Error('Rotation record text is not valid JSON')
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Rotation record text must be a JSON object')
    }

    const payload = parsed as Record<string, unknown>
    if (payload['format'] !== TEXT_FORMAT) {
        throw new Error(`Unexpected rotation record format: ${String(payload['format'])}`)
    }
    if (payload['version'] !== TEXT_VERSION) {
        throw new Error(`Unsupported rotation record version: ${String(payload['version'])}`)
    }

    const recordRaw = payload['record']
    if (!recordRaw || typeof recordRaw !== 'object') {
        throw new Error('Rotation record payload is missing record')
    }

    const record = recordRaw as Record<string, unknown>
    if (typeof record['title'] !== 'string') {
        throw new Error('Rotation record title must be a string')
    }
    if (typeof record['job'] !== 'string') {
        throw new Error('Rotation record job must be a string')
    }
    if (typeof record['expansion'] !== 'string') {
        throw new Error('Rotation record expansion must be a string')
    }
    if (typeof record['patch'] !== 'string') {
        throw new Error('Rotation record patch must be a string')
    }
    if (typeof record['level'] !== 'number' || !Number.isFinite(record['level'])) {
        throw new Error('Rotation record level must be a finite number')
    }
    if (record['wrapWidth'] !== null && typeof record['wrapWidth'] !== 'number') {
        throw new Error('Rotation record wrapWidth must be a number or null')
    }
    if (record['rowSpacing'] !== null && typeof record['rowSpacing'] !== 'number') {
        throw new Error('Rotation record rowSpacing must be a number or null')
    }
    if (!isActionArray(record['prepullRotation'])) {
        throw new Error('Rotation record prepullRotation must be an array of actions')
    }
    if (!isActionArray(record['rotation'])) {
        throw new Error('Rotation record rotation must be an array of actions')
    }

    return {
        id: crypto.randomUUID(),
        title: record['title'],
        job: record['job'],
        expansion: record['expansion'],
        patch: record['patch'],
        level: record['level'],
        wrapWidth: record['wrapWidth'] as number | null,
        rowSpacing: record['rowSpacing'] as number | null,
        prepullRotation: record['prepullRotation'],
        rotation: record['rotation'],
    }
}
