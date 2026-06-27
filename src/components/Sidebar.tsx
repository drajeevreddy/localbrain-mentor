"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

const links = [
  { href: "/app", label: "Dashboard", icon: "◉" },
  { href: "/app/resume", label: "My Resume", icon: "📄" },
  { href: "/app/linkedin", label: "LinkedIn Profile", icon: "🔗" },
  { href: "/app/jobs", label: "Target Jobs", icon: "🎯" },
  { href: "/app/gap", label: "Gap Analysis", icon: "📊" },
  { href: "/app/roadmap", label: "My Roadmap", icon: "🗺" },
  { href: "/app/coverletter", label: "Cover Letter", icon: "✉" },
  { href: "/app/interview", label: "Interview Prep", icon: "🎙" },
  { href: "/app/quiz", label: "Skill Quiz", icon: "❓" },
  { href: "/app/chat", label: "Mentor Chat", icon: "💬" },
  { href: "/app/settings", label: "Settings", icon: "⚙" },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-surface-card border border-hairline-strong rounded-lg flex items-center justify-center shadow-sm"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-canvas border-r border-hairline
        flex flex-col min-h-screen
        transform transition-transform duration-200 ease-in-out
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="px-4 py-5 border-b border-hairline flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-on-primary text-sm font-semibold">M</span>
            </div>
            <span className="text-ink font-semibold text-base">Mentor</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md hover:bg-canvas-soft text-muted"
            aria-label="Close menu"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-surface-strong text-ink"
                    : "text-body hover:bg-canvas-soft hover:text-ink"
                }`}
              >
                <span className="text-base">{link.icon}</span>
                {link.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
