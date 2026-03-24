//Commiting to check Code Changes
import { useEffect, useId, useState, type ChangeEvent, type ReactNode } from 'react'
import './App.css'
import {
  extractAndTranslateDocument,
  getHealthStatus,
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

type AuthUser = {
  id: string
  email: string | null
}

type AuthSession = {
  accessToken: string
  refreshToken: string | null
}

const outputLanguages = ['Hindi', 'Tamil', 'Bengali', 'Telugu', 'Marathi']
const authLanguages = ['English', 'Hindi', 'Tamil', 'Bengali', 'Telugu', 'Marathi']
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
}
const originalSampleText =
  'This document outlines sample intake, reagent preparation, cold-chain handling, and emergency escalation procedures for regional lab operators. Preserve technical terminology, dosage instructions, and sequence-critical actions during translation.'
const authStorageKey = 'lablingo-auth-session'

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

function App() {
  const storedAuth = readStoredAuth()
  const [pathname, setPathname] = useState(() => window.location.pathname)
  const [healthStatus, setHealthStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [healthMessage, setHealthMessage] = useState('Checking backend connection...')
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
  const [translatedText, setTranslatedText] = useState('')
  const [originalText, setOriginalText] = useState(originalSampleText)
  const [activeExtractionId, setActiveExtractionId] = useState<string | null>(null)
  const [isReaderLanguageLoading, setIsReaderLanguageLoading] = useState(false)
  const [isReaderOpen, setIsReaderOpen] = useState(false)
  const [showOriginalText, setShowOriginalText] = useState(false)
  const [originalSearch, setOriginalSearch] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant' as const,
      text: 'Ask anything about the uploaded PDF and I will answer from the translated document context.',
    },
  ])
  const fileInputId = useId()

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
    let isMounted = true

    async function loadHealth() {
      try {
        const response = await getHealthStatus()
        if (!isMounted) return

        setHealthStatus(response.status === 'ok' ? 'connected' : 'error')
        setHealthMessage(
          response.status === 'ok'
            ? `Backend connected. Last heartbeat: ${new Date(response.timestamp).toLocaleString()}`
            : 'Backend responded with an unexpected status.'
        )
      } catch (error) {
        if (!isMounted) return

        setHealthStatus('error')
        setHealthMessage(error instanceof Error ? error.message : 'Unable to reach the backend.')
      }
    }

    loadHealth()

    return () => {
      isMounted = false
    }
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
    setOriginalText(originalSampleText)
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
      setOriginalText(translationResponse.extraction.content || originalSampleText)
      setTranslatedText(translationResponse.translation.translatedText)
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
    setIsReaderOpen(false)
  }

  function handleAskDocument() {
    const trimmedInput = chatInput.trim()
    if (!trimmedInput) return

    const nextId = chatMessages.length + 1
    setChatMessages((current) => [
      ...current,
      { id: nextId, role: 'user', text: trimmedInput },
      {
        id: nextId + 1,
        role: 'assistant',
        text: `Based on the uploaded PDF, the key point is: ${translatedText || originalSampleText}`,
      },
    ])
    setChatInput('')
  }

  function navigateTo(nextPath: '/' | '/signin' | '/signup' | '/dashboard') {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }

    setPathname(nextPath)
    setIsUploadOpen(false)
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
      id: response.user.id,
      email: response.user.email,
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
    setSelectedLanguage(nextLanguage)

    if (!authSession?.accessToken || !activeExtractionId) {
      setTranslatedText(translatedSamples[nextLanguage] ?? translatedSamples.Hindi)
      return
    }

    setIsReaderLanguageLoading(true)

    try {
      const response = await translateExtraction(authSession.accessToken, activeExtractionId, nextLanguage)
      setTranslatedText(response.translation.translatedText)
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
            <ConnectionStatus status={healthStatus} message={healthMessage} />

            <div className="gateway-actions">
              <button
                className="gateway-button gateway-button--primary"
                type="button"
                onClick={() => navigateTo('/signin')}
              >
                Sign In
                <LoginIcon />
              </button>
              <button
                className="gateway-button gateway-button--secondary"
                type="button"
                onClick={() => navigateTo('/signup')}
              >
                Create Account
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
        statusMessage={healthMessage}
        statusState={healthStatus}
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
        statusMessage={healthMessage}
        statusState={healthStatus}
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
            <button className="icon-button" type="button" aria-label="Notifications">
              <BellIcon />
              <span className="icon-button__dot" />
            </button>

            <div className="profile-chip">
              <div className="profile-chip__avatar" aria-hidden="true">
                SJ
              </div>
              <div>
                <p className="profile-chip__name">{authUser?.email ?? 'Signed-in user'}</p>
                <p className="profile-chip__role">Localization Program Lead</p>
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

                <button className="reader-button reader-button--primary" type="button">
                  <VolumeIcon />
                  Text to Speech
                </button>
              </div>
            </div>

            <div className="reader-card">
              <div className="reader-card__header">
                <div>
                  <p className="eyebrow">{showOriginalText ? 'Original Output' : 'Translated Output'}</p>
                  <h2>{selectedFile?.name ?? 'Translated document'}</h2>
                </div>

                <button
                  className="reader-toggle"
                  type="button"
                  onClick={() => {
                    setShowOriginalText((current) => !current)
                    setOriginalSearch('')
                  }}
                >
                  {showOriginalText ? 'View translated output' : 'View original output'}
                </button>
              </div>

              <article className="reader-content">
                <p>
                  {showOriginalText
                    ? renderHighlightedText(originalText, originalSearch)
                    : translatedText}
                </p>
              </article>
            </div>

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
                        {message.text}
                      </div>
                    ))}
                  </div>

                  <div className="reader-chat__composer">
                    <input
                      type="text"
                      placeholder="Ask the LLM about this PDF..."
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                    />
                    <button type="button" onClick={handleAskDocument}>
                      Ask
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
              <h1>Welcome back, Sarah</h1>
              <p className="page-intro__text">
                Signed in as {authUser?.email ?? 'your LabLingo account'}.
              </p>
              <p className="page-intro__text">
                Your regional lab translation workspace is ready. Review active
                translation jobs, upload new technical documents, and continue where
                you left off.
              </p>
              <ConnectionStatus status={healthStatus} message={healthMessage} />
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
                      <button className="small-button small-button--muted" type="button">
                        View
                      </button>
                    </div>

                    {document.progress ? (
                      <div className="progress progress--subtle" aria-label="Processing progress">
                        <div
                          className="progress__bar"
                          style={{ width: `${document.progress}%` }}
                        />
                      </div>
                    ) : null}
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
  statusMessage,
  statusState,
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
  statusMessage: string
  statusState: 'checking' | 'connected' | 'error'
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
          <ConnectionStatus status={statusState} message={statusMessage} />

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
  statusMessage,
  statusState,
}: {
  onAuthenticated: (payload: { session: AuthSession; user: AuthUser }) => void
  onRequireSignIn: (email: string, message: string) => void
  onSignIn: () => void
  statusMessage: string
  statusState: 'checking' | 'connected' | 'error'
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
        password,
      })

      if (response.session?.access_token && response.user?.id) {
        onAuthenticated({
          session: {
            accessToken: response.session.access_token,
            refreshToken: response.session.refresh_token,
          },
          user: {
            id: response.user.id,
            email: response.user.email,
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
      statusMessage={statusMessage}
      statusState={statusState}
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

function ConnectionStatus({
  message,
  status,
}: {
  message: string
  status: 'checking' | 'connected' | 'error'
}) {
  return (
    <div className={`connection-status connection-status--${status}`} role="status">
      <span className="connection-status__dot" aria-hidden="true" />
      <p>{message}</p>
    </div>
  )
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

function BellIcon() {
  return (
    <SvgIcon>
      <path
        d="M9 18h6m-7-2h8l-1-2v-3a4 4 0 1 0-8 0v3l-1 2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
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
