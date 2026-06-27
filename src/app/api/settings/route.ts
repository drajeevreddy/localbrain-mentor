import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/crypto'

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError) return authError

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', user.id)
      .single()

    if (!data?.settings) {
      return NextResponse.json({
        providers: {},
        fallbackChain: ['nvidia', 'groq', 'openrouter', 'together', 'gemini'],
      })
    }

    const settings = data.settings as { providers?: Record<string, { apiKey?: string; [key: string]: unknown }>; fallbackChain?: string[] }

    const safeProviders: Record<string, unknown> = {}
    if (settings.providers) {
      for (const [name, config] of Object.entries(settings.providers)) {
        safeProviders[name] = {
          ...config,
          apiKey: config.apiKey ? '••••••••' : '',
        }
      }
    }

    return NextResponse.json({
      providers: safeProviders,
      fallbackChain: settings.fallbackChain || ['nvidia', 'groq', 'openrouter', 'together', 'gemini'],
    })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError) return authError

  try {
    const body = await request.json()
    const { providers, fallbackChain } = body

    const encryptedProviders: Record<string, { apiKey: string; model: string; enabled: boolean }> = {}
    if (providers) {
      for (const [name, config] of Object.entries(providers)) {
        const p = config as { apiKey?: string; model?: string; enabled?: boolean }
        encryptedProviders[name] = {
          apiKey: p.apiKey && p.apiKey !== '••••••••' ? encrypt(p.apiKey) : '',
          model: p.model || '',
          enabled: p.enabled || false,
        }
      }
    }

    const settings = {
      providers: encryptedProviders,
      fallbackChain: fallbackChain || ['nvidia', 'groq', 'openrouter', 'together', 'gemini'],
    }

    const supabase = await createClient()
    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        settings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (upsertError) {
      return NextResponse.json({ error: 'Failed to save settings', details: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
