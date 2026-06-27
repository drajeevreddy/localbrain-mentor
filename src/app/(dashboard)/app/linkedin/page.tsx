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
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
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
    try {
      const res = await fetch("/api/linkedin/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_text: text }),
      })
      const data = await res.json()
      if (data.parsed) setParsed(data.parsed)
      if (data.profile) {
        setProfiles((prev) => [{ id: data.profile.id, parsed_skills: data.profile.parsed_skills }, ...prev])
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

  if (profiles.length > 0 && !parsed) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-ink">LinkedIn Profile</h1>
          <button
            onClick={() => setProfiles([])}
            className="text-sm text-text-link hover:underline"
          >
            Add New Profile
          </button>
        </div>
        <div className="bg-surface-card border border-hairline rounded-xl p-6">
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
      <h1 className="text-xl lg:text-2xl font-semibold text-ink">LinkedIn Profile</h1>

      <div className="bg-surface-card border border-hairline rounded-xl p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Paste Your LinkedIn Profile</h2>
        <p className="text-sm text-body mb-4">
          Copy and paste your LinkedIn profile sections below. Include your About, Experience, Skills, Education, and Certifications.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Paste your LinkedIn profile text here...\n\nExample sections:\n\nAbout:\n[Your about/summary section]\n\nExperience:\n[Your work experience]\n\nSkills:\n[Your skills with endorsements]\n\nEducation:\n[Your education details]\n\nCertifications:\n[Your certifications]`}
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

      {parsed && (
        <div className="space-y-6">
          {parsed.summary && (
            <div className="bg-surface-card border border-hairline rounded-xl p-6">
              <h2 className="text-lg font-semibold text-ink mb-2">Summary</h2>
              <p className="text-sm text-body">{parsed.summary}</p>
            </div>
          )}

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

          {parsed.education.length > 0 && (
            <div className="bg-surface-card border border-hairline rounded-xl p-6">
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

          {parsed.certifications.length > 0 && (
            <div className="bg-surface-card border border-hairline rounded-xl p-6">
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