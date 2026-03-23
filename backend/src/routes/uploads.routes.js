const path = require('path');
const express = require('express');
const multer = require('multer');

const env = require('../config/env');
const { uploadBuffer } = require('../lib/azureBlob');
const { createDocumentRecord, listDocumentsByUser } = require('../lib/documents');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/rtf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const allowedExtensions = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.rtf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.maxUploadSizeMb * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (allowedMimeTypes.has(file.mimetype) || allowedExtensions.has(ext)) {
      cb(null, true);
      return;
    }
    cb(new Error('Unsupported file type'));
  },
});

router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided. Use form-data field: file' });
      return;
    }

    const result = await uploadBuffer({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
    });
    const record = await createDocumentRecord({
      userId: req.user.id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      blobName: result.blobName,
      container: result.containerName,
      url: result.url,
    });

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: record.id,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        blobName: result.blobName,
        container: result.containerName,
        url: result.url,
        createdAt: record.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const documents = await listDocumentsByUser(req.user.id);
    res.status(200).json({ documents });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
