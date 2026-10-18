"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createAdminCar,
  updateAdminCar,
  type AdminCar,
  type AdminCarPayload,
} from "@/lib/admin-api";
import { X } from "lucide-react";

const STATUSES = [
  { value: "available", label: "Available" },
  { value: "maintenance", label: "Maintenance" },
  { value: "hidden", label: "Hidden" },
] as const;

const toPayload = (form: {
  name: string;
  type: string;
  description: string;
  fuelCapacity: string;
  transmission: string;
  seatingCapacity: string;
  pricePerDay: string;
  originalPrice: string;
  imageUrl: string;
  images: string[];
  tags: string;
  rating: string;
  status: string;
}): AdminCarPayload => ({
  name: form.name.trim(),
  type: form.type.trim(),
  description: form.description.trim(),
  fuelCapacity: form.fuelCapacity.trim(),
  transmission: form.transmission.trim(),
  seatingCapacity: form.seatingCapacity.trim(),
  pricePerDay: Number.parseFloat(form.pricePerDay),
  originalPrice: form.originalPrice
    ? Number.parseFloat(form.originalPrice)
    : null,
  imageUrl: form.imageUrl.trim(),
  images: form.images.filter((url) => url.trim() !== ""),
  tags: form.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== ""),
  rating: form.rating ? Number.parseFloat(form.rating) : null,
  status: form.status,
});

export function CarFormDialog({
  car,
  onOpenChange,
  onSaved,
}: {
  car: AdminCar | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() => ({
    name: car?.name ?? "",
    type: car?.type ?? "",
    description: car?.description ?? "",
    fuelCapacity: car?.fuelCapacity ?? "",
    transmission: car?.transmission ?? "",
    seatingCapacity: car?.seatingCapacity ?? "",
    pricePerDay: car ? String(car.pricePerDay) : "",
    originalPrice: car?.originalPrice != null ? String(car.originalPrice) : "",
    imageUrl: car?.imageUrl ?? "",
    images: car?.images ?? [],
    tags: (car?.tags ?? []).join(", "),
    rating: car?.rating != null ? String(car.rating) : "",
    status: car?.status ?? "available",
  }));
  const [imageDraft, setImageDraft] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string | string[]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const addImage = () => {
    const url = imageDraft.trim();
    if (url === "") return;
    set("images", [...form.images, url]);
    setImageDraft("");
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);
    setError(null);
    const payload = toPayload(form);
    const request =
      car === null
        ? createAdminCar(payload)
        : updateAdminCar(car.id, payload);
    request
      .then(() => onSaved())
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Save failed");
      })
      .finally(() => setIsBusy(false));
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{car === null ? "New car" : "Edit car"}</DialogTitle>
          <DialogDescription>
            {car === null
              ? "Add a vehicle to the fleet."
              : `Editing ${car.name}.`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Could not save</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={submit}>
          <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            <Field>
              <FieldLabel htmlFor="car-name">Name</FieldLabel>
              <Input
                id="car-name"
                required
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="Toyota Corolla"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="car-type">Type</FieldLabel>
              <Input
                id="car-type"
                required
                value={form.type}
                onChange={(event) => set("type", event.target.value)}
                placeholder="Sedan"
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="car-description">Description</FieldLabel>
              <Textarea
                id="car-description"
                required
                value={form.description}
                onChange={(event) => set("description", event.target.value)}
                placeholder="Comfortable city car with low fuel consumption."
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="car-fuel">Fuel capacity</FieldLabel>
              <Input
                id="car-fuel"
                required
                value={form.fuelCapacity}
                onChange={(event) => set("fuelCapacity", event.target.value)}
                placeholder="60L"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="car-transmission">Transmission</FieldLabel>
              <Input
                id="car-transmission"
                required
                value={form.transmission}
                onChange={(event) => set("transmission", event.target.value)}
                placeholder="Automatic"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="car-seats">Seating capacity</FieldLabel>
              <Input
                id="car-seats"
                required
                value={form.seatingCapacity}
                onChange={(event) => set("seatingCapacity", event.target.value)}
                placeholder="5"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="car-status">Status</FieldLabel>
              <Select
                value={form.status}
                onValueChange={(value) => set("status", value)}
              >
                <SelectTrigger id="car-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="car-price">Price per day (USD)</FieldLabel>
              <Input
                id="car-price"
                required
                type="number"
                min="0"
                step="0.01"
                value={form.pricePerDay}
                onChange={(event) => set("pricePerDay", event.target.value)}
                placeholder="99"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="car-original-price">
                Original price (optional)
              </FieldLabel>
              <Input
                id="car-original-price"
                type="number"
                min="0"
                step="0.01"
                value={form.originalPrice}
                onChange={(event) => set("originalPrice", event.target.value)}
                placeholder="129"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="car-rating">
                Rating (0–5, optional)
              </FieldLabel>
              <Input
                id="car-rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={(event) => set("rating", event.target.value)}
                placeholder="4.8"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="car-tags">Tags (comma-separated)</FieldLabel>
              <Input
                id="car-tags"
                value={form.tags}
                onChange={(event) => set("tags", event.target.value)}
                placeholder="automatic, ac, gps"
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="car-image-url">Image URL</FieldLabel>
              <Input
                id="car-image-url"
                required
                type="url"
                value={form.imageUrl}
                onChange={(event) => set("imageUrl", event.target.value)}
                placeholder="https://…"
              />
              {form.imageUrl !== "" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.imageUrl}
                  alt=""
                  className="mt-2 h-20 rounded-md border object-cover"
                />
              )}
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="car-extra-images">
                Additional images
              </FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="car-extra-images"
                  type="url"
                  value={imageDraft}
                  onChange={(event) => setImageDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addImage();
                    }
                  }}
                  placeholder="https://…"
                />
                <Button type="button" variant="outline" onClick={addImage}>
                  Add
                </Button>
              </div>
              {form.images.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {form.images.map((url, index) => (
                    <li
                      key={`${url}-${index}`}
                      className="flex items-center gap-1 rounded-md border py-1 pl-2 pr-1 text-xs"
                    >
                      <span className="max-w-48 truncate">{url}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        aria-label="Remove image"
                        onClick={() =>
                          set(
                            "images",
                            form.images.filter((_, i) => i !== index)
                          )
                        }
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isBusy}>
              {isBusy ? "Saving…" : car === null ? "Create car" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
