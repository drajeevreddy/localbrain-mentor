import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const gapId = searchParams.get('gap_id')

    if (!gapId) {
      return NextResponse.json({ error: 'gap_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: gap, error: gapError } = await supabase
      .from('skill_gaps')
      .select('*, resumes(raw_text, parsed_skills), target_jobs(job_title, required_skills)')
      .eq('id', gapId)
      .eq('user_id', user.id)
      .single()

    if (gapError || !gap) {
      return NextResponse.json({ error: 'Gap not found' }, { status: 404 })
    }

    const missingSkills = (gap.missing_skills || []) as Array<{ skill: string; priority: string }>
    const totalMissing = missingSkills.length

    if (totalMissing === 0) {
      return NextResponse.json({
        current_score: gap.match_score,
        improvement: 0,
        completed_count: 0,
        total_count: 0,
      })
    }

    // Check roadmap progress for this gap
    const { data: roadmaps } = await supabase
      .from('roadmaps')
      .select('id')
      .eq('gap_id', gapId)
      .eq('user_id', user.id)

    if (!roadmaps || roadmaps.length === 0) {
      return NextResponse.json({
        current_score: gap.match_score,
        improvement: 0,
        completed_count: 0,
        total_count: totalMissing,
      })
    }

    let completedCount = 0
    for (const roadmap of roadmaps) {
      const { data: weeks } = await supabase
        .from('roadmap_weeks')
        .select('tasks')
        .eq('roadmap_id', roadmap.id)

      if (weeks) {
        for (const week of weeks) {
          const tasks = (week.tasks || []) as Array<{ completed: boolean }>
          completedCount += tasks.filter((t) => t.completed).length
        }
      }
    }

    const progressRatio = completedCount / (totalMissing * 3)
    const improvement = Math.min(Math.round(progressRatio * 30), 30)
    const newScore = Math.min(gap.match_score + improvement, 100)

    return NextResponse.json({
      current_score: newScore,
      original_score: gap.match_score,
      improvement,
      completed_count: completedCount,
      total_count: totalMissing * 3,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
