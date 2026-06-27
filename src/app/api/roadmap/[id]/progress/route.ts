import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError) return authError

  try {
    const { id: roadmapId } = params
    const body = await request.json()
    const { week_number, task_index, completed } = body

    if (week_number === undefined || task_index === undefined || completed === undefined) {
      return NextResponse.json({ error: 'week_number, task_index, and completed are required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: roadmap, error: roadmapError } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('id', roadmapId)
      .eq('user_id', user.id)
      .single()

    if (roadmapError || !roadmap) {
      return NextResponse.json({ error: 'Roadmap not found' }, { status: 404 })
    }

    const { data: week, error: weekError } = await supabase
      .from('roadmap_weeks')
      .select('*')
      .eq('roadmap_id', roadmapId)
      .eq('week_number', week_number)
      .single()

    if (weekError || !week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 })
    }

    const tasks = [...(week.tasks || [])] as Array<{
      task: string
      resource_url: string
      resource_type: string
      estimated_hours: number
      completed: boolean
    }>

    if (task_index >= tasks.length) {
      return NextResponse.json({ error: 'Invalid task_index' }, { status: 400 })
    }

    tasks[task_index].completed = completed

    const allTasksComplete = tasks.every((t) => t.completed)

    const { error: updateError } = await supabase
      .from('roadmap_weeks')
      .update({
        tasks,
        completed: allTasksComplete,
      })
      .eq('id', week.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update progress', details: updateError.message }, { status: 500 })
    }

    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.completed).length

    return NextResponse.json({
      week_number,
      tasks,
      week_completed: allTasksComplete,
      completed_tasks: completedTasks,
      total_tasks: totalTasks,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
