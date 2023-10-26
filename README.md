[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![License](https://img.shields.io/npm/l/nx.svg?style=flat-square)]()
[![Semantic Release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)]()
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

# @routineless

A set of utilities to simplify aws applications development, testing and deployment.

## @routineless/nx-aws-cdk

Routineless nx-aws-cdk is a tool to generate boilerplate structure for cloud backend application managed by [cdk](https://github.com/aws/aws-cdk).

For detailed documentation navigate to the [package](packages/nx-plugin/README.md).

## create-aws-cdk-app

Executable package that utilizes @routineless/nx-aws-cdk plugin to generate initial project structure.

### Usage

```shell
npx create-aws-cdk-app
```

## Build

## Local testing

In order to test plugin locally deploy local npm registry using docker-compose in docker dir.
Update npm config to reference local registry set registry http://localhost:4873/ by appending ~/.npmrc with `registry=http://localhost:4873/`

run `npm run publish:local` to publish routineless to the local registry.

run `npx create-aws-cdk-app test-workspace` to generate workspace with routineless aws cdk preset.
