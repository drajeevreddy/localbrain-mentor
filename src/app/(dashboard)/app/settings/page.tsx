"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/useSupabase"

const PROVIDERS = [
  { name: "nvidia", label: "NVIDIA NIM", rpm: 40 },
  { name: "groq", label: "Groq", rpm: 30 },
  { name: "gemini", label: "Google Gemini", rpm: 60 },
  { name: "openrouter", label: "OpenRouter", rpm: 50 },
  { name: "cohere", label: "Cohere", rpm: 20 },
  { name: "together", label: "Together AI", rpm: 60 },
  { name: "cerebras", label: "Cerebras", rpm: 30 },
  { name: "huggingface", label: "Hugging Face", rpm: 30 },
  { name: "ollama", label: "Ollama (Local)", rpm: 999 },
]

interface ProviderConfig {
  enabled: boolean
  apiKey: string
  model: string
}

export default function SettingsPage() {
  const [providers, setProviders] = useState<Record<string, ProviderConfig>>({})
  const [fallbackChain, setFallbackChain] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const supabase = useSupabase()

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/settings")
      const data = await res.json()
      setProviders(data.providers || {})
      setFallbackChain(data.fallbackChain || PROVIDERS.map((p) => p.name))
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage("")
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providers, fallbackChain }),
      })
      if (res.ok) setMessage("Settings saved!")
      else setMessage("Failed to save settings")
    } catch {
      setMessage("Failed to save settings")
    }
    setSaving(false)
  }

  const updateProvider = (name: string, field: keyof ProviderConfig, value: string | boolean) => {
    setProviders((prev) => ({
      ...prev,
      [name]: { ...prev[name], [field]: value },
    }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-surface-strong rounded animate-pulse" />
        <div className="h-64 bg-surface-strong rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6 max-w-3xl">
      <h1 className="text-xl lg:text-2xl font-semibold text-ink">Settings</h1>

      <div className="bg-surface-card border border-hairline rounded-xl p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">LLM Providers</h2>
        <div className="space-y-4">
          {PROVIDERS.map((provider) => {
            const config = providers[provider.name] || { enabled: false, apiKey: "", model: "" }
            return (
              <div key={provider.name} className="border border-hairline rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => updateProvider(provider.name, "enabled", e.target.checked)}
                      className="rounded border-hairline-strong"
                    />
                    <div>
                      <div className="text-sm font-medium text-ink">{provider.label}</div>
                      <div className="text-xs text-muted">{provider.rpm} RPM</div>
                    </div>
                  </div>
                </div>
                {config.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs text-muted mb-1">API Key</label>
                      <input
                        type="password"
                        value={config.apiKey}
                        onChange={(e) => updateProvider(provider.name, "apiKey", e.target.value)}
                        placeholder={config.apiKey ? "••••••••" : "Enter API key"}
                        className="w-full border border-hairline-strong rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Model</label>
                      <input
                        type="text"
                        value={config.model}
                        onChange={(e) => updateProvider(provider.name, "model", e.target.value)}
                        placeholder="Model name"
                        className="w-full border border-hairline-strong rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-surface-card border border-hairline rounded-xl p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Fallback Chain</h2>
        <p className="text-sm text-body mb-4">
          Drag to reorder. When a provider hits rate limits, the next one is used.
        </p>
        <div className="space-y-2">
          {fallbackChain.map((name, index) => {
            const provider = PROVIDERS.find((p) => p.name === name)
            return (
              <div
                key={name}
                className="flex items-center gap-3 p-3 bg-canvas-soft rounded-md"
              >
                <span className="text-sm text-muted font-mono w-6">{index + 1}.</span>
                <span className="text-sm text-ink flex-1">{provider?.label || name}</span>
                <span className="text-xs text-muted">{provider?.rpm || "?"} RPM</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-on-primary px-6 py-2 rounded-md text-sm font-medium hover:bg-primary-active disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {message && (
          <span className="text-sm text-semantic-success">{message}</span>
        )}
      </div>
    </div>
  )
}
