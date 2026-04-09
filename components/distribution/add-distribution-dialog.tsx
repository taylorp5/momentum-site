"use client";

import { LogEventDialog } from "@/components/timeline/log-event-dialog";
import type { Project } from "@/types/momentum";

type AddDistributionDialogProps = {
  children: React.ReactNode;
  projectId?: string;
  projects?: Project[];
};

/** Thin wrapper: opens the unified log flow with “Distribution post” pre-selected. */
export function AddDistributionDialog({
  children,
  projectId,
  projects,
}: AddDistributionDialogProps) {
  return (
    <LogEventDialog
      projectId={projectId}
      projects={projects}
      defaultEventType="distribution"
    >
      {children}
    </LogEventDialog>
  );
}
