import { startOfDay, startOfWeek } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { subtractCalendarDays, utcInstantToCalendarYmd } from "@/lib/streak";
import type { WorkSession } from "@/types/momentum";

const WORK_SESSION_STREAK_BUFFER_DAYS = 14;
const WORK_SESSION_STREAK_ROW_LIMIT = 3000;

/** Enough history for week/today sums + recent completed; avoids excluding older manual entries. */
const PROJECT_SESSIONS_LIMIT = 250;

const row =
  "id, user_id, project_id, started_at, ended_at, last_resumed_at, duration_seconds, status, notes, created_at, updated_at";

export type WorkSessionSummary = {
  todaySeconds: number;
  weekSeconds: number;
  activeSession: WorkSession | null;
  runningElsewhere: WorkSession | null;
  recentCompleted: WorkSession[];
};

export type RunningWorkSessionBanner = {
  projectId: string;
  projectName: string;
  status: "running" | "paused";
  startedAt: string;
  durationSeconds: number;
  lastResumedAt: string | null;
} | null;

export async function getWorkSessionSummary(
  userId: string,
  projectId: string
): Promise<WorkSessionSummary> {
  if (isMockDataMode() || !isSupabaseConfigured()) {
    return {
      todaySeconds: 0,
      weekSeconds: 0,
      activeSession: null,
      runningElsewhere: null,
      recentCompleted: [],
    };
  }
  const supabase = await createClient();
  const [
    { data, error },
    { data: globalRunningRows },
    { data: activeRow },
  ] = await Promise.all([
    supabase
      .from("work_sessions")
      .select(row)
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(PROJECT_SESSIONS_LIMIT),
    supabase
      .from("work_sessions")
      .select(row)
      .eq("user_id", userId)
      .eq("status", "running")
      .limit(1),
    supabase
      .from("work_sessions")
      .select(row)
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .in("status", ["running", "paused"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (error) throw error;
  const sessions = (data ?? []) as WorkSession[];
  const globalRunning =
    ((globalRunningRows ?? [])[0] as WorkSession | undefined) ?? null;
  const activeSession = (activeRow as WorkSession | null) ?? null;
  const runningElsewhere: WorkSession | null =
    globalRunning && globalRunning.project_id !== projectId ? globalRunning : null;
  const dayStart = startOfDay(new Date()).getTime();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime();

  let todaySeconds = 0;
  let weekSeconds = 0;
  const recentCompleted: WorkSession[] = [];

  for (const s of sessions) {
    if (s.project_id !== projectId) continue;
    if (activeSession && s.id === activeSession.id) continue;
    const dur = s.duration_seconds;
    const started = new Date(s.started_at).getTime();
    if (started >= dayStart) todaySeconds += dur;
    if (started >= weekStart) weekSeconds += dur;
    if (s.status === "completed" && recentCompleted.length < 6) {
      recentCompleted.push(s);
    }
  }

  return {
    todaySeconds,
    weekSeconds,
    activeSession,
    runningElsewhere,
    recentCompleted,
  };
}

export async function getRunningWorkSessionBanner(
  userId: string
): Promise<RunningWorkSessionBanner> {
  if (isMockDataMode() || !isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_sessions")
    .select(
      "project_id, status, started_at, duration_seconds, last_resumed_at, projects!inner(name)"
    )
    .eq("user_id", userId)
    .in("status", ["running", "paused"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as {
    project_id: string;
    status: "running" | "paused";
    started_at: string;
    duration_seconds: number;
    last_resumed_at: string | null;
    projects: { name: string } | { name: string }[];
  };
  const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
  return {
    projectId: row.project_id,
    projectName: project?.name ?? "Project",
    status: row.status,
    startedAt: row.started_at,
    durationSeconds: row.duration_seconds,
    lastResumedAt: row.last_resumed_at,
  };
}

/** Calendar YYYY-MM-DD keys (in `timeZone`) when the user had a work session. */
export async function collectWorkSessionActivityDatesSince(
  userId: string,
  sinceCalendarYmd: string,
  timeZone: string
): Promise<Set<string>> {
  const out = new Set<string>();
  if (isMockDataMode() || !isSupabaseConfigured()) {
    return out;
  }
  const since = sinceCalendarYmd.trim().slice(0, 10);
  const fetchFrom = subtractCalendarDays(since, WORK_SESSION_STREAK_BUFFER_DAYS);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_sessions")
    .select("started_at")
    .eq("user_id", userId)
    .gte("started_at", `${fetchFrom}T00:00:00.000Z`)
    .order("started_at", { ascending: false })
    .limit(WORK_SESSION_STREAK_ROW_LIMIT);
  if (error) throw error;
  for (const row of data ?? []) {
    const iso = (row as { started_at: string }).started_at;
    const ymd = utcInstantToCalendarYmd(iso, timeZone);
    if (ymd && ymd >= since) out.add(ymd);
  }
  return out;
}
