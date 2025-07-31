// migrations/010_create_audit_logs_table.js
exports.up = function(knex) {
  return knex.schema.createTable('audit_logs', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users');
    table.string('action', 50).notNullable(); // CREATE, UPDATE, DELETE, LOGIN, etc
    table.string('table_name', 100);
    table.integer('record_id');
    table.json('old_values'); // Previous values before change
    table.json('new_values'); // New values after change
    table.string('ip_address', 45);
    table.text('user_agent');
    table.json('additional_data'); // Any additional context
    table.timestamps(true, true);
    
    // Indexes
    table.index('user_id');
    table.index('action');
    table.index('table_name');
    table.index('record_id');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('audit_logs');
};