// migrations/006_create_notifications_table.js
exports.up = function(knex) {
  return knex.schema.createTable('notifications', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.string('title', 200).notNullable();
    table.text('message').notNullable();
    table.enum('type', [
      'submission',
      'payment', 
      'system',
      'promotion',
      'reminder'
    ]).notNullable();
    table.boolean('is_read').defaultTo(false);
    table.json('data'); // Additional notification data
    table.timestamp('read_at');
    table.timestamps(true, true);
    
    // Indexes
    table.index('user_id');
    table.index('type');
    table.index('is_read');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('notifications');
};