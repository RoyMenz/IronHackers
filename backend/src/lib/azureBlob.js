const path = require('path');
const { randomUUID } = require('crypto');
const { BlobServiceClient } = require('@azure/storage-blob');

const env = require('../config/env');

let blobServiceClient = null;
let uploadContainerClient = null;

function ensureConnectionString() {
  if (!env.azureStorageConnectionString) {
    throw new Error('Azure Blob is not configured. Set AZURE_STORAGE_CONNECTION_STRING in .env');
  }
}

function getBlobServiceClient() {
  ensureConnectionString();
  if (!blobServiceClient) {
    blobServiceClient = BlobServiceClient.fromConnectionString(env.azureStorageConnectionString);
  }
  return blobServiceClient;
}

function sanitizeBaseName(fileName) {
  return path
    .basename(fileName, path.extname(fileName))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function ensureContainer() {
  if (!uploadContainerClient) {
    uploadContainerClient = getBlobServiceClient().getContainerClient(env.azureStorageContainerName);
  }

  await uploadContainerClient.createIfNotExists();
}

function buildBlobName(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const safeBase = sanitizeBaseName(originalName) || 'file';
  return `${Date.now()}-${safeBase}-${randomUUID()}${ext}`;
}

async function uploadBuffer({ buffer, originalName, contentType }) {
  await ensureContainer();

  const blobName = buildBlobName(originalName);
  const blockBlobClient = uploadContainerClient.getBlockBlobClient(blobName);

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

function parseBlobUrl(blobUrl) {
  const url = new URL(blobUrl);
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) {
    throw new Error('Invalid blob URL. Could not parse container and blob name');
  }

  const containerName = parts[0];
  const blobName = parts.slice(1).join('/');
  return { containerName, blobName };
}

function getBlobClientFromUrl(blobUrl) {
  const { containerName, blobName } = parseBlobUrl(blobUrl);
  const containerClient = getBlobServiceClient().getContainerClient(containerName);
  return containerClient.getBlobClient(blobName);
}

async function blobExistsFromUrl(blobUrl) {
  const blobClient = getBlobClientFromUrl(blobUrl);
  return blobClient.exists();
}

async function downloadBufferFromBlobUrl(blobUrl) {
  const blobClient = getBlobClientFromUrl(blobUrl);
  const downloadResponse = await blobClient.download();

  if (!downloadResponse.readableStreamBody) {
    throw new Error('Failed to download blob content stream');
  }

  const chunks = [];
  for await (const chunk of downloadResponse.readableStreamBody) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

module.exports = {
  uploadBuffer,
  blobExistsFromUrl,
  downloadBufferFromBlobUrl,
};
