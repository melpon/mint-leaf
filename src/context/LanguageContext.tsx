"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { en, Messages } from '@/messages/en'
import { ja } from '@/messages/ja'

export type Locale = 'en' | 'ja'

const STORAGE_KEY = 'mint-leaf-locale'

const messagesByLocale: Record<Locale, Messages> = {
    en,
    ja,
}

/**
 * ブラウザの言語設定から初期 locale を判別する。
 * navigator.languages を優先し、ja / ja-* なら日本語、それ以外は英語とする。
 * 明示的なユーザー設定が localStorage に無いときのフォールバック用。
 */
const detectLocaleFromBrowser = (): Locale => {
    const candidates =
        typeof navigator !== 'undefined'
            ? [...(navigator.languages ?? []), navigator.language]
            : []

    for (const candidate of candidates) {
        if (!candidate) {
            continue
        }
        const primary = candidate.toLowerCase().split('-')[0]
        if (primary === 'ja') {
            return 'ja'
        }
    }

    return 'en'
}

type NestedKeyOf<T, Prefix extends string = ''> = T extends object
    ? {
        [K in keyof T & string]: T[K] extends object
            ? NestedKeyOf<T[K], `${Prefix}${K}.`>
            : `${Prefix}${K}`
    }[keyof T & string]
    : never

export type TranslationKey = NestedKeyOf<Messages>

interface LanguageContextValue {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: (key: TranslationKey) => string
    messages: Messages
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const getNestedValue = (obj: Messages, path: string): string => {
    const value = path.split('.').reduce<unknown>((current, key) => {
        if (current && typeof current === 'object' && key in current) {
            return (current as Record<string, unknown>)[key]
        }
        return undefined
    }, obj)

    return typeof value === 'string' ? value : path
}

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    const [locale, setLocaleState] = useState<Locale>('en')

    useEffect(() => {
        // ユーザーが明示的に選んだ言語があればそれを優先し、無ければブラウザ言語から判別する
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === 'en' || stored === 'ja') {
            setLocaleState(stored)
            return
        }
        setLocaleState(detectLocaleFromBrowser())
    }, [])

    useEffect(() => {
        document.documentElement.lang = locale
        document.title = messagesByLocale[locale].meta.title
    }, [locale])

    const setLocale = useCallback((nextLocale: Locale) => {
        setLocaleState(nextLocale)
        localStorage.setItem(STORAGE_KEY, nextLocale)
    }, [])

    const messages = messagesByLocale[locale]

    const t = useCallback((key: TranslationKey) => getNestedValue(messages, key), [messages])

    const value = useMemo(
        () => ({ locale, setLocale, t, messages }),
        [locale, setLocale, t, messages],
    )

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    )
}

export const useLanguage = () => {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider')
    }
    return context
}

export const useTranslation = () => {
    const { t, locale, messages } = useLanguage()
    return { t, locale, messages }
}
