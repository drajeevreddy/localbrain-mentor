import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { callLLM } from '@/lib/llm/adapter'
import { getLLMSettings } from '@/lib/llm/settings'

const COVER_LETTER_PROMPT = `You are a professional cover letter writer. Given the candidate's resume and the target job description, write a compelling, tailored cover letter.

Rules:
- Professional tone, not generic
- Highlight specific skills and experiences from the resume that match the job requirements
- Show enthusiasm for the specific role and company
- Keep it concise: 3-4 paragraphs
- Do NOT use placeholder text like [Company Name] — use the actual company name provided
- Do NOT include a subject line
- Start with "Dear Hiring Manager," and end with "Sincerely," followed by the candidate's name if available
- Return ONLY the cover letter text, no JSON, no markdown formatting

Resume:
{resume_text}

Target Job:
Job Title: {job_title}
Company: {company}
Description: {job_description}

Required Skills:
{required_skills}
`

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError) return authError

  try {
    const body = await request.json()
    const { resume_id, job_id } = body

    if (!resume_id || !job_id) {
      return NextResponse.json({ error: 'resume_id and job_id are required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: resume, error: resumeError } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', resume_id)
      .eq('user_id', user.id)
      .single()

    if (resumeError || !resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    const { data: job, error: jobError } = await supabase
      .from('target_jobs')
      .select('*')
      .eq('id', job_id)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const settingsResult = await getLLMSettings(user.id)
    if (!settingsResult) {
      return NextResponse.json({ error: 'No LLM provider configured' }, { status: 400 })
    }

    const { provider, apiKey, model } = settingsResult

    const resumeText = resume.raw_text || JSON.stringify(resume.parsed_skills, null, 2)
    const requiredSkills = JSON.stringify(job.required_skills, null, 2)

    const prompt = COVER_LETTER_PROMPT
      .replace('{resume_text}', resumeText)
      .replace('{job_title}', job.job_title)
      .replace('{company}', job.company || 'the company')
      .replace('{job_description}', job.job_description_raw || '')
      .replace('{required_skills}', requiredSkills)

    let coverLetter: string
    try {
      coverLetter = await callLLM(
        [{ role: 'user', content: prompt }],
        { provider, apiKey, model }
      )
    } catch (llmErr) {
      console.error('LLM call failed:', llmErr)
      return NextResponse.json({ error: 'LLM call failed. Please try again or use a different provider in Settings.' }, { status: 500 })
    }

    return NextResponse.json({ cover_letter: coverLetter })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
