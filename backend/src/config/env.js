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

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toPositiveInt(process.env.PORT, 3000),
  azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
  azureStorageContainerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'lablingo-documents',
  maxUploadSizeMb: toPositiveInt(process.env.MAX_UPLOAD_SIZE_MB, 20),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

module.exports = env;
