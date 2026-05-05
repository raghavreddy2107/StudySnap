# StudySnap 📚⚡

An AI-powered PDF study summarizer for students. Upload any PDF, tell it when your exam is, and get a tailored summary streamed in real time.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + Tailwind CSS + react-markdown |
| Backend | Node.js + Express |
| Database | PostgreSQL via Prisma ORM |
| Cache/Queue | Redis + BullMQ |
| Auth | Google OAuth 2.0 + JWT (Passport.js) |
| PDF Parsing | pdf-parse |
| AI | Groq API (`llama-3.1-8b-instant`) |
| File Upload | Multer |
| Streaming | Server-Sent Events (SSE) |
| Hosting | Vercel + Render + Supabase + Upstash |

---

## Project Structure

```
studysnap/
├── client/                   # React frontend
│   ├── src/
│   │   ├── api/
│   │   │   └── axiosInstance.js      # Axios + JWT interceptor
│   │   ├── components/
│   │   │   └── Layout.jsx            # Nav + page shell
│   │   ├── hooks/
│   │   │   ├── useAuth.js            # Auth context + state
│   │   │   └── useSSEStream.js       # Server-Sent Events hook
│   │   └── pages/
│   │       ├── LandingPage.jsx
│   │       ├── AuthCallback.jsx
│   │       ├── Dashboard.jsx
│   │       ├── NewSummary.jsx        # Multi-step upload + stream
│   │       ├── SummaryDetail.jsx
│   │       └── Profile.jsx
│   ├── .env.example
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── server/                   # Express backend
    ├── prisma/
    │   └── schema.prisma
    ├── src/
    │   ├── index.js                  # Express app entry
    │   ├── middleware/
    │   │   ├── verifyJWT.js
    │   │   ├── rateLimiter.js
    │   │   └── upload.js             # Multer PDF config
    │   ├── routes/
    │   │   ├── auth.js               # OAuth + JWT endpoints
    │   │   ├── summarize.js          # Upload + SSE stream
    │   │   ├── summaries.js          # CRUD
    │   │   └── user.js               # Profile + usage
    │   ├── services/
    │   │   ├── passportStrategy.js   # Google OAuth strategy
    │   │   ├── GroqService.js
    │   │   └── pdfService.js
    │   ├── queues/
    │   │   └── summarizeQueue.js     # BullMQ queue
    │   ├── workers/
    │   │   └── summarizeWorker.js    # BullMQ worker process
    │   └── utils/
    │       ├── prisma.js
    │       ├── redis.js
    │       ├── jwt.js
    │       └── promptBuilder.js
    └── .env.example
```

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Supabase)
- Redis (or Upstash)
- Google Cloud OAuth credentials
- Groq API key

### 1. Clone & install dependencies

```bash
# Install server deps
cd server
npm install
npx prisma generate

# Install client deps
cd ../client
npm install
```

### 2. Configure environment variables

```bash
# Server
cp server/.env.example server/.env
# Fill in all values in server/.env

# Client
cp client/.env.example client/.env
# Set VITE_API_URL=http://localhost:5000
```

### 3. Set up the database

```bash
cd server
npx prisma db push
```

### 4. Run all three processes (in separate terminals)

```bash
# Terminal 1 — Backend API
cd server && npm run dev

# Terminal 2 — BullMQ Worker
cd server && npm run worker

# Terminal 3 — Frontend
cd client && npm run dev
```

The app will be at http://localhost:5173.

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Add authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
5. Copy Client ID and Secret to `server/.env`

---

## Groq API

1. Go to [Groq Console](https://console.groq.com/)
2. Create an API key
3. Add to `server/.env` as `GROQ_API_KEY`

The app uses `llama-3.1-8b-instant` for fast, low-latency streaming summaries.

---

## Deployment

### Frontend → Vercel
```bash
cd client
vercel deploy
# Set VITE_API_URL to your Render backend URL
```

### Backend → Render
- Create a new Web Service pointing to `/server`
- Start command: `npm start`
- Add all env vars from `.env.example`

### Worker → Render
- Create a separate Background Worker service
- Root directory: `/server`
- Start command: `npm run worker`

### Database → Supabase
- Create a project, grab the `DATABASE_URL` connection string
- Run `npx prisma db push` with that URL

### Redis → Upstash
- Create a Redis database
- Use the `REDIS_URL` from Upstash dashboard

---

## API Reference

### Auth
| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | OAuth callback |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Revoke refresh token + clear cookie |

### Summaries
| Method | Path | Description |
|---|---|---|
| POST | `/api/summarize` | Upload PDF + enqueue job |
| GET | `/api/summary/:id/stream` | SSE stream of live output |
| GET | `/api/summaries` | All user summaries |
| GET | `/api/summary/:id` | Single summary |
| DELETE | `/api/summary/:id` | Delete summary |

### User
| Method | Path | Description |
|---|---|---|
| GET | `/api/user/me` | Current user + daily usage |

---

## Rate Limits

- **Per user**: 10 summaries/day (resets at midnight)
- **Auth routes**: 20 requests per 15 minutes per IP
- **File size**: Max 10MB PDF
- **Text extraction**: Max 50,000 characters (truncated with notice)

---

## Summary Modes

| Exam Time | Strategy |
|---|---|
| 1 Hour | Critical bullet points only — survival mode |
| Tomorrow | Concise structured summary with key exam points |
| 3–5 Days | Full study guide with headings and definitions |
| 1 Week+ | Comprehensive notes + 5 practice questions |
