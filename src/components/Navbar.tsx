"use client"

import { useSupabase } from "@/lib/useSupabase"
import { useRouter } from "next/navigation"
import ThemeToggle from "./ThemeToggle"

export default function Navbar() {
  const router = useRouter()
  const supabase = useSupabase()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <header className="h-14 lg:h-16 border-b border-hairline bg-canvas flex items-center justify-between px-4 lg:px-6">
      <div className="w-10 lg:hidden" />
      <div />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          onClick={handleSignOut}
          className="text-sm text-body hover:text-ink transition-colors"
        >
          Sign Out
        </button>
      </div>
    </header>
  )
}
