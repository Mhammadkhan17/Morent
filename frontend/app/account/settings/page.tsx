"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Camera, Check, LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProfile, updateProfile } from "@/lib/account";
import { useAuth } from "@/lib/AuthProvider";
import UserAvatar from "@/app/components/UserAvatar";
import {
  fileToAvatarPhoto,
  getAvatarPhoto,
  setAvatarPhoto,
  subscribeAvatarPhoto,
} from "@/lib/avatar";

function ProfilePhotoOption() {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const photo = useSyncExternalStore(
    subscribeAvatarPhoto,
    getAvatarPhoto,
    () => null
  );

  const onPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setProcessing(true);
    setPhotoError(null);
    try {
      setAvatarPhoto(await fileToAvatarPhoto(file));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Could not use that image.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-5">
      <UserAvatar
        name={user?.name}
        email={user?.email}
        className="size-16 text-xl"
      />
      <div className="space-y-2">
        <p className="text-sm font-medium">Profile photo</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onPick}
          aria-label="Choose profile photo"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={processing}
            onClick={() => inputRef.current?.click()}
          >
            <Camera aria-hidden="true" className="mr-2 size-4" />
            {processing ? "Saving…" : photo ? "Change photo" : "Upload photo"}
          </Button>
          {photo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setAvatarPhoto(null)}
            >
              <Trash2 aria-hidden="true" className="mr-2 size-4" />
              Remove
            </Button>
          )}
        </div>
        {photoError && <p className="text-xs text-destructive">{photoError}</p>}
        <p className="text-xs text-muted-foreground">
          {photo
            ? "Saved on this device."
            : "Optional — initials are used until you add one. Saved on this device."}
        </p>
      </div>
    </div>
  );
}

export default function AccountSettingsPage() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpires, setLicenseExpires] = useState("");

  useEffect(() => {
    fetchProfile()
      .then((profile) => {
        setPhone(profile.phone ?? "");
        setLicenseNumber(profile.licenseNumber ?? "");
        setLicenseExpires(profile.licenseExpires ?? "");
      })
      .catch(() => setError("Could not load profile."))
      .finally(() => setLoading(false));
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    updateProfile({
      phone: phone.trim() || null,
      licenseNumber: licenseNumber.trim() || null,
      licenseExpires: licenseExpires || null,
    })
      .then(() => setSaved(true))
      .catch(() => setError("Save failed — try again."))
      .finally(() => setSaving(false));
  };

  if (loading) {
    return <Skeleton className="h-72 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            {user?.email} — display name is managed by your auth provider.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ProfilePhotoOption />
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="555-0100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License number</Label>
                <Input
                  id="licenseNumber"
                  value={licenseNumber}
                  onChange={(event) => setLicenseNumber(event.target.value)}
                  placeholder="DL-123456"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseExpires">License expires</Label>
                <Input
                  id="licenseExpires"
                  type="date"
                  value={licenseExpires}
                  onChange={(event) => setLicenseExpires(event.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {saved && (
              <p className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                <Check aria-hidden="true" className="size-4" />
                Saved.
              </p>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => void signOut()}>
            <LogOut aria-hidden="true" className="mr-2 size-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
