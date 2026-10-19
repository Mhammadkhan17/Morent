import type { ReactNode } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "./AdminShell";

/**
 * Server-side owner gate: signed-out visitors and non-owner sessions get a
 * real 404 (no skeleton flash, no client-side bounce). API routes stay
 * protected independently via `require_owner` (403).
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const result = await auth.api.getSession({ headers: await headers() });
  const user = result?.user as { role?: string | null } | undefined;
  if (user?.role !== "owner") {
    notFound();
  }
  return <AdminShell>{children}</AdminShell>;
}
