export interface LocalstackExecutorOptions {
  command: 'start' | 'stop' | 'ps'
  debug?: boolean
  containerName?: string
  preserveVolumes?: boolean
  volumeMountPath?: string
}
