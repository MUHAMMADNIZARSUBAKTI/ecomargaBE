/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('bank_sampah', function(table) {
    table.increments('id').primary();
    table.string('nama', 255).notNullable();
    table.text('alamat').notNullable();
    table.string('kota', 100).notNullable();
    table.string('provinsi', 100).notNullable();
    table.string('phone', 20).notNullable();
    table.string('email', 255).notNullable();
    table.jsonb('koordinat').notNullable(); // {latitude: float, longitude: float}
    table.jsonb('jam_operasional').notNullable(); // {senin_jumat: string, sabtu: string, minggu: string}
    table.jsonb('jenis_sampah_diterima').defaultTo('[]'); // array of waste types
    table.decimal('rating', 3, 2).defaultTo(0);
    table.integer('total_reviews').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_partner').defaultTo(false);
    table.string('foto', 255).nullable();
    table.text('deskripsi').nullable();
    table.timestamp('bergabung_sejak').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    // Indexes
    table.index(['is_active']);
    table.index(['is_partner']);
    table.index(['kota']);
    table.index(['provinsi']);
    table.index(['rating']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('bank_sampah');
};