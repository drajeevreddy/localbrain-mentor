interface SkillPillProps {
  skill: string
  level?: string
  variant?: "strong" | "partial" | "missing"
}

export default function SkillPill({ skill, level, variant = "strong" }: SkillPillProps) {
  const styles = {
    strong: "bg-green-50 text-green-700 border-green-200",
    partial: "bg-yellow-50 text-yellow-700 border-yellow-200",
    missing: "bg-red-50 text-red-700 border-red-200",
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[variant]}`}
    >
      {skill}
      {level && <span className="opacity-60">· {level}</span>}
    </span>
  )
}
