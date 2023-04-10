https://github.com/verdaccio/verdaccio

## Nx plugin

Routinelex nx-plugin is a tool to generate boilerplate structure for cloud backend application.

## Build

## Local testing

In order to test plugin locally deploy local npm registry using docker-compose in docker dir.
Update npm config to reference local registry set registry http://localhost:4873/ by appending ~/.npmrc with `registry=http://localhost:4873/`

run `npm run publish:local` to publish routineless to the local registry.

run `npx create-nx-workspace@latest test-workspace --preset=@routineless/nx-plugin` to generate workspace with routineless preset.
