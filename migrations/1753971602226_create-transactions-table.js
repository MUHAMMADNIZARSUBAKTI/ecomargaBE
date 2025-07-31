// migrations/005_create_transactions_table.js
exports.up = function(knex) {
  return knex.schema.createTable('transactions', function(table) {
    table.increments('id').primary();
    table.integer('submission_id').unsigned().references('id').inTable('submissions');
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('amount', 15, 2).notNullable();
    table.decimal('fee', 12, 2).defaultTo(0);
    table.decimal('net_amount', 15, 2).notNullable();
    table.enum('payment_method', ['dana', 'ovo', 'gopay', 'bank_transfer']).notNullable();
    table.string('payment_account', 50);
    table.enum('status', ['pending', 'processing', 'completed', 'failed', 'cancelled']).defaultTo('pending');
    table.string('transaction_id', 50).unique();
    table.json('payment_data'); // Gateway response data
    table.text('failure_reason');
    table.timestamp('processed_at');
    table.timestamps(true, true);
    
    // Indexes
    table.index('user_id');
    table.index('submission_id');
    table.index('status');
    table.index('transaction_id');
    table.index('payment_method');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('transactions');
};