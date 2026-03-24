# LabLingo

LabLingo is a document translation and document-understanding workspace built for regional lab teams. It lets users upload technical files such as PDFs, DOCX files, and Markdown documents, extract structured text from them, translate that content into regional languages, and then interact with the processed document through a reader and chat interface.

The project includes:

- A React + TypeScript frontend built with Vite
- An Express backend for authentication, uploads, extraction, translation, and document chat
- Supabase-backed auth and profile storage
- Azure Blob Storage for uploaded documents
- Azure Document Intelligence for text extraction
- OpenAI or Azure OpenAI for translation and question answering

## What The Project Does

LabLingo is designed around a simple workflow:

1. A user signs up or signs in.
2. The user uploads a technical document.
3. The backend stores the file and extracts the document text.
4. The extracted content is translated into a selected output language.
5. The user opens the translated reader, switches between original and translated text, and can ask questions about the processed document.

The current UI also includes:

- A landing page
- Sign in and sign up flows
- A dashboard with recent translations
- A translation upload modal
- A paginated reader for original and translated document views
- A chat assistant for asking questions about the uploaded PDF/document
- Speech playback for assistant responses in the reader chat

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Plain CSS

### Backend

- Node.js
- Express
- Multer
- Supabase
- Azure Blob Storage
- Azure Document Intelligence
- OpenAI or Azure OpenAI

## Project Structure

```text
IronHackers/
├── src/                    # Frontend app
├── public/                 # Static frontend assets
├── backend/
│   ├── src/                # Express server, routes, and integrations
│   ├── sql/                # SQL setup files
│   └── pdf/                # Sample/local files
├── package.json            # Frontend scripts and dependencies
└── README.md
```

## Frontend Features

- Authentication screens for sign up and sign in
- Dashboard showing uploaded and translated documents
- File upload flow with language selection
- Translation reader with page navigation
- Toggle between original extracted text and translated text
- Search within original text in the reader
- Chat assistant scoped to the currently processed document
- Mobile-responsive layout for dashboard, reader, modals, and chat launcher

## Backend Features

- Health endpoint
- Auth endpoints
- Upload endpoint for supported document formats
- Document extraction and translation endpoints
- Stored document retrieval
- Translation history lookup
- Chat over extracted/translated document content

## Environment Notes

The backend expects configuration through a `.env` file. Based on the current codebase, the main environment values include:

- `PORT`
- `ALLOW_DEV_AUTO_CONFIRM_SIGNUP`
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_CONTAINER_NAME`
- `MAX_UPLOAD_SIZE_MB`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`
- `AZURE_DOCUMENT_INTELLIGENCE_KEY`
- `AZURE_DOCUMENT_INTELLIGENCE_MODEL_ID`
- `OPENAI_API_KEY`
- `OPENAI_TRANSLATION_MODEL`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_OPENAI_API_VERSION`

The frontend uses:

- `VITE_API_BASE_URL`

## Getting Started

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

Create the required `.env` files for the backend and frontend based on your local setup and cloud credentials.

### 4. Run the backend

From the `backend` folder:

```bash
npm run dev
```

### 5. Run the frontend

From the project root:

```bash
npm run dev
```

## Available Scripts

### Frontend

- `npm run dev` starts the Vite development server
- `npm run build` builds the frontend for production
- `npm run preview` previews the production build
- `npm run lint` runs ESLint

### Backend

From `backend/`:

- `npm run dev` starts the Express server with nodemon
- `npm start` starts the Express server normally

## Summary

LabLingo is a full-stack document translation workspace for lab and operations teams that need to turn technical documents into regionally accessible content. It combines storage, OCR-style extraction, LLM-powered translation, and document chat into one application.
