import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { callLLM } from '@/lib/llm/adapter'

const GAP_PROMPT = `You are a career gap analyzer. Given a candidate's resume skills and a job's required skills, produce an honest gap analysis. Return ONLY valid JSON.

{
  "match_score": 0,
  "missing_skills": [{"skill": "Skill", "priority": "high|medium|low", "reason": "Why needed"}],
  "existing_skills": [{"skill": "Skill", "level": "current level", "match_quality": "strong|partial"}],
  "gap_summary": "2-3 sentence honest assessment"
}

Rules:
- match_score: 0-100, based on how well the resume covers job requirements
- Be honest — don't inflate the score
- For each missing skill, explain WHY it matters for this specific role
- match_quality: "strong" = fully meets requirement, "partial" = has some experience but not enough
- gap_summary should be direct and actionable
- Return ONLY the JSON

Candidate Skills:
{candidate_skills}

Job Requirements:
{job_requirements}
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

    let semanticScore = 50
    if (resume.embedding && job.embedding) {
      try {
        const { data: similarity } = await supabase.rpc('cosine_similarity', {
          a: resume.embedding,
          b: job.embedding,
        })
        if (similarity !== null) {
          semanticScore = Math.round(similarity * 100)
        }
      } catch {
        // Fall back to LLM-only scoring
      }
    }

    const settingsResult = await getLLMSettings(user.id)
    if (!settingsResult) {
      return NextResponse.json({ error: 'No LLM provider configured' }, { status: 400 })
    }

    const { provider, apiKey, model } = settingsResult

    const candidateSkills = JSON.stringify(resume.parsed_skills, null, 2)
    const jobRequirements = JSON.stringify(job.required_skills, null, 2)

    const prompt = GAP_PROMPT
      .replace('{candidate_skills}', candidateSkills)
      .replace('{job_requirements}', jobRequirements)

    const result = await callLLM(
      [{ role: 'user', content: prompt }],
      { provider, apiKey, model }
    )

    let gapData
    try {
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      gapData = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse gap analysis', raw: result }, { status: 500 })
    }

    const finalScore = Math.round((gapData.match_score + semanticScore) / 2)

    const { data: gap, error: dbError } = await supabase
      .from('skill_gaps')
      .insert({
        user_id: user.id,
        resume_id,
        job_id,
        match_score: finalScore,
        missing_skills: gapData.missing_skills || [],
        existing_skills: gapData.existing_skills || [],
        gap_summary: gapData.gap_summary || '',
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: 'Failed to save gap analysis', details: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ gap, job_title: job.job_title, company: job.company })
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
