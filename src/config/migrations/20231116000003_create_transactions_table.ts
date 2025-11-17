import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('transactions', (table) => {
    table.string('id', 36).primary();
    table.string('account_id', 36).notNullable();
    table.string('type', 20).notNullable();
    table.decimal('amount', 19, 4).notNullable();
    table.decimal('balance_before', 19, 4).notNullable();
    table.decimal('balance_after', 19, 4).notNullable();
    table.string('related_account_id', 36).nullable();
    table.string('related_transaction_id', 36).nullable();
    table.string('reference', 100).notNullable().unique();
    table.text('description').nullable();
    table.string('status', 20).notNullable().defaultTo('COMPLETED');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign key
    table.foreign('account_id').references('id').inTable('accounts').onDelete('CASCADE');

    // Indexes
    table.index('account_id', 'idx_account_id');
    table.index('reference', 'idx_reference');
    table.index('created_at', 'idx_created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('transactions');
}
