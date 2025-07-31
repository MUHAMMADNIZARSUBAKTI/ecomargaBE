// migrations/007_create_settings_table.js
exports.up = function(knex) {
  return knex.schema.createTable('settings', function(table) {
    table.increments('id').primary();
    table.string('key', 100).unique().notNullable();
    table.json('value'); // Store as JSON for flexibility
    table.text('description');
    table.string('category', 50);
    table.boolean('is_public').defaultTo(false); // Can be accessed by non-admin users
    table.timestamps(true, true);
    
    // Indexes
    table.index('key');
    table.index('category');
    table.index('is_public');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('settings');
};