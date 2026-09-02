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
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === 'en' || stored === 'ja') {
            setLocaleState(stored)
        }
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
