import { LogFormatter, LogItem } from '@aws-lambda-powertools/logger'
import type { LogAttributes, UnformattedAttributes } from '@aws-lambda-powertools/logger/types'

// Replace this line with your own type
type RoutinelessLog = LogAttributes

class RoutinelessLogFormatter extends LogFormatter {
  public formatAttributes(attributes: UnformattedAttributes, additionalLogAttributes: LogAttributes): LogItem {
    const baseAttributes: RoutinelessLog = {
      level: attributes.logLevel,
      message: attributes.message,
      ...additionalLogAttributes,
      timestamp: this.formatTimestamp(attributes.timestamp),
      correlationIds: {
        awsRequestId: attributes.lambdaContext?.awsRequestId,
        xRayTraceId: attributes.xRayTraceId,
      },
      execution: {
        service: attributes.serviceName,
        env: attributes.environment,
        coldStart: attributes.lambdaContext?.coldStart,
        name: attributes.lambdaContext?.functionName,
        region: attributes.awsRegion,
        arn: attributes.lambdaContext?.invokedFunctionArn,
        memoryLimitInMB: attributes.lambdaContext?.memoryLimitInMB,
        version: attributes.lambdaContext?.functionVersion,
      },
      logger: {
        sampleRateValue: attributes.sampleRateValue,
      },
    }

    return new LogItem({ attributes: baseAttributes })
  }
}

export { RoutinelessLogFormatter }
