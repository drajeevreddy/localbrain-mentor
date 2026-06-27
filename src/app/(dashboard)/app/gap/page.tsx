"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/useSupabase"
import MatchScoreRing from "@/components/MatchScoreRing"
import SkillPill from "@/components/SkillPill"
import EmptyState from "@/components/EmptyState"
import { useRouter } from "next/navigation"

interface Gap {
  id: string
  match_score: number
  missing_skills: Array<{ skill: string; priority: string; reason: string }>
  existing_skills: Array<{ skill: string; level: string; match_quality: string }>
  gap_summary: string | null
  job_title?: string
  company?: string
  created_at: string
}

export default function GapPage() {
  const [gaps, setGaps] = useState<Gap[]>([])
  const [selectedGap, setSelectedGap] = useState<Gap | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const supabase = useSupabase()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("skill_gaps")
        .select("*, target_jobs(job_title, company)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (data) {
        const formatted = data.map((g: Record<string, unknown>) => ({
          ...(g as object),
          job_title: (g.target_jobs as Record<string, unknown>)?.job_title,
          company: (g.target_jobs as Record<string, unknown>)?.company,
        })) as Gap[]
        setGaps(formatted)
        if (formatted.length > 0) setSelectedGap(formatted[0])
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const handleGenerateRoadmap = async () => {
    if (!selectedGap) return
    setGenerating(true)
    try {
      const res = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gap_id: selectedGap.id, weeks_available: 8, hours_per_week: 5 }),
      })
      const data = await res.json()
      if (data.roadmap) {
        router.push("/app/roadmap")
      }
    } catch (err) {
      console.error(err)
    }
    setGenerating(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-surface-strong rounded animate-pulse" />
        <div className="h-96 bg-surface-strong rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!selectedGap) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-ink">Gap Analysis</h1>
        <EmptyState
          title="No gap analysis yet"
          description="Add a resume and target job to see your skill gap analysis."
          action={
            <button
              onClick={() => router.push("/app/jobs")}
              className="bg-primary text-on-primary px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-active transition-colors"
            >
              Add Target Job
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl lg:text-2xl font-semibold text-ink">Gap Analysis</h1>
        {gaps.length > 1 && (
          <select
            value={selectedGap.id}
            onChange={(e) => {
              const gap = gaps.find((g) => g.id === e.target.value)
              if (gap) setSelectedGap(gap)
            }}
            className="border border-hairline-strong rounded-md px-3 py-1.5 text-sm text-ink"
          >
            {gaps.map((g) => (
              <option key={g.id} value={g.id}>
                {g.job_title} {g.company && `@ ${g.company}`}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-1 flex flex-col items-center bg-surface-card border border-hairline rounded-xl p-4 lg:p-6">
          <MatchScoreRing score={selectedGap.match_score} size={140} />
          <p className="text-sm text-body mt-4 text-center max-w-xs">
            {selectedGap.gap_summary}
          </p>
        </div>

        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          {selectedGap.existing_skills.length > 0 && (
            <div className="bg-surface-card border border-hairline rounded-xl p-4 lg:p-6">
              <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
                Your Skills ✓
              </h2>
              <div className="flex flex-wrap gap-2">
                {selectedGap.existing_skills.map((s, i) => (
                  <SkillPill
                    key={i}
                    skill={s.skill}
                    level={s.level}
                    variant={s.match_quality === "strong" ? "strong" : "partial"}
                  />
                ))}
              </div>
            </div>
          )}

          {selectedGap.missing_skills.length > 0 && (
            <div className="bg-surface-card border border-hairline rounded-xl p-4 lg:p-6">
              <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
                Missing Skills
              </h2>
              <div className="space-y-2">
                {selectedGap.missing_skills
                  .sort((a, b) => {
                    const order = { high: 0, medium: 1, low: 2 }
                    return (order[a.priority as keyof typeof order] || 2) - (order[b.priority as keyof typeof order] || 2)
                  })
                  .map((skill, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-canvas-soft rounded-md">
                      <span className="text-sm mt-0.5">
                        {skill.priority === "high" ? "🔴" : skill.priority === "medium" ? "🟡" : "🟢"}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-ink">{skill.skill}</div>
                        <div className="text-xs text-body">{skill.reason}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleGenerateRoadmap}
          disabled={generating}
          className="bg-primary text-on-primary px-6 py-3 rounded-md text-sm font-medium hover:bg-primary-active disabled:opacity-50 transition-colors"
        >
          {generating ? "Generating Roadmap..." : "Generate My Learning Roadmap"}
        </button>
      </div>
    </div>
  )
}
