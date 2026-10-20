import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Logo from "./logo";
import AuthArea from "./AuthArea";
import FavoritesMenu from "./FavoritesMenu";
import NotificationBell from "./NotificationBell";
import SettingsMenu from "./SettingsMenu";

const navLinks = [
  { label: "Explore", href: "/explore" },
  { label: "Popular", href: "/#popular" },
  { label: "Recommended", href: "/#recommended" },
];

/** Real actions: favorites, notifications, appearance (replaces dead icon trio). */
const HeaderActions = () => (
  <>
    <FavoritesMenu />
    <NotificationBell />
    <SettingsMenu />
  </>
);

const SearchField = () => (
  <InputGroup className="h-11">
    <InputGroupAddon>
      <Search aria-hidden="true" />
    </InputGroupAddon>
    <InputGroupInput
      type="search"
      placeholder="Search something here"
      aria-label="Search cars"
    />
  </InputGroup>
);

const MainHeader = () => {
  return (
    <header className="bg-background">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-4 sm:px-6 lg:gap-6 lg:px-8 lg:py-6">
        <Link href="/" aria-label="Morent home">
          <Logo className="text-2xl lg:text-3xl" />
        </Link>

        <nav
          aria-label="Main"
          className="ml-4 hidden items-center gap-1 lg:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden max-w-md flex-1 md:block">
          <SearchField />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            <HeaderActions />
          </div>

          <AuthArea />

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open menu"
                className="lg:hidden"
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-full flex-col gap-6 sm:w-80"
            >
              <SheetHeader>
                <SheetTitle className="text-primary">
                  <Logo className="text-xl" />
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Navigation and search
                </SheetDescription>
              </SheetHeader>

              <SearchField />

              <nav aria-label="Mobile" className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.label}>
                    <Link
                      href={link.href}
                      className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>

              <div className="flex items-center gap-1">
                <HeaderActions />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default MainHeader;
