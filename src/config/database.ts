import knex, { Knex } from 'knex';
import appConfig from './config';

const dbConfig: Knex.Config = {
  client: 'mysql2',
  connection: {
    host: appConfig.database.host,
    port: appConfig.database.port,
    user: appConfig.database.user,
    password: appConfig.database.password,
    database: appConfig.database.name,
  },
  pool: {
    min: appConfig.isProduction() ? 2 : appConfig.isTest() ? 1 : 2,
    max: appConfig.isProduction() ? 20 : appConfig.isTest() ? 5 : 10,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './src/config/migrations',
    extension: 'ts',
  },
  seeds: {
    directory: './src/config/seeds',
    extension: 'ts',
  },
};

const db: Knex = knex(dbConfig);

export default db;
