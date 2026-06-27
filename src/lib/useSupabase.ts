"use client"

import { useRef } from "react"
import { createClient } from "./supabase/client"
import type { SupabaseClient } from "@supabase/supabase-js"

export function useSupabase(): SupabaseClient {
  const ref = useRef<SupabaseClient | null>(null)
  if (!ref.current) {
    ref.current = createClient()
  }
  return ref.current
}
