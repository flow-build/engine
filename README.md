<h1 align="center" style="border-bottom: none;">FlowBuild Engine</h1>
<h3 align="center">workflow manager for your project</h3>

[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![codecov](https://codecov.io/gh/flow-build/engine/branch/master/graph/badge.svg)](https://codecov.io/gh/flow-build/engine)
[![npm](https://img.shields.io/npm/dw/@flowbuild/engine)](https://www.npmjs.com/package/@flowbuild/engine)
[![github actions](https://img.shields.io/github/workflow/status/flow-build/engine/Node.js CI)](https://github.com/flow-build/engine/actions?query=workflow%3A%22Node.js+CI%22)

## Dependencies:

```
node v12.13.0 (lts)
npm v6.12.0
```

## Development guidelines
```json
NomeDeClasse
nomeDeMetodo
nomeDeFuncao
nome_de_variavel
nome_de_getter
nome_de_setter
```

```json
Classe{
estáticos
construtor
getters que tem setters
getters sozinhos
setters sozinhos
metodos publicos
metodos privados
}
```

## Run the project:

### On Docker:

To run tests on docker, you may use the command below:
```
docker-compose run -T app ./scripts/run_tests.sh
```

To setup the docker environment, you may run `docker-compose build` followed by `docker-compose up`.
Running `docker-compose up` will setup two containers (Application and Database Server) and run the migrations.

Once the commands above have been executed, you may run `docker exec -it workflow_app /bin/bash` to gain access to a bash inside the container of the Application. To run the tests, you may use the commands below.

To run tests with PostgreSQL database persistence:
```
npm run tests
```

To run tests with memory persistence:
```
npm run tests-memory
```

### On your localhost:

Run the commands below to setup your environment and run the tests to verify that your environment was correctly built.

```
psql -f scripts/sql/create_database.sql
npm install
npm run migrations
npm run tests
npm run tests-memory
```

## Running the examples:
First, install all the dependencies with `npm install`. The examples run with memory persistence option by default.

To run the examples from the root path of the project, you may run a command like the one below:

```
node examples/<example_name>.js
```

## Contributing

Read [CONTRIBUTING](.github/CONTRIBUTING.md) guide.