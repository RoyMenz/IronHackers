const path = require('path');
const { randomUUID } = require('crypto');
const { BlobServiceClient } = require('@azure/storage-blob');

const env = require('../config/env');

let containerClient = null;

function sanitizeBaseName(fileName) {
  return path
    .basename(fileName, path.extname(fileName))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function ensureContainer() {
  if (!env.azureStorageConnectionString) {
    throw new Error('Azure Blob is not configured. Set AZURE_STORAGE_CONNECTION_STRING in .env');
  }

  if (!containerClient) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      env.azureStorageConnectionString
    );
    containerClient = blobServiceClient.getContainerClient(env.azureStorageContainerName);
  }

  await containerClient.createIfNotExists();
}

function buildBlobName(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const safeBase = sanitizeBaseName(originalName) || 'file';
  return `${Date.now()}-${safeBase}-${randomUUID()}${ext}`;
}

async function uploadBuffer({ buffer, originalName, contentType }) {
  await ensureContainer();

  const blobName = buildBlobName(originalName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: contentType || 'application/octet-stream',
    },
  });

  return {
    blobName,
    containerName: env.azureStorageContainerName,
    url: blockBlobClient.url,
  };
}

module.exports = {
  uploadBuffer,
};
