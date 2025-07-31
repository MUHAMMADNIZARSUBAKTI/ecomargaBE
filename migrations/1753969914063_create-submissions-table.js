/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('submissions', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('bank_sampah_id').unsigned().nullable();
    table.string('waste_type', 100).notNullable();
    table.decimal('estimated_weight', 8, 2).notNullable();
    table.decimal('actual_weight', 8, 2).nullable();
    table.decimal('estimated_value', 10, 2).notNullable();
    table.decimal('actual_value', 10, 2).nullable();
    table.decimal('platform_fee', 10, 2).nullable();
    table.decimal('actual_transfer', 10, 2).nullable();
    table.text('description').nullable();
    table.jsonb('photos').defaultTo('[]'); // array of photo URLs
    table.enum('status', ['pending', 'confirmed', 'picked_up', 'processed', 'completed', 'cancelled']).defaultTo('pending');
    table.text('pickup_address').notNullable();
    table.jsonb('pickup_coordinates').nullable(); // {latitude: float, longitude: float}
    table.timestamp('pickup_date').nullable();
    table.string('pickup_time_slot', 50).nullable();
    table.text('pickup_notes').nullable();
    table.text('processing_notes').nullable();
    table.text('cancellation_reason').nullable();
    table.integer('processed_by').unsigned().nullable(); // admin user id
    table.timestamp('confirmed_at').nullable();
    table.timestamp('picked_up_at').nullable();
    table.timestamp('processed_at').nullable();
    table.timestamp('completed_at').nullable();
    table.timestamp('cancelled_at').nullable();
    table.timestamps(true, true);
    
    // Foreign keys
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('bank_sampah_id').references('id').inTable('bank_sampah').onDelete('SET NULL');
    table.foreign('processed_by').references('id').inTable('users').onDelete('SET NULL');
    
    // Indexes
    table.index(['user_id']);
    table.index(['bank_sampah_id']);
    table.index(['status']);
    table.index(['waste_type']);
    table.index(['pickup_date']);
    table.index(['created_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('submissions');
};