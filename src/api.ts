const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

type RequestOptions = {
  body?: BodyInit | null
  headers?: HeadersInit
  method?: string
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Request failed with status ${response.status}`

    throw new Error(message)
  }

  return payload as T
}

export type HealthResponse = {
  status: string
  timestamp: string
}

export function getHealthStatus() {
  return request<HealthResponse>('/api/health')
}

export type AuthPayload = {
  email: string
  languagesKnown?: string[]
  name?: string
  password: string
}

export type UserProfile = {
  id: string
  full_name: string | null
  organization_email: string | null
  organization_name?: string | null
  languages_known: string[]
  role?: string | null
}

export type AuthResponse = {
  message: string
  profile: UserProfile | null
  user: {
    id: string
    email: string | null
    user_metadata?: {
      full_name?: string
      name?: string
    } | null
  } | null
  session: {
    access_token: string
    refresh_token: string | null
  } | null
}

export function signUp(payload: AuthPayload) {
  return request<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export function signIn(payload: AuthPayload) {
  return request<AuthResponse>('/api/auth/signin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export function getCurrentUser(token: string) {
  return authorizedRequest<AuthResponse>('/api/auth/me', {
    method: 'GET',
    token,
  })
}

export type UploadedDocument = {
  id: string
  original_name?: string
  originalName?: string
  mime_type?: string
  mimeType?: string
  created_at?: string
  createdAt?: string
}

export type ChatDocumentResponse = {
  answer: string
  extractionId: string
  targetLanguage: string
}

export type UploadDocumentResponse = {
  message: string
  file: {
    id: string
    originalName: string
    mimeType: string
    size: number
    blobName: string
    container: string
    url: string
    createdAt: string
  }
}

export type ExtractAndTranslateResponse = {
  message: string
  document: {
    id: string
    originalName: string
    blobUrl: string
  }
  extraction: {
    modelId: string
    content: string
    pages: Array<{
      pageNumber: number
      lines: string[]
    }>
    keyValuePairs: Array<{
      key: string
      value: string
    }>
  }
  translation: {
    provider: string
    model: string
    targetLanguage: string
    translatedText: string
    translatedPages: Array<{
      pageNumber: number
      translatedText: string
    }>
  }
  extractionRecord: {
    id: string
    createdAt: string
  }
}

export type StoredDocumentViewResponse = {
  document: {
    id: string
    originalName: string
    createdAt: string
  }
  extractionRecord: {
    id: string
    createdAt: string
    documentId: string
    modelId: string
  }
  extraction: {
    content: string
    pages: Array<{
      pageNumber: number
      lines: string[]
    }>
    keyValuePairs: Array<{
      key: string
      value: string
    }>
  }
  translation: {
    provider: string
    model: string
    targetLanguage: string
    translatedText: string
    translatedPages: Array<{
      pageNumber: number
      translatedText: string
    }>
  } | null
  translationHistory: Array<{
    provider?: string
    model?: string
    target_language?: string
    translated_text?: string
    targetLanguage?: string
    translatedText?: string
  }>
}

type AuthorizedOptions = RequestOptions & {
  token: string
}

function authorizedRequest<T>(path: string, options: AuthorizedOptions) {
  return request<T>(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${options.token}`,
      ...options.headers,
    },
  })
}

export function listDocuments(token: string) {
  return authorizedRequest<{ documents: UploadedDocument[] }>('/api/uploads', {
    method: 'GET',
    token,
  })
}

export function uploadDocument(token: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  return authorizedRequest<UploadDocumentResponse>('/api/uploads', {
    method: 'POST',
    body: formData,
    token,
  })
}

export function extractAndTranslateDocument(
  token: string,
  documentId: string,
  targetLanguage: string
) {
  return authorizedRequest<ExtractAndTranslateResponse>(
    `/api/documents/${documentId}/extract-and-translate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targetLanguage }),
      token,
    }
  )
}

export function translateExtraction(token: string, extractionId: string, targetLanguage: string) {
  return authorizedRequest<ExtractAndTranslateResponse>(
    `/api/documents/extractions/${extractionId}/translate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targetLanguage }),
      token,
    }
  )
}

export function getLatestDocumentView(token: string, documentId: string) {
  return authorizedRequest<StoredDocumentViewResponse>(`/api/documents/${documentId}/latest-view`, {
    method: 'GET',
    token,
  })
}

export function chatWithDocument(
  token: string,
  extractionId: string,
  payload: { question: string; targetLanguage: string }
) {
  return authorizedRequest<ChatDocumentResponse>(`/api/documents/extractions/${extractionId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    token,
  })
}

export function listExtractionTranslations(token: string, extractionId: string) {
  return authorizedRequest<{
    extractionId: string
    translations: Array<{
      id: string
      provider: string
      model: string
      target_language: string
      translated_text: string
      translated_pages: Array<{
        pageNumber: number
        translatedText: string
      }>
      created_at: string
    }>
  }>(`/api/documents/extractions/${extractionId}/translations`, {
    method: 'GET',
    token,
  })
}
