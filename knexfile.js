const path = require('path');
const BASE_PATH = path.join(__dirname, 'db');

module.exports = {
  test: {
    client: 'pg',
    connection: {
      host: "127.0.0.1",
      user: "postgres",
      password: "postgres",
      database: "workflow"
    },
    migrations: {
      directory: path.join(BASE_PATH, 'migrations')
    },
    seeds: {
      directory: path.join(BASE_PATH, 'seeds')
    }
  },
  docker: {
    client: 'pg',
    connection: {
      host: "workflow_postgres",
      user: "postgres",
      password: "postgres",
      database: "workflow",
      port: 5432
    },
    pool: {min: 10, max: 40},
    migrations: {
      directory: path.join(BASE_PATH, 'migrations')
    },
    seeds: {
      directory: path.join(BASE_PATH, 'seeds')
    }
  },
  local_docker_db: {
    client: 'pg',
    connection: {
      host: "localhost",
      user: "postgres",
      password: "postgres",
      database: "workflow",
      port: 5432
    },
    pool: {min: 10, max: 40},
    migrations: {
      directory: path.join(BASE_PATH, 'migrations')
    },
    seeds: {
      directory: path.join(BASE_PATH, 'seeds')
    }
  }
}