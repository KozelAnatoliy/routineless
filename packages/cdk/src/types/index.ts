export * from './base-stack-props'

export type Mutable<T> = { -readonly [P in keyof T]: T[P] }
