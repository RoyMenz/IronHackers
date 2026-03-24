const express = require('express');

const {
  getDocumentByIdForUser,
  createDocumentExtractionRecord,
  getDocumentExtractionByIdForUser,
  getLatestDocumentExtractionByDocumentForUser,
  createDocumentTranslationRecord,
  listDocumentTranslationsByExtractionForUser,
  appendTranslationToExtraction,
} = require('../lib/documents');
const { analyzeDocumentFromUrl } = require('../lib/documentIntelligence');
const { answerQuestionFromDocument, translateExtractedText } = require('../lib/openaiTranslator');
const { blobExistsFromUrl } = require('../lib/azureBlob');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

async function translatePages(pages, targetLanguage) {
  const normalizedPages = Array.isArray(pages) ? pages : [];
  const translatedPages = [];

  for (const page of normalizedPages) {
    const pageText = Array.isArray(page?.lines) ? page.lines.join('\n').trim() : '';

    if (!pageText) {
      translatedPages.push({
        pageNumber: page?.pageNumber ?? translatedPages.length + 1,
        translatedText: '',
      });
      continue;
    }

    const translation = await translateExtractedText({
      text: pageText,
      targetLanguage,
    });

    translatedPages.push({
      pageNumber: page?.pageNumber ?? translatedPages.length + 1,
      translatedText: translation.translatedText,
    });
  }

  return translatedPages;
}

function buildTranslationRecord(translation, translatedPages) {
  return {
    id: require('crypto').randomUUID(),
    created_at: new Date().toISOString(),
    provider: translation.provider,
    model: translation.model,
    target_language: translation.targetLanguage,
    translated_text: translation.translatedText,
    translated_pages: translatedPages,
  };
}

function getTranslatedDocumentForLanguage(extractionRecord, targetLanguage) {
  const llmPayload =
    extractionRecord.llm_payload_json && typeof extractionRecord.llm_payload_json === 'object'
      ? extractionRecord.llm_payload_json
      : {};
  const translationHistory = Array.isArray(llmPayload.translation_history)
    ? llmPayload.translation_history
    : [];

  const matchedTranslation = translationHistory.find(
    (item) => item?.target_language === targetLanguage || item?.targetLanguage === targetLanguage
  );

  if (matchedTranslation?.translated_text) {
    return matchedTranslation.translated_text;
  }

  const currentTranslation = llmPayload.translation;
  if (
    currentTranslation &&
    (currentTranslation.targetLanguage === targetLanguage ||
      currentTranslation.target_language === targetLanguage) &&
    (currentTranslation.translatedText || currentTranslation.translated_text)
  ) {
    return currentTranslation.translatedText || currentTranslation.translated_text;
  }

  return null;
}

function getDocumentTitleFromExtractionRecord(extractionRecord) {
  const llmPayload =
    extractionRecord.llm_payload_json && typeof extractionRecord.llm_payload_json === 'object'
      ? extractionRecord.llm_payload_json
      : {};

  return llmPayload?.source?.originalName || 'Uploaded PDF';
}

router.get('/:documentId/latest-view', requireAuth, async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const document = await getDocumentByIdForUser({
      userId: req.user.id,
      documentId,
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found for this user' });
      return;
    }

    const extractionRecord = await getLatestDocumentExtractionByDocumentForUser({
      userId: req.user.id,
      documentId,
    });

    if (!extractionRecord) {
      res.status(404).json({ error: 'No processed translation found for this document yet' });
      return;
    }

    const llmPayload =
      extractionRecord.llm_payload_json && typeof extractionRecord.llm_payload_json === 'object'
        ? extractionRecord.llm_payload_json
        : {};

    const translation =
      llmPayload.translation ||
      (Array.isArray(llmPayload.translation_history) ? llmPayload.translation_history[0] : null);

    res.status(200).json({
      document: {
        id: document.id,
        originalName: document.original_name,
        createdAt: document.created_at,
      },
      extractionRecord: {
        id: extractionRecord.id,
        createdAt: extractionRecord.created_at,
        documentId: extractionRecord.document_id,
        modelId: extractionRecord.model_id,
      },
      extraction: {
        content: extractionRecord.extracted_content,
        pages: Array.isArray(extractionRecord.pages_json) ? extractionRecord.pages_json : [],
        keyValuePairs: Array.isArray(extractionRecord.key_value_pairs_json)
          ? extractionRecord.key_value_pairs_json
          : [],
      },
      translation: translation
        ? {
            provider: translation.provider || 'unknown',
            model: translation.model || 'unknown',
            targetLanguage: translation.targetLanguage || translation.target_language || 'English',
            translatedText: translation.translatedText || translation.translated_text || '',
            translatedPages: Array.isArray(translation.translatedPages || translation.translated_pages)
              ? translation.translatedPages || translation.translated_pages
              : [],
          }
        : null,
      translationHistory: Array.isArray(llmPayload.translation_history)
        ? llmPayload.translation_history
        : [],
    });
  } catch (error) {
    next(error);
  }
});

router.post('/extractions/:extractionId/chat', requireAuth, async (req, res, next) => {
  try {
    const { extractionId } = req.params;
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    const targetLanguage = typeof req.body?.targetLanguage === 'string' ? req.body.targetLanguage.trim() : '';

    if (!question) {
      res.status(400).json({ error: 'question is required' });
      return;
    }

    const extractionRecord = await getDocumentExtractionByIdForUser({
      userId: req.user.id,
      extractionId,
    });

    if (!extractionRecord) {
      res.status(404).json({ error: 'Extraction record not found for this user' });
      return;
    }

    const translatedDocument =
      (targetLanguage && getTranslatedDocumentForLanguage(extractionRecord, targetLanguage)) ||
      extractionRecord.extracted_content;

    const answer = await answerQuestionFromDocument({
      documentText: translatedDocument,
      documentTitle: getDocumentTitleFromExtractionRecord(extractionRecord),
      question,
      responseLanguage: targetLanguage || 'English',
    });

    res.status(200).json({
      answer,
      extractionId: extractionRecord.id,
      targetLanguage: targetLanguage || 'Original document',
    });
  } catch (error) {
    next(error);
  }
});

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
    const translatedPages = await translatePages(extraction.pages, targetLanguage);
    const translationRecord = buildTranslationRecord(translation, translatedPages);

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
      translation: {
        ...translation,
        translatedPages,
      },
      translation_history: [translationRecord],
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
      translation: {
        ...translation,
        translatedPages,
      },
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
    const sourcePages = Array.isArray(extractionRecord.pages_json) ? extractionRecord.pages_json : [];
    const translatedPages = await translatePages(sourcePages, targetLanguage);

    const stored = await appendTranslationToExtraction({
      userId: req.user.id,
      extractionId,
      translation: {
        ...translation,
        translatedPages,
      },
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
      translation: {
        ...translation,
        translatedPages,
      },
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
    const llmPayload =
      extractionRecord.llm_payload_json && typeof extractionRecord.llm_payload_json === 'object'
        ? extractionRecord.llm_payload_json
        : {};
    const translationHistory = Array.isArray(llmPayload.translation_history)
      ? llmPayload.translation_history
      : [];
    const enrichedTranslations = translations.map((translationRow) => {
      const historyMatch = translationHistory.find(
        (item) =>
          item?.target_language === translationRow.target_language &&
          item?.translated_text === translationRow.translated_text
      );

      return {
        ...translationRow,
        translated_pages: Array.isArray(historyMatch?.translated_pages) ? historyMatch.translated_pages : [],
      };
    });

    res.status(200).json({
      extractionId: extractionRecord.id,
      translations: enrichedTranslations,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
