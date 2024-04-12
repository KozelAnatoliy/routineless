import { EventType } from '@routineless/event'
import { LogLevel } from '@routineless/logging'
import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib'
import type { Table } from 'aws-cdk-lib/aws-dynamodb'
import { EventBus, Rule } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import { Function, FunctionProps, LayerVersion, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import type { Construct } from 'constructs'

import { CdkEnvironment } from '../types/base-stack-props'
import { getLambdaCode } from './code'
import { getEventBridgeDestinationResponseEventPattern, getEventBridgeEventPattern } from './event-pattern'

/**
 * The access mode.
 *
 * Values are: read-only (RO) or read-write (RW)
 */
type AccessMode = 'RO' | 'RW'

type BindProps = {
  /**
   * Whether to grant the function access to the table only,
   * @default false
   */
  accessOnly?: boolean
  /**
   * The name of the environment variable to use for the resource.
   */
  envVarName?: string
  /**
   * The access mode for the resource, defaults to 'RO' (read-only)
   * @default 'RO'
   */
  accessMode?: AccessMode
}

type EventBusBindProps = BindProps & {
  events?: EventType[]
  destinationEvents?: EventType[]
}

export type RoutinelessFunctionProps = Partial<FunctionProps> & {
  env: CdkEnvironment
  logLevel?: LogLevel
  powertoolsLayerArn?: string
  logGroupProps?: {
    removalPolicy?: RemovalPolicy
    retention?: RetentionDays
  }
}

/**
 * Custom construct that extends the `Function` construct to include a log group, a Powertools layer,
 * as well as some default properties for the function and a helper method to bind the function to a DynamoDB table.
 *
 * The function is created with the following properties:
 * - `handler` set to `main.handler`
 * - `runtime` set to `Runtime.NODEJS_20_X`
 * - `tracing` set to `Tracing.ACTIVE`
 * - `timeout` set to `Duration.seconds(30)`
 * - `logGroup` set to a new `LogGroup` with the log group name set to `/aws/lambda/${functionName}`
 *
 * By setting a custom log group, you can control the log retention policy and other log group settings
 */
export class RoutinelessFunction extends Function {
  private readonly eventRules: Rule[] = []
  private readonly destinationEventRules: Rule[] = []
  private readonly id: string

  public constructor(scope: Construct, id: string, props: RoutinelessFunctionProps) {
    super(scope, id, {
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.seconds(30),
      tracing: Tracing.ACTIVE,
      code: getLambdaCode({ executionDepth: 2 }),
      handler: 'main.handler',
      ...props,
      // architecture: lambda.Architecture.ARM_64,
      environment: {
        APP_ENV: props.env.envName,
        LOG_LEVEL: props.logLevel || 'info',
        AWS_XRAY_CONTEXT_MISSING: 'IGNORE_ERROR',
        ...props.environment,
      },
    })
    this.id = id

    const powertoolsLayer = LayerVersion.fromLayerVersionArn(
      this,
      'powertools-layer',
      props.powertoolsLayerArn ||
        `arn:aws:lambda:${Stack.of(this).region}:094274105915:layer:AWSLambdaPowertoolsTypeScriptV2:3`,
    )
    this.addLayers(powertoolsLayer)

    new LogGroup(this, `${id}-LambdaLogGroup`, {
      logGroupName: `/aws/lambda/${this.functionName}`,
      removalPolicy: props.logGroupProps?.removalPolicy || RemovalPolicy.DESTROY,
      retention:
        props.logGroupProps?.retention || props.env.envName === 'prod'
          ? RetentionDays.ONE_MONTH
          : RetentionDays.ONE_WEEK,
    })
  }

  /**
   * Binds the function to a DynamoDB table by adding the table name to the environment
   * under the key `TABLE_NAME` and granting the function read-only or read-write access
   * based on the access mode provided.
   *
   * @param table The DynamoDB table to bind the function to
   * @param accessMode The access mode for the table, defaults to 'RO' (read-only)
   * @param envVarName The name of the environment variable to use for the table name, defaults to `TABLE_NAME`
   */
  public bindTable(table: Table, { accessMode, accessOnly, envVarName }: BindProps = {}): this {
    if (accessOnly !== true) {
      this.addEnvironment(envVarName ?? 'TABLE_NAME', table.tableName)
    }
    if (accessMode === 'RW') {
      table.grantReadWriteData(this)
    } else {
      table.grantReadData(this)
    }

    return this
  }

  public bindEventBus(
    eventBus: EventBus,
    { accessMode, accessOnly, envVarName, events, destinationEvents }: EventBusBindProps = {},
  ): this {
    if (accessOnly !== true) {
      this.addEnvironment(envVarName ?? 'EVENT_BUS_NAME', eventBus.eventBusName)
    }
    if (accessMode === 'RW') {
      eventBus.grantPutEventsTo(this)
    }

    if (events) {
      this.eventRules.push(
        new Rule(this, `${this.id}EventBusRule${this.eventRules.length || ''}`, {
          ruleName: `${this.functionName}EventBusRule${this.eventRules.length || ''}`,
          eventPattern: getEventBridgeEventPattern(...events),
          targets: [new LambdaFunction(this)],
          eventBus,
        }),
      )
    }

    if (destinationEvents) {
      this.destinationEventRules.push(
        new Rule(this, `${this.id}DestinationEventBusRule${this.destinationEventRules.length || ''}`, {
          ruleName: `${this.functionName}DestinationEventBusRule${this.destinationEventRules.length || ''}`,
          eventPattern: getEventBridgeDestinationResponseEventPattern(...destinationEvents),
          targets: [new LambdaFunction(this)],
          eventBus,
        }),
      )
    }

    return this
  }
}