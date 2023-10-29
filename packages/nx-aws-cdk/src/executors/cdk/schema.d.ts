export type Json = { [k: string]: string | string[] | boolean | Json | undefined }

export interface CdkExecutorOptions extends Json {
  cwd?: string
  watch?: boolean
  env?: string
  account?: string | undefined
  region?: string | undefined
  resolve?: boolean
}
