"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  CalendarDays,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Settings,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/AuthProvider";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview", href: "/account", Icon: LayoutDashboard },
  { label: "Bookings", href: "/account/bookings", Icon: ListChecks },
  { label: "Calendar", href: "/account/calendar", Icon: CalendarDays },
  { label: "Inbox", href: "/account/inbox", Icon: Inbox },
  { label: "Settings", href: "/account/settings", Icon: Settings },
];

/** Customer portal chrome — session gate redirects signed-out visitors. */
export function AccountShell({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading || !user) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:gap-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          My account
        </h1>
        <p className="text-sm text-muted-foreground">
          Trips, messages, and your driver details.
        </p>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        <aside className="lg:w-44 lg:shrink-0">
          <nav
            aria-label="Account"
            className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 lg:flex-col lg:overflow-visible lg:pb-0"
          >
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const active =
                href === "/account" ? pathname === href : pathname.startsWith(href);
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
    </div>
  );
}
