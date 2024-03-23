[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Typescript](https://badgen.net/badge/icon/typescript?icon=typescript&label)](https://www.typescriptlang.org/)
[![codecov](https://codecov.io/gh/KozelAnatoliy/routineless/graph/badge.svg?token=KLLZDSV5Z3)](https://codecov.io/gh/KozelAnatoliy/routineless)
[![Semantic Release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)]()
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

# @routineless

A set of utilities to simplify aws applications development, testing and deployment.

## @routineless/nx-aws-cdk

Routineless nx-aws-cdk is a tool to generate boilerplate structure for cloud backend application managed by [cdk](https://github.com/aws/aws-cdk).

For detailed documentation navigate to the [package](packages/nx-aws-cdk/README.md).

## create-aws-cdk-app

Executable [package](packages/create-aws-cdk-app/README.md) that utilizes @routineless/nx-aws-cdk plugin to generate initial project structure.

### Usage

```shell
npx create-aws-cdk-app <workspace-name>
```

## Local testing

In order to test plugin locally deploy local npm registry using docker-compose in docker dir.

run `npm run publish:local` to publish routineless to the local registry.

run `npm_config_registry=http://localhost:4873 npx create-aws-cdk-app@local test-workspace` to generate workspace with routineless aws cdk preset.
