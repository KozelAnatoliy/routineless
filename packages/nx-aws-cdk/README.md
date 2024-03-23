[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://badge.fury.io/js/@routineless%2Fnx-aws-cdk.svg)](https://www.npmjs.com/package/@routineless/nx-aws-cdk)
[![codecov](https://codecov.io/gh/KozelAnatoliy/routineless/graph/badge.svg?token=KLLZDSV5Z3&flag=nx-aws-cdk)](https://codecov.io/gh/KozelAnatoliy/routineless)
[![Typescript](https://badgen.net/badge/icon/typescript?icon=typescript&label)](https://www.typescriptlang.org/)
[![Semantic Release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)]()
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

# @routineless/nx-aws-cdk

[Nx](https://nx.dev/) plugin for aws [cdk](https://github.com/aws/aws-cdk) application development.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
  - [Preset](#preset)
  - [Cdk application generator](#cdk-application-generator)
  - [Lambda application generator](#lambda-application-generator)
  - [Lambda runtime executor](#lambda-runtime-executor)
  - [Cdk executor](#cdk-executor)
  - [Localstack executor](#localstack-executor)
- [Maintainers](#maintainers)
- [License](#license)

## Install

To install this plugin to existing nx workspace run:

```sh
npm install -D @routineless/nx-aws-cdk
```

After installation you need to add `@routineless/nx-aws-cdk` to your `nx.json` plugins section:

```json
{
  "targetDefaults": {...},
  "namedInputs": {...},
  "plugins": [
    "@routineless/nx-aws-cdk"
  ]
}
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
│   │   ├── infra
|   |   |   └── src
|   |   |       └── index.ts
|   |   └── runtime
|   |       └── src
|   |           └── main.ts
│   └── <cdkApp>
│       ├── cdk.json
│       └── src
│           ├── main.ts
│           └── stacks
├── libs
└── nx.json
```

#### Available Options

| name           | type   | default | required | alias | description                                                                                                      |
| -------------- | ------ | ------- | -------- | ----- | ---------------------------------------------------------------------------------------------------------------- |
| infraAppName   | string | infra   | false    | i     | Name of cdk application.                                                                                         |
| lambdaAppName  | string |         | false    | l     | Name of lambda application. If not provided lambda application will not be generated during workspace creationg. |
| unitTestRunner | string | jest    | false    | u     | Will add corresponing unit test executors and files. Available options _jest, none_.                             |

### Cdk application generator

After installing `@routineless/nx-aws-cdk` and adding it to your `nx.json` plugins section or generating workspace using preset you can add cdk application to your nx workspace by running:

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

Stacks directory contains all cdk stacks and has generated persistance stack with simple S3 bucket for demonstration purposes. Cdk application configuration is defined in cdk.json file. Generated project will have inferred **cdk** and **localstack** targets.

You can see them by runnint `npx nx show project <projectName>`:

```json
...
"localstack": {
  "executor": "@routineless/nx-aws-cdk:localstack",
  "options": {},
  "configurations": {}
},
"cdk": {
  "executor": "@routineless/nx-aws-cdk:cdk",
  "dependsOn": ["build"],
  "options": {},
  "configurations": {}
}
...
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
├── infra
|   ├── src
|   │   ├── index.spec.ts
|   │   └── index.ts
|   ├── .eslintrc.json
|   ├── jest.config.ts
|   ├── project.json
|   ├── tsconfig.json
|   ├── tsconfig.lib.json
|   └── tsconfig.spec.json
|
└── runtime
    ├── src
    │   ├── main.spec.ts
    │   └── main.ts
    ├── .eslintrc.json
    ├── jest.config.ts
    ├── project.json
    ├── tsconfig.json
    ├── tsconfig.app.json
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

### Lambda runtime executor

Lambda runtime executor is responsible for preparing your lambda runtime code for deployment.

Executor has two main modes bundled and unbundled. Bundled mode will create a single file that will contain all runtime dependencies and your lambda code. Unbundled mode will keep your lambda and internal dependencies projects structure and bundle third party dependencies in a separate file that will be placed in output node_modules directory.

> Important: Unbundled mode supports only _esm_ format and is in experimental stage. If you encounter any issues building and deploying your project fall back to bundled mode.

Basic configuration can be described in `project.json` file as:

```json
    "build": {
      "executor": "@routineless/nx-aws-cdk:lambda-runtime",
      "outputs": ["{options.outputPath}"],
      "defaultConfiguration": "development",
      "options": {
        "outputPath": "dist/apps/<lambda-project>/runtime",
        "tsConfig": "apps/<lambda-project>/runtime/tsconfig.app.json"
      },
      "configurations": {
        "development": {
          "bundle": false
        },
        "production": {
          "minify": false
        }
      }
    },
```

| name                  | type     | default        | required | alias | description                                                                                                                                  |
| --------------------- | -------- | -------------- | -------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| tsConfig              | string   |                | true     |       | The path to tsconfig file.                                                                                                                   |
| outputPath            | string   |                | true     |       | The output path of the generated files.                                                                                                      |
| main                  | string   |                | false    |       | The path to the entry file, relative to project.                                                                                             |
| bundle                | boolean  | true           | false    |       | Whether to bundle the main entry point and additional entry points. Set to false to keep individual output files. Esm format supported only. |
| format                | string   | esm            | false    | f     | Module format to output.                                                                                                                     |
| outputFileName        | string   |                | false    |       | Name of the main output file. Defaults same basename as 'main' file.                                                                         |
| additionalEntryPoints | string[] | []             | false    |       | List of additional entry points.                                                                                                             |
| assets                | string[] | []             | false    |       | List of static assets.                                                                                                                       |
| external              | string[] | ["@aws-sdk/*"] | false    |       | Mark one or more module as external. Can use _ wildcards, such as '@aws-sdk/_'.                                                              |
| deleteOutputPath      | boolean  | true           | false    |       | Delete the output path before building.                                                                                                      |
| metafile              | boolean  | false          | false    |       | Generate a meta.json file in the output folder that includes metadata about the build. This file can be analyzed by other tools.             |
| minify                | boolean  | false          | false    |       | Minifies outputs.                                                                                                                            |
| skipTypeCheck         | boolean  | false          | false    |       | Skip type-checking via TypeScript. Skipping type-checking speeds up the build but type errors are not caught.                                |
| generatePackageJson   | boolean  | false          | false    |       | Generates a `package.json` with dependencies that were excluded and needs to be installed.                                                   |
| thirdParty            | boolean  | true           | false    |       | Includes third-party packages in the bundle (i.e. npm packages).                                                                             |
| target                | string   | esnext         | false    |       | The environment target for outputs.                                                                                                          |
| esbuildOptions        | object   |                | false    |       | Additional options to pass to esbuild. See https://esbuild.github.io/api/. Cannot be used with 'esbuildConfig' option.                       |
| esbuildConfig         | string   |                | false    |       | Path to a esbuild configuration file. See https://esbuild.github.io/api/. Cannot be used with 'esbuildOptions' option.                       |

### Cdk executor

Cdk executor is responsible for cdk commands execution. It can be used to bootstrap, deploy, destroy and executing other cdk commands. General usage pattern is `npx nx cdk <cdk-project-name> <cdk command> ...args`.

In order to use cdk executor you need a valid `cdk.json` configuration in the root of your application. By default cdk target will be inferred by `@routineless/nx-aws-cdk`, you can add additional target or override default one by adding `cdk` target to your `project.json` file:

```json
"cdk": {
  "executor": "@routineless/nx-aws-cdk:cdk",
  "configurations": {
    "development": {
      "env": "dev",
      "resolve": true
    },
    "production": {
      "env": "prod",
      "resolve": true
    }
  },
  "dependsOn": ["build"]
},
"cdk-new": {
  "executor": "@routineless/nx-aws-cdk:cdk",
  "dependsOn": ["build"],
  "options": {
    "env": "new"
  }
}
```

Using production configuration by providing `-c production` to your cdk command will utilize lambda runtime production configuration that will minify output bundle.

Or you can update `targetDefaults` section in your `nx.json` file to apply default options to all cdk targets:

```json
...
"targetDefaults": {
  "cdk": {
    "options": {
      "region": "us-east-2"
    }
  }
}
...
```

#### Local setup

By default all infrastructure would be deployed to your [localstack](https://github.com/localstack/localstack). It requires [docker](https://docs.docker.com/get-docker/) to be installed and running on your machine.

Then you can run cdk diff against localstack environment:

```sh
npx nx cdk <cdk-project-name> diff
```

You can deploy your application by running:

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
| env     | string  | local   | false    | e     | AWS_ENV      | Environment name that will be used in result stack names to distinguish different environments.                                             |
| watch   | boolean | false   | false    | w     |              | Watch mode. Will execute provided command on every change detected in cdk app and its dependencies.                                         |
| resolve | boolean | false   | false    | R     |              | Resolve mode. Will try to resolve aws account/region info from local context during build time instead of relying on aws pseudo parameters. |

### Localstack executor

Localstack executor is responsible for starting and shutting down localstack docker container. It is used intarnally by [cdk executor](###cdk-executor) in local mode.

This executor will be inferred as a `localstack` target to any project that contains `cdk.json` in its root directory. You can check it by running `npx nx show project <projectName>`.

```json
"localstack": {
  "executor": "@routineless/nx-aws-cdk:localstack",
  "options": {},
  "configurations": {}
}
```

You can use localstack container by running:

```sh
// Start localstack container
npx nx localstack <projectName> start
// Stop localstack container
npx nx localstack <projectName> stop
```

By default cdk executor will start localstack during its first local run and will leave it running for subsequent commands executions. In order to release resources you need to stop it yourself after you are done with local testing.

You can override default localstack options by adding `localstack` target to your `project.json` file:

```json
"localstack": {
  "executor": "@routineless/nx-aws-cdk:localstack",
    "options": {
      "containerName": "my-project-localstack",
      "composeFile": "path/to/localstack/docker-compose.yml",
      "preserveVolumes": true
    }
}
```

Or by updating `targetDefaults` section in your `nx.json` file to apply default options to all localstack targets:

```json
"targetDefaults": {
  "localstack": {
    "options": {
      "containerName": "my-project-localstack",
      "debug": true
    }
  },
}
```

| name            | type    | default         | required | alias | description                                                                                                |
| --------------- | ------- | --------------- | -------- | ----- | ---------------------------------------------------------------------------------------------------------- |
| command         | string  |                 | true     | c     | Localstack commands. Accepts 'start', 'stop'.                                                              |
| containerName   | string  | localstack_main | false    | n     | Localstack container name.                                                                                 |
| composeFile     | string  |                 | false    | f     | Custom localstack docker-compose file path relative to workspace root.                                     |
| volumeMountPath | string  | jest            | false    | v     | Path to mount localstack data. By default data will not be exposed and stored withing docker named volume. |
| debug           | boolean | false           | false    |       | Enable localstack debug mode.                                                                              |
| preserveVolumes | boolean | false           | false    | p     | Preserve localstack docker volumes on shutting down.                                                       |

## Maintainers

[@KozelAnatoliy](https://github.com/KozelAnatoliy)

## License

MIT © 2023 Anatoli Kozel
