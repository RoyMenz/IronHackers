//Commiting to check Code Changes
import { useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import './App.css'
import {
  chatWithDocument,
  extractAndTranslateDocument,
  getCurrentUser,
  getHealthStatus,
  getLatestDocumentView,
  listExtractionTranslations,
  listDocuments,
  signIn,
  signUp,
  translateExtraction,
  uploadDocument,
  type AuthResponse,
  type UploadedDocument,
} from './api'

type DocumentItem = {
  id: string
  title: string
  date: string
  status: 'Completed' | 'Processing'
  kind: 'report' | 'markdown' | 'compliance'
  progress?: number
}

type ChatMessage = {
  id: number
  role: 'assistant' | 'user'
  text: string
}

type ExtractionPage = {
  pageNumber: number
  lines: string[]
}

type TranslatedPage = {
  pageNumber: number
  translatedText: string
}

type AuthUser = {
  id: string
  email: string | null
  fullName: string | null
  languagesKnown: string[]
}

type AuthSession = {
  accessToken: string
  refreshToken: string | null
}

const outputLanguages = ['Hindi', 'Tamil', 'Bengali', 'Telugu', 'Marathi', 'Kannada']
const authLanguages = ['English', 'Hindi', 'Tamil', 'Bengali', 'Telugu', 'Marathi', 'Kannada']
const translatedSamples: Record<string, string> = {
  Hindi:
    'यह दस्तावेज़ लैब प्रक्रिया, सैंपल हैंडलिंग, और सुरक्षा निर्देशों का अनुवादित संस्करण है। सभी तकनीकी शब्दों को यथासंभव मूल अर्थ के साथ सुरक्षित रखा गया है ताकि फील्ड टीम इसे सीधे उपयोग कर सके।',
  Tamil:
    'இந்த ஆவணம் ஆய்வக செயல்முறை, மாதிரி கையாளுதல் மற்றும் பாதுகாப்பு வழிமுறைகளின் மொழிபெயர்க்கப்பட்ட பதிப்பு ஆகும். களப்பயன்பாட்டிற்கு தொழில்நுட்ப சொற்கள் இயன்றவரை அசல் பொருளுடன் வைத்திருக்கப்பட்டுள்ளன.',
  Bengali:
    'এই নথিটি ল্যাব প্রক্রিয়া, নমুনা পরিচালনা এবং সুরক্ষা নির্দেশিকার অনূদিত সংস্করণ। ফিল্ড টিম যাতে সহজে ব্যবহার করতে পারে, তাই প্রযুক্তিগত শব্দগুলো মূল অর্থের কাছাকাছি রাখা হয়েছে।',
  Telugu:
    'ఈ పత్రం ప్రయోగశాల ప్రక్రియలు, నమూనా నిర్వహణ మరియు భద్రతా సూచనల అనువాదిత రూపం. ఫీల్డ్ టీమ్ నేరుగా ఉపయోగించగలిగేలా సాంకేతిక పదాలను అసలు భావానికి దగ్గరగా ఉంచాం.',
  Marathi:
    'हा दस्तऐवज प्रयोगशाळा प्रक्रिया, नमुना हाताळणी आणि सुरक्षा सूचनांचा अनुवादित आवृत्ती आहे. फील्ड टीमला थेट वापरता यावा म्हणून तांत्रिक संज्ञा मूळ अर्थाजवळ ठेवण्यात आल्या आहेत.',
  Kannada:
    'ಈ ದಸ್ತಾವೇಜು ಪ್ರಯೋಗಾಲಯ ಪ್ರಕ್ರಿಯೆಗಳು, ಮಾದರಿ ನಿರ್ವಹಣೆ ಮತ್ತು ಭದ್ರತಾ ಸೂಚನೆಗಳ ಅನುವಾದಿತ ಆವೃತ್ತಿಯಾಗಿದೆ. ಫೀಲ್ಡ್ ತಂಡವು ನೇರವಾಗಿ ಬಳಸಲು ತಾಂತ್ರಿಕ ಪದಗಳನ್ನು ಮೂಲ ಅರ್ಥಕ್ಕೆ ಹತ್ತಿರವಾಗಿಯೇ ಉಳಿಸಲಾಗಿದೆ.',
}
const originalSampleText =
  'This document outlines sample intake, reagent preparation, cold-chain handling, and emergency escalation procedures for regional lab operators. Preserve technical terminology, dosage instructions, and sequence-critical actions during translation.'
const authStorageKey = 'lablingo-auth-session'
const speechTextLimit = 2800

type PuterSpeechAudio = {
  play: () => Promise<void> | void
  pause?: () => void
  currentTime?: number
  onended?: (() => void) | null
  onpause?: (() => void) | null
}

declare global {
  interface Window {
    puter?: {
      ai?: {
        txt2speech: (
          text: string,
          options?: {
            language?: string
            voice?: string
            engine?: string
            provider?: string
            model?: string
          }
        ) => Promise<PuterSpeechAudio>
      }
    }
  }
}

function readStoredAuth() {
  if (typeof window === 'undefined') {
    return {
      session: null as AuthSession | null,
      user: null as AuthUser | null,
    }
  }

  const storedValue = window.localStorage.getItem(authStorageKey)
  if (!storedValue) {
    return {
      session: null as AuthSession | null,
      user: null as AuthUser | null,
    }
  }

  try {
    const parsed = JSON.parse(storedValue) as {
      session?: AuthSession
      user?: AuthUser
    }

    return {
      session: parsed.session ?? null,
      user: parsed.user ?? null,
    }
  } catch {
    window.localStorage.removeItem(authStorageKey)
    return {
      session: null as AuthSession | null,
      user: null as AuthUser | null,
    }
  }
}

function mapAuthUser(response: AuthResponse): AuthUser {
  return {
    id: response.user?.id ?? '',
    email: response.user?.email ?? null,
    fullName: response.profile?.full_name ?? getUserDisplayName(response.user),
    languagesKnown: response.profile?.languages_known ?? [],
  }
}

function App() {
  const storedAuth = readStoredAuth()
  const [pathname, setPathname] = useState(() => window.location.pathname)
  const [authSession, setAuthSession] = useState<AuthSession | null>(storedAuth.session)
  const [authUser, setAuthUser] = useState<AuthUser | null>(storedAuth.user)
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [signInError, setSignInError] = useState('')
  const [signInNotice, setSignInNotice] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [documentsError, setDocumentsError] = useState('')
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isProcessingOpen, setIsProcessingOpen] = useState(false)
  const [processingStep, setProcessingStep] = useState<'uploading' | 'extracting' | 'translating' | 'done'>('uploading')
  const [processingError, setProcessingError] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState(outputLanguages[0])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [activeDocumentName, setActiveDocumentName] = useState('Translated document')
  const [translatedText, setTranslatedText] = useState('')
  const [translatedPages, setTranslatedPages] = useState<TranslatedPage[]>([])
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({})
  const [translatedPageCache, setTranslatedPageCache] = useState<Record<string, TranslatedPage[]>>({})
  const [originalText, setOriginalText] = useState(originalSampleText)
  const [extractionPages, setExtractionPages] = useState<ExtractionPage[]>([])
  const [activeExtractionId, setActiveExtractionId] = useState<string | null>(null)
  const [isReaderLanguageLoading, setIsReaderLanguageLoading] = useState(false)
  const [speechLoadingMessageId, setSpeechLoadingMessageId] = useState<number | null>(null)
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null)
  const [isReaderOpen, setIsReaderOpen] = useState(false)
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [showOriginalText, setShowOriginalText] = useState(false)
  const [originalSearch, setOriginalSearch] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant' as const,
      text: 'Ask anything about the uploaded PDF and I will answer from the translated document context.',
    },
  ])
  const fileInputId = useId()
  const latestDocument = documents[0] ?? null
  const isAuthenticated = Boolean(authSession?.accessToken && authUser)
  const readerPages = buildReaderPages({
    extractionPages,
    originalText,
    showOriginalText,
    translatedPages,
    translatedText,
  })
  const safePageIndex = Math.min(currentPageIndex, Math.max(readerPages.length - 1, 0))
  const currentReaderPage = readerPages[safePageIndex] ?? (showOriginalText ? originalText : translatedText)
  const activeSpeechAudioRef = useRef<PuterSpeechAudio | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!authSession || !authUser) {
      window.localStorage.removeItem(authStorageKey)
      return
    }

    window.localStorage.setItem(
      authStorageKey,
      JSON.stringify({
        session: authSession,
        user: authUser,
      })
    )
  }, [authSession, authUser])

  useEffect(() => {
    const accessToken = authSession?.accessToken ?? ''

    if (!accessToken) {
      return
    }

    let isMounted = true

    async function loadCurrentUser() {
      try {
        const response = await getCurrentUser(accessToken)
        if (!isMounted || !response.user?.id) return

        setAuthUser(mapAuthUser(response))
      } catch {
        // Keep the locally stored user if the session check fails transiently.
      }
    }

    loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [authSession?.accessToken])

  useEffect(() => {
    function handlePopState() {
      setPathname(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    if (pathname !== '/dashboard' || authSession) return
    navigateTo('/signin')
  }, [authSession, pathname])

  useEffect(() => {
    async function loadHealth() {
      try {
        await getHealthStatus()
      } catch {
        // Keep the backend heartbeat silent in the UI.
      }
    }

    void loadHealth()
  }, [])

  useEffect(() => {
    if (!isUploadOpen && !isProcessingOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isProcessingOpen, isUploadOpen])

  useEffect(() => {
    return () => {
      activeSpeechAudioRef.current?.pause?.()
      activeSpeechAudioRef.current = null
    }
  }, [])

  useEffect(() => {
    stopSpeechPlayback()
  }, [activeExtractionId, currentPageIndex, showOriginalText])

  useEffect(() => {
    const accessToken = authSession?.accessToken ?? ''

    if (!accessToken) {
      setDocuments([])
      return
    }

    let isMounted = true

    async function loadDocuments() {
      setIsLoadingDocuments(true)
      setDocumentsError('')

      try {
        const response = await listDocuments(accessToken)
        if (!isMounted) return

        setDocuments(response.documents.map(mapUploadedDocument))
      } catch (error) {
        if (!isMounted) return

        setDocumentsError(error instanceof Error ? error.message : 'Unable to load recent documents.')
      } finally {
        if (isMounted) {
          setIsLoadingDocuments(false)
        }
      }
    }

    loadDocuments()

    return () => {
      isMounted = false
    }
  }, [authSession?.accessToken])

  function openUploadModal() {
    setIsUploadOpen(true)
  }

  function openDashboardUpload() {
    navigateTo('/dashboard')
    setIsUploadOpen(true)
  }

  function closeUploadModal() {
    setIsUploadOpen(false)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null
    setSelectedFile(nextFile)
  }

  async function startTranslation() {
    if (!selectedFile || !authSession?.accessToken) return

    setIsUploadOpen(false)
    setIsProcessingOpen(true)
    setIsReaderOpen(false)
    setProcessingStep('uploading')
    setProcessingError('')
    setTranslatedText('')
    setTranslatedPages([])
    setTranslationCache({})
    setTranslatedPageCache({})
    setOriginalText(originalSampleText)
    setExtractionPages([])
    setActiveDocumentName(selectedFile.name)
    setCurrentPageIndex(0)
    setShowOriginalText(false)
    setOriginalSearch('')
    setChatMessages([
      {
        id: 1,
        role: 'assistant',
        text: 'Ask anything about the uploaded PDF and I will answer from the translated document context.',
      },
    ])

    let translatingTimer: number | null = null

    try {
      const uploadResponse = await uploadDocument(authSession.accessToken, selectedFile)

      setProcessingStep('extracting')
      translatingTimer = window.setTimeout(() => {
        setProcessingStep((current) => (current === 'extracting' ? 'translating' : current))
      }, 900)

      const translationResponse = await extractAndTranslateDocument(
        authSession.accessToken,
        uploadResponse.file.id,
        selectedLanguage
      )
      if (translatingTimer) {
        window.clearTimeout(translatingTimer)
      }

      setActiveExtractionId(translationResponse.extractionRecord.id)
      setExtractionPages(translationResponse.extraction.pages)
      setOriginalText(translationResponse.extraction.content || originalSampleText)
      setTranslatedText(translationResponse.translation.translatedText)
      setTranslatedPages(translationResponse.translation.translatedPages)
      setTranslationCache({
        [translationResponse.translation.targetLanguage]: translationResponse.translation.translatedText,
      })
      setTranslatedPageCache({
        [translationResponse.translation.targetLanguage]: translationResponse.translation.translatedPages,
      })
      setProcessingStep('done')
      setDocuments((current) => [
        mapUploadedDocument({
          id: uploadResponse.file.id,
          originalName: uploadResponse.file.originalName,
          mimeType: uploadResponse.file.mimeType,
          createdAt: uploadResponse.file.createdAt,
        }),
        ...current.filter((document) => document.id !== uploadResponse.file.id),
      ])

      window.setTimeout(() => {
        setIsProcessingOpen(false)
        setIsReaderOpen(true)
      }, 400)
    } catch (error) {
      if (translatingTimer) {
        window.clearTimeout(translatingTimer)
      }
      setProcessingError(error instanceof Error ? error.message : 'Unable to process the selected document.')
      setIsProcessingOpen(false)
      setIsUploadOpen(true)
    }
  }

  function closeReader() {
    stopSpeechPlayback()
    setIsReaderOpen(false)
  }

  async function handleViewStoredDocument(documentId: string) {
    if (!authSession?.accessToken) return

    setDocumentsError('')

    try {
      const response = await getLatestDocumentView(authSession.accessToken, documentId)
      setActiveExtractionId(response.extractionRecord.id)
      setActiveDocumentName(response.document.originalName)
      setSelectedFile(null)
      setSelectedLanguage(response.translation?.targetLanguage ?? outputLanguages[0])
      setExtractionPages(response.extraction.pages)
      setOriginalText(response.extraction.content || originalSampleText)
      setTranslatedText(response.translation?.translatedText ?? '')
      setTranslatedPages(response.translation?.translatedPages ?? [])
      setCurrentPageIndex(0)
      setTranslationCache(buildTranslationCache(response))
      setTranslatedPageCache(buildTranslatedPageCache(response))
      setShowOriginalText(false)
      setOriginalSearch('')
      setIsReaderOpen(true)
      setIsChatOpen(false)
      setChatInput('')
      setChatMessages([
        {
          id: 1,
          role: 'assistant',
          text: 'Ask anything about the uploaded PDF and I will answer from the translated document context.',
        },
      ])
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : 'Unable to open this document.')
    }
  }

  async function handleAskDocument() {
    const trimmedInput = chatInput.trim()
    if (!trimmedInput) return

    const nextId = chatMessages.length + 1
    setChatMessages((current) => [
      ...current,
      { id: nextId, role: 'user', text: trimmedInput },
    ])
    setChatInput('')

    if (!authSession?.accessToken || !activeExtractionId) {
      setChatMessages((current) => [
        ...current,
        {
          id: nextId + 1,
          role: 'assistant',
          text: 'Open a processed document first to ask questions about it.',
        },
      ])
      return
    }

    setIsChatLoading(true)

    try {
      const response = await chatWithDocument(authSession.accessToken, activeExtractionId, {
        question: trimmedInput,
        targetLanguage: selectedLanguage,
      })

      setChatMessages((current) => [
        ...current,
        {
          id: nextId + 1,
          role: 'assistant',
          text: response.answer,
        },
      ])
    } catch (error) {
      setChatMessages((current) => [
        ...current,
        {
          id: nextId + 1,
          role: 'assistant',
          text: error instanceof Error ? error.message : 'Unable to answer from this document right now.',
        },
      ])
    } finally {
      setIsChatLoading(false)
    }
  }

  function navigateTo(nextPath: '/' | '/signin' | '/signup' | '/dashboard') {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }

    setPathname(nextPath)
    setIsUploadOpen(false)
  }

  function handleLogout() {
    stopSpeechPlayback()
    setAuthSession(null)
    setAuthUser(null)
    setDocuments([])
    setDocumentsError('')
    setSelectedFile(null)
    setActiveDocumentName('Translated document')
    setTranslatedText('')
    setTranslatedPages([])
    setTranslationCache({})
    setTranslatedPageCache({})
    setOriginalText(originalSampleText)
    setExtractionPages([])
    setActiveExtractionId(null)
    setCurrentPageIndex(0)
    setIsReaderOpen(false)
    setIsUploadOpen(false)
    setIsProcessingOpen(false)
    setIsChatOpen(false)
    setChatInput('')
    setShowOriginalText(false)
    setOriginalSearch('')
    setSignInPassword('')
    navigateTo('/signin')
  }

  function stopSpeechPlayback() {
    const currentAudio = activeSpeechAudioRef.current
    if (!currentAudio) {
      setSpeakingMessageId(null)
      return
    }

    currentAudio.pause?.()
    if (typeof currentAudio.currentTime === 'number') {
      currentAudio.currentTime = 0
    }

    activeSpeechAudioRef.current = null
    setSpeakingMessageId(null)
    setSpeechLoadingMessageId(null)
  }

  async function handleChatMessageSpeech(messageId: number, messageText: string) {
    const textToSpeak = getSpeakableText(messageText)

    if (speakingMessageId === messageId) {
      stopSpeechPlayback()
      return
    }

    if (!textToSpeak) {
      return
    }

    if (!window.puter?.ai?.txt2speech) {
      return
    }

    if (speechLoadingMessageId === messageId) {
      return
    }

    setSpeechLoadingMessageId(messageId)

    try {
      stopSpeechPlayback()

      const speechConfig = getSpeechConfig()
      const audio = await window.puter.ai.txt2speech(textToSpeak, speechConfig)
      activeSpeechAudioRef.current = audio
      setSpeakingMessageId(messageId)

      audio.onended = () => {
        activeSpeechAudioRef.current = null
        setSpeakingMessageId(null)
        setSpeechLoadingMessageId(null)
      }

      audio.onpause = () => {
        if (!activeSpeechAudioRef.current) {
          return
        }

        activeSpeechAudioRef.current = null
        setSpeakingMessageId(null)
        setSpeechLoadingMessageId(null)
      }

      await audio.play()
    } catch (error) {
      activeSpeechAudioRef.current = null
      setSpeakingMessageId(null)
      console.error(error)
    } finally {
      setSpeechLoadingMessageId((current) => (current === messageId ? null : current))
    }
  }

  function applyAuthResponse(response: AuthResponse) {
    if (!response.session?.access_token || !response.user?.id) {
      throw new Error('Authentication succeeded, but no active session was returned.')
    }

    setAuthSession({
      accessToken: response.session.access_token,
      refreshToken: response.session.refresh_token,
    })
    setAuthUser({
      ...mapAuthUser(response),
    })
  }

  async function handleSignInSubmit() {
    const email = signInEmail.trim()
    const password = signInPassword

    if (!email || !password) {
      setSignInError('Email and password are required.')
      return
    }

    setIsSigningIn(true)
    setSignInError('')
    setSignInNotice('')

    try {
      const response = await signIn({ email, password })
      applyAuthResponse(response)
      setSignInPassword('')
      navigateTo('/dashboard')
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : 'Unable to sign in.')
    } finally {
      setIsSigningIn(false)
    }
  }

  async function handleReaderLanguageChange(nextLanguage: string) {
    stopSpeechPlayback()
    setSelectedLanguage(nextLanguage)

    if (!authSession?.accessToken || !activeExtractionId) {
      setTranslatedText(translatedSamples[nextLanguage] ?? translatedSamples.Hindi)
      setTranslatedPages([])
      return
    }

    setIsReaderLanguageLoading(true)
    setDocumentsError('')

    try {
      const cachedTranslation = translationCache[nextLanguage]
      const cachedPages = translatedPageCache[nextLanguage]
      if (cachedTranslation) {
        setTranslatedText(cachedTranslation)
        setTranslatedPages(cachedPages ?? [])
        return
      }

      const storedTranslations = await listExtractionTranslations(authSession.accessToken, activeExtractionId)
      const existingTranslation = storedTranslations.translations.find(
        (translation) => translation.target_language === nextLanguage
      )

      if (existingTranslation) {
        setTranslatedText(existingTranslation.translated_text)
        setTranslatedPages(existingTranslation.translated_pages ?? [])
        setTranslationCache((current) => ({
          ...current,
          [nextLanguage]: existingTranslation.translated_text,
        }))
        setTranslatedPageCache((current) => ({
          ...current,
          [nextLanguage]: existingTranslation.translated_pages ?? [],
        }))
        setCurrentPageIndex(0)
        return
      }

      const response = await translateExtraction(authSession.accessToken, activeExtractionId, nextLanguage)
      setTranslatedText(response.translation.translatedText)
      setTranslatedPages(response.translation.translatedPages)
      setTranslationCache((current) => ({
        ...current,
        [nextLanguage]: response.translation.translatedText,
      }))
      setTranslatedPageCache((current) => ({
        ...current,
        [nextLanguage]: response.translation.translatedPages,
      }))
      setCurrentPageIndex(0)
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : 'Unable to translate into the selected language.')
    } finally {
      setIsReaderLanguageLoading(false)
    }
  }

  if (pathname === '/') {
    return (
      <div className="gateway-shell">
        <header className="gateway-nav">
          <div className="gateway-brand">
            <p>LabLingo</p>
            <span />
          </div>
        </header>

        <main className="gateway-main">
          <div className="gateway-orb gateway-orb--left" aria-hidden="true" />
          <div className="gateway-orb gateway-orb--right" aria-hidden="true" />

          <section className="gateway-hero">
            <p className="gateway-hero__eyebrow">Precision Linguistic Intelligence</p>
            <h1>High-fidelity analysis begins here.</h1>
            <p className="gateway-hero__text">
              Access the ecosystem of scientific precision and linguistic mastery.
            </p>
            <GatewayWorkspaceSummary
              authUserEmail={authUser?.email ?? null}
              documentCount={documents.length}
              isAuthenticated={isAuthenticated}
              isLoadingDocuments={isLoadingDocuments}
              latestDocumentTitle={latestDocument?.title ?? null}
            />

            <div className="gateway-actions">
              <button
                className="gateway-button gateway-button--primary"
                type="button"
                onClick={() => {
                  if (isAuthenticated) {
                    navigateTo('/dashboard')
                    return
                  }

                  navigateTo('/signin')
                }}
              >
                {isAuthenticated ? 'Open Workspace' : 'Sign In'}
                <LoginIcon />
              </button>
              <button
                className="gateway-button gateway-button--secondary"
                type="button"
                onClick={() => {
                  if (isAuthenticated) {
                    openDashboardUpload()
                    return
                  }

                  navigateTo('/signup')
                }}
              >
                {isAuthenticated ? 'Upload Document' : 'Create Account'}
                <ArrowRightIcon />
              </button>
            </div>
          </section>
        </main>

        <footer className="gateway-footer">
          <p>© 2024 LabLingo Precision Systems</p>
          <div>
            <button type="button">Privacy</button>
            <button type="button">Terms</button>
            <button type="button">Security</button>
          </div>
        </footer>
      </div>
    )
  }

  if (pathname === '/signin') {
    return (
      <AuthShell
        actionLabel="Sign In"
        eyebrow="Welcome Back"
        helperText="Enter your organization credentials to continue into the LabLingo workspace."
        title="Sign in to your workspace."
        footerPrompt="Don't have an account?"
        footerAction="Create one"
        errorMessage={signInError}
        infoMessage={signInNotice}
        isSubmitting={isSigningIn}
        onFooterAction={() => {
          setSignInError('')
          setSignInNotice('')
          navigateTo('/signup')
        }}
        onSubmit={handleSignInSubmit}
      >
        <AuthField label="Organization email">
          <input
            type="email"
            placeholder="name@organization.com"
            value={signInEmail}
            onChange={(event) => {
              setSignInEmail(event.target.value)
              if (signInError) setSignInError('')
              if (signInNotice) setSignInNotice('')
            }}
          />
        </AuthField>
        <AuthField label="Password">
          <input
            type="password"
            placeholder="Enter your password"
            value={signInPassword}
            onChange={(event) => {
              setSignInPassword(event.target.value)
              if (signInError) setSignInError('')
              if (signInNotice) setSignInNotice('')
            }}
          />
        </AuthField>
      </AuthShell>
    )
  }

  if (pathname === '/signup') {
    return (
      <SignUpPage
        onAuthenticated={({ session, user }) => {
          setAuthSession(session)
          setAuthUser(user)
          navigateTo('/dashboard')
        }}
        onRequireSignIn={(email, message) => {
          setSignInEmail(email)
          setSignInPassword('')
          setSignInError('')
          setSignInNotice(message)
          navigateTo('/signin')
        }}
        onSignIn={() => navigateTo('/signin')}
      />
    )
  }

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand__mark">
            <ScienceIcon />
          </div>
          <div>
            <p className="brand__name">LabLingo</p>
            <p className="brand__tag">Regional Lab Translator</p>
          </div>
        </div>

        <div className="topbar__utility">
          {isReaderOpen && showOriginalText ? (
            <label className="search" aria-label="Find a word in the original output">
              <SearchIcon />
              <input
                type="search"
                placeholder="Find a word in original output..."
                value={originalSearch}
                onChange={(event) => setOriginalSearch(event.target.value)}
              />
            </label>
          ) : null}

          <div className="topbar__actions">
            <button className="logout-button" type="button" onClick={handleLogout}>
              Logout
            </button>

            <div className="profile-chip">
              <div className="profile-chip__avatar" aria-hidden="true">
                {getInitials(authUser?.fullName ?? authUser?.email ?? 'User')}
              </div>
              <div>
                <p className="profile-chip__name">{authUser?.fullName ?? 'Signed-in user'}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="content">
        {isReaderOpen ? (
          <section className="reader-shell">
            <div className="reader-toolbar">
              <button className="reader-button reader-button--ghost" type="button" onClick={closeReader}>
                <ArrowLeftIcon />
                Back
              </button>

              <div className="reader-toolbar__actions">
                <label className="reader-language" aria-label="Change translated language">
                  <select
                    value={selectedLanguage}
                    disabled={isReaderLanguageLoading}
                    onChange={(event) => {
                      void handleReaderLanguageChange(event.target.value)
                    }}
                  >
                    {outputLanguages.map((language) => (
                      <option key={language} value={language}>
                        {language}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon />
                </label>
                {isReaderLanguageLoading ? (
                  <p className="reader-language-status">Loading {selectedLanguage} translation...</p>
                ) : null}
              </div>
            </div>

            <div className="reader-card">
              <div className="reader-card__header">
                <div>
                  <p className="eyebrow">{showOriginalText ? 'Original Output' : 'Translated Output'}</p>
                  <h2>{activeDocumentName}</h2>
                </div>

                <button
                  className="reader-toggle"
                  type="button"
                  onClick={() => {
                    setShowOriginalText((current) => !current)
                    setOriginalSearch('')
                    setCurrentPageIndex(0)
                  }}
                >
                  {showOriginalText ? 'View translated output' : 'View original output'}
                </button>
              </div>

              <article className="reader-content">
                <p>
                  {showOriginalText
                    ? renderHighlightedText(currentReaderPage, originalSearch)
                    : currentReaderPage}
                </p>
              </article>

              <div className="reader-pagination">
                <button
                  className="reader-page-button"
                  type="button"
                  aria-label="Previous page"
                  disabled={safePageIndex === 0}
                  onClick={() => setCurrentPageIndex((current) => Math.max(current - 1, 0))}
                >
                  <ArrowLeftIcon />
                </button>
                <p className="reader-pagination__meta">
                  Page {safePageIndex + 1} of {Math.max(readerPages.length, 1)}
                </p>
                <button
                  className="reader-page-button"
                  type="button"
                  aria-label="Next page"
                  disabled={safePageIndex >= readerPages.length - 1}
                  onClick={() =>
                    setCurrentPageIndex((current) => Math.min(current + 1, readerPages.length - 1))
                  }
                >
                  <ArrowRightIcon />
                </button>
              </div>
            </div>

            {isReaderLanguageLoading ? (
              <div className="reader-loading-overlay" role="status" aria-live="polite">
                <div className="reader-loading-overlay__card">
                  <div className="reader-loading-overlay__spinner" aria-hidden="true" />
                  <p>Loading {selectedLanguage} translation...</p>
                </div>
              </div>
            ) : null}

            <div className="reader-chat-fab">
              {isChatOpen ? (
                <section className="reader-chat reader-chat--popup">
                  <div className="reader-chat__topbar">
                    <p>Ask about this PDF</p>
                    <button type="button" onClick={() => setIsChatOpen(false)}>
                      <CloseIcon />
                    </button>
                  </div>

                  <div className="reader-chat__messages">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`reader-chat__bubble reader-chat__bubble--${message.role}`}
                      >
                        <div className="reader-chat__bubble-content">
                          <span>{message.text}</span>
                          {message.role === 'assistant' ? (
                            <button
                              className={`reader-chat__speech-button${speakingMessageId === message.id ? ' reader-chat__speech-button--active' : ''}`}
                              type="button"
                              aria-label={speakingMessageId === message.id ? 'Stop audio' : 'Play audio'}
                              disabled={speechLoadingMessageId === message.id}
                              onClick={() => {
                                void handleChatMessageSpeech(message.id, message.text)
                              }}
                            >
                              <VolumeIcon />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {isChatLoading ? (
                      <div className="reader-chat__bubble reader-chat__bubble--assistant reader-chat__bubble--typing">
                        <div className="reader-chat__typing" aria-label="Assistant is typing" role="status">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="reader-chat__composer">
                    <input
                      type="text"
                      placeholder="Ask the LLM about this PDF..."
                      disabled={isChatLoading}
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                    />
                    <button
                      type="button"
                      disabled={isChatLoading || !chatInput.trim()}
                      onClick={() => {
                        void handleAskDocument()
                      }}
                    >
                      {isChatLoading ? 'Thinking...' : 'Ask'}
                    </button>
                  </div>
                </section>
              ) : (
                <button className="reader-chat-launcher" type="button" onClick={() => setIsChatOpen(true)}>
                  <ChatIcon />
                  Chat
                </button>
              )}
            </div>
          </section>
        ) : (
          <>
            <section className="page-intro">
              <p className="eyebrow">Dashboard</p>
              <h1>Welcome, {authUser?.fullName ?? 'Name'}</h1>
              <p className="page-intro__text">
                Your regional lab translation workspace is ready. Review active
                translation jobs, upload new technical documents, and continue where
                you left off.
              </p>
              {documentsError ? <p className="auth-feedback auth-feedback--error">{documentsError}</p> : null}
            </section>

            <section className="overview-grid" aria-label="Overview">
              <article className="upload-panel">
                <div className="upload-panel__icon">
                  <UploadIcon />
                </div>
                <h2>Upload Document</h2>
                <p>
                  Upload technical lab documentation, SOPs, and manuals to translate
                  them into local languages for clearer field-level understanding.
                </p>
                <button className="ghost-button" type="button" onClick={openUploadModal}>
                  Upload Files
                </button>
              </article>
            </section>

            <section className="documents-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Recent activity</p>
                  <h2>Recent Translations</h2>
                </div>
              </div>

              <div className="document-grid">
                {documents.map((document) => (
                  <article key={document.title} className="document-card">
                    <div className="document-card__top">
                      <div className={`document-card__icon document-card__icon--${document.kind}`}>
                        <DocumentIcon kind={document.kind} />
                      </div>
                    </div>

                    <h3>{document.title}</h3>
                    <p>{document.date}</p>

                    <div className="document-card__actions">
                      <button
                        className="small-button small-button--muted"
                        type="button"
                        onClick={() => {
                          void handleViewStoredDocument(document.id)
                        }}
                      >
                        View
                      </button>
                    </div>
                  </article>
                ))}

                {isLoadingDocuments ? (
                  <article className="document-card document-card--skeleton" aria-hidden="true">
                    <div className="skeleton skeleton--square" />
                    <div className="skeleton skeleton--line-lg" />
                    <div className="skeleton skeleton--line-sm" />
                    <div className="document-card__actions">
                      <div className="skeleton skeleton--button" />
                    </div>
                  </article>
                ) : null}
              </div>
            </section>
          </>
        )}

      </main>

      {isUploadOpen ? (
        <div
          className="upload-modal-backdrop"
          role="presentation"
          onClick={closeUploadModal}
        >
          <section
            className="upload-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="upload-modal__header">
              <div>
                <p className="upload-modal__eyebrow">New Translation</p>
                <h2 id="upload-modal-title">Upload document</h2>
              </div>

              <button
                className="upload-modal__close"
                type="button"
                aria-label="Close upload dialog"
                onClick={closeUploadModal}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="upload-modal__body">
              <label
                className={`dropzone${selectedFile ? ' dropzone--selected' : ''}`}
                htmlFor={fileInputId}
              >
                <input
                  id={fileInputId}
                  className="dropzone__input"
                  type="file"
                  accept=".pdf,.doc,.docx,.md,.markdown"
                  onChange={handleFileChange}
                />
                <div className="dropzone__icon">
                  {selectedFile ? <CheckIcon /> : <UploadIcon />}
                </div>
                {selectedFile ? (
                  <>
                    <p className="dropzone__title">File uploaded</p>
                    <p className="dropzone__subtitle">{selectedFile.name}</p>
                    <p className="dropzone__caption">
                      Click here to replace it with another PDF, DOCX, or Markdown file.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="dropzone__title">Drag and drop your file or browse</p>
                    <p className="dropzone__subtitle">Supported formats: PDF, DOCX, Markdown</p>
                    <p className="dropzone__caption">
                      Best for SOPs, manuals, reagent instructions, and process notes
                    </p>
                  </>
                )}
              </label>

              <div className="upload-modal__settings">
                <p className="upload-modal__label">Choose output language</p>

                <label className="language-select" aria-label="Choose output language">
                  <select
                    value={selectedLanguage}
                    onChange={(event) => setSelectedLanguage(event.target.value)}
                  >
                    {outputLanguages.map((language) => (
                      <option key={language} value={language}>
                        {language}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon />
                </label>
              </div>
            </div>

            <div className="upload-modal__footer">
              {processingError ? <p className="auth-feedback auth-feedback--error">{processingError}</p> : null}
              <button
                className={`translate-button${selectedFile ? ' translate-button--ready' : ''}`}
                type="button"
                disabled={!selectedFile || !authSession?.accessToken}
                onClick={() => {
                  void startTranslation()
                }}
              >
                Translate
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isProcessingOpen ? (
        <div className="status-popup-backdrop" role="presentation">
          <section className="status-popup" role="status" aria-live="polite">
            <p className="status-popup__eyebrow">Translation Status</p>
            <h3>
              {processingStep === 'done'
                ? 'Translation ready'
                : processingStep === 'translating'
                  ? 'Translating content'
                  : processingStep === 'extracting'
                    ? 'Extracting text'
                    : 'Uploading file'}
            </h3>
            <p className="status-popup__meta">
              {selectedFile?.name ?? 'Selected document'} to {selectedLanguage}
            </p>

            {processingStep !== 'done' ? (
              <>
                <div className="status-popup__loader" aria-hidden="true">
                  <div className="status-popup__loader-ring status-popup__loader-ring--outer" />
                  <div className="status-popup__loader-ring status-popup__loader-ring--inner" />
                  <div className="status-popup__loader-core">
                    <SparkIcon />
                  </div>
                </div>
                <div className="status-popup__bar">
                  <div
                    className="status-popup__bar-fill"
                    style={{
                      width:
                        processingStep === 'uploading'
                          ? '28%'
                          : processingStep === 'extracting'
                            ? '62%'
                            : '92%',
                    }}
                  />
                </div>
                <p className="status-popup__message">
                  {processingStep === 'uploading'
                    ? 'Uploading your file and preparing it for processing.'
                    : processingStep === 'extracting'
                      ? 'Pulling structured text from the document.'
                      : 'Waiting for the LLM to finish generating translated output.'}
                </p>
              </>
            ) : (
              <p className="status-popup__message">Opening translated reader...</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  )
}

function AuthShell({
  actionLabel,
  children,
  errorMessage,
  infoMessage,
  eyebrow,
  footerAction,
  footerPrompt,
  helperText,
  isSubmitting,
  onFooterAction,
  onSubmit,
  title,
}: {
  actionLabel: string
  children: ReactNode
  errorMessage?: string
  infoMessage?: string
  eyebrow: string
  footerAction: string
  footerPrompt: string
  helperText: string
  isSubmitting?: boolean
  onFooterAction: () => void
  onSubmit: () => Promise<void> | void
  title: string
}) {
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit()
  }

  return (
    <div className="gateway-shell">
      <header className="gateway-nav">
        <div className="gateway-brand">
          <p>LabLingo</p>
          <span />
        </div>
      </header>

      <main className="gateway-main">
        <div className="gateway-orb gateway-orb--left" aria-hidden="true" />
        <div className="gateway-orb gateway-orb--right" aria-hidden="true" />

        <section className="auth-panel">
          <div className="auth-panel__intro">
            <p className="gateway-hero__eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{helperText}</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {children}
            {infoMessage ? <p className="auth-feedback auth-feedback--info">{infoMessage}</p> : null}
            {errorMessage ? <p className="auth-feedback auth-feedback--error">{errorMessage}</p> : null}
            <button
              className="gateway-button gateway-button--primary auth-submit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? `${actionLabel}...` : actionLabel}
              <ArrowRightIcon />
            </button>
          </form>

          <div className="auth-panel__footer">
            <span>{footerPrompt}</span>
            <button type="button" onClick={onFooterAction}>
              {footerAction}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

function AuthField({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function SignUpPage({
  onAuthenticated,
  onRequireSignIn,
  onSignIn,
}: {
  onAuthenticated: (payload: { session: AuthSession; user: AuthUser }) => void
  onRequireSignIn: (email: string, message: string) => void
  onSignIn: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedKnownLanguage, setSelectedKnownLanguage] = useState('')
  const [knownLanguages, setKnownLanguages] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function addKnownLanguage(language: string) {
    if (!language || knownLanguages.includes(language)) return
    setKnownLanguages((current) => [...current, language])
  }

  function removeKnownLanguage(language: string) {
    setKnownLanguages((current) => current.filter((item) => item !== language))
  }

  async function handleSubmit() {
    const trimmedEmail = email.trim()
    const trimmedName = name.trim()

    if (!trimmedEmail || !password) {
      setErrorMessage('Email and password are required.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const response = await signUp({
        email: trimmedEmail,
        languagesKnown: knownLanguages,
        name: trimmedName,
        password,
      })

      if (response.session?.access_token && response.user?.id) {
        onAuthenticated({
          session: {
            accessToken: response.session.access_token,
            refreshToken: response.session.refresh_token,
          },
          user: {
            ...mapAuthUser(response),
          },
        })
        return
      }

      onRequireSignIn(
        trimmedEmail,
        'Account created. Confirm your email if required, then sign in to continue.'
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create your account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      actionLabel="Create an account"
      errorMessage={errorMessage}
      eyebrow="Get Started"
      helperText="Set up your LabLingo access with your organization details and preferred language."
      isSubmitting={isSubmitting}
      title="Create your account."
      footerPrompt="Already have an account?"
      footerAction="Sign in"
      onFooterAction={onSignIn}
      onSubmit={handleSubmit}
    >
      <AuthField label="Name (First and Last)">
        <input
          type="text"
          placeholder="Asha Patel"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </AuthField>
      <AuthField label="Organization email">
        <input
          type="email"
          placeholder="asha@organization.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            if (errorMessage) setErrorMessage('')
          }}
        />
      </AuthField>
      <AuthField label="Password">
        <input
          type="password"
          placeholder="Create a password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            if (errorMessage) setErrorMessage('')
          }}
        />
      </AuthField>
      <AuthField label="Enter password again">
        <input
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value)
            if (errorMessage) setErrorMessage('')
          }}
        />
      </AuthField>
      <AuthField label="Languages known">
        <div className="auth-multi-select">
          <div className="auth-select">
            <select
              value={selectedKnownLanguage}
              onChange={(event) => {
                const nextLanguage = event.target.value
                setSelectedKnownLanguage(nextLanguage)
                addKnownLanguage(nextLanguage)
                setSelectedKnownLanguage('')
              }}
            >
              <option value="">Select a language</option>
              {authLanguages
                .filter((language) => !knownLanguages.includes(language))
                .map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
            </select>
            <ChevronDownIcon />
          </div>

          {knownLanguages.length ? (
            <div className="auth-tags">
              {knownLanguages.map((language) => (
                <button
                  key={language}
                  className="auth-tag"
                  type="button"
                  onClick={() => removeKnownLanguage(language)}
                >
                  <span>{language}</span>
                  <CloseIcon />
                </button>
              ))}
            </div>
          ) : (
            <p className="auth-tags__hint">Selected languages will appear here as tags.</p>
          )}
        </div>
      </AuthField>
    </AuthShell>
  )
}

function GatewayWorkspaceSummary({
  authUserEmail,
  documentCount,
  isAuthenticated,
  isLoadingDocuments,
  latestDocumentTitle,
}: {
  authUserEmail: string | null
  documentCount: number
  isAuthenticated: boolean
  isLoadingDocuments: boolean
  latestDocumentTitle: string | null
}) {
  return (
    <section className="gateway-summary" aria-label="Workspace status">
      <article className="gateway-summary__card">
        <p className="gateway-summary__label">Account</p>
        <strong>{isAuthenticated ? 'Connected' : 'Not signed in'}</strong>
        <span>{isAuthenticated ? authUserEmail : 'Sign in to access your workspace'}</span>
      </article>

      <article className="gateway-summary__card">
        <p className="gateway-summary__label">Documents</p>
        <strong>{isLoadingDocuments ? 'Loading...' : String(documentCount)}</strong>
        <span>
          {isAuthenticated
            ? documentCount
              ? 'Files ready in your workspace'
              : 'Your workspace is ready for the first upload'
            : 'Recent translations appear after sign in'}
        </span>
      </article>

      <article className="gateway-summary__card">
        <p className="gateway-summary__label">Latest</p>
        <strong>{latestDocumentTitle ?? 'No documents yet'}</strong>
        <span>
          {latestDocumentTitle
            ? 'Most recent translated file'
            : 'Upload a document to start extraction and translation'}
        </span>
      </article>
    </section>
  )
}

function getUserDisplayName(
  user:
    | {
        email: string | null
        user_metadata?: {
          full_name?: string
          name?: string
        } | null
      }
    | null
    | undefined
) {
  const fullName = user?.user_metadata?.full_name?.trim()
  if (fullName) return fullName

  const fallbackName = user?.user_metadata?.name?.trim()
  if (fallbackName) return fallbackName

  return null
}

function getInitials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!parts.length) {
    return 'U'
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function buildTranslationCache(response: {
  translation: {
    targetLanguage: string
    translatedText: string
  } | null
  translationHistory?: Array<{
    target_language?: string
    translated_text?: string
    targetLanguage?: string
    translatedText?: string
  }>
}) {
  const cache: Record<string, string> = {}

  if (response.translation?.targetLanguage && response.translation.translatedText) {
    cache[response.translation.targetLanguage] = response.translation.translatedText
  }

  for (const item of response.translationHistory ?? []) {
    const language = item.targetLanguage ?? item.target_language
    const text = item.translatedText ?? item.translated_text

    if (language && text && !cache[language]) {
      cache[language] = text
    }
  }

  return cache
}

function getSpeakableText(content: string) {
  return content.replace(/\s+/g, ' ').trim().slice(0, speechTextLimit)
}

function getSpeechConfig() {
  return {
    provider: 'elevenlabs',
    model: 'eleven_multilingual_v2',
    voice: '21m00Tcm4TlvDq8ikWAM',
  }
}

function buildTranslatedPageCache(response: {
  translation: {
    targetLanguage: string
    translatedPages?: TranslatedPage[]
  } | null
  translationHistory?: Array<{
    target_language?: string
    targetLanguage?: string
    translated_pages?: TranslatedPage[]
  }>
}) {
  const cache: Record<string, TranslatedPage[]> = {}

  if (response.translation?.targetLanguage) {
    cache[response.translation.targetLanguage] = response.translation.translatedPages ?? []
  }

  for (const item of response.translationHistory ?? []) {
    const language = item.targetLanguage ?? item.target_language
    if (language && !cache[language]) {
      cache[language] = Array.isArray(item.translated_pages) ? item.translated_pages : []
    }
  }

  return cache
}

function buildReaderPages({
  extractionPages,
  originalText,
  showOriginalText,
  translatedPages,
  translatedText,
}: {
  extractionPages: ExtractionPage[]
  originalText: string
  showOriginalText: boolean
  translatedPages: TranslatedPage[]
  translatedText: string
}) {
  if (!extractionPages.length) {
    return [showOriginalText ? originalText : translatedText]
  }

  if (showOriginalText) {
    return extractionPages.map((page) => page.lines.join('\n').trim() || originalText)
  }

  if (translatedPages.length) {
    return translatedPages.map((page) => page.translatedText || translatedText)
  }

  const translatedParagraphs = translatedText
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (!translatedParagraphs.length) {
    return [translatedText]
  }

  const chunkSize = Math.max(1, Math.ceil(translatedParagraphs.length / extractionPages.length))
  const pages = extractionPages.map((_, index) => {
    const chunk = translatedParagraphs.slice(index * chunkSize, (index + 1) * chunkSize).join('\n\n')
    return chunk || translatedText
  })

  return pages.length ? pages : [translatedText]
}

function mapUploadedDocument(document: UploadedDocument): DocumentItem {
  const originalName = document.originalName ?? document.original_name ?? 'Untitled document'
  const mimeType = document.mimeType ?? document.mime_type ?? ''

  return {
    id: document.id,
    title: originalName,
    date: formatDocumentDate(document.createdAt ?? document.created_at),
    status: 'Completed',
    kind: getDocumentKind(mimeType, originalName),
  }
}

function formatDocumentDate(value?: string) {
  if (!value) return 'Recently uploaded'

  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getDocumentKind(mimeType: string, fileName: string): DocumentItem['kind'] {
  const lowerName = fileName.toLowerCase()

  if (mimeType.includes('text') || lowerName.endsWith('.md') || lowerName.endsWith('.txt')) {
    return 'markdown'
  }

  if (mimeType.includes('image') || lowerName.endsWith('.png') || lowerName.endsWith('.jpg')) {
    return 'compliance'
  }

  return 'report'
}

function renderHighlightedText(content: string, query: string) {
  const trimmedQuery = query.trim()

  if (!trimmedQuery) return content

  const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = content.split(new RegExp(`(${escapedQuery})`, 'gi'))

  return parts.map((part, index) =>
    part.toLowerCase() === trimmedQuery.toLowerCase() ? (
      <mark key={`${part}-${index}`}>{part}</mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  )
}

function DocumentIcon({ kind }: { kind: DocumentItem['kind'] }) {
  if (kind === 'markdown') return <MarkdownIcon />
  if (kind === 'compliance') return <ShieldIcon />
  return <FileIcon />
}

function SvgIcon({
  children,
  className,
  viewBox = '0 0 24 24',
}: {
  children: ReactNode
  className?: string
  viewBox?: string
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  )
}

function ScienceIcon() {
  return (
    <SvgIcon>
      <path
        d="M9 3h6M10 3v5l-4.8 7.8A3 3 0 0 0 7.8 20h8.4a3 3 0 0 0 2.6-4.2L14 8V3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M8.5 14h7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </SvgIcon>
  )
}

function UploadIcon() {
  return (
    <SvgIcon>
      <path
        d="M12 16V5m0 0-4 4m4-4 4 4M5 19h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </SvgIcon>
  )
}

function SearchIcon() {
  return (
    <SvgIcon>
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </SvgIcon>
  )
}

function CloseIcon() {
  return (
    <SvgIcon>
      <path
        d="m7 7 10 10M17 7 7 17"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </SvgIcon>
  )
}

function LoginIcon() {
  return (
    <SvgIcon>
      <path
        d="M14 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M10 16 14 12 10 8M14 12H4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </SvgIcon>
  )
}

function ArrowRightIcon() {
  return (
    <SvgIcon>
      <path
        d="M5 12h14M13 7l5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </SvgIcon>
  )
}

function CheckIcon() {
  return (
    <SvgIcon>
      <path
        d="m7 12 3.2 3.2L17.5 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </SvgIcon>
  )
}

function ArrowLeftIcon() {
  return (
    <SvgIcon>
      <path
        d="M19 12H5m6-6-6 6 6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </SvgIcon>
  )
}

function VolumeIcon() {
  return (
    <SvgIcon>
      <path
        d="M5 14h3l4 4V6L8 10H5v4Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </SvgIcon>
  )
}

function ChatIcon() {
  return (
    <SvgIcon>
      <path
        d="M6 8.5A2.5 2.5 0 0 1 8.5 6h7A2.5 2.5 0 0 1 18 8.5v4A2.5 2.5 0 0 1 15.5 15H11l-3.5 3v-3H8.5A2.5 2.5 0 0 1 6 12.5v-4Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </SvgIcon>
  )
}

function SparkIcon() {
  return (
    <SvgIcon>
      <path
        d="M12 4.5 13.8 9l4.7 1.8-4.7 1.8L12 17l-1.8-4.4-4.7-1.8L10.2 9 12 4.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </SvgIcon>
  )
}

function ChevronDownIcon() {
  return (
    <SvgIcon>
      <path
        d="m7 10 5 5 5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </SvgIcon>
  )
}

function FileIcon() {
  return (
    <SvgIcon>
      <path
        d="M8 4h5l4 4v12H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M13 4v4h4" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
    </SvgIcon>
  )
}

function MarkdownIcon() {
  return (
    <SvgIcon viewBox="0 0 32 24">
      <path
        d="M2 3.5A1.5 1.5 0 0 1 3.5 2h25A1.5 1.5 0 0 1 30 3.5v17a1.5 1.5 0 0 1-1.5 1.5h-25A1.5 1.5 0 0 1 2 20.5v-17Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M7 17V8l4.5 5L16 8v9m4-4h5m-2.5-3v6l2.5-2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </SvgIcon>
  )
}

function ShieldIcon() {
  return (
    <SvgIcon>
      <path
        d="M12 3 6.5 5v6.2c0 3.6 2.3 6.9 5.5 7.8 3.2-.9 5.5-4.2 5.5-7.8V5L12 3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m9.5 12 1.7 1.7 3.3-3.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </SvgIcon>
  )
}

export default App
