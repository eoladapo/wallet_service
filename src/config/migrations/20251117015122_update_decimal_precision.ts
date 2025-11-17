import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Update accounts table - change balance precision from (19,4) to (19,2)
  await knex.schema.alterTable('accounts', (table) => {
    table.decimal('balance', 19, 2).notNullable().defaultTo(0).alter();
  });

  // Update transactions table - change amount and balance columns precision from (19,4) to (19,2)
  await knex.schema.alterTable('transactions', (table) => {
    table.decimal('amount', 19, 2).notNullable().alter();
    table.decimal('balance_before', 19, 2).notNullable().alter();
    table.decimal('balance_after', 19, 2).notNullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  // Revert accounts table - change balance precision back to (19,4)
  await knex.schema.alterTable('accounts', (table) => {
    table.decimal('balance', 19, 4).notNullable().defaultTo(0).alter();
  });

  // Revert transactions table - change amount and balance columns precision back to (19,4)
  await knex.schema.alterTable('transactions', (table) => {
    table.decimal('amount', 19, 4).notNullable().alter();
    table.decimal('balance_before', 19, 4).notNullable().alter();
    table.decimal('balance_after', 19, 4).notNullable().alter();
  });
}
