import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()

    // Query all tables to keep Supabase alive
    await Promise.all([
      supabase.from('profiles').select('id').limit(1),
      supabase.from('resumes').select('id').limit(1),
      supabase.from('target_jobs').select('id').limit(1),
      supabase.from('skill_gaps').select('id').limit(1),
      supabase.from('roadmaps').select('id').limit(1),
      supabase.from('roadmap_weeks').select('id').limit(1),
      supabase.from('mentor_chats').select('id').limit(1),
      supabase.from('user_settings').select('id').limit(1),
      supabase.from('linkedin_profiles').select('id').limit(1),
    ])

    const now = new Date().toISOString()
    return NextResponse.json({ status: 'ok', timestamp: now, message: 'Supabase keep-alive ping successful' })
  } catch (err) {
    return NextResponse.json({ status: 'error', message: err instanceof Error ? err.message : 'unknown' }, { status: 500 })
  }
}
