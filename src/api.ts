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
  password: string
}

export type AuthResponse = {
  message: string
  user: {
    id: string
    email: string | null
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

export type UploadedDocument = {
  id: string
  original_name?: string
  originalName?: string
  mime_type?: string
  mimeType?: string
  created_at?: string
  createdAt?: string
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
  }
  extractionRecord: {
    id: string
    createdAt: string
  }
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
