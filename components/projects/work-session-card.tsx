"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/actions/result";
import {
  editCompletedWorkSessionAction,
  logManualWorkSessionAction,
  pauseWorkSessionAction,
  resumeWorkSessionAction,
  startWorkSessionAction,
  stopWorkSessionAction,
  switchWorkSessionAction,
} from "@/app/actions/work-sessions";
import { usePlan } from "@/components/billing/plan-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WorkSession } from "@/types/momentum";

type Props = {
  projectId: string;
  projectName: string;
  isPro: boolean;
  todaySeconds: number;
  weekSeconds: number;
  activeSession: WorkSession | null;
  runningElsewhere: WorkSession | null;
  recentCompleted: WorkSession[];
};

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const MIN_MANUAL_SECONDS = 60;

/** Decimal hours (e.g. 4.1) plus whole minutes (e.g. 20 with 6 hours → 6h 20m). Returns null if invalid or under 1 minute. */
function parseManualDurationToSeconds(
  hoursRaw: string,
  minutesRaw: string
): number | null {
  const hStr = hoursRaw.trim().replace(/,/g, ".");
  const hours = hStr === "" ? 0 : Number(hStr);
  const mStr = minutesRaw.trim();
  const minutesWhole = mStr === "" ? 0 : Math.floor(Number(mStr));
  if (!Number.isFinite(hours) || hours < 0) return null;
  if (!Number.isFinite(minutesWhole) || minutesWhole < 0) return null;
  const totalMinutes = hours * 60 + minutesWhole;
  const secs = Math.round(totalMinutes * 60);
  if (!Number.isFinite(secs) || secs < MIN_MANUAL_SECONDS) return null;
  return secs;
}

function sanitizeHoursInput(raw: string): string {
  const withDot = raw.replace(/,/g, ".");
  let out = "";
  let dotSeen = false;
  for (const ch of withDot) {
    if (ch >= "0" && ch <= "9") {
      out += ch;
      continue;
    }
    if (ch === "." && !dotSeen) {
      dotSeen = true;
      out += ".";
    }
  }
  return out;
}

