const express = require('express');

const {
  getDocumentByIdForUser,
  createDocumentExtractionRecord,
  getDocumentExtractionByIdForUser,
  createDocumentTranslationRecord,
  listDocumentTranslationsByExtractionForUser,
  appendTranslationToExtraction,
} = require('../lib/documents');
const { analyzeDocumentFromUrl } = require('../lib/documentIntelligence');
const { translateExtractedText } = require('../lib/openaiTranslator');
const { blobExistsFromUrl } = require('../lib/azureBlob');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/:documentId/extract-and-translate', requireAuth, async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const targetLanguage = req.body?.targetLanguage || 'English';

    const document = await getDocumentByIdForUser({
      userId: req.user.id,
      documentId,
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found for this user' });
      return;
    }

    const existsInAzure = await blobExistsFromUrl(document.blob_url);
    if (!existsInAzure) {
      res.status(404).json({
        error: 'Document file was not found in Azure Storage for this record',
      });
      return;
    }

    const extraction = await analyzeDocumentFromUrl(document.blob_url);
    const translation = await translateExtractedText({
      text: extraction.content,
      targetLanguage,
    });

    const llmPayload = {
      documentId: document.id,
      userId: document.user_id,
      source: {
        blobUrl: document.blob_url,
        originalName: document.original_name,
        mimeType: document.mime_type,
        uploadedAt: document.created_at,
      },
      extraction,
      translation,
      translation_history: [
        {
          id: require('crypto').randomUUID(),
          created_at: new Date().toISOString(),
          provider: translation.provider,
          model: translation.model,
          target_language: translation.targetLanguage,
          translated_text: translation.translatedText,
        },
      ],
    };

    const extractionRecord = await createDocumentExtractionRecord({
      userId: req.user.id,
      documentId: document.id,
      modelId: extraction.modelId,
      extractedContent: extraction.content,
      pages: extraction.pages,
      keyValuePairs: extraction.keyValuePairs,
      llmPayload,
    });

    const translationTableRow = await createDocumentTranslationRecord({
      userId: req.user.id,
      extractionId: extractionRecord.id,
      documentId: document.id,
      translation,
    });

    res.status(200).json({
      message: 'Document extracted and translated successfully',
      document: {
        id: document.id,
        originalName: document.original_name,
        blobUrl: document.blob_url,
      },
      extraction,
      translation,
      extractionRecord: {
        id: extractionRecord.id,
        createdAt: extractionRecord.created_at,
      },
      translationTableRow: {
        id: translationTableRow.id,
        createdAt: translationTableRow.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/extractions/:extractionId/translate', requireAuth, async (req, res, next) => {
  try {
    const { extractionId } = req.params;
    const targetLanguage = req.body?.targetLanguage || 'English';

    const extractionRecord = await getDocumentExtractionByIdForUser({
      userId: req.user.id,
      extractionId,
    });

    if (!extractionRecord) {
      res.status(404).json({ error: 'Extraction record not found for this user' });
      return;
    }

    const translation = await translateExtractedText({
      text: extractionRecord.extracted_content,
      targetLanguage,
    });

    const stored = await appendTranslationToExtraction({
      userId: req.user.id,
      extractionId,
      translation,
    });

    const translationTableRow = await createDocumentTranslationRecord({
      userId: req.user.id,
      extractionId,
      documentId: extractionRecord.document_id,
      translation,
    });

    res.status(200).json({
      message: 'Existing extracted text translated successfully',
      extractionRecord: {
        id: extractionRecord.id,
        documentId: extractionRecord.document_id,
        modelId: extractionRecord.model_id,
        createdAt: extractionRecord.created_at,
      },
      translation,
      translationRecord: stored.translationRecord,
      translationTableRow: {
        id: translationTableRow.id,
        createdAt: translationTableRow.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/extractions/:extractionId/translations', requireAuth, async (req, res, next) => {
  try {
    const { extractionId } = req.params;

    const extractionRecord = await getDocumentExtractionByIdForUser({
      userId: req.user.id,
      extractionId,
    });

    if (!extractionRecord) {
      res.status(404).json({ error: 'Extraction record not found for this user' });
      return;
    }

    const translations = await listDocumentTranslationsByExtractionForUser({
      userId: req.user.id,
      extractionId,
    });

    res.status(200).json({
      extractionId: extractionRecord.id,
      translations,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
