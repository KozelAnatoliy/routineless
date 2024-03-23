export type ClassType<T> = new (...args: any[]) => T

export type FunctionType = (...args: any[]) => any

export type ExcludeFunctions<T> = Omit<T, FunctionKeys<T>>

export type RequiredProperties<T> = ExcludeFunctions<
  Pick<
    T,
    {
      [K in keyof T]-?: Record<string, unknown> extends Pick<T, K> ? never : K
    }[keyof T]
  >
>

export type OptionalProperties<T> = ExcludeFunctions<
  Pick<
    T,
    {
      [K in keyof T]-?: T extends Record<K, T[K]> ? never : K
    }[keyof T]
  >
>

// A helper type that gets the keys of `Type` that are functions
type FunctionKeys<Type> = {
  [Key in keyof Type]: Type[Key] extends FunctionType ? Key : never
}[keyof Type]
