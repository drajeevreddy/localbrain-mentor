"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/useSupabase"
import EmptyState from "@/components/EmptyState"

interface Gap {
  id: string
  match_score: number
  missing_skills: Array<{ skill: string; priority: string; reason: string }>
  job_title?: string
  company?: string
}

interface Question {
  question: string
  answer: string
  skill_tested: string
  difficulty: "easy" | "medium" | "hard"
}

const DIFFICULTY_COLORS = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  hard: "bg-red-100 text-red-800",
}

export default function InterviewPage() {
  const [gaps, setGaps] = useState<Gap[]>([])
  const [selectedGap, setSelectedGap] = useState("")
  const [generating, setGenerating] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const supabase = useSupabase()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("skill_gaps")
        .select("id, match_score, missing_skills, target_jobs(job_title, company)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (data) {
        const formatted = data.map((g: Record<string, unknown>) => ({
          ...(g as object),
          job_title: (g.target_jobs as Record<string, unknown>)?.job_title,
          company: (g.target_jobs as Record<string, unknown>)?.company,
        })) as Gap[]
        setGaps(formatted)
        if (formatted.length > 0) setSelectedGap(formatted[0].id)
      }
    }
    load()
  }, [supabase])

  const handleGenerate = async () => {
    if (!selectedGap) return
    setGenerating(true)
    setQuestions([])
    setExpandedIndex(null)
    try {
      const res = await fetch("/api/interview/prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gap_id: selectedGap }),
      })
      const data = await res.json()
      if (data.questions) {
        setQuestions(data.questions)
      }
    } catch (err) {
      console.error(err)
    }
    setGenerating(false)
  }

  if (gaps.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-ink">Interview Prep</h1>
        <EmptyState
          title="No gap analyses yet"
          description="Run a gap analysis first to generate tailored interview questions."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl lg:text-2xl font-semibold text-ink">Interview Prep</h1>

      <div className="bg-surface-card border border-hairline rounded-xl p-4 lg:p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Select Gap Analysis</label>
          <select
            value={selectedGap}
            onChange={(e) => setSelectedGap(e.target.value)}
            className="w-full border border-hairline-strong rounded-md px-3 py-2 text-sm text-ink"
          >
            {gaps.map((g) => (
              <option key={g.id} value={g.id}>
                {g.job_title}{g.company && ` @ ${g.company}`} — {g.match_score}% match
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !selectedGap}
          className="bg-primary text-on-primary px-6 py-2.5 rounded-md text-sm font-medium hover:bg-primary-active disabled:opacity-50 transition-colors"
        >
          {generating ? "Generating..." : "Generate Interview Questions"}
        </button>
      </div>

      {questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div
              key={i}
              className="bg-surface-card border border-hairline rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                className="w-full text-left p-4 lg:p-5 flex items-start gap-3 hover:bg-canvas-soft transition-colors"
              >
                <span className="text-sm font-bold text-muted mt-0.5 shrink-0">
                  {i + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink pr-2">{q.question}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${DIFFICULTY_COLORS[q.difficulty]}`}>
                      {q.difficulty}
                    </span>
                    <span className="text-xs text-muted">{q.skill_tested}</span>
                  </div>
                </div>
                <span className="text-muted text-lg shrink-0">
                  {expandedIndex === i ? "−" : "+"}
                </span>
              </button>
              {expandedIndex === i && (
                <div className="px-4 lg:px-5 pb-4 lg:pb-5 pt-0">
                  <div className="bg-canvas-soft rounded-md p-4 text-sm text-ink leading-relaxed whitespace-pre-wrap">
                    {q.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
