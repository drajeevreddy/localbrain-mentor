export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          created_at?: string
        }
      }
      resumes: {
        Row: {
          id: string
          user_id: string
          raw_text: string | null
          parsed_skills: SkillEntry[]
          parsed_experience: ExperienceEntry[]
          parsed_projects: ProjectEntry[]
          parsed_education: EducationEntry[]
          embedding: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          raw_text?: string | null
          parsed_skills?: SkillEntry[]
          parsed_experience?: ExperienceEntry[]
          parsed_projects?: ProjectEntry[]
          parsed_education?: EducationEntry[]
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          raw_text?: string | null
          parsed_skills?: SkillEntry[]
          parsed_experience?: ExperienceEntry[]
          parsed_projects?: ProjectEntry[]
          parsed_education?: EducationEntry[]
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
      }
      target_jobs: {
        Row: {
          id: string
          user_id: string
          job_title: string
          company: string | null
          job_description_raw: string
          required_skills: RequiredSkill[]
          seniority_level: string | null
          embedding: number[] | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_title: string
          company?: string | null
          job_description_raw: string
          required_skills?: RequiredSkill[]
          seniority_level?: string | null
          embedding?: number[] | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          job_title?: string
          company?: string | null
          job_description_raw?: string
          required_skills?: RequiredSkill[]
          seniority_level?: string | null
          embedding?: number[] | null
          created_at?: string
        }
      }
      skill_gaps: {
        Row: {
          id: string
          user_id: string
          resume_id: string
          job_id: string
          match_score: number
          missing_skills: MissingSkill[]
          existing_skills: ExistingSkill[]
          gap_summary: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resume_id: string
          job_id: string
          match_score?: number
          missing_skills?: MissingSkill[]
          existing_skills?: ExistingSkill[]
          gap_summary?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resume_id?: string
          job_id?: string
          match_score?: number
          missing_skills?: MissingSkill[]
          existing_skills?: ExistingSkill[]
          gap_summary?: string | null
          created_at?: string
        }
      }
      roadmaps: {
        Row: {
          id: string
          user_id: string
          gap_id: string
          title: string
          total_weeks: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gap_id: string
          title: string
          total_weeks: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          gap_id?: string
          title?: string
          total_weeks?: number
          created_at?: string
        }
      }
      roadmap_weeks: {
        Row: {
          id: string
          roadmap_id: string
          week_number: number
          theme: string
          tasks: RoadmapTask[]
          completed: boolean
        }
        Insert: {
          id?: string
          roadmap_id: string
          week_number: number
          theme: string
          tasks?: RoadmapTask[]
          completed?: boolean
        }
        Update: {
          id?: string
          roadmap_id?: string
          week_number?: number
          theme?: string
          tasks?: RoadmapTask[]
          completed?: boolean
        }
      }
      mentor_chats: {
        Row: {
          id: string
          user_id: string
          roadmap_id: string | null
          messages: ChatMessage[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          roadmap_id?: string | null
          messages?: ChatMessage[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          roadmap_id?: string | null
          messages?: ChatMessage[]
          created_at?: string
          updated_at?: string
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          settings: UserSettings
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          settings?: UserSettings
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          settings?: UserSettings
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export interface SkillEntry {
  skill: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  years?: number
}

export interface ExperienceEntry {
  company: string
  role: string
  duration: string
  summary: string
}

export interface ProjectEntry {
  name: string
  tech_stack: string[]
  description: string
}

export interface EducationEntry {
  degree: string
  institution: string
  year: string
}

export interface RequiredSkill {
  skill: string
  priority: 'high' | 'medium' | 'low'
  reason: string
}

export interface MissingSkill {
  skill: string
  priority: 'high' | 'medium' | 'low'
  reason: string
}

export interface ExistingSkill {
  skill: string
  level: string
  match_quality: 'strong' | 'partial'
}

export interface RoadmapTask {
  task: string
  resource_url: string
  resource_type: 'youtube' | 'docs' | 'github' | 'article'
  estimated_hours: number
  completed: boolean
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ProviderSettings {
  enabled: boolean
  apiKey: string
  model: string
}

export interface UserSettings {
  providers: Record<string, ProviderSettings>
  fallbackChain: string[]
}
