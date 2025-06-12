const { v4: uuidv4 } = require('uuid');

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create files table for uploads
  await knex.schema.createTable('files', (table) => {
    table.string('id').primary();
    table.string('original_name').notNullable();
    table.string('file_name').notNullable();
    table.string('file_path').notNullable();
    table.string('mime_type').notNullable();
    table.bigInteger('size').notNullable();
    table.timestamp('upload_date').defaultTo(knex.fn.now());
    table.timestamp('last_modified').defaultTo(knex.fn.now());
    table.string('status').defaultTo('pending');
    table.json('metadata').defaultTo('{}');
    table.text('error');
    
    table.index(['status']);
    table.index(['mime_type']);
    table.index(['upload_date']);
  });

  // Create table for Teams messages
  await knex.schema.createTable('teams_messages', (table) => {
    table.string('id').primary();
    table.text('message_text');
    table.json('from_user');
    table.string('channel_id').notNullable();
    table.json('channel_data').defaultTo('{}');
    table.string('in_reply_to_id');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.string('status');
    table.text('error');
    
    table.index(['channel_id']);
    table.index(['status']);
    table.index(['created_at']);
    table.index(['in_reply_to_id']);
  });

  // Create table for LLM conversations
  await knex.schema.createTable('llm_conversations', (table) => {
    table.string('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title').notNullable();
    table.json('participants').defaultTo('[]');
    table.json('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.boolean('is_active').defaultTo(true);
    
    table.index(['is_active']);
    table.index(['updated_at']);
  });

  // Create table for LLM messages
  await knex.schema.createTable('llm_messages', (table) => {
    table.string('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('conversation_id').references('id').inTable('llm_conversations').onDelete('CASCADE');
    table.string('role').notNullable(); // 'user', 'assistant', 'system'
    table.text('content').notNullable();
    table.json('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['conversation_id']);
    table.index(['created_at']);
  });

  // Create table for RAG documents
  await knex.schema.createTable('rag_documents', (table) => {
    table.string('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('file_id').references('id').inTable('files').onDelete('SET NULL');
    table.string('collection_name').notNullable();
    table.string('document_id').notNullable(); // ID in the vector database
    table.string('title');
    table.text('summary');
    table.json('metadata').defaultTo('{}');
    table.timestamp('ingested_at').defaultTo(knex.fn.now());
    
    table.index(['collection_name']);
    table.index(['file_id']);
    table.unique(['collection_name', 'document_id']);
  });

  // Create table for RAG chunks
  await knex.schema.createTable('rag_chunks', (table) => {
    table.string('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('document_id').references('id').inTable('rag_documents').onDelete('CASCADE');
    table.string('chunk_id').notNullable(); // ID in the vector database
    table.integer('chunk_index').notNullable();
    table.text('content').notNullable();
    table.json('metadata').defaultTo('{}');
    
    table.index(['document_id']);
    table.index(['chunk_id']);
  });
};

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Drop tables in reverse order to handle foreign key constraints
  await knex.schema.dropTableIfExists('rag_chunks');
  await knex.schema.dropTableIfExists('rag_documents');
  await knex.schema.dropTableIfExists('llm_messages');
  await knex.schema.dropTableIfExists('llm_conversations');
  await knex.schema.dropTableIfExists('teams_messages');
  await knex.schema.dropTableIfExists('files');
};
