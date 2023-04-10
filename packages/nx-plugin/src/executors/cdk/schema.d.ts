export type Json = { [k: string]: string | string[] | boolean | Json }

export interface CdkExecutorOptions extends Json {
  // __unparsed__: string[]
  args?: string
  command: string
  cwd?: string
}
