import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { callLLM } from '@/lib/llm/adapter'

const INTERVIEW_PROMPT = `You are a technical interview coach. Given a skill gap analysis for a target role, generate 10 interview questions that test the candidate on their missing skills and the requirements of the role.

For each question, provide a model answer that would impress an interviewer.

Return ONLY valid JSON:
{
  "questions": [
    {
      "question": "The interview question",
      "answer": "A strong model answer demonstrating knowledge",
      "skill_tested": "Which skill this tests",
      "difficulty": "easy|medium|hard"
    }
  ]
}

Rules:
- 10 questions total: ~3 easy, ~4 medium, ~3 hard
- Focus primarily on the missing/high-priority skills
- Questions should be realistic — what a hiring manager would actually ask
- Model answers should be concise but thorough (2-4 sentences each)
- Mix behavioral and technical questions
- Return ONLY the JSON

Target Role: {job_title}
Company: {company}
Required Skills: {required_skills}
Missing Skills: {missing_skills}
Existing Skills: {existing_skills}
`

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError) return authError

  try {
    const body = await request.json()
    const { gap_id } = body

    if (!gap_id) {
      return NextResponse.json({ error: 'gap_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: gap, error: gapError } = await supabase
      .from('skill_gaps')
      .select('*, target_jobs(job_title, company, required_skills), resumes(parsed_skills)')
      .eq('id', gap_id)
      .eq('user_id', user.id)
      .single()

    if (gapError || !gap) {
      return NextResponse.json({ error: 'Gap analysis not found' }, { status: 404 })
    }

    const settingsResult = await getLLMSettings(user.id)
    if (!settingsResult) {
      return NextResponse.json({ error: 'No LLM provider configured' }, { status: 400 })
    }

    const { provider, apiKey, model } = settingsResult

    const job = gap.target_jobs as Record<string, unknown> | null
    const jobTitle = (job?.job_title as string) || 'the target role'
    const company = (job?.company as string) || 'the company'
    const requiredSkills = JSON.stringify(job?.required_skills || [], null, 2)
    const missingSkills = JSON.stringify(gap.missing_skills || [], null, 2)
    const existingSkills = JSON.stringify(gap.existing_skills || [], null, 2)

    const prompt = INTERVIEW_PROMPT
      .replace('{job_title}', jobTitle)
      .replace('{company}', company)
      .replace('{required_skills}', requiredSkills)
      .replace('{missing_skills}', missingSkills)
      .replace('{existing_skills}', existingSkills)

    const result = await callLLM(
      [{ role: 'user', content: prompt }],
      { provider, apiKey, model }
    )

    let parsedData
    try {
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsedData = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse interview questions', raw: result }, { status: 500 })
    }

    return NextResponse.json({ questions: parsedData.questions || [] })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getLLMSettings(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_settings')
    .select('settings')
    .eq('user_id', userId)
    .single()

  if (!data?.settings?.providers) return null

  const chain = data.settings.fallbackChain || ['nvidia', 'groq', 'openrouter']
  for (const providerName of chain) {
    const providerConfig = data.settings.providers[providerName]
    if (providerConfig?.enabled && providerConfig?.apiKey) {
      return {
        provider: providerName,
        apiKey: providerConfig.apiKey,
        model: providerConfig.model,
      }
    }
  }
  return null
}
