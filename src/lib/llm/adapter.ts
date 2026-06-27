import {
  trackRequest,
  canMakeRequest,
  getWaitTime,
} from './queue'

import { nvidiaConfig } from './providers/nvidia'
import { groqConfig } from './providers/groq'
import { geminiConfig } from './providers/gemini'
import { openrouterConfig } from './providers/openrouter'
import { cohereConfig } from './providers/cohere'
import { ollamaConfig } from './providers/ollama'
import { togetherConfig } from './providers/together'
import { cerebrasConfig } from './providers/cerebras'
import { huggingfaceConfig } from './providers/huggingface'

const providerConfigs = [
  nvidiaConfig,
  groqConfig,
  geminiConfig,
  openrouterConfig,
  cohereConfig,
  ollamaConfig,
  togetherConfig,
  cerebrasConfig,
  huggingfaceConfig,
] as const

export type ProviderName =
  | 'nvidia'
  | 'groq'
  | 'gemini'
  | 'openrouter'
  | 'cohere'
  | 'ollama'
  | 'together'
  | 'cerebras'
  | 'huggingface'

export interface LLMOptions {
  provider: ProviderName
  model?: string
  apiKey: string
  fallbackChain?: ProviderName[]
}

export interface EmbeddingOptions {
  provider: ProviderName
  apiKey: string
}

function getProviderConfig(name: ProviderName) {
  return providerConfigs.find((p) => p.name === name)
}

function buildOpenAICompatibleHeaders(apiKey: string, provider: ProviderName): Record<string, string> {
  if (provider === 'openrouter') {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://mentor.localbrain.in',
      'X-Title': 'LocalBrain Mentor',
    }
  }
  return { 'Authorization': `Bearer ${apiKey}` }
}

async function callOpenAICompatible(
  baseUrl: string,
  messages: Array<{ role: string; content: string }>,
  model: string,
  headers: Record<string, string>
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ model, messages, max_tokens: 2048 }),
  })

  if (res.status === 429) throw new Error('RATE_LIMITED')
  if (!res.ok) throw new Error(`LLM error: ${res.status} ${await res.text()}`)

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

async function callOpenAICompatibleStream(
  baseUrl: string,
  messages: Array<{ role: string; content: string }>,
  model: string,
  headers: Record<string, string>
): Promise<ReadableStream> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ model, messages, max_tokens: 2048, stream: true }),
  })

  if (res.status === 429) throw new Error('RATE_LIMITED')
  if (!res.ok) throw new Error(`LLM error: ${res.status} ${await res.text()}`)

  return res.body!
}

async function callGemini(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  model: string
): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const res = await fetch(
    `${geminiConfig.baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    }
  )

  if (res.status === 429) throw new Error('RATE_LIMITED')
  if (!res.ok) throw new Error(`Gemini error: ${res.status} ${await res.text()}`)

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

async function callCohere(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  model: string
): Promise<string> {
  const lastUser = messages.filter((m) => m.role === 'user').pop()
  const chatHistory = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'CHATBOT' : 'USER',
    message: m.content,
  }))

  const res = await fetch(`${cohereConfig.baseUrl}/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      message: lastUser?.content ?? '',
      chat_history: chatHistory,
    }),
  })

  if (res.status === 429) throw new Error('RATE_LIMITED')
  if (!res.ok) throw new Error(`Cohere error: ${res.status} ${await res.text()}`)

  const data = await res.json()
  return data.text ?? ''
}

export async function callLLM(
  messages: Array<{ role: string; content: string }>,
  options: LLMOptions
): Promise<string> {
  const { provider, apiKey, fallbackChain = [] } = options
  const chain = [provider, ...fallbackChain]

  for (const p of chain) {
    const config = getProviderConfig(p)
    if (!config || !apiKey) continue

    if (!canMakeRequest(p, config.rpmLimit)) {
      const wait = getWaitTime(p, config.rpmLimit)
      if (wait > 0) await new Promise((r) => setTimeout(r, Math.min(wait, 5000)))
    }

    try {
      trackRequest(p, config.rpmLimit)

      if (p === 'gemini') {
        return await callGemini(apiKey, messages, options.model ?? config.models[0])
      }
      if (p === 'cohere') {
        return await callCohere(apiKey, messages, options.model ?? config.models[0])
      }

      const headers = buildOpenAICompatibleHeaders(apiKey, p)
      const model = options.model ?? config.models[0]
      return await callOpenAICompatible(config.baseUrl, messages, model, headers)
    } catch (err) {
      if (err instanceof Error && err.message === 'RATE_LIMITED') continue
      if (p === chain[chain.length - 1]) throw err
      continue
    }
  }

  throw new Error('All providers failed')
}

