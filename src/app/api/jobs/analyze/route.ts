import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { callLLM, callEmbedding } from '@/lib/llm/adapter'

const ANALYZE_PROMPT = `You are a job requirements analyst. Extract structured skill requirements from the job description below. Return ONLY valid JSON.

{
  "required_skills": [{"skill": "Skill Name", "priority": "high|medium|low", "reason": "Why this matters for the role"}],
  "seniority_level": "junior|mid|senior|lead|principal",
  "key_responsibilities": ["responsibility 1", "responsibility 2"]
}

Rules:
- high = blocking requirement (must have)
- medium = important but learnable on the job
- low = nice-to-have, differentiator
- Be specific — not "programming" but "TypeScript with React"
- Return ONLY the JSON object

Job Title: {job_title}
Company: {company}

Job Description:
{job_description}
`

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError) return authError

  try {
    const body = await request.json()
    const { job_title, company, job_description } = body

    if (!job_title || !job_description) {
      return NextResponse.json({ error: 'Job title and description are required' }, { status: 400 })
    }

    const settingsResult = await getLLMSettings(user.id)
    if (!settingsResult) {
      return NextResponse.json({ error: 'No LLM provider configured. Add an API key in Settings.' }, { status: 400 })
    }

    const { provider, apiKey, model } = settingsResult

    const prompt = ANALYZE_PROMPT
      .replace('{job_title}', job_title)
      .replace('{company}', company || 'Not specified')
      .replace('{job_description}', job_description)

    const result = await callLLM(
      [{ role: 'user', content: prompt }],
      { provider, apiKey, model }
    )

    let parsedData
    try {
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsedData = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse LLM response', raw: result }, { status: 500 })
    }

    let embedding: number[] = []
    try {
      embedding = await callEmbedding(job_description, { provider, apiKey })
    } catch {
      // Optional
    }

    const supabase = await createClient()
    const { data: job, error: dbError } = await supabase
      .from('target_jobs')
      .insert({
        user_id: user.id,
        job_title,
        company: company || null,
        job_description_raw: job_description,
        required_skills: parsedData.required_skills || [],
        seniority_level: parsedData.seniority_level || null,
        embedding: embedding.length > 0 ? embedding : null,
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: 'Failed to save job', details: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ job, parsed: parsedData })
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
