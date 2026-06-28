import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { callLLM, callEmbedding } from '@/lib/llm/adapter'
import { getLLMSettings } from '@/lib/llm/settings'
import { extractJson } from '@/lib/llm/parseJson'

const PARSE_PROMPT = `You are a resume parser. Extract structured data from the resume text below. Return ONLY valid JSON with no markdown fences.

{
  "skills": [{"skill": "Skill Name", "level": "beginner|intermediate|advanced|expert", "years": 0}],
  "experience": [{"company": "", "role": "", "duration": "", "summary": ""}],
  "projects": [{"name": "", "tech_stack": [], "description": ""}],
  "education": [{"degree": "", "institution": "", "year": ""}]
}

Rules:
- Infer skill levels from context (years of use, depth of description)
- years should be estimated from experience if not explicit
- Include ALL mentioned skills, even soft skills
- If a field is empty, use empty string or empty array
- Return ONLY the JSON object, nothing else

Resume text:
`

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError) return authError

  try {
    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Resume text is required' }, { status: 400 })
    }

    const settingsResult = await getLLMSettings(user.id)
    if (!settingsResult) {
      return NextResponse.json({ error: 'No LLM provider configured. Add an API key in Settings.' }, { status: 400 })
    }

    const { provider, apiKey, model } = settingsResult

    const parsed = await callLLM(
      [{ role: 'user', content: PARSE_PROMPT + text }],
      { provider, apiKey, model }
    )

    let parsedData
    try {
      parsedData = extractJson(parsed)
    } catch {
      return NextResponse.json({ error: 'Failed to parse LLM response', raw: parsed }, { status: 500 })
    }

    let embedding: number[] = []
    try {
      embedding = await callEmbedding(text, { provider, apiKey })
    } catch {
      // Embedding is optional — proceed without it
    }

    const supabase = await createClient()
    const { data: resume, error: dbError } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        raw_text: text,
        parsed_skills: parsedData.skills || [],
        parsed_experience: parsedData.experience || [],
        parsed_projects: parsedData.projects || [],
        parsed_education: parsedData.education || [],
        embedding: embedding.length > 0 ? embedding : null,
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: 'Failed to save resume', details: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ resume, parsed: parsedData })
  } catch (err) {
    console.error('Resume parse error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
