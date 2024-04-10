import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { EventBridgeClient } from '@aws-sdk/client-eventbridge'
import { S3Client } from '@aws-sdk/client-s3'
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { SNSClient } from '@aws-sdk/client-sns'
import { SQSClient } from '@aws-sdk/client-sqs'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { logger, tracer } from '@routineless/logging'

export class AwsClientFactory {
  private static eventBridgeClient: EventBridgeClient
  private static snsClient: SNSClient
  private static sqsClient: SQSClient
  private static dynamoDbClient: DynamoDBClient
  private static dynamoDbDocumentClient: DynamoDBDocumentClient
  private static s3Client: S3Client
  private static secretsManagerClient: SecretsManagerClient

  public static getEventBridgeClient(newInstance = false): EventBridgeClient {
    if (!AwsClientFactory.eventBridgeClient || newInstance) {
      AwsClientFactory.eventBridgeClient = tracer.captureAWSv3Client(
        new EventBridgeClient(AwsClientFactory.getClientConfig()),
      )
    }
    return AwsClientFactory.eventBridgeClient
  }

  public static getSnsClient(newInstance = false): SNSClient {
    if (!AwsClientFactory.snsClient || newInstance) {
      AwsClientFactory.snsClient = tracer.captureAWSv3Client(new SNSClient(AwsClientFactory.getClientConfig()))
    }
    return AwsClientFactory.snsClient
  }

  public static getSqsClient(newInstance = false): SQSClient {
    if (!AwsClientFactory.sqsClient || newInstance) {
      AwsClientFactory.sqsClient = tracer.captureAWSv3Client(new SQSClient(AwsClientFactory.getClientConfig()))
    }
    return AwsClientFactory.sqsClient
  }

  public static getDynamoDbClient(newInstance = false): DynamoDBClient {
    if (!AwsClientFactory.dynamoDbClient || newInstance) {
      AwsClientFactory.dynamoDbClient = tracer.captureAWSv3Client(
        new DynamoDBClient(AwsClientFactory.getClientConfig()),
      )
    }
    return AwsClientFactory.dynamoDbClient
  }

  public static getDynamoDbDocumentClient(newInstance = false): DynamoDBDocumentClient {
    if (!AwsClientFactory.dynamoDbDocumentClient || newInstance) {
      AwsClientFactory.dynamoDbDocumentClient = DynamoDBDocumentClient.from(
        AwsClientFactory.getDynamoDbClient(newInstance),
      )
    }
    return AwsClientFactory.dynamoDbClient
  }

  public static getS3Client(newInstance = false): S3Client {
    if (!AwsClientFactory.s3Client || newInstance) {
      AwsClientFactory.s3Client = tracer.captureAWSv3Client(new S3Client(AwsClientFactory.getClientConfig()))
    }
    return AwsClientFactory.s3Client
  }

  public static getSecretsManagerClient(newInstance = false): SecretsManagerClient {
    if (!AwsClientFactory.secretsManagerClient || newInstance) {
      // Do not capture secret retieval because it is done outside of hanlder method
      // and no trace Id is present at that moment
      AwsClientFactory.secretsManagerClient = new SecretsManagerClient(AwsClientFactory.getClientConfig())
    }
    return AwsClientFactory.secretsManagerClient
  }

  private static getClientConfig() {
    let config = {}
    if (process.env['AWS_ENDPOINT_URL']) {
      config = {
        ...config,
        endpoint: process.env['AWS_ENDPOINT_URL'],
        region: process.env['AWS_REGION'],
      }
    }
    if (process.env['LOG_AWS']) {
      config = {
        ...config,
        logger: {
          debug: logger.debug,
          info: logger.info,
          warn: logger.warn,
          error: logger.error,
        },
      }
    }
    logger.debug('AWS client config', { config })
    return config
  }
}
