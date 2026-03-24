const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function toBoolean(value, fallback = false) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toPositiveInt(process.env.PORT, 3000),
  allowDevAutoConfirmSignup: toBoolean(process.env.ALLOW_DEV_AUTO_CONFIRM_SIGNUP, false),
  azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
  azureStorageContainerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'lablingo-documents',
  maxUploadSizeMb: toPositiveInt(process.env.MAX_UPLOAD_SIZE_MB, 20),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  azureDocumentIntelligenceEndpoint: process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || '',
  azureDocumentIntelligenceKey: process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY || '',
  azureDocumentIntelligenceModelId: process.env.AZURE_DOCUMENT_INTELLIGENCE_MODEL_ID || 'prebuilt-layout',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiTranslationModel: process.env.OPENAI_TRANSLATION_MODEL || 'gpt-4o',
  azureOpenAiEndpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
  azureOpenAiApiKey: process.env.AZURE_OPENAI_API_KEY || '',
  azureOpenAiDeployment: process.env.AZURE_OPENAI_DEPLOYMENT || '',
  azureOpenAiApiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-21',
};

module.exports = env;
