import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { callLLM } from '@/lib/llm/adapter'
import { getLLMSettings } from '@/lib/llm/settings'

const ROADMAP_PROMPT = `You are a learning roadmap generator. Given a skill gap analysis, generate a week-by-week learning plan. Return ONLY valid JSON.

{
  "title": "Roadmap title",
  "weeks": [
    {
      "week_number": 1,
      "theme": "Week theme (e.g., 'TypeScript Fundamentals')",
      "tasks": [
        {
          "task": "Specific learning task",
          "resource_url": "https://free-resource-url.com",
          "resource_type": "youtube|docs|github|article",
          "estimated_hours": 2
        }
      ]
    }
  ]
}

Rules:
- Generate exactly {weeks_available} weeks
- 3-5 tasks per week
- All resource URLs MUST be FREE (YouTube, official docs, MDN, freeCodeCamp, GitHub)
- NO paid courses, no Udemy, no Coursera certificates
- Each task should be completable in 1-3 hours
- Start with fundamentals, progress to advanced topics
- Group related skills into themed weeks
- Prioritize high-priority missing skills first
- Resources must be REAL and working URLs
- Return ONLY the JSON

Skill Gap:
{gap_summary}

Missing Skills (by priority):
{missing_skills}

Existing Skills:
{existing_skills}

Target Role: {job_title}
Available Weeks: {weeks_available}
Hours Per Week: {hours_per_week}
`

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError) return authError

  try {
    const body = await request.json()
    const { gap_id, weeks_available = 8, hours_per_week = 5 } = body

    if (!gap_id) {
      return NextResponse.json({ error: 'gap_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: gap, error: gapError } = await supabase
      .from('skill_gaps')
      .select('*, target_jobs(job_title, company)')
      .eq('id', gap_id)
      .eq('user_id', user.id)
      .single()

    if (gapError || !gap) {
      return NextResponse.json({ error: 'Gap not found' }, { status: 404 })
    }

    const settingsResult = await getLLMSettings(user.id)
    if (!settingsResult) {
      return NextResponse.json({ error: 'No LLM provider configured' }, { status: 400 })
    }

    const { provider, apiKey, model } = settingsResult

    const missingSkills = (gap.missing_skills || [])
      .sort((a: { priority: string }, b: { priority: string }) => {
        const order = { high: 0, medium: 1, low: 2 }
        return (order[a.priority as keyof typeof order] || 2) - (order[b.priority as keyof typeof order] || 2)
      })
      .map((s: { skill: string; priority: string; reason: string }) => `${s.skill} (${s.priority}): ${s.reason}`)
      .join('\n')

    const existingSkills = (gap.existing_skills || [])
      .map((s: { skill: string; level: string }) => `${s.skill} - ${s.level}`)
      .join(', ') || 'None specified'

    const prompt = ROADMAP_PROMPT
      .replace('{weeks_available}', String(weeks_available))
      .replace('{hours_per_week}', String(hours_per_week))
      .replace('{gap_summary}', gap.gap_summary || 'No summary available')
      .replace('{missing_skills}', missingSkills || 'None')
      .replace('{existing_skills}', existingSkills)
      .replace('{job_title}', gap.target_jobs?.job_title || 'Target role')

    const result = await callLLM(
      [{ role: 'user', content: prompt }],
      { provider, apiKey, model }
    )

    let roadmapData
    try {
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      roadmapData = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse roadmap', raw: result }, { status: 500 })
    }

    const { data: roadmap, error: roadmapError } = await supabase
      .from('roadmaps')
      .insert({
        user_id: user.id,
        gap_id,
        title: roadmapData.title || `${gap.target_jobs?.job_title || 'Target'} Learning Roadmap`,
        total_weeks: weeks_available,
      })
      .select()
      .single()

    if (roadmapError) {
      return NextResponse.json({ error: 'Failed to save roadmap', details: roadmapError.message }, { status: 500 })
    }

    const weekInserts = (roadmapData.weeks || []).map((week: {
      week_number: number
      theme: string
      tasks: Array<{
        task: string
        resource_url: string
        resource_type: string
        estimated_hours: number
      }>
    }) => ({
      roadmap_id: roadmap.id,
      week_number: week.week_number,
      theme: week.theme,
      tasks: (week.tasks || []).map((t) => ({
        ...t,
        completed: false,
      })),
      completed: false,
    }))

    if (weekInserts.length > 0) {
      await supabase.from('roadmap_weeks').insert(weekInserts)
    }

    const { data: weeks } = await supabase
      .from('roadmap_weeks')
      .select('*')
      .eq('roadmap_id', roadmap.id)
      .order('week_number')

    return NextResponse.json({ roadmap, weeks: weeks || [] })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
