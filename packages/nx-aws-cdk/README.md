[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![License](https://img.shields.io/npm/l/nx.svg?style=flat-square)]()
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

Right now this plugin supports nx integrated repos only.
You can add cdk application to your nx workspace by running:

```sh
npx nx g cdk-application infra --setAsRoutinelessInfraApp=true
npx nx cdk infra diff
npx nx g aws-lambda foo-lambda
```

Or you can generate nx workspace using preset

```sh
npx create-nx-workspace nx-aws-cdk-workspace --preset @routineless/nx-aws-cdk
```

Or by running create-aws-cdk-app

```sh
npx create-aws-cdk-app nx-aws-cdk-workspace
```

By default all infrastructure would be deployed to your [localstack](https://github.com/localstack/localstack).
If you were using @routineless/nx-aws-cdk preset you can start localstack by running:

```sh
cd docker
docker-compose up --wait
cd ..
```

Otherwice you need to follow [localstack](https://github.com/localstack/localstack) insallation guide.

Then you can deploy your application to aws by running:

```sh
npx nx cdk infra bootstrap
npx nx cdk infra deploy --all
```

You can inspect deployed resources using [awslocal](https://github.com/localstack/awscli-local) cli.

```sh
pip install awscli-local
awslocal lambda list-functions
awslocal lambda invoke --function-name FooLambda response.json && cat response.json
```

Then you can destroy your infrastructure by running:

```sh
npx nx cdk infra destroy --all
```

## Maintainers

[@KozelAnatoliy](https://github.com/KozelAnatoliy)

## License

MIT © 2023 Anatoli Kozel
