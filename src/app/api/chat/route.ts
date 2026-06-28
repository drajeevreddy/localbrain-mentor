import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { callLLMStream, callLLM } from '@/lib/llm/adapter'
import { getLLMSettings } from '@/lib/llm/settings'

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError) return authError

  try {
    const body = await request.json()
    const { message, roadmap_id, chat_id } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const supabase = await createClient()

    let contextPrompt = 'You are a personal career mentor. '
    contextPrompt += 'Answer questions about the user\'s learning path, skills, and career growth. '
    contextPrompt += 'Be encouraging but honest. Give specific, actionable advice.\n\n'

    if (roadmap_id) {
      const { data: roadmap } = await supabase
        .from('roadmaps')
        .select('*, skill_gaps(*, target_jobs(job_title, company), resumes(parsed_skills))')
        .eq('id', roadmap_id)
        .eq('user_id', user.id)
        .single()

      if (roadmap) {
        const gap = roadmap.skill_gaps as Record<string, unknown> | null
        const job = gap?.target_jobs as Record<string, unknown> | null
        const resume = gap?.resumes as Record<string, unknown> | null
        const missingSkills = (gap?.missing_skills || []) as Array<{ skill: string; priority: string }>

        contextPrompt += `Target Role: ${job?.job_title || 'Unknown'} at ${job?.company || 'Unknown'}\n`
        contextPrompt += `Current Match Score: ${gap?.match_score || 0}%\n`
        const skills = (resume?.parsed_skills || []) as Array<{ skill: string }>
        contextPrompt += `Skills You Have: ${skills.map((s) => s.skill).join(', ')}\n`
        contextPrompt += `Skills to Learn: ${missingSkills.map((s) => `${s.skill} (${s.priority})`).join(', ')}\n\n`

        const { data: currentWeek } = await supabase
          .from('roadmap_weeks')
          .select('theme, tasks')
          .eq('roadmap_id', roadmap_id)
          .eq('completed', false)
          .order('week_number')
          .limit(1)
          .single()

        if (currentWeek) {
          const tasks = (currentWeek.tasks || []) as Array<{ task: string; completed: boolean }>
          contextPrompt += `Current Week Theme: ${currentWeek.theme}\n`
          contextPrompt += `Remaining Tasks: ${tasks.filter((t) => !t.completed).map((t) => t.task).join(', ')}\n`
        }
      }
    }

    let chat
    if (chat_id) {
      const { data } = await supabase
        .from('mentor_chats')
        .select('*')
        .eq('id', chat_id)
        .eq('user_id', user.id)
        .single()
      chat = data
    } else {
      const { data } = await supabase
        .from('mentor_chats')
        .insert({
          user_id: user.id,
          roadmap_id: roadmap_id || null,
          messages: [],
        })
        .select()
        .single()
      chat = data
    }

    if (!chat) {
      return NextResponse.json({ error: 'Failed to create/get chat' }, { status: 500 })
    }

    const existingMessages = (chat.messages || []) as Array<{ role: string; content: string }>
    const messages = [
      { role: 'system', content: contextPrompt },
      ...existingMessages.slice(-10),
      { role: 'user', content: message },
    ]

    const settingsResult = await getLLMSettings(user.id)
    if (!settingsResult) {
      return NextResponse.json({ error: 'No LLM provider configured' }, { status: 400 })
    }

    const { provider, apiKey, model } = settingsResult

    const assistantResponse = await callLLM(messages, { provider, apiKey, model })

    const updatedMessages = [
      ...existingMessages,
      { role: 'user', content: message },
      { role: 'assistant', content: assistantResponse },
    ]

    await supabase
      .from('mentor_chats')
      .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
      .eq('id', chat.id)

    return NextResponse.json({
      chat_id: chat.id,
      response: assistantResponse,
      messages: updatedMessages,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
