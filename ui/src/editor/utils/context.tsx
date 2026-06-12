import React, { FC, memo, useContext, useMemo } from 'react'

// --- Recursive Path Logic (Generic) ---
type Prev = [never, 0, 1, 2, 3, 4, 5, ...0[]]

type DeepPath<T, D extends number = 2> = [D] extends [never]
  ? never
  : T extends object
    ? {
         
        [K in keyof T & string]: NonNullable<T[K]> extends Date | Array<any>
          ? K
          : NonNullable<T[K]> extends object
            ? `${K}` | `${K}.${DeepPath<NonNullable<T[K]>, Prev[D]>}`
            : K
      }[keyof T & string]
    : never

export type GenericPaths<T, R extends keyof T = never> =
  | (keyof T & string)
  | {
      [K in R & string]: K extends keyof T
        ? `${K}.${DeepPath<NonNullable<T[K]>>}`
        : never
    }[R & string]

export type PathValue<
  T,
  P extends string,
> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? PathValue<Exclude<T[Key], undefined | null>, Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never

export type CamelCasePath<S extends string> = S extends `${infer T}.${infer U}`
  ? `${T}${Capitalize<CamelCasePath<U>>}`
  : S

export type InjectedPropsFromPaths<Base, K extends string[]> = {
  [P in K[number] as CamelCasePath<P>]: PathValue<Base, P>
}

/**
 * T: The Full Context Value type
 * R: The keys of T that allow dot-notation (e.g. "page" | "content")
 */
export function contextualizeBuilder<
  T extends object,
  R extends keyof T = never,
>(Context: React.Context<T | null>) {
  // Define the path type specifically for this context
  type ValidPaths = GenericPaths<T, R>

  return function contextualize<ComponentProps = object>() {
    return <K extends ValidPaths>(
      keys: K[],
      Component: FC<ComponentProps & InjectedPropsFromPaths<T, K[]>>,
    ) => {
      const MemoizedComponent = memo(Component) as unknown as typeof Component

      const ContextualizedComponent: FC<ComponentProps> = (props) => {
        const context = useContext(Context)

        if (!context) {
          throw new Error(
            `Contextualized component must be descendants of ${Context.displayName}`,
          )
        }

        // Memoize the selection logic to prevent re-renders unless the
        // specific values picked from context actually change.
        const pickedValues = useMemo(() => {
           
          const result = {} as any
          keys.forEach((path) => {
            const camelKey = path.replace(/\.([a-z])/g, (g) =>
              g[1].toUpperCase(),
            )

            result[camelKey] = path
              .split('.')
               
              .reduce((acc, part) => (acc as any)?.[part], context)
          })
          return result
        }, [
          context,
          // eslint-disable-next-line react-hooks/exhaustive-deps
          ...keys.map((k) =>
             
            k.split('.').reduce((acc, part) => (acc as any)?.[part], context),
          ),
        ])

        return <MemoizedComponent {...props} {...pickedValues} />
      }

      return ContextualizedComponent
    }
  }
}
