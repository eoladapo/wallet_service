import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('accounts', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable();
    table.decimal('balance', 19, 4).notNullable().defaultTo(0);
    table.string('currency', 3).notNullable().defaultTo('NGN');
    table.string('status', 20).notNullable().defaultTo('ACTIVE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('user_id', 'idx_user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('accounts');
}
