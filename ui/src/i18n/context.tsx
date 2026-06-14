import React, { createContext, useContext, useMemo } from 'react'
import _ from 'lodash'

import enDict from './locales/en.json'
import { ExtendedTranslator, extendTranslator, Translator } from './utils'

type Dictionary = typeof enDict

const I18nContext = createContext<Dictionary>(enDict)

export const I18nProvider: React.FC<{
  children: React.ReactNode
  dict?: Dictionary
}> = ({ children, dict = enDict }) => {
  return <I18nContext.Provider value={dict}>{children}</I18nContext.Provider>
}

export function useTranslations(namespace?: string): ExtendedTranslator {
  const dict = useContext(I18nContext)

  const t: Translator = useMemo(() => {
    return (key: string, values?: Record<string, any>) => {
      // If namespace is provided and key doesn't start with '@' or another namespace prefix,
      // you could prepend it, but in the old code `t('@editor.heading')` uses absolute keys often.
      // We will try exact key first, then fallback to `namespace.key` if provided.
      let result = _.get(dict, key)

      if (result === undefined && namespace) {
        result = _.get(dict, `${namespace}.${key}`)
      }

      if (result === undefined) {
        console.warn(`Translation missing for key: ${key}`)
        return key
      }

      if (typeof result !== 'string') {
        return key
      }

      // Simple interpolation for {variable}
      if (values) {
        return result.replace(/\{(\w+)\}/g, (match, p1) => {
          return values[p1] !== undefined ? String(values[p1]) : match
        })
      }

      return result
    }
  }, [dict, namespace])

  return useMemo(() => extendTranslator(t), [t])
}
