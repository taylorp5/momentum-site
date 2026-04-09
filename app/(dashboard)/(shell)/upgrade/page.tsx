import type { Metadata } from "next";
import { UpgradePageClient } from "@/components/billing/upgrade-page-client";

export const metadata: Metadata = {
  title: "Upgrade",
};

export default function UpgradePage() {
  return <UpgradePageClient />;
}
