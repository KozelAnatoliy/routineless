[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://badge.fury.io/js/create-aws-cdk-app.svg)](https://www.npmjs.com/package/create-aws-cdk-app)
[![codecov](https://codecov.io/gh/KozelAnatoliy/routineless/graph/badge.svg?token=KLLZDSV5Z3&flag=create-aws-cdk-app)](https://codecov.io/gh/KozelAnatoliy/routineless)
[![Typescript](https://badgen.net/badge/icon/typescript?icon=typescript&label)](https://www.typescriptlang.org/)
[![Semantic Release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)]()
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

# create-aws-cdk-app

This package is an executable that uses [@routineless/nx-aws-plugin](../nx-aws-cdk/) to generate [nx](https://nx.dev/) workspace with [cdk](https://github.com/aws/aws-cdk) and lambda applications.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Maintainers](#maintainers)
- [License](#license)

## Install

To install this package globaly run:

```sh
npm install -g create-aws-cdk-app
```

## Usage

To generate a workspace run:

```sh
npx create-aws-cdk-app nx-aws-cdk-workspace -i infra -l lambda
```

First argument is a workspace name, so after generation completed you can navigate to the `nx-aws-cdk-workspace` folder.

### Local mode

By default cdk executor will deploy all changes to [localstack](https://github.com/localstack/localstack) environment. You need to have [docker](https://docs.docker.com/get-docker/) installed in order to use this mode.

```sh
npx nx cdk infra diff
npx nx cdk infra deploy --all
```

After deployment you can view your resources using [awslocal](https://github.com/localstack/awscli-local) cli:

```sh
awslocal lambda list-functions
awslocal lambda invoke --function-name <functionName> '/dev/stdout'
```

After exploring you can destroy your resources by running `npx nx cdk infra destroy --all` command.

### AWS mode

In order to use cdk executor for aws deployment you need to have configured aws credentials.
You can achieve this by configuring [awscli](https://github.com/aws/aws-cli#installation). And you need to provide `--env <envName>` flag to cdk executor. Environment name can be any string except `local` because it is reserved for localstack environment.

```sh
npx nx cdk infra diff --env dev
npx nx cdk infra deploy --env dev --all
```

After deployment you can explore your resources:

```sh
aws lambda list-functions
aws lambda invoke --function-name <functionName> '/dev/stdout'
// Run to clean up your resources
npx nx cdk infra destroy --all --env dev
```

### Lambda application generation

You can generate new lambda application by running withing you workspace:

```sh
// Optionally you can run deploy in watch mode so it will be deployed instantly after generation and any cahnges. You need to have a separate terminal window for this command.
npx nx cdk infra deploy --env dev --watch
npx nx g aws-lambda lambda
```

### Available options

| name           | type   | default | required | alias | description                                                                                                      |
| -------------- | ------ | ------- | -------- | ----- | ---------------------------------------------------------------------------------------------------------------- |
| infraAppName   | string | infra   | false    | i     | Name of cdk application.                                                                                         |
| lambdaAppName  | string |         | false    | l     | Name of lambda application. If not provided lambda application will not be generated during workspace creationg. |
| unitTestRunner | string | jest    | false    | u     | Will add corresponing unit test executors and files. Available options _jest, none_.                             |

For detailed documentation navigate to the [nx-aws-cdk](packages/nx-plugin/README.md) package. It will has documentation for lambda and cdk applications generators and cdk executor.

## Maintainers

[@KozelAnatoliy](https://github.com/KozelAnatoliy)

## License

MIT © 2023 Anatoli Kozel
