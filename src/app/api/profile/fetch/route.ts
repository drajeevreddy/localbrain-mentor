import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { getLLMSettings } from '@/lib/llm/settings'
import { callLLM } from '@/lib/llm/adapter'
import { extractJson } from '@/lib/llm/parseJson'

const PROFILE_PROMPT = `You are a profile parser. Extract structured professional data from the text below. Return ONLY valid JSON with no markdown fences.

{
  "skills": [{"skill": "Skill Name", "level": "beginner|intermediate|advanced|expert", "years": 0}],
  "experience": [{"company": "", "role": "", "duration": "", "summary": ""}],
  "education": [{"degree": "", "institution": "", "year": ""}],
  "summary": ""
}

Rules:
- Extract ALL mentioned skills, even soft skills
- For experience, include role, company, duration, and summary
- Extract education details
- Infer skill levels from context
- If a field is empty, use empty string or empty array
- Return ONLY the JSON object, nothing else

Profile text:
`

function stripHtml(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
  return text
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError) return authError

  try {
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol')
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    let html: string
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) {
        return NextResponse.json({ error: `Failed to fetch URL: ${res.status} ${res.statusText}` }, { status: 400 })
      }

      html = await res.text()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      return NextResponse.json({ error: `Could not fetch URL: ${msg}` }, { status: 400 })
    }

    const text = stripHtml(html)

    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: 'Page content too short or empty. The URL may require authentication or the page has no visible text.' }, { status: 400 })
    }

    const settingsResult = await getLLMSettings(user.id)
    if (!settingsResult) {
      return NextResponse.json({ error: 'No LLM provider configured. Go to Settings and add an API key first.' }, { status: 400 })
    }

    const { provider, apiKey, model } = settingsResult

    let llmResult: string
    try {
      llmResult = await callLLM(
        [{ role: 'user', content: PROFILE_PROMPT + text.substring(0, 8000) }],
        { provider, apiKey, model }
      )
    } catch (llmErr) {
      return NextResponse.json({ error: `LLM call failed: ${llmErr instanceof Error ? llmErr.message : 'unknown'}` }, { status: 500 })
    }

    let parsed
    try {
      parsed = extractJson(llmResult)
    } catch {
      return NextResponse.json({ error: 'Failed to parse profile data from page content' }, { status: 500 })
    }

    return NextResponse.json({ parsed, url })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
