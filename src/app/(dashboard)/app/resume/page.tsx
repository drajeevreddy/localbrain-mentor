"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/useSupabase"
import SkillPill from "@/components/SkillPill"
import EmptyState from "@/components/EmptyState"
import Link from "next/link"

interface ParsedData {
  skills: Array<{ skill: string; level: string; years?: number }>
  experience: Array<{ company: string; role: string; duration: string; summary: string }>
  projects: Array<{ name: string; tech_stack: string[]; description: string }>
  education: Array<{ degree: string; institution: string; year: string }>
}

export default function ResumePage() {
  const [mode, setMode] = useState<"paste" | "upload">("paste")
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState<ParsedData | null>(null)
  const [resumes, setResumes] = useState<Array<{ id: string; parsed_skills: ParsedData["skills"] }>>([])
  const supabase = useSupabase()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("resumes")
        .select("id, parsed_skills")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      if (data) setResumes(data)
    }
    load()
  }, [supabase])

  const handleParse = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/resume/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (data.parsed) setParsed(data.parsed)
      if (data.resume) {
        setResumes((prev) => [{ id: data.resume.id, parsed_skills: data.resume.parsed_skills }, ...prev])
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const getLevelVariant = (level: string) => {
    if (level === "advanced" || level === "expert") return "strong"
    if (level === "intermediate") return "partial"
    return "partial"
  }

  if (resumes.length > 0 && !parsed) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-ink">My Resume</h1>
          <button
            onClick={() => setResumes([])}
            className="text-sm text-text-link hover:underline"
          >
            Add New Resume
          </button>
        </div>
        <div className="bg-surface-card border border-hairline rounded-xl p-6">
          <h2 className="text-lg font-semibold text-ink mb-4">Parsed Skills</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {(resumes[0].parsed_skills || []).map((s, i) => (
              <SkillPill
                key={i}
                skill={s.skill}
                level={s.level}
                variant={getLevelVariant(s.level)}
              />
            ))}
          </div>
          <Link
            href="/app/jobs"
            className="inline-block bg-primary text-on-primary px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-active transition-colors"
          >
            Analyze Gap Against a Job
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <h1 className="text-xl lg:text-2xl font-semibold text-ink">My Resume</h1>

      <div className="bg-surface-card border border-hairline rounded-xl overflow-hidden">
        <div className="flex border-b border-hairline">
          <button
            onClick={() => setMode("paste")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              mode === "paste" ? "text-ink border-b-2 border-primary" : "text-body hover:text-ink"
            }`}
          >
            Paste Text
          </button>
          <button
            onClick={() => setMode("upload")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              mode === "upload" ? "text-ink border-b-2 border-primary" : "text-body hover:text-ink"
            }`}
          >
            Upload PDF
          </button>
        </div>

        <div className="p-6">
          {mode === "paste" ? (
            <div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your resume text here..."
                className="w-full h-64 bg-canvas border border-hairline-strong rounded-md p-4 text-sm text-ink resize-none focus:outline-none focus:border-ink"
              />
              <button
                onClick={handleParse}
                disabled={loading || !text.trim()}
                className="mt-4 bg-primary text-on-primary px-6 py-2 rounded-md text-sm font-medium hover:bg-primary-active disabled:opacity-50 transition-colors"
              >
                {loading ? "Parsing..." : "Parse Resume"}
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-hairline-strong rounded-lg p-12 text-center">
              <div className="text-4xl mb-3">📄</div>
              <p className="text-sm text-body mb-2">Drag and drop your PDF here</p>
              <p className="text-xs text-muted">or click to browse</p>
            </div>
          )}
        </div>
      </div>

      {parsed && (
        <div className="space-y-6">
          <div className="bg-surface-card border border-hairline rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ink mb-4">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {parsed.skills.map((s, i) => (
                <SkillPill
                  key={i}
                  skill={s.skill}
                  level={s.level}
                  variant={getLevelVariant(s.level)}
                />
              ))}
            </div>
          </div>

          {parsed.experience.length > 0 && (
            <div className="bg-surface-card border border-hairline rounded-xl p-6">
              <h2 className="text-lg font-semibold text-ink mb-4">Experience</h2>
              <div className="space-y-4">
                {parsed.experience.map((exp, i) => (
                  <div key={i} className="border-l-2 border-hairline pl-4">
                    <div className="font-medium text-ink">{exp.role}</div>
                    <div className="text-sm text-body">{exp.company} · {exp.duration}</div>
                    <div className="text-sm text-body mt-1">{exp.summary}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {parsed.projects.length > 0 && (
            <div className="bg-surface-card border border-hairline rounded-xl p-6">
              <h2 className="text-lg font-semibold text-ink mb-4">Projects</h2>
              <div className="space-y-3">
                {parsed.projects.map((proj, i) => (
                  <div key={i}>
                    <div className="font-medium text-ink">{proj.name}</div>
                    <div className="text-sm text-body">{proj.description}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {proj.tech_stack.map((tech, j) => (
                        <span key={j} className="text-xs bg-surface-strong px-2 py-0.5 rounded">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
