import { translations, Locale, TranslationKeys } from '../i18n/translations'
import { useState, useEffect } from 'react'

export function useTranslation() {
    // Currently hardcoded to zh-CN as per user request
    const [locale, setLocale] = useState<Locale>('zh-CN')

    // In the future, this could be fetched from a user preference, 
    // browser setting, or cookie.

    const t = translations[locale]

    return { t, locale, setLocale }
}
