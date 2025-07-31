/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('settings', function(table) {
    table.increments('id').primary();
    table.string('key', 100).unique().notNullable();
    table.jsonb('value').notNullable();
    table.text('description').nullable();
    table.string('category', 50).defaultTo('general');
    table.boolean('is_public').defaultTo(false); // whether frontend can access this setting
    table.timestamps(true, true);
    
    // Indexes
    table.index(['key']);
    table.index(['category']);
    table.index(['is_public']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('settings');
};