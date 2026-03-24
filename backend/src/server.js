const express = require('express');
const multer = require('multer');

const env = require('./config/env');
const authRouter = require('./routes/auth.routes');
const healthRouter = require('./routes/health.routes');
const uploadsRouter = require('./routes/uploads.routes');
const documentProcessingRouter = require('./routes/documentProcessing.routes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.json({
    message: 'LabLingo Express API is running',
  });
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/documents', documentProcessingRouter);

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      error: `File too large. Max allowed size is ${env.maxUploadSizeMb}MB`,
    });
    return;
  }

  if (err.message === 'Unsupported file type') {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err.message && err.message.includes('Document Intelligence could not process this file')) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err.message && err.message.includes('Azure Blob is not configured')) {
    res.status(500).json({ error: err.message });
    return;
  }

  if (err.message && err.message.includes('Supabase is not configured')) {
    res.status(500).json({ error: err.message });
    return;
  }

  if (err.message && err.message.includes('Azure Document Intelligence is not configured')) {
    res.status(500).json({ error: err.message });
    return;
  }

  if (
    err.message &&
    (err.message.includes('OpenAI is not configured') ||
      err.message.includes('Translator is not configured'))
  ) {
    res.status(500).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Something went wrong while processing the request' });
});

const server = app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});

module.exports = { app, server };
