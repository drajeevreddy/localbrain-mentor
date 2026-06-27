-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- resumes
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_text TEXT,
  parsed_skills JSONB DEFAULT '[]',
  parsed_experience JSONB DEFAULT '[]',
  parsed_projects JSONB DEFAULT '[]',
  parsed_education JSONB DEFAULT '[]',
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- target_jobs
CREATE TABLE target_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title TEXT,
  company TEXT,
  job_description_raw TEXT,
  required_skills JSONB DEFAULT '[]',
  seniority_level TEXT,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- skill_gaps
CREATE TABLE skill_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
  job_id UUID REFERENCES target_jobs(id) ON DELETE CASCADE,
  match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  missing_skills JSONB DEFAULT '[]',
  existing_skills JSONB DEFAULT '[]',
  gap_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- roadmaps
CREATE TABLE roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  gap_id UUID REFERENCES skill_gaps(id) ON DELETE CASCADE,
  title TEXT,
  total_weeks INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- roadmap_weeks
CREATE TABLE roadmap_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID REFERENCES roadmaps(id) ON DELETE CASCADE,
  week_number INTEGER,
  theme TEXT,
  tasks JSONB DEFAULT '[]',
  completed BOOLEAN DEFAULT false,
  UNIQUE(roadmap_id, week_number)
);

-- mentor_chats
CREATE TABLE mentor_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  roadmap_id UUID REFERENCES roadmaps(id) ON DELETE SET NULL,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- user_settings
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- resumes
CREATE POLICY "Users can view own resumes" ON resumes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own resumes" ON resumes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own resumes" ON resumes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own resumes" ON resumes FOR DELETE USING (auth.uid() = user_id);

-- target_jobs
CREATE POLICY "Users can view own jobs" ON target_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own jobs" ON target_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jobs" ON target_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own jobs" ON target_jobs FOR DELETE USING (auth.uid() = user_id);

-- skill_gaps
CREATE POLICY "Users can view own gaps" ON skill_gaps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gaps" ON skill_gaps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gaps" ON skill_gaps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own gaps" ON skill_gaps FOR DELETE USING (auth.uid() = user_id);

-- roadmaps
CREATE POLICY "Users can view own roadmaps" ON roadmaps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own roadmaps" ON roadmaps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own roadmaps" ON roadmaps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own roadmaps" ON roadmaps FOR DELETE USING (auth.uid() = user_id);

-- roadmap_weeks
CREATE POLICY "Users can view own roadmap weeks" ON roadmap_weeks FOR SELECT USING (
  EXISTS (SELECT 1 FROM roadmaps WHERE roadmaps.id = roadmap_weeks.roadmap_id AND roadmaps.user_id = auth.uid())
);
CREATE POLICY "Users can insert own roadmap weeks" ON roadmap_weeks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM roadmaps WHERE roadmaps.id = roadmap_weeks.roadmap_id AND roadmaps.user_id = auth.uid())
);
CREATE POLICY "Users can update own roadmap weeks" ON roadmap_weeks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM roadmaps WHERE roadmaps.id = roadmap_weeks.roadmap_id AND roadmaps.user_id = auth.uid())
);
CREATE POLICY "Users can delete own roadmap weeks" ON roadmap_weeks FOR DELETE USING (
  EXISTS (SELECT 1 FROM roadmaps WHERE roadmaps.id = roadmap_weeks.roadmap_id AND roadmaps.user_id = auth.uid())
);

-- mentor_chats
CREATE POLICY "Users can view own chats" ON mentor_chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chats" ON mentor_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chats" ON mentor_chats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chats" ON mentor_chats FOR DELETE USING (auth.uid() = user_id);

-- user_settings
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Indexes for pgvector similarity search
CREATE INDEX resumes_embedding_idx ON resumes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
CREATE INDEX target_jobs_embedding_idx ON target_jobs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
