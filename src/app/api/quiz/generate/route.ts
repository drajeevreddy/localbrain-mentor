import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { callLLM } from '@/lib/llm/adapter'
import { getLLMSettings } from '@/lib/llm/settings'
import { extractJson } from '@/lib/llm/parseJson'

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError) return authError

  try {
    const body = await request.json()
    const { skill, level } = body

    if (!skill || !level) {
      return NextResponse.json({ error: 'Skill and level are required' }, { status: 400 })
    }

    const settingsResult = await getLLMSettings(user.id)
    if (!settingsResult) {
      return NextResponse.json({ error: 'No LLM provider configured' }, { status: 400 })
    }

    const { provider, apiKey, model } = settingsResult

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
      { provider, apiKey, model }
    )

    let parsed
    try {
      parsed = extractJson(response)
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