function sanitizeWholeMinutesInput(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function WorkSessionCard({
  projectId,
  projectName,
  isPro,
  todaySeconds,
  weekSeconds,
  activeSession,
  runningElsewhere,
  recentCompleted,
}: Props) {
  const router = useRouter();
  const { openUpgrade } = usePlan();
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualHours, setManualHours] = useState("1");
  const [manualMinutes, setManualMinutes] = useState("0");
  const [manualNote, setManualNote] = useState("");
  const [stopNote, setStopNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editMinutes, setEditMinutes] = useState("");
  const [editNote, setEditNote] = useState("");

  const status = runningElsewhere
    ? "Running on another project"
    : activeSession?.status === "running"
      ? "Running"
      : activeSession?.status === "paused"
        ? "Paused"
        : "Not running";

  useEffect(() => {
    if (activeSession?.status !== "running") return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [activeSession?.status, activeSession?.id]);

  const elapsedLive = useMemo(() => {
    if (!activeSession) return 0;
    if (activeSession.status !== "running" || !activeSession.last_resumed_at) {
      return activeSession.duration_seconds;
    }
    const delta = Math.max(
      0,
      Math.floor((now - new Date(activeSession.last_resumed_at).getTime()) / 1000)
    );
    return activeSession.duration_seconds + delta;
  }, [activeSession, now]);

  async function run(
    action: () => Promise<ActionResult>,
    onSuccess?: () => void
  ) {
    setPending(true);
    try {
      const res = await action();
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Saved");
      onSuccess?.();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!isPro) {
    return (
      <Card className="rounded-xl border-zinc-200/80 bg-zinc-50/40 py-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Work session</CardTitle>
          <p className="text-[13px] text-zinc-600">
            Track work sessions and see how much time you actually invest in each project.
          </p>
        </CardHeader>
        <CardContent className="pb-4">
          <Button className="h-9 rounded-lg" onClick={openUpgrade}>
            Upgrade to Pro
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-zinc-200/80 py-0">
      <CardHeader className="border-b border-zinc-100/80 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Work session</CardTitle>
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
            {status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/40 px-3 py-2">
            <p className="text-[11px] text-zinc-500">Today</p>
            <p className="text-[14px] font-semibold text-zinc-900">{fmt(todaySeconds + elapsedLive)}</p>
          </div>
          <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/40 px-3 py-2">
            <p className="text-[11px] text-zinc-500">This week</p>
            <p className="text-[14px] font-semibold text-zinc-900">{fmt(weekSeconds + elapsedLive)}</p>
          </div>
          <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/40 px-3 py-2">
            <p className="text-[11px] text-zinc-500">Current session</p>
            <p className="text-[14px] font-semibold text-zinc-900">
              {activeSession ? fmt(elapsedLive) : "—"}
            </p>
          </div>
        </div>

        {runningElsewhere ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-[12px] text-amber-900">
            A session is running on another project.
            <Button
              size="sm"
              variant="outline"
              className="ml-3 h-7"
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  if (!confirm("Stop the other running session and switch here?")) {
                    return { error: "Cancelled" };
                  }
                  return switchWorkSessionAction(projectId);
                })
              }
            >
              Switch here
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {!activeSession ? (
            <Button
              className="h-9 rounded-lg"
              disabled={pending || Boolean(runningElsewhere)}
              onClick={() => void run(() => startWorkSessionAction(projectId))}
            >
              Start
            </Button>
          ) : null}
          {activeSession?.status === "running" ? (
            <Button
              variant="outline"
              className="h-9 rounded-lg"
              disabled={pending}
              onClick={() => void run(() => pauseWorkSessionAction(projectId))}
            >
              Pause
            </Button>
          ) : null}
          {activeSession?.status === "paused" ? (
            <Button
              variant="outline"
              className="h-9 rounded-lg"
              disabled={pending}
              onClick={() => void run(() => resumeWorkSessionAction(projectId))}
            >
              Resume
            </Button>
          ) : null}
          {activeSession ? (
            <Button
              variant="outline"
              className="h-9 rounded-lg"
              disabled={pending}
              onClick={() =>
                void run(() =>
                  stopWorkSessionAction({
                    projectId,
                    note: stopNote,
                    createTimelineEntry: true,
                  })
                )
              }
            >
              Stop
            </Button>
          ) : null}
          <Button
            variant="ghost"
            className="h-9 rounded-lg"
            onClick={() => setManualOpen((v) => !v)}
          >
            Log manual time
          </Button>
        </div>

        {activeSession ? (
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-500">Session note (optional)</Label>
            <Textarea
              value={stopNote}
              onChange={(e) => setStopNote(e.target.value)}
              placeholder={`What did you work on in ${projectName}?`}
            />
          </div>
        ) : null}

        {manualOpen ? (
          <div className="space-y-3 rounded-lg border border-zinc-200/80 bg-zinc-50/40 p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-500">Hours</Label>
                <Input
                  inputMode="decimal"
                  value={manualHours}
                  onChange={(e) => setManualHours(sanitizeHoursInput(e.target.value))}
                  placeholder="4.1 or 6"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-500">Minutes</Label>
                <Input
                  inputMode="numeric"
                  value={manualMinutes}
                  onChange={(e) =>
                    setManualMinutes(sanitizeWholeMinutesInput(e.target.value))
                  }
                  placeholder="20 with hours above"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-500">Date</Label>
                <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
              </div>
            </div>
            <p className="text-[11px] leading-snug text-zinc-500">
              Decimal hours (e.g. 4.1) work on their own. Or use whole hours plus minutes (e.g. 6
              and 20 for 6h 20m). Minutes add to hours; you can also enter only minutes (e.g. 90).
            </p>
            <div className="space-y-1">
              <Label className="text-[11px] text-zinc-500">Note (optional)</Label>
              <Textarea value={manualNote} onChange={(e) => setManualNote(e.target.value)} />
            </div>
            <Button
              className="h-8 rounded-lg"
              disabled={pending}
              onClick={() => {
                const durationSeconds = parseManualDurationToSeconds(
                  manualHours,
                  manualMinutes
                );
                if (durationSeconds == null) {
                  toast.error("Enter a duration of at least 1 minute (e.g. 4.1 hours or 6h 20m).");
                  return;
                }
                void run(() =>
                  logManualWorkSessionAction({
                    projectId,
                    date: manualDate,
                    durationSeconds,
                    note: manualNote,
                  })
                );
              }}
            >
              Save manual entry
            </Button>
          </div>
        ) : null}

        {recentCompleted.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[12px] font-medium text-zinc-600">Recent sessions</p>
            {recentCompleted.slice(0, 4).map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-zinc-200/80 px-3 py-2 text-[12px]"
              >
                {editingId === s.id ? (
                  <div className="space-y-2">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-zinc-500">Hours</Label>
                        <Input
                          inputMode="decimal"
                          value={editHours}
                          onChange={(e) => setEditHours(sanitizeHoursInput(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-zinc-500">Minutes</Label>
                        <Input
                          inputMode="numeric"
                          value={editMinutes}
                          onChange={(e) =>
                            setEditMinutes(sanitizeWholeMinutesInput(e.target.value))
                          }
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-zinc-500">Date</Label>
                        <Input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <Textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const durationSeconds = parseManualDurationToSeconds(
                            editHours,
                            editMinutes
                          );
                          if (durationSeconds == null) {
                            toast.error(
                              "Enter a duration of at least 1 minute (e.g. 4.1 hours or 6h 20m)."
                            );
                            return;
                          }
                          void run(
                            () =>
                              editCompletedWorkSessionAction({
                                sessionId: s.id,
                                projectId,
                                date: editDate,
                                durationSeconds,
                                note: editNote,
                              }),
                            () => setEditingId(null)
                          );
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-zinc-800">
                        {fmt(s.duration_seconds)} · {format(new Date(s.started_at), "MMM d")}
                      </p>
                      {s.notes ? <p className="text-zinc-500">{s.notes}</p> : null}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const sec = s.duration_seconds;
                        const h = Math.floor(sec / 3600);
                        const m = Math.floor((sec % 3600) / 60);
                        setEditingId(s.id);
                        setEditDate(s.started_at.slice(0, 10));
                        setEditHours(h > 0 ? String(h) : "");
                        setEditMinutes(String(m));
                        setEditNote(s.notes ?? "");
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
