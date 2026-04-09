import { requireSessionUser } from "@/lib/auth/user";

export const dynamic = "force-dynamic";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSessionUser();
  return <>{children}</>;
}
