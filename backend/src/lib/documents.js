const { getAdminClient } = require('./supabase');

const TABLE_NAME = 'documents';

async function createDocumentRecord({
  userId,
  originalName,
  mimeType,
  size,
  blobName,
  container,
  url,
}) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      user_id: userId,
      original_name: originalName,
      mime_type: mimeType,
      size_bytes: size,
      blob_name: blobName,
      container_name: container,
      blob_url: url,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to save document metadata: ${error.message}`);
  }

  return data;
}

async function listDocumentsByUser(userId) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load documents: ${error.message}`);
  }

  return data;
}

module.exports = {
  createDocumentRecord,
  listDocumentsByUser,
};
