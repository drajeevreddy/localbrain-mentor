"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/useSupabase"
import SkillPill from "@/components/SkillPill"
import Link from "next/link"

interface ParsedData {
  skills: Array<{ skill: string; level: string; endorsements?: number }>
  experience: Array<{ company: string; role: string; duration: string; summary: string }>
  education: Array<{ degree: string; institution: string; year: string }>
  certifications: Array<{ name: string; issuer: string; date: string }>
  summary: string
}

export default function LinkedInPage() {
  const [mode, setMode] = useState<"paste" | "pdf" | "url">("url")
  const [text, setText] = useState("")
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [parsed, setParsed] = useState<ParsedData | null>(null)
  const [profiles, setProfiles] = useState<Array<{ id: string; parsed_skills: ParsedData["skills"] }>>([])
  const supabase = useSupabase()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("linkedin_profiles")
        .select("id, parsed_skills")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      if (data) setProfiles(data)
    }
    load()
  }, [supabase])

  const handleParse = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/linkedin/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_text: text }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        if (data.parsed) setParsed(data.parsed)
        if (data.profile) {
          setProfiles((prev) => [{ id: data.profile.id, parsed_skills: data.profile.parsed_skills }, ...prev])
        }
      }
    } catch (err) {
      setError("Failed to parse profile")
    }
    setLoading(false)
  }

  const handleUrlImport = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/profile/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else if (data.parsed) {
        setParsed(data.parsed)
      }
    } catch (err) {
      setError("Failed to fetch and parse profile")
    }
    setLoading(false)
  }

  const handlePdfUpload = async (file: File) => {
    setLoading(true)
    setError("")
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const pageText = content.items
          .reduce((acc: string, item: Record<string, unknown>) => {
            if ('str' in item && typeof item.str === 'string') return acc + item.str + ' '
            return acc
          }, '')
        fullText += pageText + '\n'
      }

      if (!fullText.trim()) {
        setError("Could not extract text from PDF")
        setLoading(false)
        return
      }

      const res = await fetch("/api/linkedin/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_text: fullText }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else if (data.parsed) {
        setParsed(data.parsed)
        if (data.profile) {
          setProfiles((prev) => [{ id: data.profile.id, parsed_skills: data.profile.parsed_skills }, ...prev])
        }
      }
    } catch (err) {
      setError("Failed to parse PDF")
    }
    setLoading(false)
  }

  const getLevelVariant = (level: string) => {
    if (level === "advanced" || level === "expert") return "strong"
    if (level === "intermediate") return "partial"
    return "partial"
  }

  if (profiles.length > 0 && !parsed) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl lg:text-2xl font-semibold text-ink">LinkedIn Profile</h1>
          <button
            onClick={() => setProfiles([])}
            className="text-sm text-text-link hover:underline"
          >
            Add New Profile
          </button>
        </div>
        <div className="bg-surface-card border border-hairline rounded-xl p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-ink mb-4">Parsed Skills</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {(profiles[0].parsed_skills || []).map((s, i) => (
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
      <h1 className="text-xl lg:text-2xl font-semibold text-ink">Import Profile</h1>

      <div className="bg-surface-card border border-hairline rounded-xl overflow-hidden">
        <div className="flex border-b border-hairline">
          {[
            { key: "url" as const, label: "Import URL" },
            { key: "paste" as const, label: "Paste Text" },
            { key: "pdf" as const, label: "Upload PDF" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setMode(tab.key); setError("") }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                mode === tab.key ? "text-ink border-b-2 border-primary" : "text-body hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 lg:p-6">
          {mode === "url" && (
            <div>
              <p className="text-sm text-body mb-4">
                Enter a public profile URL. Works with GitHub profiles, personal websites, and portfolio pages.
              </p>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/username or https://yourwebsite.com"
                className="w-full bg-canvas border border-hairline-strong rounded-md px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-ink mb-3"
              />
              <p className="text-xs text-muted mb-4">
                Tip: For LinkedIn, use the Paste Text tab — LinkedIn blocks automated fetching.
              </p>
              <button
                onClick={handleUrlImport}
                disabled={loading || !url.trim()}
                className="bg-primary text-on-primary px-6 py-2 rounded-md text-sm font-medium hover:bg-primary-active disabled:opacity-50 transition-colors"
              >
                {loading ? "Importing..." : "Import Profile"}
              </button>
            </div>
          )}

          {mode === "paste" && (
            <div>
              <p className="text-sm text-body mb-4">
                Copy and paste your profile sections. Include About, Experience, Skills, Education.
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Paste your profile text here...\n\nExample sections:\n\nAbout:\n[Your about/summary]\n\nExperience:\n[Your work experience]\n\nSkills:\n[Your skills]\n\nEducation:\n[Your education]`}
                className="w-full h-64 bg-canvas border border-hairline-strong rounded-md p-4 text-sm text-ink resize-none focus:outline-none focus:border-ink"
              />
              <button
                onClick={handleParse}
                disabled={loading || !text.trim()}
                className="mt-4 bg-primary text-on-primary px-6 py-2 rounded-md text-sm font-medium hover:bg-primary-active disabled:opacity-50 transition-colors"
              >
                {loading ? "Parsing..." : "Parse Profile"}
              </button>
            </div>
          )}

          {mode === "pdf" && (
            <div
              className="border-2 border-dashed border-hairline-strong rounded-lg p-12 text-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => document.getElementById('profile-pdf-upload')?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/5') }}
              onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary', 'bg-primary/5') }}
              onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.classList.remove('border-primary', 'bg-primary/5')
                const file = e.dataTransfer.files[0]
                if (file && file.type === 'application/pdf') handlePdfUpload(file)
              }}
            >
              <input
                id="profile-pdf-upload"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handlePdfUpload(file)
                }}
              />
              <div className="text-4xl mb-3">📄</div>
              <p className="text-sm text-body mb-2">Drag and drop your PDF here</p>
              <p className="text-xs text-muted">or click to browse</p>
              {loading && <p className="text-sm text-text-link mt-3">Parsing PDF...</p>}
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-semantic-error bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </p>
          )}
        </div>
      </div>

      {parsed && (
        <div className="space-y-4 lg:space-y-6">
          {parsed.summary && (
            <div className="bg-surface-card border border-hairline rounded-xl p-4 lg:p-6">
              <h2 className="text-lg font-semibold text-ink mb-2">Summary</h2>
              <p className="text-sm text-body">{parsed.summary}</p>
            </div>
          )}

          {parsed.skills.length > 0 && (
            <div className="bg-surface-card border border-hairline rounded-xl p-4 lg:p-6">
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
          )}

          {parsed.experience.length > 0 && (
            <div className="bg-surface-card border border-hairline rounded-xl p-4 lg:p-6">
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

          {parsed.education.length > 0 && (
            <div className="bg-surface-card border border-hairline rounded-xl p-4 lg:p-6">
              <h2 className="text-lg font-semibold text-ink mb-4">Education</h2>
              <div className="space-y-3">
                {parsed.education.map((edu, i) => (
                  <div key={i}>
                    <div className="font-medium text-ink">{edu.degree}</div>
                    <div className="text-sm text-body">{edu.institution} · {edu.year}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {parsed.certifications && parsed.certifications.length > 0 && (
            <div className="bg-surface-card border border-hairline rounded-xl p-4 lg:p-6">
              <h2 className="text-lg font-semibold text-ink mb-4">Certifications</h2>
              <div className="space-y-3">
                {parsed.certifications.map((cert, i) => (
                  <div key={i}>
                    <div className="font-medium text-ink">{cert.name}</div>
                    <div className="text-sm text-body">{cert.issuer} · {cert.date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4">
            <Link
              href="/app/jobs"
              className="inline-block bg-primary text-on-primary px-6 py-2 rounded-md text-sm font-medium hover:bg-primary-active transition-colors"
            >
              Analyze Gap Against a Job
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
