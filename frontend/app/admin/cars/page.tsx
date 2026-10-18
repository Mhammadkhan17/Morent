"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteAdminCar, fetchAdminCars, type AdminCar } from "@/lib/admin-api";
import { formatMoney } from "@/lib/cars-api";
import { CarFormDialog } from "./car-form-dialog";
import { StatusBadge } from "../status-badge";

type Editor = { car: AdminCar | null; nonce: number } | null;

export default function AdminCarsPage() {
  const [cars, setCars] = useState<AdminCar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCar | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [nonce, setNonce] = useState(0);

  const load = useCallback(() => {
    fetchAdminCars()
      .then((data) => {
        setCars(data);
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

  const openWith = (car: AdminCar | null) => {
    const next = nonce + 1;
    setNonce(next);
    setEditor({ car, nonce: next });
  };

  const openCreate = () => openWith(null);

  const openEdit = (car: AdminCar) => openWith(car);

  const confirmDelete = () => {
    if (deleteTarget === null) return;
    setIsDeleting(true);
    setDeleteError(null);
    deleteAdminCar(deleteTarget.id)
      .then(() => {
        setDeleteTarget(null);
        load();
      })
      .catch((err: unknown) => {
        setDeleteError(
          err instanceof Error
            ? err.message
            : "Delete failed — this car may have bookings"
        );
      })
      .finally(() => setIsDeleting(false));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Cars</h1>
        <Button onClick={openCreate}>New car</Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Skeleton className="h-72 rounded-lg" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{cars.length} cars</CardTitle>
          </CardHeader>
          <CardContent>
            {cars.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cars yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Car</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Price / day</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cars.map((car) => (
                      <TableRow key={car.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={car.imageUrl}
                              alt=""
                              className="size-10 rounded-md border object-cover"
                            />
                            <div>
                              <span className="block text-sm font-medium">
                                {car.name}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {car.id}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{car.type}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatMoney(car.pricePerDay)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={car.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(car)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(car);
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
        <CarFormDialog
          key={editor.nonce}
          car={editor.car}
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
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              This removes the car from the catalogue. Cars with bookings
              cannot be deleted — set the status to hidden instead.
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
