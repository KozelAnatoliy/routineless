export interface LocalstackExecutorOptions {
  command: 'start' | 'stop' | 'ps'
  composeFile?: string
  debug?: boolean
  containerName?: string
  preserveVolumes?: boolean
  volumeMountPath?: string
}
