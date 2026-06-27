"use client"

import { useEffect, useState, useRef } from "react"
import { useSupabase } from "@/lib/useSupabase"
import EmptyState from "@/components/EmptyState"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [roadmapId, setRoadmapId] = useState<string | null>(null)
  const [hasRoadmap, setHasRoadmap] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = useSupabase()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: roadmaps } = await supabase
        .from("roadmaps")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)

      if (roadmaps && roadmaps.length > 0) {
        setRoadmapId(roadmaps[0].id)
        setHasRoadmap(true)

        const { data: chats } = await supabase
          .from("mentor_chats")
          .select("*")
          .eq("user_id", user.id)
          .eq("roadmap_id", roadmaps[0].id)
          .order("created_at", { ascending: false })
          .limit(1)

        if (chats && chats.length > 0) {
          setChatId(chats[0].id)
          setMessages(chats[0].messages || [])
        }
      }
    }
    load()
  }, [supabase])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          roadmap_id: roadmapId,
          chat_id: chatId,
        }),
      })
      const data = await res.json()
      if (data.response) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.response }])
        if (data.chat_id) setChatId(data.chat_id)
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const quickPrompts = [
    "What should I focus on this week?",
    "Am I ready to apply yet?",
    "Explain TypeScript simply",
    "How do I practice React?",
  ]

  if (!hasRoadmap) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-ink">Mentor Chat</h1>
        <EmptyState
          title="No active roadmap"
          description="Generate a roadmap first so the mentor has context about your learning journey."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] lg:h-[calc(100vh-120px)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h1 className="text-xl lg:text-2xl font-semibold text-ink">Mentor Chat</h1>
        <div className="text-xs text-muted bg-surface-strong px-2 py-1 rounded-full self-start">
          Mentor knows your resume + roadmap
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-sm text-body mb-4">Ask your mentor anything about your learning path</p>
            <div className="flex flex-wrap justify-center gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="text-xs border border-hairline-strong rounded-full px-3 py-1.5 text-body hover:bg-canvas-soft transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] px-4 py-3 rounded-xl text-sm ${
                msg.role === "user"
                  ? "bg-primary text-on-primary rounded-br-none"
                  : "bg-surface-card border border-hairline text-ink rounded-bl-none"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-card border border-hairline rounded-xl px-4 py-3 rounded-bl-none">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask your mentor..."
          className="flex-1 border border-hairline-strong rounded-md px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-ink"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-primary text-on-primary px-4 py-2.5 rounded-md text-sm font-medium hover:bg-primary-active disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
}
