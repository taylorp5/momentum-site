"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions/result";
import {
  READ_ONLY_MOCK_ERROR,
  SUPABASE_REQUIRED_ERROR,
  validationError,
} from "@/lib/actions/result";
import { getProfile, requireSessionUser } from "@/lib/auth/user";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { isProPlan } from "@/lib/plan";
import { createClient } from "@/lib/supabase/server";
import { insertTimelineEntry } from "@/lib/services/timeline-entries";

const uuidSchema = z.string().uuid();

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function projectPath(projectId: string) {
  return `/projects/${projectId}`;
}

async function getRunningSession(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("work_sessions")
    .select(
      "id, user_id, project_id, started_at, ended_at, last_resumed_at, duration_seconds, status, notes, created_at, updated_at"
    )
    .eq("user_id", userId)
    .eq("status", "running")
    .maybeSingle();
  return data as
    | {
        id: string;
        project_id: string;
        last_resumed_at: string | null;
        duration_seconds: number;
      }
    | null;
}

async function requireWritable() {
  const user = await requireSessionUser();
  if (isMockDataMode()) return { user, error: READ_ONLY_MOCK_ERROR as string };
  if (!isSupabaseConfigured()) return { user, error: SUPABASE_REQUIRED_ERROR as string };
  return { user, error: null as string | null };
}

const PRO_TIMED_SESSION_ERROR =
  "Timed work sessions are a Pro feature. Upgrade to unlock them.";

async function requireProForTimedWork(userId: string): Promise<ActionResult | null> {
  const profile = await getProfile(userId);
  if (!isProPlan(profile?.plan ?? "free")) {
    return { error: PRO_TIMED_SESSION_ERROR };
  }
  return null;
}

export async function startWorkSessionAction(projectId: string): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(projectId);
  if (!parsed.success) return validationError(parsed.error);
  const { user, error } = await requireWritable();
  if (error) return { error };
  const supabase = await createClient();
  const running = await getRunningSession(user.id);
  if (running && running.project_id !== projectId) {
    return { error: "Another project has a running session. Stop or switch first." };
  }
  if (running && running.project_id === projectId) return { success: true };

  const proErr = await requireProForTimedWork(user.id);
  if (proErr) return proErr;

  const now = new Date().toISOString();
  const { error: insertError } = await supabase.from("work_sessions").insert({
    user_id: user.id,
    project_id: projectId,
    started_at: now,
    last_resumed_at: now,
    status: "running",
    duration_seconds: 0,
  });
  if (insertError) return { error: insertError.message };
  revalidatePath(projectPath(projectId));
  return { success: true };
}

export async function pauseWorkSessionAction(projectId: string): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(projectId);
  if (!parsed.success) return validationError(parsed.error);
  const { user, error } = await requireWritable();
  if (error) return { error };
  const supabase = await createClient();
  const running = await getRunningSession(user.id);
  if (!running || running.project_id !== projectId) return { error: "No running session." };

  const now = Date.now();
  const extra = running.last_resumed_at
    ? Math.max(0, Math.floor((now - new Date(running.last_resumed_at).getTime()) / 1000))
    : 0;
  const { error: updateError } = await supabase
    .from("work_sessions")
    .update({
      status: "paused",
      duration_seconds: running.duration_seconds + extra,
      last_resumed_at: null,
    })
    .eq("id", running.id)
    .eq("user_id", user.id);
  if (updateError) return { error: updateError.message };
  revalidatePath(projectPath(projectId));
  return { success: true };
}

export async function resumeWorkSessionAction(projectId: string): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(projectId);
  if (!parsed.success) return validationError(parsed.error);
  const { user, error } = await requireWritable();
  if (error) return { error };
  const supabase = await createClient();
  const running = await getRunningSession(user.id);
  if (running && running.project_id !== projectId) {
    return { error: "Another project has a running session. Stop or switch first." };
  }
  const { data: paused } = await supabase
    .from("work_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .eq("status", "paused")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!paused) return { error: "No paused session to resume." };
  const { error: updateError } = await supabase
    .from("work_sessions")
    .update({ status: "running", last_resumed_at: new Date().toISOString() })
    .eq("id", paused.id)
    .eq("user_id", user.id);
  if (updateError) return { error: updateError.message };
  revalidatePath(projectPath(projectId));
  return { success: true };
}

const stopSchema = z.object({
  projectId: z.string().uuid(),
  note: z.string().max(2000).optional().default(""),
  createTimelineEntry: z.boolean().optional().default(true),
});

