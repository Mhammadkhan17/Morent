"use client";

import { useSyncExternalStore } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  avatarInitial,
  getAvatarPhoto,
  subscribeAvatarPhoto,
} from "@/lib/avatar";

/**
 * Shared user avatar: device-local photo from account settings when set,
 * otherwise the user's initial on the muted surface.
 */
export default function UserAvatar({
  name,
  email,
  className,
}: {
  name?: string | null;
  email?: string | null;
  className?: string;
}) {
  const photo = useSyncExternalStore(
    subscribeAvatarPhoto,
    getAvatarPhoto,
    () => null
  );

  return (
    <Avatar className={className}>
      {photo && <AvatarImage src={photo} alt="" />}
      <AvatarFallback className="font-semibold">
        {avatarInitial(name, email)}
      </AvatarFallback>
    </Avatar>
  );
}
