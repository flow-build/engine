const path = require("path");
const BASE_PATH = path.join(__dirname, "db");

module.exports = {
  test: {
    client: "pg",
    connection: {
      host: "127.0.0.1",
      user: "postgres",
      password: "postgres",
      database: "workflow",
    },
    migrations: {
      directory: path.join(BASE_PATH, "migrations"),
    },
    seeds: {
      directory: path.join(BASE_PATH, "seeds"),
    },
  },
  docker: {
    client: "pg",
    connection: {
      host: "flowbuild_db",
      user: "postgres",
      password: "postgres",
      database: "workflow",
      port: 5432,
    },
    pool: { min: 0, max: 100 },
    migrations: {
      directory: path.join(BASE_PATH, "migrations"),
    },
    seeds: {
      directory: path.join(BASE_PATH, "seeds"),
    },
  },
  local_docker_db: {
    client: "pg",
    connection: {
      host: "localhost",
      user: "postgres",
      password: "postgres",
      database: "workflow",
      port: 5432,
    },
    pool: { min: 10, max: 40 },
    migrations: {
      directory: path.join(BASE_PATH, "migrations"),
    },
    seeds: {
      directory: path.join(BASE_PATH, "seeds"),
    },
  },
  sqlite: {
    client: "sqlite3",
    useNullAsDefault: true,
    connection: {
      database: "workflow",
      filename: `${BASE_PATH}/workflow.sqlite`
    },
    pool: {
      min: 1,
      max: 50,
      idleTimeoutMillis: 360000 * 1000
    },
    migrations: {
      directory: path.join(BASE_PATH, "migrations"),
    },
    seeds: {
      directory: path.join(BASE_PATH, "seeds"),
    },
  },
};
