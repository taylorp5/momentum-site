"use client";

import * as React from "react";
import { DialogTrigger } from "@/components/ui/dialog";

/**
 * Merges Base UI Dialog trigger props onto a single child element (e.g. Button).
 */
export function DialogTriggerMerge({
  children,
}: {
  children: React.ReactElement<Record<string, unknown>>;
}) {
  return (
    <DialogTrigger
      render={(props) =>
        React.cloneElement(children, {
          ...(children.props as object),
          ...(props as object),
        } as never)
      }
    />
  );
}
