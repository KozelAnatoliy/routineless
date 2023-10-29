[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![License](https://img.shields.io/npm/l/nx.svg?style=flat-square)]()
[![Typescript](https://badgen.net/badge/icon/typescript?icon=typescript&label)](https://www.typescriptlang.org/)
[![Semantic Release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)]()
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

# @routineless/nx-aws-cdk

[Nx](https://nx.dev/) plugin for aws [cdk](https://github.com/aws/aws-cdk) application development.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Maintainers](#maintainers)
- [License](#license)

## Install

To install this plugin to existing nx workspace run:

```sh
npm install -D @routineless/nx-aws-cdk
```

## Usage

Right now this plugin supports nx **integrated repos** only.

### Preset

`@routineless/nx-aws-cdk` can be used to generate aws cdk app with `create-nx-workspace`.

You can generate nx workspace using preset.

```sh
npx create-nx-workspace nx-aws-cdk-workspace --preset @routineless/nx-aws-cdk
```

Same can be achieved by running:

```sh
npx create-aws-cdk-app nx-aws-cdk-workspace
```

This command will create a workspace with cdk application and optionaly initial lambda function app.
It utilizes [cdk-application](###cdk-application-generator) and [aws-lambda](###lambda-application-generator) generators to generate applications.

```
├── apps
│   ├── <lambdaApp>
│   │   └── src
│   │       ├── index.ts
│   │       ├── infra
│   │       │   └── index.ts
│   │       └── runtime
│   │           └── main.ts
│   └── <cdkApp>
│       ├── cdk.json
│       └── src
│           ├── main.ts
│           └── stacks
│
├── docker
│   └── docker-compose.yaml
├── libs
└── nx.json
```

Docker compose file can be used to start localstack environment.

#### Available Options

| name           | type   | default | required | alias | description                                                                                                      |
| -------------- | ------ | ------- | -------- | ----- | ---------------------------------------------------------------------------------------------------------------- |
| infraAppName   | string | infra   | false    | i     | Name of cdk application.                                                                                         |
| lambdaAppName  | string |         | false    | l     | Name of lambda application. If not provided lambda application will not be generated during workspace creationg. |
| unitTestRunner | string | jest    | false    | u     | Will add corresponing unit test executors and files. Available options _jest, none_.                             |

### Cdk application generator

After installing `@routineless/nx-aws-cdk` or generating workspace using preset you can add cdk application to your nx workspace by running:

```sh
npx nx g cdk-application infra
```

> Note: `--setAsRoutinelessInfraApp=true` will set generated app as routineless infra app and all generated lambda functions will be added to this application.

Generated application structure:

```
├── cdk.json
├── jest.config.ts
├── project.json
├── src
│   ├── assets
│   ├── environment.spec.ts
│   ├── environment.ts
│   ├── main.ts
│   └── stacks
│       ├── persistance.spec.ts
│       └── persistance.ts
├── tsconfig.app.json
├── tsconfig.json
└── tsconfig.spec.json
```

Stacks directory contains all cdk stacks and has generated persistance stack with simple S3 bucket for demonstration purposes. Cdk application configuration is defined in cdk.json file. Project json will have cdk preconfigured target.

```json
"cdk": {
  "executor": "@routineless/nx-aws-cdk:cdk",
  "dependsOn": ["build"]
}
```

All stacks that should be managed withing generated cdk application should be described in the main.ts file.

| name                     | type    | default | required | alias | description                                                                                        |
| ------------------------ | ------- | ------- | -------- | ----- | -------------------------------------------------------------------------------------------------- |
| name                     | string  |         | true     |       | Name of cdk application.                                                                           |
| tags                     | string  |         | false    | t     | Tags to apply for generated application.                                                           |
| unitTestRunner           | string  | jest    | false    | u     | Will add corresponing unit test executors and files. Available options _jest, none_.               |
| setAsRoutinelessInfraApp | boolean | false   | false    | i     | Will configure generated cdk app to be infra app where other generated applications will be added. |

### Lambda application generator

Lambda generator will generate nx application for lambda runtime and infrastructure code that can be used by cdk. It also can add lambda to existing cdk application if it is configured as routineless infra app.

```sh
npx nx g aws-lambda foo-lambda
```

Generated application structure:

```
├── jest.config.ts
├── package.json
├── project.json
├── src
│   ├── index.ts
│   ├── infra
│   │   ├── index.spec.ts
│   │   └── index.ts
│   └── runtime
│       ├── main.spec.ts
│       └── main.ts
├── tsconfig.json
├── tsconfig.lib.json
└── tsconfig.spec.json
```

Runtime code is located in `src/runtime/main.ts` file. Infrastructure code is located in `src/infra/index.ts` file.

| name                | type    | default | required | alias | description                                                                            |
| ------------------- | ------- | ------- | -------- | ----- | -------------------------------------------------------------------------------------- |
| name                | string  |         | true     |       | Name of cdk application.                                                               |
| tags                | string  |         | false    | t     | Tags to apply for generated application.                                               |
| unitTestRunner      | string  | jest    | false    | u     | Will add corresponing unit test executors and files. Available options _jest, none_.   |
| directory           | string  |         | false    | c     | A directory name where to generate lambda application. Can be provided using -d alias. |
| addLambdaToInfraApp | boolean | true    | false    | a     | Adds generated lambda to configured cdk infrastrucure app.                             |

### Cdk executor

Cdk executor is responsible for cdk commands execution. It can be used to bootstrap, deploy, destroy and executing other cdk commands. General usage pattern is `npx nx cdk <cdk-project-name> <cdk command> ...args`.

In order to use cdk executor you need a valid `cdk.json` configuration in the root of your application, bare minimal configuration looks like this:

```json
"cdk": {
  "executor": "@routineless/nx-aws-cdk:cdk",
  "dependsOn": ["build"]
}
```

#### Local setup

By default all infrastructure would be deployed to your [localstack](https://github.com/localstack/localstack).
If you were using [@routineless/nx-aws-cdk](###preset) preset you can start localstack by running:

```sh
(cd docker && docker-compose up --wait)
```

Otherwice you need to follow [localstack](https://github.com/localstack/localstack) insallation guide.

Then you can run cdk diff against localstack environment:

```sh
npx nx cdk <cdk-project-name> diff
```

Then you can deploy your application to aws by running:

```sh
npx nx cdk <cdk-project-name> bootstrap
npx nx cdk <cdk-project-name> deploy --all
```

You can inspect deployed resources using [awslocal](https://github.com/localstack/awscli-local) cli.
Note that awslocal uses _us-east-1_ region by default. If you have configured another default region in your `~/.aws/config` file you need to provide `--region` flag to awslocal commands or define `DEFAULT_REGION` env variable to have the same value.

```sh
pip install awscli-local
awslocal lambda list-functions
awslocal lambda invoke --function-name <functionName> '/dev/stdout'
```

Then you can destroy your infrastructure by running:

```sh
npx nx cdk <cdk-project-name> destroy --all
```

All commands can be run with `--watch` flag to enable watch mode.

> Note: Insert gif demo here

#### AWS setup

In order to deploy cdk application to aws account you need to have configured [aws](https://github.com/aws/aws-cli#installation) credentials and provide `--env <env>` flag to cdk executor. Env flag can be anything except `local` as it is reserved for localstack environment.

```sh
npx nx cdk <cdk-project-name> diff --env dev
npx nx cdk <cdk-project-name> bootstrap --env dev
npx nx cdk <cdk-project-name> deploy --all --env dev
// In order to prevent aws cli from sending output to vi you can provide --no-cli-pager
// or run aws configure set cli_pager ""
aws lambda list-functions
aws lambda invoke --function-name <functionName> '/dev/stdout'
npx nx cdk <cdk-project-name> destroy --all --env dev
```

You can provide `--profile <profile>` flag to cdk executor to use specific aws profile. Same can be achieved by setting `AWS_PROFILE` env variable.
Bu default all stacks will resolve their region and account using aws [pseudo parameters](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html) that will be resolved during deployment. You can provide specific account region information using `--region <region>` and `--account <account>` flags. You can use `--resolve` flag to try to resolve account/region information from aws config, it will fallback to pseudo parameters if resolution failes.

```sh
AWS_ENV=dev npx nx cdk <cdk-project-name> diff --resolve
```

| name    | type    | default | required | alias | env variable | description                                                                                                                                 |
| ------- | ------- | ------- | -------- | ----- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| account | number  |         | false    | a     | AWS_ACCOUNT  | AWS account id to deploy cdk application.                                                                                                   |
| region  | string  |         | false    | r     | AWS_REGION   | AWS region to deploy cdk application.                                                                                                       |
| env     | string  |         | local    | e     | AWS_ENV      | Environment name that will be used in result stack names to distinguish different environments.                                             |
| watch   | boolean | false   | false    | w     |              | Watch mode. Will execute provided command on every change detected in cdk app and its dependencies.                                         |
| resolve | boolean | false   | false    | R     |              | Resolve mode. Will try to resolve aws account/region info from local context during build time instead of relying on aws pseudo parameters. |

## Maintainers

[@KozelAnatoliy](https://github.com/KozelAnatoliy)

## License

MIT © 2023 Anatoli Kozel
