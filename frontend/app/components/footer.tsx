import Link from "next/link";
import Logo from "./logo";

const AboutLinks = [
  { title: "How it works", href: "/how-it-works" },
  { title: "Featured", href: "/#popular" },
  { title: "Explore cars", href: "/explore" },
];

const linkClassName =
  "flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

export const Footer = () => {
  return (
    <footer className="mt-8 bg-muted">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <section>
            <Logo className="mb-4 text-xl" />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground md:max-w-sm">
              Our vision is to provide convenience and help increase your sales
              business.
            </p>
          </section>

          <section>
            <div className="flex flex-col gap-4">
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                About
              </h3>
              {AboutLinks.map((link) => (
                <Link
                  key={link.title}
                  href={link.href}
                  className={linkClassName}
                >
                  {link.title}
                </Link>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-12 text-sm font-medium text-muted-foreground md:mt-16">
          <p>© {new Date().getFullYear()} Morent. All rights reserved.</p>
        </section>
      </div>
    </footer>
  );
};