export async function stopWorkSessionAction(input: unknown): Promise<ActionResult> {
  const parsed = stopSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { user, error } = await requireWritable();
  if (error) return { error };
  const { projectId, note, createTimelineEntry } = parsed.data;
  const supabase = await createClient();
  const running = await getRunningSession(user.id);

  const nowIso = new Date().toISOString();
  const nowMs = Date.now();
  let sessionId: string;
  let total: number;

  if (running && running.project_id === projectId) {
    sessionId = running.id;
    const extra = running.last_resumed_at
      ? Math.max(0, Math.floor((nowMs - new Date(running.last_resumed_at).getTime()) / 1000))
      : 0;
    total = running.duration_seconds + extra;
  } else {
    const { data: paused } = await supabase
      .from("work_sessions")
      .select("id, duration_seconds")
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .eq("status", "paused")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!paused) return { error: "No active session to stop." };
    sessionId = paused.id;
    total = paused.duration_seconds;
  }

  const { error: updateError } = await supabase
    .from("work_sessions")
    .update({
      status: "completed",
      ended_at: nowIso,
      last_resumed_at: null,
      duration_seconds: total,
      notes: note?.trim() || null,
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);
  if (updateError) return { error: updateError.message };

  if (createTimelineEntry) {
    const secs = Math.max(60, total);
    await insertTimelineEntry(supabase, {
      userId: user.id,
      data: {
        type: "work",
        project_id: projectId,
        entry_date: nowIso.slice(0, 10),
        title: `Worked ${fmtDuration(total)}`,
        description: note?.trim() || "",
        duration_seconds: secs,
        work_session_kind: "timer_session",
      },
      provenance: { source_type: "manual", source_metadata: null },
    });
    revalidatePath("/dashboard");
  }

  revalidatePath(projectPath(projectId));
  return { success: true };
}

export async function switchWorkSessionAction(nextProjectId: string): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(nextProjectId);
  if (!parsed.success) return validationError(parsed.error);
  const { user, error } = await requireWritable();
  if (error) return { error };
  const proErr = await requireProForTimedWork(user.id);
  if (proErr) return proErr;
  const running = await getRunningSession(user.id);
  if (running) {
    await stopWorkSessionAction({
      projectId: running.project_id,
      note: "",
      createTimelineEntry: false,
    });
  }
  return startWorkSessionAction(nextProjectId);
}

const manualSchema = z.object({
  projectId: z.string().uuid(),
  date: z.string().min(1),
  durationSeconds: z.number().int().positive(),
  note: z.string().max(2000).optional().default(""),
});

export async function logManualWorkSessionAction(input: unknown): Promise<ActionResult> {
  const parsed = manualSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { user, error } = await requireWritable();
  if (error) return { error };
  const proErr = await requireProForTimedWork(user.id);
  if (proErr) return proErr;
  const { projectId, date, durationSeconds, note } = parsed.data;
  const supabase = await createClient();
  const start = new Date(`${date}T09:00:00.000Z`);
  const end = new Date(start.getTime() + durationSeconds * 1000);
  const { error: insertError } = await supabase.from("work_sessions").insert({
    user_id: user.id,
    project_id: projectId,
    started_at: start.toISOString(),
    ended_at: end.toISOString(),
    last_resumed_at: null,
    duration_seconds: durationSeconds,
    status: "completed",
    notes: note?.trim() || null,
  });
  if (insertError) return { error: insertError.message };

  const secs = Math.max(60, durationSeconds);
  const { error: timelineError } = await insertTimelineEntry(supabase, {
    userId: user.id,
    data: {
      type: "work",
      project_id: projectId,
      entry_date: date,
      title: `Worked ${fmtDuration(durationSeconds)}`,
      description: note?.trim() || "",
      duration_seconds: secs,
      work_session_kind: "manual_time_entry",
    },
    provenance: { source_type: "manual", source_metadata: null },
  });
  if (timelineError) {
    console.error("Manual work session: timeline note failed:", timelineError.message);
  }

  revalidatePath(projectPath(projectId));
  revalidatePath("/dashboard");
  return { success: true };
}

const editSchema = z.object({
  sessionId: z.string().uuid(),
  projectId: z.string().uuid(),
  date: z.string().min(1),
  durationSeconds: z.number().int().positive(),
  note: z.string().max(2000).optional().default(""),
});

export async function editCompletedWorkSessionAction(input: unknown): Promise<ActionResult> {
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { user, error } = await requireWritable();
  if (error) return { error };
  const { sessionId, projectId, date, durationSeconds, note } = parsed.data;
  const start = new Date(`${date}T09:00:00.000Z`);
  const end = new Date(start.getTime() + durationSeconds * 1000);
  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("work_sessions")
    .update({
      started_at: start.toISOString(),
      ended_at: end.toISOString(),
      duration_seconds: durationSeconds,
      notes: note?.trim() || null,
    })
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .eq("status", "completed");
  if (updateError) return { error: updateError.message };
  revalidatePath(projectPath(projectId));
  revalidatePath("/dashboard");
  return { success: true };
}
