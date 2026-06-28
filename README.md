# LocalBrain Mentor

**Resume-aware AI skill gap analyzer and free learning roadmap generator.**

🌐 **Live App:** [mentor.localbrain.in](https://mentor.localbrain.in)

<p align="center">
  <a href="https://mentor.localbrain.in">
    <img src="https://raw.githubusercontent.com/drajeevreddy/localbrain-mentor/master/public/og-image.svg" alt="LocalBrain Mentor - Close the gap between where you are and where you want to be" width="100%">
  </a>
</p>

<p align="center">
  <em>Paste your resume. Paste a job description. Get a personalized learning roadmap with free resources — built by AI, tailored to you.</em>
</p>

---

## How it works

1. **Import Profile** — Paste text, upload PDF, or enter a URL (GitHub, website)
2. **Analyze Job** — Paste a job description to extract required skills
3. **Gap Analysis** — Compare your skills vs. requirements with semantic matching
4. **Generate Roadmap** — Get a week-by-week plan with free resources
5. **Track Progress** — Complete tasks and watch your match score improve
6. **Chat with Mentor** — Ask questions with full context of your journey
7. **Prepare** — Practice interview questions, generate cover letters, take quizzes

## Features

### Core
- **Resume Parser** — Paste text or upload PDF. AI extracts skills, experience, projects, and education.
- **Job Analyzer** — Paste any job description. AI identifies required skills with priority levels (high/medium/low).
- **Skill Gap Analysis** — See exactly what you're missing with a match score (0-100%) and honest assessment using pgvector semantic matching.
- **Learning Roadmap** — Week-by-week plan with real free resources (YouTube, docs, GitHub, articles). No paid courses.
- **Mentor Chat** — Context-aware AI mentor that knows your resume, target job, and roadmap progress.
- **Progress Tracking** — Check off tasks, track completion, and watch your match score improve.

### Profile Import
- **LinkedIn Profile** — Paste LinkedIn profile text for instant skill extraction.
- **URL Import** — Enter any public URL (GitHub profiles, personal websites, portfolios). Fetches and parses automatically.
- **PDF Upload** — Drag-drop or click to upload a PDF resume. Client-side parsing with pdfjs-dist.

### Additional Tools
- **Cover Letter Generator** — AI writes a tailored cover letter for any job using your resume data.
- **Interview Prep** — 10 AI-generated interview questions with model answers, based on your skill gaps.
- **Skill Quiz** — Test your knowledge with multiple-choice quizzes on your resume skills.
- **Dark Mode** — Toggle between light and dark themes. Persists to localStorage.

### Infrastructure
- **Multi-Provider LLM** — 10 providers with RPM-aware queuing and automatic fallback.
- **Supabase Keep-Alive** — Cron job pings the database every 2 days to prevent free tier sleep.
- **Mobile Responsive** — Hamburger menu sidebar, responsive layouts across all pages.

## Tech Stack

- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + pgvector for semantic matching)
- **AI:** Multi-provider LLM adapter with automatic fallback
- **PDF Parsing:** pdfjs-dist (client-side)
- **Deploy:** Vercel (frontend + cron) + Supabase (database)

## LLM Providers

Supports 10 providers with RPM-aware queuing and auto-fallback:

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

Run migrations in Supabase SQL Editor:

```bash
supabase db push
```

