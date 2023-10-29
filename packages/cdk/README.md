[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![License](https://img.shields.io/npm/l/nx.svg?style=flat-square)]()
[![Typescript](https://badgen.net/badge/icon/typescript?icon=typescript&label)](https://www.typescriptlang.org/)
[![Semantic Release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)]()
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

# cdk

Set of utilities that can be used for [nx](https://nx.dev/) [cdk](https://github.com/aws/aws-cdk) application development.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Maintainers](#maintainers)
- [License](#license)

## Install

To install this package run:

```sh
npm i @routineless/cdk
```

## Usage

There are some type definitions and utility function that can be used for cdk infrastructure code development.

You can use them to define basic stack props to destinguish envirements.

BaseStackProps type definition, you can extend it to add more props and use accross stacks:

```ts
import type { Environment, StackProps } from 'aws-cdk-lib'

export interface CdkEnvironment extends Environment {
  readonly envName: string
}

export interface BaseStackProps extends StackProps {
  readonly env: CdkEnvironment
}
```

Lambda infrastructure code example:

```ts
import { BaseStackProps, capitalize } from '@routineless/cdk'
import { Stack } from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import type { Construct } from 'constructs'
import path from 'path'

export class LambdaStack extends Stack {
  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props)

    new lambda.Function(this, 'LambdaFunction', {
      functionName: `Lambda${capitalize(props.env.envName)}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../runtime')),
      handler: 'main.handler',
    })
  }
}
```

## Maintainers

[@KozelAnatoliy](https://github.com/KozelAnatoliy)

## License

MIT © 2023 Anatoli Kozel
