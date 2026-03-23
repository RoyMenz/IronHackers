import type { ReactNode } from 'react'
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

function App() {
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

        <section className="greeting-strip">
          <p className="eyebrow">Today&apos;s overview</p>
          <h2>Good morning, Sarah</h2>
          <p className="greeting-strip__text">
            Three translation jobs are ready for review, and your regional
            language delivery pipeline is up 42% this week.
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
            <button className="ghost-button" type="button">
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
    </div>
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
