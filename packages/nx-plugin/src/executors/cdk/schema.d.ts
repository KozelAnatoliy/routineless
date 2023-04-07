export type Json = { [k: string]: any }

export interface CdkExecutorOptions extends Json {
  // __unparsed__: string[]
  args?: string
  command: string
  cwd?: string
}
