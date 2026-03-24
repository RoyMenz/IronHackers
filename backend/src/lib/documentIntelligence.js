const { AzureKeyCredential } = require('@azure/core-auth');
const { DocumentAnalysisClient } = require('@azure/ai-form-recognizer');

const env = require('../config/env');
const { downloadBufferFromBlobUrl } = require('./azureBlob');

function ensureDocumentIntelligenceConfigured() {
  if (!env.azureDocumentIntelligenceEndpoint || !env.azureDocumentIntelligenceKey) {
    throw new Error(
      'Azure Document Intelligence is not configured. Set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY in .env'
    );
  }
}

function getDocumentClient() {
  ensureDocumentIntelligenceConfigured();
  return new DocumentAnalysisClient(
    env.azureDocumentIntelligenceEndpoint,
    new AzureKeyCredential(env.azureDocumentIntelligenceKey)
  );
}

async function fetchDocumentBuffer(fileUrl) {
  const response = await fetch(fileUrl);
  if (response.ok) {
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  if (response.status === 403 || response.status === 404 || response.status === 409) {
    return downloadBufferFromBlobUrl(fileUrl);
  }

  throw new Error(`Failed to access document URL: ${response.status} ${response.statusText}`);
}

function mapDocumentIntelligenceError(error) {
  const innerCode = error?.details?.error?.innererror?.code;
  if (innerCode === 'InvalidContent') {
    return new Error(
      'Document Intelligence could not process this file. Use a supported format like PDF, DOCX, XLSX, PPTX, JPG, or PNG.'
    );
  }

  return error;
}

async function analyzeDocumentFromUrl(fileUrl) {
  const buffer = await fetchDocumentBuffer(fileUrl);
  const client = getDocumentClient();

  try {
    const poller = await client.beginAnalyzeDocument(env.azureDocumentIntelligenceModelId, buffer);
    const result = await poller.pollUntilDone();

    const content = result?.content || '';
    const pages = Array.isArray(result?.pages)
      ? result.pages.map((page) => ({
          pageNumber: page.pageNumber,
          lines: Array.isArray(page.lines)
            ? page.lines.map((line) => line.content).filter(Boolean)
            : [],
        }))
      : [];

    const keyValuePairs = Array.isArray(result?.keyValuePairs)
      ? result.keyValuePairs.map((kv) => ({
          key: kv?.key?.content || '',
          value: kv?.value?.content || '',
        }))
      : [];

    return {
      modelId: result?.modelId || env.azureDocumentIntelligenceModelId,
      content,
      pages,
      keyValuePairs,
    };
  } catch (error) {
    throw mapDocumentIntelligenceError(error);
  }
}

module.exports = {
  analyzeDocumentFromUrl,
};
