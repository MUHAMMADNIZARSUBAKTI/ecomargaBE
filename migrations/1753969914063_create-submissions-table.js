// migrations/004_create_submissions_table.js
exports.up = function(knex) {
  return knex.schema.createTable('submissions', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('bank_sampah_id').unsigned().references('id').inTable('bank_sampah');
    table.string('waste_type', 100).notNullable();
    table.decimal('estimated_weight', 8, 2).notNullable();
    table.decimal('actual_weight', 8, 2);
    table.decimal('estimated_value', 12, 2);
    table.decimal('actual_value', 12, 2);
    table.decimal('platform_fee', 12, 2).defaultTo(0);
    table.decimal('actual_transfer', 12, 2);
    table.text('description');
    table.json('photos'); // Array of photo URLs
    table.enum('status', [
      'pending', 
      'confirmed', 
      'picked_up', 
      'processed', 
      'completed', 
      'cancelled',
      'rejected'
    ]).defaultTo('pending');
    table.text('pickup_address');
    table.json('pickup_coordinates'); // {latitude: -6.xxx, longitude: 110.xxx}
    table.timestamp('pickup_date');
    table.string('pickup_time_slot', 20); // "08:00-10:00"
    table.text('pickup_notes');
    table.text('processing_notes');
    table.integer('processed_by').unsigned().references('id').inTable('users');
    table.timestamp('confirmed_at');
    table.timestamp('picked_up_at');
    table.timestamp('processed_at');
    table.timestamp('completed_at');
    table.timestamp('cancelled_at');
    table.timestamps(true, true);
    
    // Indexes
    table.index('user_id');
    table.index('bank_sampah_id');
    table.index('status');
    table.index('pickup_date');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('submissions');
};