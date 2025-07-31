exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.increments('id').primary();
    table.string('nama', 100).notNullable();
    table.string('email', 100).notNullable().unique();
    table.string('password', 255).notNullable();
    table.string('phone', 20);
    table.text('address');
    table.string('avatar_url', 255);
    table.enum('role', ['user', 'admin', 'moderator']).defaultTo('user');
    table.decimal('balance', 15, 2).defaultTo(0);
    table.decimal('pending_balance', 15, 2).defaultTo(0);
    table.integer('total_submissions').defaultTo(0);
    table.decimal('total_weight', 10, 2).defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.boolean('email_verified').defaultTo(false);
    table.json('ewallet_accounts'); // {dana: '08xxx', ovo: '08xxx', gopay: '08xxx'}
    table.timestamp('last_login_at');
    table.timestamp('join_date').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    // Indexes
    table.index('email');
    table.index('role');
    table.index('is_active');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};