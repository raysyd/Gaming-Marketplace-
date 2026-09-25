"use client";
import type { createClient } from "./client";

/**
 * The browser Supabase client (auth + realtime + postgrest) is the single
 * biggest piece of JavaScript on the site. Components mounted on every page
 * (AuthProvider, the header's NotificationBell) load it with this instead of
 * a static import, so it's fetched after the page is interactive rather
 * than holding up first load.
 */
export function loadSupabase(): Promise<ReturnType<typeof createClient>> {
  return import("./client").then((m) => m.createClient());
}
