export const serviceName = process.env['SERVICE_NAME'] || 'service'

export const metricsNamespace = serviceName

export const defaultValues = {
  executionEnv: process.env['AWS_EXECUTION_ENV'] || 'N/A',
}
