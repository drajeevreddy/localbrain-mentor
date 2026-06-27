import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { callLLM, callEmbedding } from '@/lib/llm/adapter'

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

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  const result = await parser.getText()
  return result.text
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError) return authError

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let text: string
    try {
      text = await extractPdfText(buffer)
    } catch {
      return NextResponse.json({ error: 'Could not parse PDF. The file may be corrupted or image-based.' }, { status: 400 })
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Could not extract text from PDF. The file may be image-based.' }, { status: 400 })
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
      const cleaned = parsed.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsedData = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse LLM response', raw: parsed }, { status: 500 })
    }

    let embedding: number[] = []
    try {
      embedding = await callEmbedding(text, { provider, apiKey })
    } catch {
      // Embedding is optional
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
