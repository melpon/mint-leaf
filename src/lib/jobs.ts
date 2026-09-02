import { Job, jobs } from '@/data/jobs'
import { Locale } from '@/context/LanguageContext'

export const getJobName = (job: Job, locale: Locale): string => {
    if (locale === 'ja' && job.nameJa) {
        return job.nameJa
    }
    return job.name
}

/**
 * Job オブジェクトから jobs Record の略称キー（DRK / BLM 等）を返す。
 * XIVAPI の ClassJobCategory.{略称} クエリにそのまま使える。
 */
export const getJobAbbreviation = (job: Job): string => {
    const entry = Object.entries(jobs).find(([, candidate]) => candidate.id === job.id)
    if (!entry) {
        throw new Error(`Unknown job id: ${job.id}`)
    }
    return entry[0]
}
