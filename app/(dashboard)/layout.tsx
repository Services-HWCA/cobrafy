import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/AppShell";

export const instant = false;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
