-- LinkedIn profiles table
CREATE TABLE linkedin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_text TEXT,
  parsed_skills JSONB DEFAULT '[]',
  parsed_experience JSONB DEFAULT '[]',
  parsed_education JSONB DEFAULT '[]',
  parsed_certifications JSONB DEFAULT '[]',
  summary TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE linkedin_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own linkedin profiles" ON linkedin_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own linkedin profiles" ON linkedin_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own linkedin profiles" ON linkedin_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own linkedin profiles" ON linkedin_profiles FOR DELETE USING (auth.uid() = user_id);
