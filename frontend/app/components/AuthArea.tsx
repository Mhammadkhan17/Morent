"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/AuthProvider";

export default function AuthArea() {
  const { user, isLoading, signOut } = useAuth();

  if (isLoading) {
    return <Skeleton className="size-9 rounded-full" />;
  }

  if (!user) {
    return (
      <Button asChild size="sm">
        <Link href="/login">Sign in</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-9">
        <AvatarImage src="/asset/Man-Avatar/avatar.png" alt={user.email} />
        <AvatarFallback>
          {(user.name ?? user.email).charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="hidden max-w-[10rem] truncate text-sm text-muted-foreground lg:inline">
        {user.email}
      </span>
      <Button variant="ghost" size="sm" onClick={() => void signOut()}>
        Sign out
      </Button>
    </div>
  );
}
