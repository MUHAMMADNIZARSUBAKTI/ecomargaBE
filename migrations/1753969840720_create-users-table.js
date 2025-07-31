/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.increments('id').primary();
    table.string('nama', 255).notNullable();
    table.string('email', 255).unique().notNullable();
    table.string('password', 255).notNullable();
    table.string('phone', 20).notNullable();
    table.text('address').notNullable();
    table.enum('role', ['user', 'admin']).defaultTo('user');
    table.boolean('is_active').defaultTo(true);
    table.boolean('email_verified').defaultTo(false);
    table.string('profile_image', 255).nullable();
    table.jsonb('ewallet_accounts').defaultTo('{}');
    table.jsonb('admin_notes').defaultTo('[]');
    table.timestamp('last_login').nullable();
    table.timestamp('join_date').defaultTo(knex.fn.now());
    table.timestamps(true, true); // created_at, updated_at
    
    // Indexes
    table.index(['email']);
    table.index(['role']);
    table.index(['is_active']);
    table.index(['join_date']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};