import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import type { ProviderName } from './adapter'

export async function getLLMSettings(userId: string): Promise<{
  provider: ProviderName
  apiKey: string
  model: string
} | null> {
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
      let apiKey: string
      try {
        apiKey = decrypt(providerConfig.apiKey)
      } catch {
        apiKey = providerConfig.apiKey
      }
      return {
        provider: providerName as ProviderName,
        apiKey,
        model: providerConfig.model,
      }
    }
  }
  return null
}