export async function callLLMStream(
  messages: Array<{ role: string; content: string }>,
  options: LLMOptions
): Promise<ReadableStream> {
  const { provider, apiKey, fallbackChain = [] } = options
  const chain = [provider, ...fallbackChain]

  for (const p of chain) {
    const config = getProviderConfig(p)
    if (!config || !apiKey) continue

    if (!canMakeRequest(p, config.rpmLimit)) {
      const wait = getWaitTime(p, config.rpmLimit)
      if (wait > 0) await new Promise((r) => setTimeout(r, Math.min(wait, 5000)))
    }

    try {
      trackRequest(p, config.rpmLimit)
      const headers = buildOpenAICompatibleHeaders(apiKey, p)
      const model = options.model ?? config.models[0]
      return await callOpenAICompatibleStream(config.baseUrl, messages, model, headers)
    } catch (err) {
      if (err instanceof Error && err.message === 'RATE_LIMITED') continue
      if (p === chain[chain.length - 1]) throw err
      continue
    }
  }

  throw new Error('All providers failed')
}

async function embedWithOpenAICompatible(
  baseUrl: string,
  text: string,
  model: string,
  headers: Record<string, string>,
  dimensions?: number
): Promise<number[]> {
  const res = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ model, input: text, dimensions }),
  })

  if (!res.ok) throw new Error(`Embedding error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.data?.[0]?.embedding ?? []
}

async function embedWithCohere(
  apiKey: string,
  text: string,
  model: string
): Promise<number[]> {
  const res = await fetch(`${cohereConfig.baseUrl}/v1/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, texts: [text], input_type: 'search_document' }),
  })

  if (!res.ok) throw new Error(`Cohere embedding error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.embeddings?.[0] ?? []
}

async function embedWithHuggingFace(
  apiKey: string,
  text: string,
  model: string
): Promise<number[]> {
  const res = await fetch(`${huggingfaceConfig.baseUrl}/pipeline/feature-extraction/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: text }),
  })

  if (!res.ok) throw new Error(`HF embedding error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  if (Array.isArray(data) && data.length > 0) {
    return Array.isArray(data[0]) ? data[0] : data
  }
  return data
}

const EMBEDDING_FALLBACK_CHAIN: ProviderName[] = ['nvidia', 'together', 'huggingface', 'ollama']

export async function callEmbedding(
  text: string,
  options: EmbeddingOptions
): Promise<number[]> {
  const { provider, apiKey } = options
  const chain = [provider, ...EMBEDDING_FALLBACK_CHAIN.filter((p) => p !== provider)]

  for (const p of chain) {
    const config = getProviderConfig(p)
    if (!config || !config.embeddingModel) continue

    if (!canMakeRequest(p, config.rpmLimit)) {
      const wait = getWaitTime(p, config.rpmLimit)
      if (wait > 0) await new Promise((r) => setTimeout(r, Math.min(wait, 5000)))
    }

    try {
      trackRequest(p, config.rpmLimit)

      if (p === 'cohere') {
        return await embedWithCohere(apiKey, text, config.embeddingModel)
      }
      if (p === 'huggingface') {
        return await embedWithHuggingFace(apiKey, text, config.embeddingModel)
      }

      const headers = buildOpenAICompatibleHeaders(apiKey, p)
      return await embedWithOpenAICompatible(
        config.baseUrl,
        text,
        config.embeddingModel,
        headers,
        config.embeddingDimensions
      )
    } catch {
      continue
    }
  }

  throw new Error('No embedding provider available')
}
