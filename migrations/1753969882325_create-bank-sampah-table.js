exports.up = function(knex) {
  return knex.schema.createTable('bank_sampah', function(table) {
    table.increments('id').primary();
    table.string('nama', 150).notNullable();
    table.text('alamat').notNullable();
    table.string('kota', 50).notNullable();
    table.string('provinsi', 50).notNullable();
    table.string('phone', 20);
    table.string('email', 100);
    table.json('koordinat'); // {latitude: -6.xxx, longitude: 110.xxx}
    table.json('jam_operasional'); // {senin_jumat: '08:00-16:00', sabtu: '08:00-12:00', minggu: 'Tutup'}
    table.json('jenis_sampah_diterima'); // ['Botol Plastik', 'Kardus', 'Kaleng']
    table.decimal('rating', 3, 2).defaultTo(0);
    table.integer('total_reviews').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_partner').defaultTo(false);
    table.string('foto', 255);
    table.text('deskripsi');
    table.timestamp('bergabung_sejak').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    // Indexes
    table.index('kota');
    table.index('is_active');
    table.index('is_partner');
    table.index('rating');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('bank_sampah');
};