const { randomUUID } = require('crypto');

const { getAdminClient } = require('./supabase');

const DOCUMENTS_TABLE = 'documents';
const EXTRACTIONS_TABLE = 'document_extractions';
const TRANSLATIONS_TABLE = 'document_translations';

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
    .from(DOCUMENTS_TABLE)
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
    .from(DOCUMENTS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load documents: ${error.message}`);
  }

  return data;
}

async function getDocumentByIdForUser({ userId, documentId }) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .select('*')
    .eq('id', documentId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load document: ${error.message}`);
  }

  return data;
}

async function createDocumentExtractionRecord({
  userId,
  documentId,
  modelId,
  extractedContent,
  pages,
  keyValuePairs,
  llmPayload,
}) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(EXTRACTIONS_TABLE)
    .insert({
      user_id: userId,
      document_id: documentId,
      model_id: modelId,
      extracted_content: extractedContent,
      pages_json: pages,
      key_value_pairs_json: keyValuePairs,
      llm_payload_json: llmPayload,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to save extraction data: ${error.message}`);
  }

  return data;
}

async function getDocumentExtractionByIdForUser({ userId, extractionId }) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(EXTRACTIONS_TABLE)
    .select('*')
    .eq('id', extractionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load extraction: ${error.message}`);
  }

  return data;
}

function getTranslationHistory(llmPayload) {
  if (!llmPayload || typeof llmPayload !== 'object') {
    return [];
  }

  const history = llmPayload.translation_history;
  return Array.isArray(history) ? history : [];
}

async function createDocumentTranslationRecord({
  userId,
  extractionId,
  documentId,
  translation,
}) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(TRANSLATIONS_TABLE)
    .insert({
      user_id: userId,
      extraction_id: extractionId,
      document_id: documentId,
      provider: translation.provider,
      model: translation.model,
      target_language: translation.targetLanguage,
      translated_text: translation.translatedText,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to store translation in table: ${error.message}`);
  }

  return data;
}

async function listDocumentTranslationsByExtractionForUser({ userId, extractionId }) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(TRANSLATIONS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('extraction_id', extractionId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load translations: ${error.message}`);
  }

  return data;
}

async function appendTranslationToExtraction({ userId, extractionId, translation }) {
  const current = await getDocumentExtractionByIdForUser({ userId, extractionId });
  if (!current) {
    return null;
  }

  const translationRecord = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    provider: translation.provider,
    model: translation.model,
    target_language: translation.targetLanguage,
    translated_text: translation.translatedText,
  };

  const llmPayload = current.llm_payload_json && typeof current.llm_payload_json === 'object'
    ? { ...current.llm_payload_json }
    : {};

  const history = getTranslationHistory(llmPayload);
  llmPayload.translation = translation;
  llmPayload.translation_history = [translationRecord, ...history];

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(EXTRACTIONS_TABLE)
    .update({ llm_payload_json: llmPayload })
    .eq('id', extractionId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to store translation data: ${error.message}`);
  }

  return {
    extraction: data,
    translationRecord,
  };
}

module.exports = {
  createDocumentRecord,
  listDocumentsByUser,
  getDocumentByIdForUser,
  createDocumentExtractionRecord,
  getDocumentExtractionByIdForUser,
  createDocumentTranslationRecord,
  listDocumentTranslationsByExtractionForUser,
  appendTranslationToExtraction,
  getTranslationHistory,
};
