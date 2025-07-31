// migrations/008_create_reviews_table.js
exports.up = function(knex) {
  return knex.schema.createTable('reviews', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('bank_sampah_id').unsigned().references('id').inTable('bank_sampah').onDelete('CASCADE');
    table.integer('submission_id').unsigned().references('id').inTable('submissions').onDelete('CASCADE');
    table.integer('rating').notNullable(); // 1-5 stars
    table.text('comment');
    table.boolean('is_anonymous').defaultTo(false);
    table.timestamps(true, true);
    
    // Indexes
    table.index('user_id');
    table.index('bank_sampah_id');
    table.index('submission_id');
    table.index('rating');
    table.index('created_at');
    
    // Ensure one review per submission
    table.unique('submission_id');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('reviews');
};