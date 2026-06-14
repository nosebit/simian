import _ from 'lodash'

export type Translator = (key: string, values?: Record<string, any>) => string

export const titleCase = (s: string) =>
  s
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

export function extendTranslator(t: Translator) {
  return Object.assign(t, {
    cap: (key: string, ...rest: any[]) => _.capitalize(t(key, ...rest)),

    title: (key: string, ...rest: any[]) => _.startCase(t(key, ...rest)),

    upper: (key: string, ...rest: any[]) => _.upperCase(t(key, ...rest)),

    upperFirst: (key: string, ...rest: any[]) => _.upperFirst(t(key, ...rest)),

    lower: (key: string, ...rest: any[]) => _.lowerCase(t(key, ...rest)),
  })
}

export type ExtendedTranslator = ReturnType<typeof extendTranslator>
