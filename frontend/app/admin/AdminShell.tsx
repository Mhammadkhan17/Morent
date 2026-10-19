"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarCheck,
  CarFront,
  LayoutDashboard,
  TicketPercent,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview", href: "/admin", Icon: LayoutDashboard },
  { label: "Bookings", href: "/admin/bookings", Icon: CalendarCheck },
  { label: "Cars", href: "/admin/cars", Icon: CarFront },
  { label: "Customers", href: "/admin/customers", Icon: Users },
  { label: "Promos", href: "/admin/promos", Icon: TicketPercent },
  { label: "Analytics", href: "/admin/analytics", Icon: BarChart3 },
];

/** Owner-only chrome for /admin/* — auth is enforced in the server layout. */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-10 lg:px-8">
      <aside className="lg:w-48 lg:shrink-0">
        <nav
          aria-label="Admin"
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active =
              href === "/admin" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
