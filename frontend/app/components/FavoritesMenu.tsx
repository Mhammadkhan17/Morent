"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFavorites } from "@/lib/favorites";

/** Header action: saved cars with a live count badge. */
export default function FavoritesMenu() {
  const favorites = useFavorites();
  const count = favorites.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            count > 0 ? `Favorites, ${count} saved` : "Favorites, none saved"
          }
          className="relative text-muted-foreground"
        >
          <Heart
            aria-hidden="true"
            className={count > 0 ? "fill-destructive text-destructive" : ""}
          />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Favorites</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {count === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            No favorites yet — tap the heart on any car to save it here.
          </p>
        ) : (
          favorites.map((car) => (
            <DropdownMenuItem key={car.id} asChild>
              <Link href={`/cars/${car.id}`} className="gap-3">
                <span className="relative size-8 shrink-0 overflow-hidden rounded-md bg-accent">
                  {car.image && (
                    <Image
                      src={car.image}
                      alt=""
                      fill
                      sizes="32px"
                      className="object-contain"
                    />
                  )}
                </span>
                <span className="truncate">{car.name}</span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
