import { useEffect, useId, useState, type ChangeEvent, type ReactNode } from 'react'
import './App.css'

type DocumentItem = {
  title: string
  date: string
  status: 'Completed' | 'Processing'
  kind: 'report' | 'markdown' | 'compliance'
  progress?: number
}

const recentDocuments: DocumentItem[] = [
  {
    title: 'Regional Lab Workflow Guide.pdf',
    date: 'October 12, 2024',
    status: 'Completed',
    kind: 'report',
  },
  {
    title: 'Sample Collection SOP - Hindi.md',
    date: 'October 14, 2024',
    status: 'Processing',
    kind: 'markdown',
    progress: 65,
  },
  {
    title: 'Equipment Calibration Manual - Tamil.pdf',
    date: 'October 10, 2024',
    status: 'Completed',
    kind: 'compliance',
  },
]

const outputLanguages = ['Hindi', 'Tamil', 'Bengali', 'Telugu', 'Marathi']
const authLanguages = ['English', 'Hindi', 'Tamil', 'Bengali', 'Telugu', 'Marathi']

function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(outputLanguages[0])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputId = useId()

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
    if (!isUploadOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isUploadOpen])

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

  function navigateTo(nextPath: '/' | '/signin' | '/signup' | '/dashboard') {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }

    setPathname(nextPath)
    setIsUploadOpen(false)
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
        onFooterAction={() => navigateTo('/signup')}
        onSubmit={() => navigateTo('/dashboard')}
      >
        <AuthField label="Organization email">
          <input type="email" placeholder="name@organization.com" />
        </AuthField>
        <AuthField label="Password">
          <input type="password" placeholder="Enter your password" />
        </AuthField>
      </AuthShell>
    )
  }

  if (pathname === '/signup') {
    return <SignUpPage onComplete={() => navigateTo('/dashboard')} onSignIn={() => navigateTo('/signin')} />
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
          <label className="search" aria-label="Search translated lab documents">
            <SearchIcon />
            <input type="search" placeholder="Search translated lab guides..." />
          </label>

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
                <p className="profile-chip__name">Sarah Jenkins</p>
                <p className="profile-chip__role">Localization Program Lead</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="content">
        <section className="page-intro">
          <p className="eyebrow">Dashboard</p>
          <h1>Welcome back, Sarah</h1>
          <p className="page-intro__text">
            Your regional lab translation workspace is ready. Review active
            translation jobs, upload new technical documents, and continue where
            you left off.
          </p>
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
            {recentDocuments.map((document) => (
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

            <article className="document-card document-card--skeleton" aria-hidden="true">
              <div className="skeleton skeleton--square" />
              <div className="skeleton skeleton--line-lg" />
              <div className="skeleton skeleton--line-sm" />
              <div className="document-card__actions">
                <div className="skeleton skeleton--button" />
              </div>
            </article>
          </div>
        </section>

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
              <label className="dropzone" htmlFor={fileInputId}>
                <input
                  id={fileInputId}
                  className="dropzone__input"
                  type="file"
                  accept=".pdf,.doc,.docx,.md,.markdown"
                  onChange={handleFileChange}
                />
                <div className="dropzone__icon">
                  <UploadIcon />
                </div>
                <p className="dropzone__title">Drag and drop your file or browse</p>
                <p className="dropzone__subtitle">Supported formats: PDF, DOCX, Markdown</p>
                <p className="dropzone__caption">
                  Best for SOPs, manuals, reagent instructions, and process notes
                </p>
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

                <div className="upload-modal__status">
                  <span className="upload-modal__pill">
                    {selectedFile ? 'File ready to translate' : 'Waiting for file upload'}
                  </span>
                  <p>
                    {selectedFile
                      ? `${selectedFile.name} selected for ${selectedLanguage}`
                      : 'Choose a file to enable translation'}
                  </p>
                </div>
              </div>
            </div>

            <div className="upload-modal__footer">
              <button className="translate-button" type="button" disabled={!selectedFile}>
                Translate
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function AuthShell({
  actionLabel,
  children,
  eyebrow,
  footerAction,
  footerPrompt,
  helperText,
  onFooterAction,
  onSubmit,
  title,
}: {
  actionLabel: string
  children: ReactNode
  eyebrow: string
  footerAction: string
  footerPrompt: string
  helperText: string
  onFooterAction: () => void
  onSubmit: () => void
  title: string
}) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
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
            <button className="gateway-button gateway-button--primary auth-submit" type="submit">
              {actionLabel}
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
  onComplete,
  onSignIn,
}: {
  onComplete: () => void
  onSignIn: () => void
}) {
  const [selectedKnownLanguage, setSelectedKnownLanguage] = useState('')
  const [knownLanguages, setKnownLanguages] = useState<string[]>([])

  function addKnownLanguage(language: string) {
    if (!language || knownLanguages.includes(language)) return
    setKnownLanguages((current) => [...current, language])
  }

  function removeKnownLanguage(language: string) {
    setKnownLanguages((current) => current.filter((item) => item !== language))
  }

  return (
    <AuthShell
      actionLabel="Create an account"
      eyebrow="Get Started"
      helperText="Set up your LabLingo access with your organization details and preferred language."
      title="Create your account."
      footerPrompt="Already have an account?"
      footerAction="Sign in"
      onFooterAction={onSignIn}
      onSubmit={onComplete}
    >
      <AuthField label="Name (First and Last)">
        <input type="text" placeholder="Asha Patel" />
      </AuthField>
      <AuthField label="Organization email">
        <input type="email" placeholder="asha@organization.com" />
      </AuthField>
      <AuthField label="Password">
        <input type="password" placeholder="Create a password" />
      </AuthField>
      <AuthField label="Enter password again">
        <input type="password" placeholder="Re-enter your password" />
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
