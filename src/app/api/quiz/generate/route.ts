import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { callLLM } from '@/lib/llm/adapter'

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError) return authError

  try {
    const body = await request.json()
    const { skill, level } = body

    if (!skill || !level) {
      return NextResponse.json({ error: 'Skill and level are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: settingsData } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', user.id)
      .single()

    if (!settingsData?.settings?.providers) {
      return NextResponse.json({ error: 'No LLM provider configured' }, { status: 400 })
    }

    const chain = settingsData.settings.fallbackChain || ['nvidia', 'groq', 'openrouter']
    let providerConfig = null
    for (const providerName of chain) {
      const pc = settingsData.settings.providers[providerName]
      if (pc?.enabled && pc?.apiKey) {
        providerConfig = { provider: providerName, apiKey: pc.apiKey, model: pc.model }
        break
      }
    }

    if (!providerConfig) {
      return NextResponse.json({ error: 'No LLM provider configured' }, { status: 400 })
    }

    const prompt = `Generate exactly 5 multiple-choice quiz questions to assess someone's knowledge of "${skill}" at the "${level}" difficulty level.

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "questions": [
    {
      "question": "question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Why the correct answer is correct"
    }
  ]
}

Requirements:
- Each question must have exactly 4 options
- correct_index is 0-based (0 = first option)
- Questions should test understanding, not just memorization
- At the "${level}" level, adjust complexity accordingly
- Include a clear, concise explanation for each correct answer
- Do NOT include any text outside the JSON object`

    const response = await callLLM(
      [{ role: 'user', content: prompt }],
      { provider: providerConfig.provider, apiKey: providerConfig.apiKey, model: providerConfig.model }
    )

    let parsed
    try {
      const cleaned = response.replace(/```json\n?|\n?```/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse quiz from LLM response' }, { status: 500 })
    }

    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length !== 5) {
      return NextResponse.json({ error: 'Invalid quiz format from LLM' }, { status: 500 })
    }

    return NextResponse.json({ questions: parsed.questions })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