This creates all tables with RLS policies and pgvector for semantic search.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/              # Login/signup page
│   ├── (dashboard)/app/           # Protected dashboard pages
│   │   ├── page.tsx               # Dashboard overview
│   │   ├── resume/                # Resume parser (text + PDF)
│   │   ├── linkedin/              # LinkedIn/profile URL import
│   │   ├── jobs/                  # Target job analyzer
│   │   ├── gap/                   # Skill gap analysis
│   │   ├── roadmap/               # Learning roadmap
│   │   ├── coverletter/           # Cover letter generator
│   │   ├── interview/             # Interview prep questions
│   │   ├── quiz/                  # Skill quiz
│   │   ├── chat/                  # Mentor chat
│   │   └── settings/              # LLM provider settings
│   └── api/                       # API routes
│       ├── resume/                # Resume parse + upload
│       ├── linkedin/analyze       # LinkedIn text parsing
│       ├── profile/fetch          # URL profile import
│       ├── jobs/analyze           # Job analysis
│       ├── gap/                   # Gap analysis + rescore
│       ├── roadmap/               # Roadmap generate + progress
│       ├── coverletter/generate   # Cover letter generation
│       ├── interview/prep         # Interview questions
│       ├── quiz/generate          # Quiz generation
│       ├── chat/                  # Mentor chat
│       ├── settings/              # Provider settings
│       └── cron/keepalive         # Supabase keep-alive
├── components/                    # Reusable UI components
│   ├── Sidebar.tsx                # Mobile-responsive sidebar
│   ├── Navbar.tsx                 # Top navbar with dark mode toggle
│   ├── MatchScoreRing.tsx         # Animated SVG score ring
│   ├── SkillPill.tsx              # Color-coded skill badges
│   ├── ThemeToggle.tsx            # Dark/light mode toggle
│   └── ...
└── lib/
    ├── llm/                       # Multi-provider LLM adapter
    │   ├── adapter.ts             # callLLM, callLLMStream, callEmbedding
    │   ├── queue.ts               # RPM tracking
    │   ├── settings.ts            # Shared LLM settings (with decrypt)
    │   ├── parseJson.ts           # Robust JSON extraction from LLM
    │   └── providers/             # 9 provider configs
    └── supabase/                  # Supabase client setup
```

## How It Works

1. **Import Profile** — Paste text, upload PDF, or enter a URL (GitHub, website)
2. **Analyze Job** — Paste a job description to extract required skills
3. **Gap Analysis** — Compare your skills vs. requirements with semantic matching
4. **Generate Roadmap** — Get a week-by-week plan with free resources
5. **Track Progress** — Complete tasks and watch your match score improve
6. **Chat with Mentor** — Ask questions with full context of your journey
7. **Prepare** — Practice interview questions, generate cover letters, take quizzes

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/resume/parse` | POST | Parse resume text into structured data |
| `/api/resume/upload` | POST | Parse extracted PDF text |
| `/api/linkedin/analyze` | POST | Parse LinkedIn profile text |
| `/api/profile/fetch` | POST | Fetch and parse URL profile |
| `/api/jobs/analyze` | POST | Extract requirements from job description |
| `/api/gap/analyze` | POST | Compute skill gap analysis |
| `/api/gap/rescore` | GET | Re-score after progress updates |
| `/api/roadmap/generate` | POST | Generate learning roadmap |
| `/api/roadmap/[id]/progress` | POST | Update task completion |
| `/api/coverletter/generate` | POST | Generate tailored cover letter |
| `/api/interview/prep` | POST | Generate interview questions |
| `/api/quiz/generate` | POST | Generate skill quiz |
| `/api/chat` | POST | Mentor chat |
| `/api/settings` | GET/POST | Provider settings |
| `/api/cron/keepalive` | GET | Supabase keep-alive ping |

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles |
| `resumes` | Parsed resumes with embeddings |
| `target_jobs` | Job descriptions with embeddings |
| `skill_gaps` | Gap analysis results |
| `roadmaps` | Learning roadmaps |
| `roadmap_weeks` | Weekly tasks and progress |
| `mentor_chats` | Chat history |
| `user_settings` | Encrypted LLM API keys |
| `linkedin_profiles` | Parsed LinkedIn profiles |

## Deployment

### Vercel

```bash
vercel --prod
```

Enable cron jobs at Vercel Dashboard → Settings → Crons for the keep-alive.

### Supabase

```bash
supabase db push
```

## License

MIT
