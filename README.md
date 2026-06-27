# LocalBrain Mentor

**Resume-aware AI skill gap analyzer and free learning roadmap generator.**

🌐 **Live App:** [mentor.localbrain.in](https://mentor.localbrain.in)

---

Paste your resume, paste a job description, and get a personalized learning roadmap with free resources — built by AI, tailored to you.

## Features

- **Resume Parser** — Upload or paste your resume. AI extracts skills, experience, projects, and education.
- **Job Analyzer** — Paste any job description. AI identifies required skills with priority levels.
- **Skill Gap Analysis** — See exactly what you're missing with a match score (0-100%) and honest assessment.
- **Learning Roadmap** — Week-by-week plan with real free resources (YouTube, docs, GitHub, articles).
- **Mentor Chat** — Context-aware AI mentor that knows your resume, target job, and roadmap progress.
- **Progress Tracking** — Check off tasks, track completion, and watch your match score improve.

## Tech Stack

- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + pgvector for semantic matching)
- **AI:** Multi-provider LLM adapter with automatic fallback
- **Deploy:** Vercel (frontend) + Supabase (database)

## LLM Providers

Supports 10+ providers with RPM-aware queuing and auto-fallback:

| Provider | RPM | Notes |
|----------|-----|-------|
| NVIDIA NIM | 40 | Free tier |
| Groq | 30 | Free tier |
| Google Gemini | 60 | Free tier |
| OpenRouter | 50 | 50+ free models |
| Cohere | 20 | Free tier |
| Together AI | 60 | Free tier |
| Cerebras | 30 | Free tier |
| Hugging Face | 30 | Free tier |
| Ollama | ∞ | Local |

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project (free tier works)
- At least one LLM provider API key (all have free tiers)

### Setup

```bash
git clone https://github.com/drajeevreddy/localbrain-mentor.git
cd localbrain-mentor
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SETTINGS_ENCRYPTION_KEY=at-least-32-characters-long
```

### Database

Run the migration in Supabase SQL Editor:

```sql
-- See supabase/migrations/001_initial_schema.sql
```

This creates all required tables with RLS policies and pgvector for semantic search.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          # Login/signup page
│   ├── (dashboard)/app/       # Protected dashboard pages
│   │   ├── page.tsx           # Dashboard overview
│   │   ├── resume/            # Resume parser
│   │   ├── jobs/              # Target job analyzer
│   │   ├── gap/               # Skill gap analysis
│   │   ├── roadmap/           # Learning roadmap
│   │   ├── chat/              # Mentor chat
│   │   └── settings/          # LLM provider settings
│   └── api/                   # API routes
├── components/                # Reusable UI components
└── lib/
    ├── llm/                   # Multi-provider LLM adapter
    │   ├── adapter.ts         # callLLM, callEmbedding
    │   ├── queue.ts           # RPM tracking
    │   └── providers/         # Provider configs
    └── supabase/              # Supabase client setup
```

## How It Works

1. **Paste Resume** → AI extracts skills, experience, projects
2. **Paste Job** → AI identifies required skills with priorities
3. **Gap Analysis** → Compares your skills vs. requirements (pgvector + LLM)
4. **Generate Roadmap** → Week-by-week plan with free resources
5. **Track Progress** → Complete tasks, watch your match score improve
6. **Chat with Mentor** → Ask questions with full context of your journey

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/resume/parse` | POST | Parse resume text into structured data |
| `/api/jobs/analyze` | POST | Extract requirements from job description |
| `/api/gap/analyze` | POST | Compute skill gap analysis |
| `/api/gap/rescore` | GET | Re-score after progress updates |
| `/api/roadmap/generate` | POST | Generate learning roadmap |
| `/api/roadmap/[id]/progress` | POST | Update task completion |
| `/api/chat` | POST | Mentor chat |
| `/api/settings` | GET/POST | Provider settings |

## Deployment

### Vercel

```bash
vercel --prod
```

### Supabase

```bash
supabase db push
```

## License

MIT
