import { Job, jobs } from '@/data/jobs'
import { Locale } from '@/context/LanguageContext'

export const getJobName = (job: Job, locale: Locale): string => {
    if (locale === 'ja' && job.nameJa) {
        return job.nameJa
    }
    return job.name
}

// Resolve the jobs Record key (DRK / BLM / ...) for a Job object.
// Matches XIVAPI ClassJobCategory.{abbreviation} query fields.
export const getJobAbbreviation = (job: Job): string => {
    const entry = Object.entries(jobs).find(([, candidate]) => candidate.id === job.id)
    if (!entry) {
        throw new Error(`Unknown job id: ${job.id}`)
    }
    return entry[0]
}
