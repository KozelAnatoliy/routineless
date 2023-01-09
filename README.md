https://github.com/verdaccio/verdaccio

## Local testing

In order to test plugin locally deploy local npm registry using docker-compose in docker dir.
Update npm registyr config to reference locla registry npm config set registry http://localhost:4873/

npx create-nx-workspace@latest test-workspace --preset=@routineless/nx-plugin
