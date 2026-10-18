"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createPromo,
  deletePromo,
  fetchPromos,
  updatePromo,
  type AdminPromo,
} from "@/lib/admin-api";

type Editor =
  | { mode: "create"; nonce: number }
  | { mode: "edit"; promo: AdminPromo; nonce: number }
  | null;

function PromoDialog({
  promo,
  onOpenChange,
  onSaved,
}: {
  promo: AdminPromo | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(promo?.code ?? "");
  const [percent, setPercent] = useState(promo ? String(promo.percent) : "");
  const [isActive, setIsActive] = useState(promo?.isActive ?? true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);
    setError(null);
    const percentValue = Number.parseInt(percent, 10);
    const request =
      promo === null
        ? createPromo({ code: code.trim().toUpperCase(), percent: percentValue, isActive })
        : updatePromo(promo.code, { percent: percentValue, isActive });
    request
      .then(() => onSaved())
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Save failed");
      })
      .finally(() => setIsBusy(false));
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {promo === null ? "New promo code" : `Edit ${promo.code}`}
          </DialogTitle>
          <DialogDescription>
            {promo === null
              ? "Codes are stored uppercase."
              : "Update the discount or toggle the code."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Could not save</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={submit}>
          <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="promo-code">Code</FieldLabel>
              <Input
                id="promo-code"
                required
                disabled={promo !== null}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="SUMMER10"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="promo-percent">Discount (%)</FieldLabel>
              <Input
                id="promo-percent"
                required
                type="number"
                min="1"
                max="100"
                value={percent}
                onChange={(event) => setPercent(event.target.value)}
                placeholder="10"
              />
            </Field>
            <Field className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                Active
              </label>
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
              {isBusy ? "Saving…" : promo === null ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<AdminPromo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPromo | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [nonce, setNonce] = useState(0);

  const load = useCallback(() => {
    fetchPromos()
      .then((data) => {
        setPromos(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openWith = (promo: AdminPromo | null) => {
    const next = nonce + 1;
    setNonce(next);
    setEditor(
      promo === null
        ? { mode: "create", nonce: next }
        : { mode: "edit", promo, nonce: next }
    );
  };

  const confirmDelete = () => {
    if (deleteTarget === null) return;
    setIsDeleting(true);
    setDeleteError(null);
    deletePromo(deleteTarget.code)
      .then(() => {
        setDeleteTarget(null);
        load();
      })
      .catch((err: unknown) => {
        setDeleteError(err instanceof Error ? err.message : "Delete failed");
      })
      .finally(() => setIsDeleting(false));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Promo codes</h1>
        <Button onClick={() => openWith(null)}>New promo code</Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Skeleton className="h-56 rounded-lg" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {promos.length} code{promos.length === 1 ? "" : "s"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {promos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No promo codes.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promos.map((promo) => (
                      <TableRow key={promo.code}>
                        <TableCell className="font-mono text-sm font-medium">
                          {promo.code}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {promo.percent}%
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={promo.isActive ? "default" : "outline"}
                          >
                            {promo.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openWith(promo)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(promo);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {editor !== null && (
        <PromoDialog
          key={editor.nonce}
          promo={editor.mode === "edit" ? editor.promo : null}
          onOpenChange={(open) => {
            if (!open) setEditor(null);
          }}
          onSaved={() => {
            setEditor(null);
            load();
          }}
        />
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.code}?</DialogTitle>
            <DialogDescription>
              The code stops working immediately. Existing bookings keep their
              discount.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertTitle>Could not delete</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
