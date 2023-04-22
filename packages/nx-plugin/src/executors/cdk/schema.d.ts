export type Json = { [k: string]: string | string[] | boolean | Json }

export interface CdkExecutorOptions extends Json {
  args?: string
  command: string
  cwd?: string
}
