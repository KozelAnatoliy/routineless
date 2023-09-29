https://github.com/verdaccio/verdaccio

## Nx plugin

Routineless nx-aws-cdk is a tool to generate boilerplate structure for cloud backend application.

## Build

## Local testing

In order to test plugin locally deploy local npm registry using docker-compose in docker dir.
Update npm config to reference local registry set registry http://localhost:4873/ by appending ~/.npmrc with `registry=http://localhost:4873/`

run `npm run publish:local` to publish routineless to the local registry.

run `npx create-aws-cdk-app test-workspace` to generate workspace with routineless aws cdk preset.
