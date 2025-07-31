// migrations/003_create_waste_types_table.js
exports.up = function(knex) {
  return knex.schema.createTable('waste_types', function(table) {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('category', 50).notNullable(); // Plastik, Kertas, Logam, Kaca
    table.decimal('price_per_kg', 10, 2).defaultTo(0);
    table.text('description');
    table.string('image', 255);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    // Indexes
    table.index('category');
    table.index('is_active');
    table.index('name');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('waste_types');
};