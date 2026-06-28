import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { callLLM } from '@/lib/llm/adapter'
import { getLLMSettings } from '@/lib/llm/settings'
import { extractJson } from '@/lib/llm/parseJson'

const PARSE_PROMPT = `You are a LinkedIn profile parser. Extract structured data from the LinkedIn profile text below. Return ONLY valid JSON with no markdown fences.

{
  "skills": [{"skill": "Skill Name", "level": "beginner|intermediate|advanced|expert", "endorsements": 0}],
  "experience": [{"company": "", "role": "", "duration": "", "summary": ""}],
  "education": [{"degree": "", "institution": "", "year": ""}],
  "certifications": [{"name": "", "issuer": "", "date": ""}],
  "summary": ""
}

Rules:
- Extract skills with endorsement counts if mentioned
- Include ALL mentioned skills, even soft skills
- For experience, include role, company, duration, and a brief summary
- Extract education details including degree, institution, and year
- Capture any certifications listed
- Extract the profile summary/headline if present
- If a field is empty, use empty string or empty array
- Return ONLY the JSON object, nothing else

LinkedIn profile text:
`

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError) return authError

  try {
    const body = await request.json()
    const { profile_text } = body

    if (!profile_text || typeof profile_text !== 'string') {
      return NextResponse.json({ error: 'Profile text is required' }, { status: 400 })
    }

    const settingsResult = await getLLMSettings(user.id)
    if (!settingsResult) {
      return NextResponse.json({ error: 'No LLM provider configured. Add an API key in Settings.' }, { status: 400 })
    }

    const { provider, apiKey, model } = settingsResult

    let parsed: string
    try {
      parsed = await callLLM(
        [{ role: 'user', content: PARSE_PROMPT + profile_text }],
        { provider, apiKey, model }
      )
    } catch (llmErr) {
      console.error('LLM call failed:', llmErr)
      return NextResponse.json({ error: 'LLM call failed. Please try again or use a different provider in Settings.' }, { status: 500 })
    }

    let parsedData
    try {
      parsedData = extractJson(parsed)
    } catch {
      return NextResponse.json({ error: 'Failed to parse LLM response', raw: parsed }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: profile, error: dbError } = await supabase
      .from('linkedin_profiles')
      .insert({
        user_id: user.id,
        raw_text: profile_text,
        parsed_skills: parsedData.skills || [],
        parsed_experience: parsedData.experience || [],
        parsed_education: parsedData.education || [],
        parsed_certifications: parsedData.certifications || [],
        summary: parsedData.summary || '',
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: 'Failed to save profile', details: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ profile, parsed: parsedData })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}