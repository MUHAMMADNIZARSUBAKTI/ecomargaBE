// migrations/009_create_file_uploads_table.js
exports.up = function(knex) {
  return knex.schema.createTable('file_uploads', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users');
    table.string('filename', 255).notNullable();
    table.string('original_name', 255).notNullable();
    table.string('file_path', 500).notNullable();
    table.string('file_type', 100).notNullable(); // image/jpeg, image/png, etc
    table.integer('file_size').notNullable(); // in bytes
    table.enum('upload_type', [
      'avatar',
      'submission_photo', 
      'bank_sampah_logo',
      'document',
      'other'
    ]).notNullable();
    table.integer('related_id'); // ID of related record (submission_id, bank_sampah_id, etc)
    table.string('related_type', 50); // submissions, bank_sampah, etc
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    // Indexes
    table.index('user_id');
    table.index('upload_type');
    table.index(['related_type', 'related_id']);
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('file_uploads');
};